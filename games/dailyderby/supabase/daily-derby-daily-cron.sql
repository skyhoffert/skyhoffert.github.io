-- 2. Update the race runner function to remove the Step B insert
create or replace function public.run_daily_race()
returns void as $$
declare
  v_race_date date := ((now() at time zone 'utc') - interval '8 hours')::date - interval '1 day';
  v_winning_horse_id uuid;
begin
  -- Step A: Rank all horses based on odds probability (adjusted by today's condition) using the A-Res algorithm.
  -- condition_modifier nudges win weight but never touches the displayed morning_line_odds.
  with ranked_horses as (
    select id as roster_id, horse_id,
           row_number() over (
             order by -ln(random()) / (
               (
                 cast(split_part(morning_line_odds, '/', 2) as float) /
                 (cast(split_part(morning_line_odds, '/', 1) as float) + cast(split_part(morning_line_odds, '/', 2) as float))
               ) * (1 + coalesce(condition_modifier, 0) / 100.0)
             ) asc
           ) as position
    from public.daily_rosters_daily_derby
    where race_date = v_race_date
  )
  -- Save all 10 finishing positions to the roster table
  update public.daily_rosters_daily_derby r
  set finish_position = rh.position
  from ranked_horses rh
  where r.id = rh.roster_id;

  -- Step B: Extract the 1st place winner for bet settling
  select horse_id into v_winning_horse_id
  from public.daily_rosters_daily_derby
  where race_date = v_race_date and finish_position = 1;

  if v_winning_horse_id is null then return; end if;

  -- Step C: Settle pending bets
  update public.bets_daily_derby
  set status = case 
    when horse_id = v_winning_horse_id then 'Won'
    else 'Lost'
  end
  where race_date = v_race_date and status = 'Pending';

end;
$$ language plpgsql security definer;

-- 2. Ensure pg_cron is enabled
create extension if not exists pg_cron;

-- 1. Schedule the race runner (settles bets, logs winner, saves positions)
-- Runs at exactly 08:00 UTC every day
select cron.schedule(
  'run-daily-derby-race', 
  '0 8 * * *', 
  $$ select public.run_daily_race(); $$
);

-- 2. Schedule the new roster generator (selects top 7 + 3 fresh, sets new odds)
-- Runs at exactly 08:01 UTC every day
select cron.schedule(
  'generate-daily-derby-roster', 
  '1 8 * * *', 
  $$ select public.generate_daily_roster(); $$
);
