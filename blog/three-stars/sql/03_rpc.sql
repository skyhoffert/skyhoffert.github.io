-- ### JSON HELPERS ###

-- Latest roster week that isn't in the future; the "current" roster for edits and ownership
create or replace function roster_week(p_league int)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select max(week) from roster_weeks where league_id = p_league and week <= current_week();
$$;

create or replace function team_json(p_team int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('id', t.id, 'name', t.name, 'owner', t.owner, 'color', t.color, 'icon_path', t.icon_path,
                            'supporter', t.supporter_season is not distinct from l.season)
  from teams t join leagues l on l.id = t.league_id where t.id = p_team;
$$;

-- p_team is the owner whose nickname applies; null means no nickname
create or replace function player_json(p_league int, p_team int, p_player int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'name', trim(coalesce(p.first_name, '') || ' ' || p.last_name),
    'position', p.position,
    'nhl_team', p.nhl_team,
    'headshot', p.headshot,
    'nickname', (select n.nickname from nicknames n
                 where n.league_id = p_league and n.team_id = p_team and n.player_id = p.id)
  )
  from players p where p.id = p_player;
$$;

create or replace function league_json(p_league int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('id', l.id, 'name', l.name, 'season', l.season, 'first_scoring_week', l.first_scoring_week,
                            'slots', to_jsonb(slot_list(l.n_f, l.n_d, l.n_g, l.n_x, l.n_s)), 'max_teams', l.max_teams,
                            'draft_status', (select d.status from drafts d where d.league_id = l.id and d.season = l.season),
                            'midweek_at', (select d.midweek_at from drafts d
                                           where d.league_id = l.id and d.season = l.season and d.midweek_ran_at is null))
  from leagues l where l.id = p_league;
$$;

create or replace function team_week_json(p_league int, p_team int, p_week date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'team', team_json(p_team),
    'total_points', coalesce(s.total_points, 0),
    'star_points', coalesce(s.star_points, 0),
    'bonus_points', coalesce(s.bonus_points, 0),
    'week_rank', s.week_rank,
    'sp', coalesce(s.sp, 0),
    'players', coalesce((
      select jsonb_agg(
        player_json(p_league, p_team, rp.player_id) || jsonb_build_object(
          'slot', rp.slot,
          'games', rp.games,
          'goals', rp.goals,
          'assists', rp.assists,
          'points', rp.points,
          'plus_minus', rp.plus_minus,
          'firsts', rp.firsts,
          'seconds', rp.seconds,
          'thirds', rp.thirds,
          'star_points', rp.star_points,
          'goals_leader', rp.goals_leader,
          'points_leader', rp.points_leader,
          'pm_leader', rp.pm_leader,
          'bonus_points', rp.bonus_points,
          'total_points', rp.total_points
        )
        order by strpos('FDGXS', left(rp.slot, 1)), rp.slot)
      from roster_week_points rp
      where rp.league_id = p_league and rp.team_id = p_team and rp.week = p_week
    ), '[]'::jsonb)
  )
  from (select 1) x
  left join team_week_scores s on s.league_id = p_league and s.team_id = p_team and s.week = p_week;
$$;

create or replace function week_nav_json(p_league int, p_week date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'week', p_week,
    'current_week', current_week(),
    'prev_week', (select max(week) from roster_weeks where league_id = p_league and week < p_week),
    'next_week', (select min(week) from roster_weeks where league_id = p_league and week > p_week),
    'is_scoring', p_week >= (select first_scoring_week from leagues where id = p_league),
    'is_final', p_week < current_week(),
    'weeks', coalesce((select jsonb_agg(w order by w desc) from (select distinct week as w from roster_weeks where league_id = p_league) x), '[]'::jsonb)
  );
$$;

create or replace function moves_json(p_league int, p_week date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'team', team_json(m.team_id),
    'kind', m.kind,
    'source', m.source,
    'player', player_json(p_league, null, m.player_id)
  ) order by m.team_id, m.source, m.kind, m.id), '[]'::jsonb)
  from moves m
  where m.league_id = p_league and m.week = p_week;
$$;



-- ### PAGE RPCS ###

create or replace function get_standings(p_league int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'league', league_json(p_league),
    'current_week', current_week(),
    'standings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'team', team_json(s.team_id),
        'sp', s.sp,
        'place1', s.place1,
        'place2', s.place2,
        'place3', s.place3,
        'total_points', s.total_points,
        'standing', s.standing
      ) order by s.standing, s.team_id)
      from season_standings s where s.league_id = p_league
    ), '[]'::jsonb)
  );
$$;

