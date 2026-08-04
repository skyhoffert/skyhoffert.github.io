create or replace function public.generate_daily_roster()
returns void as $$
declare
  v_today date := ((now() at time zone 'utc') - interval '8 hours')::date;
  v_yesterday date := v_today - interval '1 day';
begin
  -- Ensure we don't accidentally generate a roster if one already exists for today
  if exists (select 1 from public.daily_rosters_daily_derby where race_date = v_today) then
    return;
  end if;

  -- Insert the new 10-horse lineup
  insert into public.daily_rosters_daily_derby (
    race_date, horse_id, morning_line_odds, post_position
  )
  with top_7 as (
    -- Get the top 7 horses from yesterday's race
    select horse_id, finish_position
    from public.daily_rosters_daily_derby
    where race_date = v_yesterday
    order by finish_position asc
    limit 7
  ),
  fresh_3 as (
    -- Get 3 random horses that did NOT run yesterday
    select id as horse_id, null::int as finish_position
    from public.horses_daily_derby
    where id not in (
      select horse_id from public.daily_rosters_daily_derby where race_date = v_yesterday
    )
    order by random()
    limit 3
  ),
  combined_roster as (
    select * from top_7
    union all
    select * from fresh_3
  ),
  shuffled_roster as (
    -- Shuffle them so the top 7 aren't always gates 1-7
    select *, row_number() over (order by random()) as gate_num
    from combined_roster
  )
  select 
    v_today,
    horse_id,
    -- Dynamic Odds Logic based on previous finish
    case 
      when finish_position = 1 then '2/1'   -- Heavy favorite
      when finish_position = 2 then '7/2'
      when finish_position = 3 then '5/1'
      when finish_position between 4 and 5 then '8/1'
      when finish_position between 6 and 7 then '12/1' -- Underdogs
      else '15/1' -- The 3 new entrants start as longshots
    end as morning_line_odds,
    gate_num as post_position
  from shuffled_roster;

end;
$$ language plpgsql security definer;