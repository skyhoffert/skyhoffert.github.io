-- Auto draft (README.md, Draft). Tables live in 01_schema.sql (league_json in 03 reads drafts). Run after 01/03/04, then 05.

-- ### HELPERS ###

-- Draftable: on a current NHL roster as of the latest roster refresh
create or replace function draft_pool()
returns table (player_id int)
language sql
stable
security definer
set search_path = public
as $$
  select p.id from players p
  where p.nhl_team is not null
    and p.updated_at >= (select max(updated_at) from players) - interval '2 days';
$$;

-- The league's draft for its current season
create or replace function league_draft(p_league int)
returns drafts
language sql
stable
security definer
set search_path = public
as $$
  select d.* from drafts d join leagues l on l.id = d.league_id and l.season = d.season
  where d.league_id = p_league;
$$;

create or replace function wish_max(p_league int)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select 3 * cardinality(league_slots(p_league));
$$;



-- ### PAGE RPCS (anon) ###

-- Wishlist only when p_team + p_pin check out (null otherwise)
create or replace function get_draft(p_league int, p_team int default null, p_pin text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with d as (select * from league_draft(p_league) where id is not null)
  select jsonb_build_object(
    'league', league_json(p_league),
    'draft', (select jsonb_build_object(
      'status', d.status,
      'type', d.type,
      'ran_at', d.ran_at,
      'scheduled_at', d.scheduled_at,
      'wish_max', wish_max(p_league),
      'order', coalesce((select jsonb_agg(team_json(u.t) order by u.i)
                         from unnest(d.draft_order) with ordinality u(t, i)
                         where exists (select 1 from teams where id = u.t)), '[]'::jsonb),
      'unordered', coalesce((select jsonb_agg(team_json(tm.id) order by tm.id) from teams tm
                             where tm.league_id = p_league and not tm.id = any(d.draft_order)), '[]'::jsonb)
    ) from d),
    'picks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'overall', dp.overall,
        'round', dp.round,
        'team', team_json(dp.team_id),
        'player', player_json(p_league, null, dp.player_id),
        'wish_rank', dp.wish_rank,
        'rank', pr.rank
      ) order by dp.overall)
      from d join draft_picks dp on dp.draft_id = d.id
      left join player_ranks pr on pr.season = d.season and pr.player_id = dp.player_id
    ), '[]'::jsonb),
    'wishlist', case when p_team is not null and pin_ok(p_league, p_team, p_pin) then coalesce((
      select jsonb_agg(player_json(p_league, null, w.player_id) || jsonb_build_object('rank', pr.rank) order by w.rank)
      from d join draft_wishlists w on w.draft_id = d.id and w.team_id = p_team
      left join player_ranks pr on pr.season = d.season and pr.player_id = w.player_id
    ), '[]'::jsonb) end
  );
$$;

-- Undrafted pool players by default rank, then name. p_position: '', F, D, G.
create or replace function get_draft_pool(p_league int, p_search text default null, p_position text default null, p_limit int default 50)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with lg as (select season, roster_week(p_league) as rw from leagues where id = p_league),
  rows as (
    select p.id, p.first_name, p.last_name, pr.rank
    from draft_pool() dp
    join players p on p.id = dp.player_id
    cross join lg
    left join player_ranks pr on pr.season = lg.season and pr.player_id = p.id
    where not exists (select 1 from roster_weeks rw where rw.league_id = p_league and rw.week = lg.rw and rw.player_id = p.id)
      and (p_search is null or p_search = '' or (coalesce(p.first_name, '') || ' ' || p.last_name) ilike '%' || p_search || '%')
      and (p_position is null or p_position = '' or p.position = p_position
           or (p_position = 'F' and p.position in ('C', 'L', 'R')))
    order by pr.rank nulls last, p.last_name, p.first_name, p.id
    limit least(greatest(p_limit, 1), 200)
  )
  select coalesce(jsonb_agg(player_json(p_league, null, r.id) || jsonb_build_object('rank', r.rank)
                            order by r.rank nulls last, r.last_name, r.first_name, r.id), '[]'::jsonb)
  from rows r;
$$;



-- ### OWNER ACTIONS (anon, PIN-gated) ###