create or replace function get_week(p_league int, p_week date default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with p as (select week_of(coalesce(p_week, current_week())) as w)
  select jsonb_build_object(
    'league', league_json(p_league),
    'nav', week_nav_json(p_league, p.w),
    'teams', coalesce((
      select jsonb_agg(tw order by (tw->>'week_rank')::int nulls last, tw->'team'->>'name')
      from (select team_week_json(p_league, t.id, p.w) as tw from teams t where t.league_id = p_league) x
    ), '[]'::jsonb),
    'moves', moves_json(p_league, p.w)
  )
  from p;
$$;

create or replace function get_team(p_league int, p_team int, p_week date default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with p as (select week_of(coalesce(p_week, current_week())) as w)
  select case when not exists (select 1 from teams where id = p_team and league_id = p_league) then null
  else jsonb_build_object(
    'league', league_json(p_league),
    'nav', week_nav_json(p_league, p.w),
    'standing', (select jsonb_build_object('sp', s.sp, 'place1', s.place1, 'place2', s.place2, 'place3', s.place3,
                                           'total_points', s.total_points, 'standing', s.standing)
                 from season_standings s where s.team_id = p_team),
    'week', team_week_json(p_league, p_team, p.w),
    'editable', p.w = roster_week(p_league),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'week', s.week,
        'total_points', s.total_points,
        'week_rank', s.week_rank,
        'is_scoring', s.is_scoring,
        'is_final', s.is_final,
        'sp', s.sp
      ) order by s.week desc)
      from team_week_scores s where s.team_id = p_team
    ), '[]'::jsonb)
  ) end
  from p;
$$;

create or replace function get_history(p_league int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'league', league_json(p_league),
    'current_week', current_week(),
    'weeks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'week', wk.week,
        'is_scoring', wk.is_scoring,
        'is_final', wk.is_final,
        'teams', (
          select jsonb_agg(jsonb_build_object(
            'team', team_json(s.team_id),
            'total_points', s.total_points,
            'week_rank', s.week_rank,
            'sp', s.sp
          ) order by s.week_rank, s.team_id)
          from team_week_scores s where s.league_id = p_league and s.week = wk.week
        ),
        'moves', moves_json(p_league, wk.week)
      ) order by wk.week desc)
      from (select distinct week, is_scoring, is_final from team_week_scores where league_id = p_league) wk
    ), '[]'::jsonb)
  );
$$;

-- p_owner: null = all, 'fa' = free agents, 'owned' = rostered
create or replace function get_players(
  p_league int,
  p_search text default null,
  p_position text default null,
  p_owner text default null,
  p_limit int default 100
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with lg as (
    select season,
      (select max(week) from roster_weeks where league_id = p_league and week <= current_week()) as rw
    from leagues where id = p_league
  ),
  season_pts as (
    select pw.player_id,
      sum(pw.games)::int as games, sum(pw.goals)::int as goals, sum(pw.assists)::int as assists,
      sum(pw.points)::int as points, sum(pw.plus_minus)::int as plus_minus,
      sum(pw.firsts)::int as firsts, sum(pw.seconds)::int as seconds, sum(pw.thirds)::int as thirds,
      sum(pw.star_points)::int as star_points
    from player_week_points pw, lg
    where pw.season = lg.season
    group by pw.player_id
  ),
  rows as (
    select p.id, p.last_name, rw.team_id, sp.*
    from players p
    cross join lg
    left join roster_weeks rw on rw.league_id = p_league and rw.week = lg.rw and rw.player_id = p.id
    left join season_pts sp on sp.player_id = p.id
    left join nicknames n on n.league_id = p_league and n.team_id = rw.team_id and n.player_id = p.id
    where (p_search is null or p_search = ''
           or (coalesce(p.first_name, '') || ' ' || p.last_name) ilike '%' || p_search || '%'
           or n.nickname ilike '%' || p_search || '%')
      and (p_position is null or p_position = '' or p.position = p_position
           or (p_position = 'F' and p.position in ('C', 'L', 'R')))
      and (p_owner is null or p_owner = ''
           or (p_owner = 'fa' and rw.team_id is null)
           or (p_owner = 'owned' and rw.team_id is not null))
    order by coalesce(sp.star_points, 0) desc, coalesce(sp.points, 0) desc, p.last_name
    limit least(greatest(p_limit, 1), 500)
  )
  select jsonb_build_object(
    'league', league_json(p_league),
    'players', coalesce((
      select jsonb_agg(
        player_json(p_league, r.team_id, r.id) || jsonb_build_object(
          'owner', case when r.team_id is null then null else team_json(r.team_id) end,
          'games', coalesce(r.games, 0),
          'goals', coalesce(r.goals, 0),
          'assists', coalesce(r.assists, 0),
          'points', coalesce(r.points, 0),
          'plus_minus', coalesce(r.plus_minus, 0),
          'firsts', coalesce(r.firsts, 0),
          'seconds', coalesce(r.seconds, 0),
          'thirds', coalesce(r.thirds, 0),
          'star_points', coalesce(r.star_points, 0)
        )
        order by coalesce(r.star_points, 0) desc, coalesce(r.points, 0) desc, r.last_name)
      from rows r
    ), '[]'::jsonb)
  );
$$;

create or replace function get_recent_stars(p_league int, p_days int default 3)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'game_id', g.id,
    'date', g.game_date,
    'away', g.away,
    'home', g.home,
    'away_score', g.away_score,
    'home_score', g.home_score,
    'stars', (
      select jsonb_agg(jsonb_build_object(
        'star', st.star,
        'points', case st.star when 1 then 30 when 2 then 20 else 10 end,
        'player', player_json(p_league, rw.team_id, st.player_id),
        'owner', case when rw.team_id is null then null else team_json(rw.team_id) end,
        'goals', s.goals,
        'assists', s.assists,
        'saves', s.saves,
        'is_goalie', s.is_goalie
      ) order by st.star)
      from game_stars st
      left join roster_weeks rw on rw.league_id = p_league and rw.week = week_of(g.game_date) and rw.player_id = st.player_id
      left join player_game_stats s on s.game_id = g.id and s.player_id = st.player_id
      where st.game_id = g.id
    )
  ) order by g.game_date desc, g.id desc), '[]'::jsonb)
  from games g
  where g.game_type = 2
    and g.game_date >= (now() at time zone 'America/New_York')::date - greatest(p_days, 1)
    and exists (select 1 from game_stars st where st.game_id = g.id);
