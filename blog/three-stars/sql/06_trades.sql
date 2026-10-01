-- ### HELPERS ###

-- Where every traded player lands for p_week, as [{player_id, team_id, slot}].
-- Incoming players fill the slots freed by outgoing ones (specific slot before X). With one X, greedy is exact.
-- Null if any player is no longer on the giving team or the slots don't work out.
create or replace function trade_plan(p_trade int, p_week date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  tr trades;
  give int;
  recv int;
  free text[];
  p record;
  s text;
  plan jsonb := '[]'::jsonb;
begin
  select * into tr from trades where id = p_trade;
  if not found or exists (
    select 1 from trade_players tp
    where tp.trade_id = p_trade
      and not exists (select 1 from roster_weeks rw
                      where rw.league_id = tr.league_id and rw.week = p_week
                        and rw.player_id = tp.player_id and rw.team_id = tp.from_team)
  ) then
    return null;
  end if;

  foreach give in array array[tr.from_team, tr.to_team] loop
    recv := case when give = tr.from_team then tr.to_team else tr.from_team end;
    select array_agg(rw.slot) into free
    from trade_players tp
    join roster_weeks rw on rw.league_id = tr.league_id and rw.week = p_week and rw.player_id = tp.player_id
    where tp.trade_id = p_trade and tp.from_team = recv;

    for p in
      select tp.player_id, pl.position from trade_players tp join players pl on pl.id = tp.player_id
      where tp.trade_id = p_trade and tp.from_team = give
    loop
      select f into s from unnest(free) f where slot_fits(f, p.position) order by f = 'X' limit 1;
      if s is null then
        return null;
      end if;
      free := array_remove(free, s);
      plan := plan || jsonb_build_object('player_id', p.player_id, 'team_id', recv, 'slot', s);
    end loop;
    if coalesce(cardinality(free), 0) > 0 then
      return null;
    end if;
  end loop;
  return plan;
end;
$$;

-- Owner's view of one trade: give = players p_team sends, get = players p_team receives
create or replace function trade_json(p_trade int, p_team int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', t.id,
    'status', t.status,
    'sent', t.from_team = p_team,
    'other', team_json(case when t.from_team = p_team then t.to_team else t.from_team end),
    'give', coalesce((select jsonb_agg(player_json(t.league_id, tp.from_team, tp.player_id) order by tp.player_id)
                      from trade_players tp where tp.trade_id = t.id and tp.from_team = p_team), '[]'::jsonb),
    'get', coalesce((select jsonb_agg(player_json(t.league_id, tp.from_team, tp.player_id) order by tp.player_id)
                     from trade_players tp where tp.trade_id = t.id and tp.from_team <> p_team), '[]'::jsonb)
  )
  from trades t where t.id = p_trade;
$$;

-- First trade-related reason these players can't be traded, or null
create or replace function trade_blocker(p_league int, p_players int[], p_ignore int)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select pl.last_name || ' is on Waiver Out. Remove it first.'
     from waiver_outs wo join players pl on pl.id = wo.player_id
     where wo.league_id = p_league and wo.player_id = any(p_players) limit 1),
    (select pl.last_name || ' is already in an accepted trade.'
     from trade_players tp join trades t on t.id = tp.trade_id join players pl on pl.id = tp.player_id
     where t.league_id = p_league and t.status = 'accepted' and t.id is distinct from p_ignore
       and tp.player_id = any(p_players) limit 1)
  );
$$;



-- ### PROCESSING (called by rollover) ###

