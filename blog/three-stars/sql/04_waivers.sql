-- Replaced: nickname-only update_roster_player, paired set_waiver_in (Waiver Out list is gone)
drop function if exists set_nickname(int, int, int, text, text);
drop function if exists update_roster_player(int, int, text, int, text, boolean);
drop function if exists set_waiver_in(int, int, text, int, boolean);



-- ### HELPERS ###

create or replace function pin_ok(p_league int, p_team int, p_pin text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select pin_hash is not null and extensions.crypt(coalesce(p_pin, ''), pin_hash) = pin_hash
    from teams where id = p_team and league_id = p_league
  ), false);
$$;



-- ### PROCESSING (called by rollover) ###

-- Priority: lowest score of the ended week, then lowest season SP, then lowest season points, then random.
-- Before scoring starts (ended week < first_scoring_week) with a done draft: reverse draft order instead,
-- teams missing from the order last.
-- Round-robin: each round every team (in priority order) gets at most one successful claim.
-- A claim needs the add to be unrostered and not dropped this run, and its drop still on the team
-- in a slot the add fits. The add takes the drop's slot. Unused claims are cleared. Returns claims granted.
create or replace function process_waivers(p_league int, p_week date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  prio int[];
  dord int[];
  t int;
  c record;
  s text;
  dropped int[] := '{}';
  progress boolean;
  n int := 0;
begin
  select d.draft_order into dord
  from drafts d join leagues l on l.id = d.league_id and l.season = d.season
  where d.league_id = p_league and d.status = 'done' and p_week - 7 < l.first_scoring_week;

  if dord is not null then
    select array_agg(tm.id order by array_position(dord, tm.id) desc nulls last, tm.id)
    into prio
    from teams tm where tm.league_id = p_league;
  else
    select array_agg(tm.id order by coalesce(s.total_points, 0), coalesce(ss.sp, 0), coalesce(ss.total_points, 0), random())
    into prio
    from teams tm
    left join team_week_scores s on s.team_id = tm.id and s.week = p_week - 7
    left join season_standings ss on ss.team_id = tm.id
    where tm.league_id = p_league;
  end if;

  if prio is not null then
    loop
      progress := false;
      foreach t in array prio loop
        for c in
          select wi.player_id, wi.drop_player_id, pl.position from waiver_ins wi
          join players pl on pl.id = wi.player_id
          where wi.league_id = p_league and wi.team_id = t
          order by wi.created_at
        loop
          delete from waiver_ins where league_id = p_league and team_id = t and player_id = c.player_id;
          continue when c.player_id = any(dropped)
            or exists (select 1 from roster_weeks where league_id = p_league and week = p_week and player_id = c.player_id);

          select rw.slot into s from roster_weeks rw
          where rw.league_id = p_league and rw.week = p_week and rw.team_id = t and rw.player_id = c.drop_player_id;
          continue when not found or not slot_fits(s, c.position);

          perform apply_set(p_league, p_week, t, s, c.player_id);
          dropped := dropped || c.drop_player_id;
          insert into moves (league_id, week, team_id, player_id, kind, source) values
            (p_league, p_week, t, c.player_id, 'add', 'waiver'),
            (p_league, p_week, t, c.drop_player_id, 'drop', 'waiver');
          n := n + 1;
          progress := true;
          exit;
        end loop;
      end loop;
      exit when not progress;
    end loop;
  end if;

  delete from waiver_ins where league_id = p_league;
  return n;
end;
$$;



-- ### OWNER ACTIONS (anon, PIN-gated) ###

-- Doubles as sign-in check. Lists are private to the owner.
create or replace function get_my_team(p_league int, p_team int, p_pin text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not pin_ok(p_league, p_team, p_pin)
    then jsonb_build_object('ok', false, 'error', 'Wrong PIN (or no PIN set for this team).')
    else jsonb_build_object(
      'ok', true,
      'team', team_json(p_team),
      'dekes', (select dekes from teams where id = p_team),
      'ins', coalesce((
        select jsonb_agg(player_json(p_league, null, x.player_id)
                         || jsonb_build_object('n', x.n, 'drop', player_json(p_league, p_team, x.drop_player_id)) order by x.n)
        from (select player_id, drop_player_id, row_number() over (order by created_at) as n
              from waiver_ins where league_id = p_league and team_id = p_team) x
      ), '[]'::jsonb),
      'trades', coalesce((
        select jsonb_agg(trade_json(t.id, p_team) order by t.status, t.created_at)
        from trades t where t.league_id = p_league and p_team in (t.from_team, t.to_team)
      ), '[]'::jsonb)
    )
  end;
$$;

-- Nickname ('' clears) for a player on the team's current roster.
-- Setting a new nickname costs 1 Deke (08_dekes.sql); clearing one is free.
-- All checks run before any write so a rejected save never costs a Deke.
create or replace function update_roster_player(
  p_league int, p_team int, p_pin text, p_player int, p_nickname text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  nick text := nullif(trim(coalesce(p_nickname, '')), '');
  old text;
  bal int;
begin
  if not pin_ok(p_league, p_team, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN.');
  end if;
  if not exists (select 1 from roster_weeks
                 where league_id = p_league and team_id = p_team and player_id = p_player
                   and week = roster_week(p_league)) then
    return jsonb_build_object('ok', false, 'error', 'Player is not on this team''s current roster.');
  end if;
  if char_length(nick) > 20 then
    return jsonb_build_object('ok', false, 'error', 'Nickname max 20 characters.');
  end if;

  select nickname into old from nicknames where league_id = p_league and team_id = p_team and player_id = p_player;
  if nick is not null and nick is distinct from old then
    select dekes into bal from teams where id = p_team for update;
    if bal < 1 then
      return jsonb_build_object('ok', false, 'error', 'A new nickname costs 1 Deke. Get some in Customize on your team page.');
    end if;
    perform add_dekes(p_team, -1, 'nickname', null,
      (select trim(coalesce(first_name, '') || ' ' || last_name) from players where id = p_player)
        || ': ' || coalesce(old, '(none)') || ' -> ' || nick);
  end if;

  if nick is null then
    delete from nicknames where league_id = p_league and team_id = p_team and player_id = p_player;
  else
    insert into nicknames (league_id, team_id, player_id, nickname)
    values (p_league, p_team, p_player, nick)
    on conflict (league_id, team_id, player_id) do update set nickname = excluded.nickname;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Claim p_player, dropping p_drop. Re-claiming the same player just changes the drop (keeps priority).
-- p_drop null removes the claim.
create or replace function set_waiver_in(p_league int, p_team int, p_pin text, p_player int, p_drop int)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  pos text;
  s text;
begin
  if not pin_ok(p_league, p_team, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN.');
  end if;

  if p_drop is null then
    delete from waiver_ins where league_id = p_league and team_id = p_team and player_id = p_player;
    return jsonb_build_object('ok', true);
  end if;

  select position into pos from players where id = p_player;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Unknown player.');
  end if;
  if exists (select 1 from roster_weeks
             where league_id = p_league and player_id = p_player and week = roster_week(p_league)) then
    return jsonb_build_object('ok', false, 'error', 'Player is not a free agent.');
  end if;
  select slot into s from roster_weeks
  where league_id = p_league and team_id = p_team and player_id = p_drop and week = roster_week(p_league);
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Drop player is not on your current roster.');
  end if;
  if not slot_fits(s, pos) then
    return jsonb_build_object('ok', false, 'error', 'Position doesn''t fit the drop player''s slot.');
  end if;
  if exists (select 1 from trade_players tp join trades t on t.id = tp.trade_id
             where t.league_id = p_league and tp.player_id = p_drop) then
    return jsonb_build_object('ok', false, 'error', 'Drop player is in a trade.');
  end if;

  insert into waiver_ins (league_id, team_id, player_id, drop_player_id)
  values (p_league, p_team, p_player, p_drop)
  on conflict (league_id, team_id, player_id) do update set drop_player_id = excluded.drop_player_id;
  return jsonb_build_object('ok', true);
end;
$$;
