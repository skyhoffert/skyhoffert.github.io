-- 1. Master Horse Catalog (Stores permanent identity and stats)
create table if not exists public.horses_daily_derby (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  breed text default 'Thoroughbred',
  base_speed int check (base_speed between 50 and 100),
  stamina int check (stamina between 50 and 100),
  grit int check (grit between 50 and 100),
  bio text,
  created_at timestamp with time zone default now()
);

-- Enable RLS & Read Policy
alter table public.horses_daily_derby enable row level security;
drop policy if exists "Allow read horses" on public.horses_daily_derby;
create policy "Allow read horses" on public.horses_daily_derby for select using (true);

-- 2. Daily Race Rosters (Links horses to specific daily race dates + daily status)
create table if not exists public.daily_rosters_daily_derby (
  id uuid primary key default gen_random_uuid(),
  race_date date not null default (now() at time zone 'utc' - interval '8 hours')::date,
  horse_id uuid references public.horses_daily_derby(id) on delete cascade,
  morning_line_odds text not null, -- e.g. "3/1", "12/1"
  condition_status text default 'Fresh', -- 'Fresh', 'Tired', 'Feisty', 'Slightly Injured'
  wildcard_trait text, -- e.g. "Mudder (+15% speed in rain)", "Sprinting Start"
  wildcard_stat_modifier int default 0,
  post_position int check (post_position between 1 and 12),
  unique(race_date, horse_id)
);

-- Enable RLS & Read Policy
alter table public.daily_rosters_daily_derby enable row level security;
drop policy if exists "Allow read rosters" on public.daily_rosters_daily_derby;
create policy "Allow read rosters" on public.daily_rosters_daily_derby for select using (true);

-- 3. Seed 20 Master Horses
-- Using ON CONFLICT (name) DO NOTHING allows this script to be run multiple times safely.
insert into public.horses_daily_derby (name, base_speed, stamina, grit, bio) values
  -- Original 10 Horses
  ('Thunder Strike', 88, 75, 90, 'Known for explosive late-stretch surges.'),
  ('Midnight Runner', 92, 60, 70, 'Pure sprinter. Fast early, tires on long tracks.'),
  ('Silver Bullet', 80, 85, 95, 'Incredible grit. Thrives when pressed side-by-side.'),
  ('Red Comet', 85, 80, 82, 'Consistent performer across all track conditions.'),
  ('Gilded Arrow', 90, 70, 75, 'High speed starter that prefers taking the early lead.'),
  ('Shadow Fax', 82, 92, 88, 'Endurance specialist. Takes control in the final quarter.'),
  ('Iron Giant', 78, 95, 90, 'Heavy build, virtually immune to fatigue.'),
  ('Solar Flare', 94, 55, 65, 'Blistering top speed, sensitive to track friction.'),
  ('Cobalt Cruiser', 84, 82, 80, 'Balanced contender with steady split times.'),
  ('Wild Card', 86, 78, 85, 'Unpredictable runner that responds to crowd noise.'),
  
  -- 10 New Addition Horses
  ('Crimson Tide', 89, 72, 85, 'A relentless powerhouse on muddy tracks.'),
  ('Desert Mirage', 95, 50, 60, 'Flashes of brilliance but fades in the final stretch.'),
  ('Electric Glide', 84, 88, 80, 'Smooth, efficient stride that conserves energy.'),
  ('Frostbite', 81, 94, 92, 'Cold under pressure, excels in tight packs.'),
  ('Galactic Star', 91, 65, 75, 'Cosmic acceleration out of the gate.'),
  ('Hurricane Warning', 87, 85, 80, 'A chaotic runner that disrupts the pack.'),
  ('Ironclad', 76, 98, 95, 'Practically a machine; ignores fatigue entirely.'),
  ('Lunar Eclipse', 83, 83, 83, 'Perfectly balanced attributes across the board.'),
  ('Mystic River', 88, 77, 86, 'Unpredictable pathing finds unexpected gaps.'),
  ('Neon Lights', 93, 58, 68, 'Flashy and fast, a crowd favorite on dry tracks.')
on conflict (name) do nothing;

-- 4. Seed Today's Daily Race Roster (Limits to 10 horses to respect post_position constraints)
insert into public.daily_rosters_daily_derby (race_date, horse_id, morning_line_odds, condition_status, wildcard_trait, wildcard_stat_modifier, post_position)
select 
  (now() at time zone 'utc' - interval '8 hours')::date, 
  id,
  case name
    when 'Midnight Runner' then '5/2'
    when 'Thunder Strike' then '3/1'
    when 'Solar Flare' then '4/1'
    when 'Shadow Fax' then '6/1'
    when 'Silver Bullet' then '8/1'
    when 'Red Comet' then '10/1'
    when 'Gilded Arrow' then '12/1'
    when 'Iron Giant' then '15/1'
    when 'Cobalt Cruiser' then '20/1'
    when 'Wild Card' then '25/1'
    else '12/1' -- Fallback odds for new horses
  end,
  case name
    when 'Midnight Runner' then 'Fresh'
    when 'Solar Flare' then 'Feisty (+5 Speed)'
    when 'Iron Giant' then 'Slightly Tired (-5 Stamina)'
    else 'Fresh' -- Fallback status
  end,
  case name
    when 'Thunder Strike' then '⚡ Thunder Sprint (Extra push in last 100m)'
    when 'Solar Flare' then '🔥 Sunburst (Random speed spikes)'
    when 'Shadow Fax' then '🛡️ Unshakable Focus (Ignores track bumps)'
    when 'Wild Card' then '🎲 Wild Momentum (+/- 10% random boost)'
    else 'Standard Pacing' -- Fallback trait
  end,
  0,
  row_number() over (order by id)
from public.horses_daily_derby
limit 10
on conflict do nothing;

-- Add last_raced_date column to the horses table if missing
alter table public.horses_daily_derby 
add column if not exists last_raced_date date;

-- Dynamically update last_raced_date based on actual historical roster data
UPDATE public.horses_daily_derby h
SET last_raced_date = (
  SELECT MAX(race_date)
  FROM public.daily_rosters_daily_derby r
  WHERE r.horse_id = h.id
    AND r.race_date < (now() at time zone 'utc' - interval '8 hours')::date
);