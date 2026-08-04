-- Add finish_position to track 1st through 10th place
alter table public.daily_rosters_daily_derby 
add column if not exists finish_position int check (finish_position between 1 and 12);

-- Master Horse Catalog Seeding
insert into public.horses_daily_derby (name, base_speed, stamina, grit, bio) values
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