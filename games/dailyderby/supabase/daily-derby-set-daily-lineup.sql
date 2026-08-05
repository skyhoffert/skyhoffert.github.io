create or replace function public.generate_daily_roster()
returns void as $$
declare
  v_today date := ((now() at time zone 'utc') - interval '8 hours')::date;
  v_yesterday date := v_today - interval '1 day';
  v_track_id uuid;
begin
  -- Ensure we don't accidentally generate a roster if one already exists for today
  if exists (select 1 from public.daily_rosters_daily_derby where race_date = v_today) then
    return;
  end if;

  -- Pick today's track at random; every horse in today's roster shares this track
  select id into v_track_id from public.tracks_daily_derby order by random() limit 1;

  -- Insert the new 10-horse lineup
  insert into public.daily_rosters_daily_derby (
    race_date, horse_id, morning_line_odds, condition_status, condition_modifier, post_position, track_id
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
    select *, row_number() over (order by random()) as gate_num,
           floor(random() * 3)::int as condition_bucket -- 0 = negative, 1 = fresh, 2 = positive
    from combined_roster
  )
  select
    v_today,
    horse_id,
    -- Dynamic Odds Logic based on previous finish (condition is never factored in here)
    case
      when finish_position = 1 then '2/1'   -- Heavy favorite
      when finish_position = 2 then '7/2'
      when finish_position = 3 then '5/1'
      when finish_position between 4 and 5 then '8/1'
      when finish_position between 6 and 7 then '12/1' -- Underdogs
      else '15/1' -- The 3 new entrants start as longshots
    end as morning_line_odds,
    -- Condition is a random 1/3 negative / 1/3 fresh / 1/3 positive roll, independent of odds
    case condition_bucket
      when 0 then (array['Tired', 'Sore', 'Distracted', 'Off Their Feed'])[floor(random() * 4 + 1)]
      when 2 then (array['Feisty', 'Fired Up', 'In The Zone', 'Raring to Go'])[floor(random() * 4 + 1)]
      else 'Fresh'
    end as condition_status,
    case condition_bucket
      when 0 then -5
      when 2 then 5
      else 0
    end as condition_modifier,
    gate_num as post_position,
    v_track_id
  from shuffled_roster;

end;
$$ language plpgsql security definer;