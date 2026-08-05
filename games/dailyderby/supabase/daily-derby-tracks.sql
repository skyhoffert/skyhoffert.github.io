-- 1. Track Catalog (Stores permanent identity and physical stats for each race venue)
create table if not exists public.tracks_daily_derby (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  length_miles numeric(3,2) check (length_miles between 0.5 and 1.5),
  width_feet int check (width_feet between 50 and 100),
  surface text check (surface in ('Dirt', 'Turf', 'Synthetic')),
  turn_radius text check (turn_radius in ('Tight', 'Medium', 'Wide')),
  direction text check (direction in ('Clockwise', 'Counterclockwise')),
  crowd_impact text check (crowd_impact in ('Low', 'Medium', 'High')),
  created_at timestamp with time zone default now()
);

-- Enable RLS & Read Policy
alter table public.tracks_daily_derby enable row level security;
drop policy if exists "Allow read tracks" on public.tracks_daily_derby;
create policy "Allow read tracks" on public.tracks_daily_derby for select using (true);

-- 2. Seed 10 Tracks
-- Using ON CONFLICT (name) DO NOTHING allows this script to be run multiple times safely.
insert into public.tracks_daily_derby (name, length_miles, width_feet, surface, turn_radius, direction, crowd_impact) values
  ('Canterlot Derby', 1.50, 100, 'Turf', 'Wide', 'Counterclockwise', 'High'),
  ('Cair Paravel Cup', 1.25, 90, 'Turf', 'Wide', 'Counterclockwise', 'High'),
  ('Edoras Stakes', 1.00, 78, 'Dirt', 'Medium', 'Clockwise', 'Medium'),
  ('The Ivory Gate Sprint', 0.75, 60, 'Synthetic', 'Tight', 'Clockwise', 'Medium'),
  ('Vaes Dothrak Sprint', 0.65, 55, 'Dirt', 'Tight', 'Counterclockwise', 'Low'),

  ('Emerald City Cup', 1.40, 96, 'Turf', 'Wide', 'Clockwise', 'High'),
  ('Corona Classic', 1.10, 82, 'Dirt', 'Medium', 'Counterclockwise', 'High'),
  ('Tashbaan Stakes', 1.05, 76, 'Dirt', 'Medium', 'Clockwise', 'Medium'),
  ('DunBroch Highland Sprint', 0.70, 58, 'Turf', 'Tight', 'Counterclockwise', 'Medium'),
  ('Far Far Away Sprint', 0.55, 52, 'Synthetic', 'Tight', 'Clockwise', 'Low')
on conflict (name) do nothing;

-- 3. Link each race day to the track it's run on
-- (all horses in a given day's daily_rosters_daily_derby row share the same track_id)
alter table public.daily_rosters_daily_derby add column if not exists track_id uuid references public.tracks_daily_derby(id);

-- Backfill any existing race days that predate this column, assigning one random track per race_date
update public.daily_rosters_daily_derby dr
set track_id = sub.track_id
from (
  select distinct race_date, (select id from public.tracks_daily_derby order by random() limit 1) as track_id
  from public.daily_rosters_daily_derby
  where track_id is null
) sub
where dr.race_date = sub.race_date and dr.track_id is null;
