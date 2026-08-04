-- 1. Master Horse Catalog (Stores permanent identity and stats)
create table if not exists public.horses_daily_derby (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  breed text default 'Thoroughbred',
  base_speed int check (base_speed between 50 and 100),
  stamina int check (stamina between 50 and 100),
  grit int check (grit between 50 and 100),
  bio text,
  wildcard_trait text default 'Standard Pacing', -- permanent flavor attribute tied to the horse's name/personality, e.g. "Steady Pacer"
  wildcard_stat_modifier int default 0,
  created_at timestamp with time zone default now()
);

-- Adds the wildcard columns for tables created before this change
alter table public.horses_daily_derby add column if not exists wildcard_trait text default 'Standard Pacing';
alter table public.horses_daily_derby add column if not exists wildcard_stat_modifier int default 0;

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
  condition_status text default 'Fresh', -- daily flavor text, e.g. 'Fresh', 'Tired', 'Feisty'
  condition_modifier int default 0, -- hidden win-weight adjustment behind condition_status; never affects morning_line_odds
  post_position int check (post_position between 1 and 12),
  unique(race_date, horse_id)
);

-- Removes the wildcard columns for tables created before this change
-- (wildcard_trait/wildcard_stat_modifier now live permanently on horses_daily_derby)
alter table public.daily_rosters_daily_derby drop column if exists wildcard_trait;
alter table public.daily_rosters_daily_derby drop column if exists wildcard_stat_modifier;

-- Adds condition_modifier for tables created before this change
alter table public.daily_rosters_daily_derby add column if not exists condition_modifier int default 0;

-- Enable RLS & Read Policy
alter table public.daily_rosters_daily_derby enable row level security;
drop policy if exists "Allow read rosters" on public.daily_rosters_daily_derby;
create policy "Allow read rosters" on public.daily_rosters_daily_derby for select using (true);

-- Speeds up last-raced lookups (horse_id lookup ordered by most recent race_date)
create index if not exists idx_daily_rosters_horse_id_race_date
  on public.daily_rosters_daily_derby (horse_id, race_date desc);

-- Prevents two horses from ever being assigned the same gate on the same race day
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_daily_rosters_race_date_post_position'
  ) then
    alter table public.daily_rosters_daily_derby
      add constraint uq_daily_rosters_race_date_post_position unique (race_date, post_position);
  end if;
end $$;

-- 3. Seed 20 Master Horses
-- Using ON CONFLICT (name) DO NOTHING allows this script to be run multiple times safely.
insert into public.horses_daily_derby (name, base_speed, stamina, grit, bio, wildcard_trait) values
  -- Original 10 Horses
  ('Thunder Strike', 88, 75, 90, 'Known for explosive late-stretch surges.', '⚡ Thunder Sprint'),
  ('Midnight Runner', 92, 60, 70, 'Pure sprinter. Fast early, tires on long tracks.', '🌙 Midnight Dash'),
  ('Silver Bullet', 80, 85, 95, 'Incredible grit. Thrives when pressed side-by-side.', '🥈 Bullet Focus'),
  ('Red Comet', 85, 80, 82, 'Consistent performer across all track conditions.', '☄️ Steady Comet'),
  ('Gilded Arrow', 90, 70, 75, 'High speed starter that prefers taking the early lead.', '🏹 Golden Start'),
  ('Shadow Fax', 82, 92, 88, 'Endurance specialist. Takes control in the final quarter.', '🛡️ Unshakable Focus'),
  ('Iron Giant', 78, 95, 90, 'Heavy build, virtually immune to fatigue.', '🦾 Iron Resolve'),
  ('Solar Flare', 94, 55, 65, 'Blistering top speed, sensitive to track friction.', '🔥 Sunburst'),
  ('Cobalt Cruiser', 84, 82, 80, 'Balanced contender with steady split times.', '🔷 Cobalt Cruise'),
  ('Wild Card', 86, 78, 85, 'Unpredictable runner that responds to crowd noise.', '🎲 Wild Momentum'),

  -- 10 New Addition Horses
  ('Crimson Tide', 89, 72, 85, 'A relentless powerhouse on muddy tracks.', '🌊 Crimson Surge'),
  ('Desert Mirage', 95, 50, 60, 'Flashes of brilliance but fades in the final stretch.', '🏜️ Mirage Flicker'),
  ('Electric Glide', 84, 88, 80, 'Smooth, efficient stride that conserves energy.', '⚡ Electric Glide'),
  ('Frostbite', 81, 94, 92, 'Cold under pressure, excels in tight packs.', '❄️ Frosty Nerve'),
  ('Galactic Star', 91, 65, 75, 'Cosmic acceleration out of the gate.', '🌟 Galactic Launch'),
  ('Hurricane Warning', 87, 85, 80, 'A chaotic runner that disrupts the pack.', '🌪️ Hurricane Chaos'),
  ('Ironclad', 76, 98, 95, 'Practically a machine; ignores fatigue entirely.', '⚙️ Ironclad Resolve'),
  ('Lunar Eclipse', 83, 83, 83, 'Perfectly balanced attributes across the board.', '🌗 Perfect Balance'),
  ('Mystic River', 88, 77, 86, 'Unpredictable pathing finds unexpected gaps.', '🌀 Mystic Flow'),
  ('Neon Lights', 93, 58, 68, 'Flashy and fast, a crowd favorite on dry tracks.', '💡 Neon Flash')
