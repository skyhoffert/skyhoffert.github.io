-- 1. Daily Wallets Table
create table if not exists public.wallets_daily_derby (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players_daily_derby(id) on delete cascade not null,
  wallet_date date not null default (now() at time zone 'utc' - interval '8 hours')::date,
  balance numeric(10, 2) not null default 30.00,
  unique(player_id, wallet_date)
);

-- Enable RLS
alter table public.wallets_daily_derby enable row level security;

drop policy if exists "Allow players to read own wallet" on public.wallets_daily_derby;
drop policy if exists "Allow players to insert/update own wallet" on public.wallets_daily_derby;

create policy "Allow players to read own wallet"
  on public.wallets_daily_derby for select using (true);

create policy "Allow players to insert/update own wallet"
  on public.wallets_daily_derby for all using (true);

-- 2. Database Function to fetch or initialize today's wallet ($30 limit)
create or replace function public.get_or_create_daily_wallet(p_player_id uuid)
returns numeric as $$
declare
  v_balance numeric;
  v_game_date date := (now() at time zone 'utc' - interval '8 hours')::date;
begin
  insert into public.wallets_daily_derby (player_id, wallet_date, balance)
  values (p_player_id, v_game_date, 30.00)
  on conflict (player_id, wallet_date) do nothing;

  select balance into v_balance
  from public.wallets_daily_derby
  where player_id = p_player_id and wallet_date = v_game_date;

  return v_balance;
end;
$$ language plpgsql security definer;