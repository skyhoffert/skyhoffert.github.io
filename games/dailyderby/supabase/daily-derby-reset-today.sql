-- 1. (Optional but recommended) Delete any test bets placed for today's Game Date
delete from public.bets_daily_derby 
where race_date = (now() at time zone 'utc' - interval '8 hours')::date;

-- 2. Delete the current placeholder roster for today
delete from public.daily_rosters_daily_derby 
where race_date = (now() at time zone 'utc' - interval '8 hours')::date;

-- 3. Manually trigger the generation function to build the new lineup
select public.generate_daily_roster();