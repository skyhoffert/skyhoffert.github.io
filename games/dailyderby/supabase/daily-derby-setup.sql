-- Enable pgcrypto for secure password hashing
create extension if not exists "pgcrypto";

-- 1. Create players table specific to Daily Derby
create table if not exists public.players_daily_derby (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.players_daily_derby enable row level security;

-- 2. Stored Procedure to register players
create or replace function register_player_daily_derby(p_username text, p_password text)
returns uuid as $$
declare
  new_id uuid;
begin
  insert into public.players_daily_derby (username, password_hash)
  values (p_username, crypt(p_password, gen_salt('bf')))
  on conflict (username) do nothing
  returning id into new_id;
  
  return new_id;
end;
$$ language plpgsql security definer;

-- 3. Stored Procedure to authenticate players
create or replace function authenticate_player_daily_derby(p_username text, p_password text)
returns table (player_id uuid, username text) as $$
begin
  return query
  select id, players_daily_derby.username
  from public.players_daily_derby
  where lower(players_daily_derby.username) = lower(p_username)
    and players_daily_derby.password_hash = crypt(p_password, players_daily_derby.password_hash);
end;
$$ language plpgsql security definer;


-- Remove existing policy if necessary.
drop policy if exists "Allow read access to player profiles"
  on public.players_daily_derby;

-- Allow read access to players_daily_derby. 
create policy "Allow read access to player profiles"
  on public.players_daily_derby
  for select
  using (true);

-- Create initial test accounts
select register_player_daily_derby('DerbyPro', 'DailyPass123!');
select register_player_daily_derby('TrackMaster', 'LuckyRace456!');
select register_player_daily_derby('Master Blaster 20', 'abc12three4');
