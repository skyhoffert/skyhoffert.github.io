-- Daily Race Results Table
create table if not exists public.daily_race_results_daily_derby (
  id uuid primary key default gen_random_uuid(),
  race_date date unique not null,
  winning_horse_id uuid references public.horses_daily_derby(id) not null,
  second_horse_id uuid references public.horses_daily_derby(id),
  third_horse_id uuid references public.horses_daily_derby(id),
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.daily_race_results_daily_derby enable row level security;
drop policy if exists "Allow read race results" on public.daily_race_results_daily_derby;
create policy "Allow read race results" on public.daily_race_results_daily_derby for select using (true);