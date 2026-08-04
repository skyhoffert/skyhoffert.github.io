create or replace function public.run_daily_race()
returns void as $$
declare
  -- Since the job runs at exactly 08:00 UTC, the "Game Date" just flipped.
  -- We subtract 1 day to settle yesterday's race.
  v_race_date date := ((now() at time zone 'utc') - interval '8 hours')::date - interval '1 day';
  
  v_winning_horse_id uuid;
begin
  -- Step A: Determine the winner based on odds (weighted random selection)
  -- Parses '3/1' format: part 1 is Numerator, part 2 is Denominator.
  select horse_id into v_winning_horse_id
  from public.daily_rosters_daily_derby
  where race_date = v_race_date
  order by -ln(random()) / (
    cast(split_part(morning_line_odds, '/', 2) as float) / 
    (cast(split_part(morning_line_odds, '/', 1) as float) + cast(split_part(morning_line_odds, '/', 2) as float))
  ) asc
  limit 1;

  -- Exit safely if no race was found for yesterday
  if v_winning_horse_id is null then
    return;
  end if;

  -- Step B: Save the result to the results table
  insert into public.daily_race_results_daily_derby (race_date, winning_horse_id)
  values (v_race_date, v_winning_horse_id)
  on conflict (race_date) do nothing;

  -- Step C: Settle all pending bets for the race date
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

-- 3. Schedule the job to run every day at exactly 08:00 UTC
select cron.schedule(
  'run-daily-derby-automated-race', 
  '0 8 * * *', 
  $$ select public.run_daily_race(); $$
);
