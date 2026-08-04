-- Reverts yesterday's race back to an unresolved/upcoming state, undoing whatever
-- run_daily_race() last did to it. Use this after manually testing the results page
-- so the race goes back to "not yet run" for the next test (or the real cron run).

-- 1. Clear finish positions for yesterday's roster
update public.daily_rosters_daily_derby
set finish_position = null
where race_date = ((now() at time zone 'utc' - interval '8 hours')::date - interval '1 day');

-- 2. Revert any bets that got settled back to Pending
update public.bets_daily_derby
set status = 'Pending'
where race_date = ((now() at time zone 'utc' - interval '8 hours')::date - interval '1 day')
  and status in ('Won', 'Lost');
