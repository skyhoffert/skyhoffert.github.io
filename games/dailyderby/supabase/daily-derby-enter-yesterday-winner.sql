-- Insert a test result for yesterday's date
insert into public.daily_race_results_daily_derby (race_date, winning_horse_id)
select 
  ((now() at time zone 'utc' - interval '8 hours')::date) - interval '1 day',
  id
from public.horses_daily_derby
where name = 'Thunder Strike'
on conflict (race_date) do update 
set winning_horse_id = excluded.winning_horse_id;