on conflict (name) do nothing;

-- Backfill wildcard traits for horses inserted before this column existed
-- (the ON CONFLICT above won't touch rows that already exist)
update public.horses_daily_derby set wildcard_trait = '⚡ Thunder Sprint' where name = 'Thunder Strike' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🌙 Midnight Dash' where name = 'Midnight Runner' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🥈 Bullet Focus' where name = 'Silver Bullet' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '☄️ Steady Comet' where name = 'Red Comet' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🏹 Golden Start' where name = 'Gilded Arrow' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🛡️ Unshakable Focus' where name = 'Shadow Fax' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🦾 Iron Resolve' where name = 'Iron Giant' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🔥 Sunburst' where name = 'Solar Flare' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🔷 Cobalt Cruise' where name = 'Cobalt Cruiser' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🎲 Wild Momentum' where name = 'Wild Card' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🌊 Crimson Surge' where name = 'Crimson Tide' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🏜️ Mirage Flicker' where name = 'Desert Mirage' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '⚡ Electric Glide' where name = 'Electric Glide' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '❄️ Frosty Nerve' where name = 'Frostbite' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🌟 Galactic Launch' where name = 'Galactic Star' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🌪️ Hurricane Chaos' where name = 'Hurricane Warning' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '⚙️ Ironclad Resolve' where name = 'Ironclad' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🌗 Perfect Balance' where name = 'Lunar Eclipse' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '🌀 Mystic Flow' where name = 'Mystic River' and wildcard_trait = 'Standard Pacing';
update public.horses_daily_derby set wildcard_trait = '💡 Neon Flash' where name = 'Neon Lights' and wildcard_trait = 'Standard Pacing';

-- 4. Seed Today's Daily Race Roster (Limits to 10 horses to respect post_position constraints)
insert into public.daily_rosters_daily_derby (race_date, horse_id, morning_line_odds, condition_status, condition_modifier, post_position)
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
  -- Condition is a random 1/3 negative / 1/3 fresh / 1/3 positive roll, independent of odds
  case condition_bucket
    when 0 then (array['Tired', 'Sore', 'Distracted', 'Off Their Feed'])[floor(random() * 4 + 1)]
    when 2 then (array['Feisty', 'Fired Up', 'In The Zone', 'Raring to Go'])[floor(random() * 4 + 1)]
    else 'Fresh'
  end,
  case condition_bucket
    when 0 then -5
    when 2 then 5
    else 0
  end,
  row_number() over (order by id)
from (
  select *, floor(random() * 3)::int as condition_bucket
  from public.horses_daily_derby
) sub
limit 10
on conflict do nothing;