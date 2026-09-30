-- Replaced by update_roster_player
drop function if exists set_nickname(int, int, int, text, text);



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

create or replace function slot_fits(p_slot text, p_pos text)
returns boolean
language sql
immutable
as $$
  select (p_slot in ('F1', 'F2') and p_pos in ('C', 'L', 'R'))
      or (p_slot in ('D1', 'D2') and p_pos = 'D')
      or (p_slot = 'G' and p_pos = 'G')
      or (p_slot = 'X' and p_pos in ('C', 'L', 'R', 'D'));
$$;



-- ### PROCESSING (called by rollover) ###

-- Priority: lowest score of the ended week, then lowest season points, then random.
-- Round-robin: each round every team (in priority order) gets at most one successful claim.
-- A claim needs the player to be unrostered and not dropped this run, plus an Out whose slot fits.
-- Unused claims and Outs are cleared afterwards. Returns claims granted.
create or replace function process_waivers(p_league int, p_week date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  prio int[];
  t int;
  c record;
  o record;
  pos text;
  dropped int[] := '{}';
  progress boolean;
  n int := 0;
begin
  select array_agg(tm.id order by coalesce(s.total_points, 0), coalesce(ss.total_points, 0), random())
  into prio
  from teams tm
  left join team_week_scores s on s.team_id = tm.id and s.week = p_week - 7
  left join season_standings ss on ss.team_id = tm.id
  where tm.league_id = p_league;

  if prio is not null then
    loop
      progress := false;
      foreach t in array prio loop
        for c in
          select wi.player_id from waiver_ins wi
          where wi.league_id = p_league and wi.team_id = t
          order by wi.created_at
        loop
          delete from waiver_ins where league_id = p_league and team_id = t and player_id = c.player_id;
          continue when c.player_id = any(dropped)
            or exists (select 1 from roster_weeks where league_id = p_league and week = p_week and player_id = c.player_id);

          select position into pos from players where id = c.player_id;
          select wo.player_id, rw.slot into o
          from waiver_outs wo
          join roster_weeks rw on rw.league_id = wo.league_id and rw.week = p_week
                              and rw.team_id = wo.team_id and rw.player_id = wo.player_id
          where wo.league_id = p_league and wo.team_id = t and slot_fits(rw.slot, pos)
          order by wo.created_at
          limit 1;
          continue when not found;

          perform apply_set(p_league, p_week, t, o.slot, c.player_id);
          delete from waiver_outs where league_id = p_league and team_id = t and player_id = o.player_id;
          dropped := dropped || o.player_id;
          insert into moves (league_id, week, team_id, player_id, kind, source) values
            (p_league, p_week, t, c.player_id, 'add', 'waiver'),
            (p_league, p_week, t, o.player_id, 'drop', 'waiver');
          n := n + 1;
          progress := true;
          exit;
        end loop;
      end loop;
      exit when not progress;
    end loop;
  end if;

  delete from waiver_ins where league_id = p_league;
  delete from waiver_outs where league_id = p_league;
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
      'outs', coalesce((
        select jsonb_agg(jsonb_build_object('player_id', x.player_id, 'n', x.n) order by x.n)
        from (select player_id, row_number() over (order by created_at) as n
              from waiver_outs where league_id = p_league and team_id = p_team) x
      ), '[]'::jsonb),
      'ins', coalesce((
        select jsonb_agg(player_json(p_league, null, x.player_id) || jsonb_build_object('n', x.n) order by x.n)
        from (select player_id, row_number() over (order by created_at) as n
              from waiver_ins where league_id = p_league and team_id = p_team) x
      ), '[]'::jsonb)
    )
  end;
$$;

-- Nickname ('' clears) + Waiver Out toggle for a player on the team's current roster
create or replace function update_roster_player(
  p_league int, p_team int, p_pin text, p_player int, p_nickname text, p_waiver_out boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  nick text := nullif(trim(coalesce(p_nickname, '')), '');
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

  if nick is null then
    delete from nicknames where league_id = p_league and team_id = p_team and player_id = p_player;
  else
    insert into nicknames (league_id, team_id, player_id, nickname)
    values (p_league, p_team, p_player, nick)
    on conflict (league_id, team_id, player_id) do update set nickname = excluded.nickname;
  end if;

  if p_waiver_out then
    insert into waiver_outs (league_id, team_id, player_id)
    values (p_league, p_team, p_player)
    on conflict do nothing;
  else
    delete from waiver_outs where league_id = p_league and team_id = p_team and player_id = p_player;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function set_waiver_in(p_league int, p_team int, p_pin text, p_player int, p_on boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not pin_ok(p_league, p_team, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN.');
  end if;

  if not p_on then
    delete from waiver_ins where league_id = p_league and team_id = p_team and player_id = p_player;
    return jsonb_build_object('ok', true);
  end if;

  if not exists (select 1 from players where id = p_player) then
    return jsonb_build_object('ok', false, 'error', 'Unknown player.');
  end if;
  if exists (select 1 from roster_weeks
             where league_id = p_league and player_id = p_player and week = roster_week(p_league)) then
    return jsonb_build_object('ok', false, 'error', 'Player is not a free agent.');
  end if;
  insert into waiver_ins (league_id, team_id, player_id)
  values (p_league, p_team, p_player)
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;