-- Applies accepted trades in acceptance order, then clears every trade (pending ones expire). Returns trades applied.
create or replace function process_trades(p_league int, p_week date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  tr trades;
  plan jsonb;
  n int := 0;
begin
  for tr in
    select * from trades where league_id = p_league and status = 'accepted' order by accepted_at, id
  loop
    plan := trade_plan(tr.id, p_week);
    continue when plan is null;

    delete from roster_weeks
    where league_id = p_league and week = p_week
      and player_id in (select player_id from trade_players where trade_id = tr.id);
    insert into roster_weeks (league_id, week, team_id, player_id, slot)
    select p_league, p_week, (x->>'team_id')::int, (x->>'player_id')::int, x->>'slot'
    from jsonb_array_elements(plan) x;

    insert into moves (league_id, week, team_id, player_id, kind, source)
    select p_league, p_week, tp.from_team, tp.player_id, 'drop', 'trade' from trade_players tp where tp.trade_id = tr.id
    union all
    select p_league, p_week, case when tp.from_team = tr.from_team then tr.to_team else tr.from_team end,
           tp.player_id, 'add', 'trade'
    from trade_players tp where tp.trade_id = tr.id;
    n := n + 1;
  end loop;

  delete from trades where league_id = p_league;
  return n;
end;
$$;



-- ### OWNER ACTIONS (anon, PIN-gated) ###

create or replace function propose_trade(
  p_league int, p_team int, p_pin text, p_to_team int, p_give int[], p_get int[]
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_give int[] := (select array_agg(distinct x) from unnest(p_give) x);
  v_get int[] := (select array_agg(distinct x) from unnest(p_get) x);
  err text;
  tid int;
begin
  if not pin_ok(p_league, p_team, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN.');
  end if;
  if p_to_team = p_team or not exists (select 1 from teams where id = p_to_team and league_id = p_league) then
    return jsonb_build_object('ok', false, 'error', 'Pick another team in this league.');
  end if;
  if coalesce(cardinality(v_give), 0) = 0 or coalesce(cardinality(v_get), 0) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Pick at least one player from each side.');
  end if;
  if cardinality(v_give) <> cardinality(v_get) then
    return jsonb_build_object('ok', false, 'error', 'Both sides must trade the same number of players.');
  end if;

  perform pg_advisory_xact_lock(31337, p_league);
  err := trade_blocker(p_league, v_give || v_get, null);
  if err is not null then
    return jsonb_build_object('ok', false, 'error', err);
  end if;

  insert into trades (league_id, from_team, to_team) values (p_league, p_team, p_to_team) returning id into tid;
  insert into trade_players (trade_id, player_id, from_team)
  select tid, x, p_team from unnest(v_give) x
  union all
  select tid, x, p_to_team from unnest(v_get) x;

  if trade_plan(tid, roster_week(p_league)) is null then
    delete from trades where id = tid;
    return jsonb_build_object('ok', false, 'error', 'Players aren''t on those rosters, or their positions don''t fit the open slots.');
  end if;
  return jsonb_build_object('ok', true, 'id', tid);
end;
$$;

-- Receiver only. Accept is final and cancels other pending trades sharing any of these players.
create or replace function respond_trade(p_league int, p_team int, p_pin text, p_trade int, p_accept boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  pids int[];
  err text;
begin
  if not pin_ok(p_league, p_team, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN.');
  end if;
  perform pg_advisory_xact_lock(31337, p_league);
  if not exists (select 1 from trades
                 where id = p_trade and league_id = p_league and to_team = p_team and status = 'pending') then
    return jsonb_build_object('ok', false, 'error', 'Trade not found or no longer pending.');
  end if;

  if not p_accept then
    delete from trades where id = p_trade;
    return jsonb_build_object('ok', true);
  end if;

  select array_agg(player_id) into pids from trade_players where trade_id = p_trade;
  err := trade_blocker(p_league, pids, p_trade);
  if err is null and trade_plan(p_trade, roster_week(p_league)) is null then
    err := 'Rosters have changed; this trade no longer works.';
  end if;
  if err is not null then
    return jsonb_build_object('ok', false, 'error', err);
  end if;

  update trades set status = 'accepted', accepted_at = clock_timestamp() where id = p_trade;
  delete from trades t
  where t.league_id = p_league and t.status = 'pending' and t.id <> p_trade
    and exists (select 1 from trade_players tp where tp.trade_id = t.id and tp.player_id = any(pids));
  return jsonb_build_object('ok', true);
end;
$$;

-- Sender only, while pending
create or replace function cancel_trade(p_league int, p_team int, p_pin text, p_trade int)
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
  perform pg_advisory_xact_lock(31337, p_league);
  delete from trades
  where id = p_trade and league_id = p_league and from_team = p_team and status = 'pending';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Trade not found or already accepted.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