-- Full replace, in priority order
create or replace function set_wishlist(p_league int, p_team int, p_pin text, p_players int[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  d drafts;
  ids int[] := coalesce(p_players, '{}');
  bad text;
begin
  if not pin_ok(p_league, p_team, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN.');
  end if;
  d := league_draft(p_league);
  if d.id is null or d.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'The draft is not open.');
  end if;
  if cardinality(ids) > wish_max(p_league) then
    return jsonb_build_object('ok', false, 'error', format('Wishlist max is %s players.', wish_max(p_league)));
  end if;
  if array_position(ids, null) is not null or cardinality(ids) <> (select count(distinct x) from unnest(ids) x) then
    return jsonb_build_object('ok', false, 'error', 'Wishlist has duplicates.');
  end if;
  select coalesce(pl.last_name, x::text) into bad from unnest(ids) x left join players pl on pl.id = x
  where not exists (select 1 from draft_pool() dp where dp.player_id = x)
     or exists (select 1 from roster_weeks rw where rw.league_id = p_league and rw.week = roster_week(p_league) and rw.player_id = x)
  limit 1;
  if bad is not null then
    return jsonb_build_object('ok', false, 'error', bad || ' can''t be drafted.');
  end if;

  delete from draft_wishlists where draft_id = d.id and team_id = p_team;
  insert into draft_wishlists (draft_id, team_id, rank, player_id)
  select d.id, p_team, u.i, u.x from unnest(ids) with ordinality u(x, i);
  return jsonb_build_object('ok', true);
end;
$$;



-- ### ADMIN (service role only) ###

-- Fills open slots in the current week. Snake reverses even rounds. Each pick: the team's first wishlist player
-- still free with an open slot that fits, else the best default-ranked pool player that fits (unranked by name).
-- Slot: specific type first, then X, then S. Atomic; refuses unless open and the order matches the league's teams.
create or replace function run_draft(p_league int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d drafts;
  w date := current_week();
  last date;
  slots text[];
  seq int[];
  open_slots text[];
  t int;
  r int;
  c record;
  s text;
  n int := 0;
begin
  perform pg_advisory_xact_lock(31337, p_league);
  d := league_draft(p_league);
  if d.id is null then
    raise exception 'league % has no draft this season (draft-init)', p_league;
  end if;
  if d.status <> 'open' then
    raise exception 'draft already ran at %', d.ran_at;
  end if;
  if exists (select id from teams where league_id = p_league except select unnest(d.draft_order))
     or exists (select unnest(d.draft_order) except select id from teams where league_id = p_league) then
    raise exception 'draft order doesn''t match the league''s teams; re-run draft-init or draft-order';
  end if;
  select max(week) into last from roster_weeks where league_id = p_league;
  if last is not null and last <> w then
    raise exception 'rosters are at week %, not the current week %', last, w;
  end if;

  slots := league_slots(p_league);
  for r in 1 .. cardinality(slots) loop
    seq := case when d.type = 'snake' and r % 2 = 0
      then (select array_agg(x order by i desc) from unnest(d.draft_order) with ordinality u(x, i))
      else d.draft_order end;
    foreach t in array seq loop
      select array_agg(sl order by strpos('FDGXS', left(sl, 1)), sl) into open_slots
      from unnest(slots) sl
      where not exists (select 1 from roster_weeks rw where rw.league_id = p_league and rw.week = w and rw.team_id = t and rw.slot = sl);
      continue when open_slots is null;

      select x.player_id, x.wish_rank, x.position into c from (
        select wl.player_id, wl.rank as wish_rank, 0 as tier, wl.rank as ord, pl.position, pl.last_name, pl.first_name
        from draft_wishlists wl join players pl on pl.id = wl.player_id
        where wl.draft_id = d.id and wl.team_id = t
        union all
        select pl.id, null, 1, coalesce(pr.rank, 2147483647), pl.position, pl.last_name, pl.first_name
        from draft_pool() dp join players pl on pl.id = dp.player_id
        left join player_ranks pr on pr.season = d.season and pr.player_id = pl.id
      ) x
      where not exists (select 1 from roster_weeks rw where rw.league_id = p_league and rw.week = w and rw.player_id = x.player_id)
        and exists (select 1 from unnest(open_slots) sl where slot_fits(sl, x.position))
      order by x.tier, x.ord, x.last_name, x.first_name, x.player_id
      limit 1;
      if not found then
        raise notice 'team %: nobody left to fit %', t, open_slots;
        continue;
      end if;

      select sl into s from unnest(open_slots) sl where slot_fits(sl, c.position) limit 1;
      insert into roster_weeks (league_id, week, team_id, player_id, slot) values (p_league, w, t, c.player_id, s);
      n := n + 1;
      insert into draft_picks (draft_id, overall, round, team_id, player_id, wish_rank)
      values (d.id, n, r, t, c.player_id, c.wish_rank);
    end loop;
  end loop;

  update drafts set status = 'done', ran_at = now() where id = d.id;
  return jsonb_build_object('week', w, 'picks', n,
    'from_wishlist', (select count(*) from draft_picks where draft_id = d.id and wish_rank is not null));
end;
$$;

-- One extra trades + waivers pass on the current roster week after the draft, optional per league (time posted via drafts.midweek_at).
-- Waiver priority is reverse draft order (process_waivers). Runs once per draft.
create or replace function run_midweek(p_league int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d drafts;
  w date := roster_week(p_league);
  nt int;
  nw int;
begin
  perform pg_advisory_xact_lock(31337, p_league);
  d := league_draft(p_league);
  if d.id is null or d.status <> 'done' then
    raise exception 'league % has no completed draft this season', p_league;
  end if;
  if d.midweek_ran_at is not null then
    raise exception 'midweek already ran at %', d.midweek_ran_at;
  end if;
  if w is null then
    raise exception 'league % has no rosters', p_league;
  end if;
  nt := process_trades(p_league, w);
  nw := process_waivers(p_league, w);
  update drafts set midweek_ran_at = now() where id = d.id;
  return jsonb_build_object('week', w, 'trades', nt, 'waivers', nw);
end;
$$;