$$;



-- ### ROSTER MUTATIONS (service role only) ###

create or replace function set_team_pin(p_team int, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pin is null or char_length(p_pin) < 6 then
    raise exception 'PIN must be at least 6 characters';
  end if;
  update teams set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')) where id = p_team;
end;
$$;

create or replace function apply_set(p_league int, p_week date, p_team int, p_slot text, p_player int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from roster_weeks
  where league_id = p_league and week = p_week
    and (player_id = p_player or (team_id = p_team and slot = p_slot));
  insert into roster_weeks (league_id, week, team_id, player_id, slot)
  values (p_league, p_week, p_team, p_player, p_slot);
end;
$$;

create or replace function apply_drop(p_league int, p_week date, p_player int)
returns void
language sql
security definer
set search_path = public
as $$
  delete from roster_weeks where league_id = p_league and week = p_week and player_id = p_player;
$$;

-- Admin pending transaction applied at rollover, with moves logged
create or replace function apply_admin_tx(tx pending_transactions, p_week date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  prev_team int;
  occupant int;
begin
  select team_id into prev_team from roster_weeks
  where league_id = tx.league_id and week = p_week and player_id = tx.player_id;

  if tx.type = 'drop' then
    perform apply_drop(tx.league_id, p_week, tx.player_id);
    if prev_team is not null then
      insert into moves (league_id, week, team_id, player_id, kind, source)
      values (tx.league_id, p_week, prev_team, tx.player_id, 'drop', 'admin');
    end if;
    return;
  end if;

  select player_id into occupant from roster_weeks
  where league_id = tx.league_id and week = p_week and team_id = tx.team_id and slot = tx.slot;
  perform apply_set(tx.league_id, p_week, tx.team_id, tx.slot, tx.player_id);

  if prev_team is distinct from tx.team_id then
    insert into moves (league_id, week, team_id, player_id, kind, source)
    values (tx.league_id, p_week, tx.team_id, tx.player_id, 'add', 'admin');
    if prev_team is not null then
      insert into moves (league_id, week, team_id, player_id, kind, source)
      values (tx.league_id, p_week, prev_team, tx.player_id, 'drop', 'admin');
    end if;
  end if;
  if occupant is not null and occupant <> tx.player_id then
    insert into moves (league_id, week, team_id, player_id, kind, source)
    values (tx.league_id, p_week, tx.team_id, occupant, 'drop', 'admin');
  end if;
end;
$$;

-- Catch-up + idempotent: creates every missing week up to the current one by copying the previous
-- week, then applies admin pending transactions (target_week <= that week), then trades, then waivers.
-- Returns weeks created. Worker only calls this once the ended week's games are all final.
create or replace function rollover(p_league int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  cur date := current_week();
  last date;
  w date;
  tx pending_transactions;
  n int := 0;
begin
  perform pg_advisory_xact_lock(31337, p_league);
  select max(week) into last from roster_weeks where league_id = p_league;
  if last is null then
    return 0;
  end if;

  while last < cur loop
    w := last + 7;
    insert into roster_weeks (league_id, week, team_id, player_id, slot)
    select league_id, w, team_id, player_id, slot
    from roster_weeks where league_id = p_league and week = last;

    for tx in
      select * from pending_transactions
      where league_id = p_league and status = 'pending' and target_week <= w
      order by id
    loop
      begin
        perform apply_admin_tx(tx, w);
        update pending_transactions set status = 'applied', applied_at = now() where id = tx.id;
      exception when others then
        update pending_transactions set status = 'failed', error = sqlerrm where id = tx.id;
      end;
    end loop;

    perform process_trades(p_league, w);
    perform process_waivers(p_league, w);
    last := w;
    n := n + 1;
  end loop;
  return n;
end;
$$;
