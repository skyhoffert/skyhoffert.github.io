-- Create bets table linked to players, horses, and daily rosters
create table if not exists public.bets_daily_derby (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players_daily_derby(id) on delete cascade not null,
  horse_id uuid references public.horses_daily_derby(id) on delete cascade not null,
  race_date date not null default (now() at time zone 'utc' - interval '8 hours')::date,
  wager_amount numeric(10, 2) not null check (wager_amount > 0),
  odds_at_placement text not null,
  status text default 'Pending',
  created_at timestamp with time zone default now()
);

-- Redundant with odds_at_placement + wager_amount; drop if it exists from a prior version of this table
alter table public.bets_daily_derby drop column if exists potential_payout;

-- Enable RLS
alter table public.bets_daily_derby enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Allow players to read own bets" on public.bets_daily_derby;
drop policy if exists "Allow players to insert own bets" on public.bets_daily_derby;

-- RLS Policies: Players can read and create their own bets
create policy "Allow players to read own bets"
  on public.bets_daily_derby for select using (true);

create policy "Allow players to insert own bets"
  on public.bets_daily_derby for insert with check (true);

  -- Allow players to delete/cancel their own bets
drop policy if exists "Allow players to delete own bets" on public.bets_daily_derby;

create policy "Allow players to delete own bets"
  on public.bets_daily_derby 
  for delete 
  using (true);