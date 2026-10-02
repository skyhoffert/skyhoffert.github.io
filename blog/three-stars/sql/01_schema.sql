-- ### HELPERS ###

create extension if not exists pgcrypto with schema extensions;

-- Monday of the week containing d
create or replace function week_of(d date)
returns date
language sql
immutable
as $$
  select d - (extract(isodow from d)::int - 1);
$$;

create or replace function current_week()
returns date
language sql
stable
as $$
  select week_of((now() at time zone 'America/New_York')::date);
$$;



-- ### LEAGUES & TEAMS ###

create table if not exists leagues (
  id int primary key,
  name text not null,
  season int not null,
  first_scoring_week date not null check (extract(isodow from first_scoring_week) = 1),
  hidden boolean not null default true,
  pass_hash text,
  created_at timestamptz not null default now()
);

-- Roster config: slot counts per type (F, D, G, X = flex F/D, S = superflex any) and team cap
alter table leagues add column if not exists n_f smallint not null default 2 check (n_f between 0 and 9);
alter table leagues add column if not exists n_d smallint not null default 2 check (n_d between 0 and 9);
alter table leagues add column if not exists n_g smallint not null default 1 check (n_g between 0 and 9);
alter table leagues add column if not exists n_x smallint not null default 1 check (n_x between 0 and 9);
alter table leagues add column if not exists n_s smallint not null default 0 check (n_s between 0 and 9);
alter table leagues add column if not exists max_teams smallint not null default 10 check (max_teams between 1 and 16);

create table if not exists teams (
  id serial primary key,
  league_id int not null references leagues(id) on delete cascade,
  name text not null,
  owner text not null,
  color text not null default '#888888' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon_path text,
  pin_hash text,
  created_at timestamptz not null default now()
);

-- Three Stars Supporter for this leagues.season: set by any single Stripe purchase of 40+ Dekes (add_dekes, 08)
-- or admin.py supporter. Only shown while it matches the league's season.
alter table teams add column if not exists supporter_season int;

-- Replaced lifetime supporter boolean: carry any to the current season, then drop it
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'teams' and column_name = 'supporter') then
    execute 'update teams t set supporter_season = l.season from leagues l where l.id = t.league_id and t.supporter';
    alter table teams drop column supporter;
  end if;
end;
$$;

create or replace function team_cap_check()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from teams where league_id = new.league_id)
     >= (select max_teams from leagues where id = new.league_id) then
    raise exception 'league % is full', new.league_id;
  end if;
  return new;
end;
$$;

drop trigger if exists team_cap_check on teams;
create trigger team_cap_check
  before insert on teams
  for each row execute function team_cap_check();



-- ### SLOTS ###

-- Slot = type letter + number, e.g. F1, X2, S1. Order: F, D, G, X, S.
create or replace function slot_list(f int, d int, g int, x int, s int)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(v.t || n order by v.o, n), '{}')
  from (values ('F', 1, f), ('D', 2, d), ('G', 3, g), ('X', 4, x), ('S', 5, s)) v(t, o, c),
    generate_series(1, v.c) n;
$$;

create or replace function league_slots(p_league int)
returns text[]
language sql
stable
as $$
  select slot_list(n_f, n_d, n_g, n_x, n_s) from leagues where id = p_league;
$$;

create or replace function slot_fits(p_slot text, p_pos text)
returns boolean
language sql
immutable
as $$
  select case left(p_slot, 1)
    when 'F' then p_pos in ('C', 'L', 'R')
    when 'D' then p_pos = 'D'
    when 'G' then p_pos = 'G'
    when 'X' then p_pos in ('C', 'L', 'R', 'D')
    when 'S' then p_pos in ('C', 'L', 'R', 'D', 'G')
    else false
  end;
$$;



-- ### NHL DATA ###

create table if not exists players (
  id int primary key,
  first_name text,
  last_name text not null,
  position text not null check (position in ('C', 'L', 'R', 'D', 'G')),
  nhl_team text,
  headshot text,
  updated_at timestamptz not null default now()
);

create table if not exists games (
  id int primary key,
  game_date date not null,
  season int not null,
  game_type int not null,
  away text not null,
  home text not null,
  away_score int,
  home_score int,
  state text not null,
  ingested_at timestamptz not null default now()
);
create index if not exists games_date on games(game_date);

create table if not exists game_stars (
  game_id int not null references games(id) on delete cascade,
  star smallint not null check (star between 1 and 3),
  player_id int not null references players(id),
  primary key (game_id, star)
);

create table if not exists player_game_stats (
  game_id int not null references games(id) on delete cascade,
  player_id int not null references players(id),
  goals int not null default 0,
  assists int not null default 0,
  plus_minus int,
  is_goalie boolean not null default false,
  primary key (game_id, player_id)
);
create index if not exists player_game_stats_player on player_game_stats(player_id);
alter table player_game_stats add column if not exists saves int;



-- ### ROSTERS ###

-- Slots: see league_slots
create table if not exists roster_weeks (
  league_id int not null references leagues(id) on delete cascade,
  week date not null check (extract(isodow from week) = 1),
  team_id int not null references teams(id) on delete cascade,
  player_id int not null references players(id),
  slot text not null,
  primary key (league_id, week, player_id),
  unique (league_id, week, team_id, slot)
);

create or replace function roster_slot_check()
returns trigger
language plpgsql
as $$
declare
  pos text;
begin
  select position into pos from players where id = new.player_id;
  if not slot_fits(new.slot, pos) then
    raise exception 'player % (position %) not allowed in slot %', new.player_id, pos, new.slot;
  end if;
  if not new.slot = any(league_slots(new.league_id)) then
    raise exception 'league % has no slot %', new.league_id, new.slot;
  end if;
  if not exists (select 1 from teams where id = new.team_id and league_id = new.league_id) then
    raise exception 'team % not in league %', new.team_id, new.league_id;
  end if;
  return new;
end;
$$;

drop trigger if exists roster_slot_check on roster_weeks;
create trigger roster_slot_check
  before insert or update on roster_weeks
  for each row execute function roster_slot_check();

-- type 'set': put player in team's slot (removes player from any other team, displaces slot occupant)
-- type 'drop': remove player from whatever team has him
create table if not exists pending_transactions (
  id serial primary key,
  league_id int not null references leagues(id) on delete cascade,
  target_week date not null check (extract(isodow from target_week) = 1),
  type text not null check (type in ('set', 'drop')),
  team_id int references teams(id) on delete cascade,
  player_id int not null references players(id),
  slot text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'applied', 'failed', 'cancelled')),
  error text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  check (type = 'drop' or (team_id is not null and slot is not null))
);

-- Old fixed slots G and X became G1 and X1
alter table roster_weeks drop constraint if exists roster_weeks_slot_check;
alter table pending_transactions drop constraint if exists pending_transactions_slot_check;
update roster_weeks set slot = slot || '1' where slot in ('G', 'X');
update pending_transactions set slot = slot || '1' where slot in ('G', 'X');
alter table roster_weeks add constraint roster_weeks_slot_check check (slot ~ '^[FDGXS][1-9]$');
alter table pending_transactions add constraint pending_transactions_slot_check check (slot ~ '^[FDGXS][1-9]$');

-- Config changes can't strand players in removed slots (latest week, pending txns) or exceed the team cap
create or replace function league_config_check()
returns trigger
language plpgsql
as $$
declare
  slots text[] := slot_list(new.n_f, new.n_d, new.n_g, new.n_x, new.n_s);
  bad text;
begin
  if (select count(*) from teams where league_id = new.id) > new.max_teams then
    raise exception 'league % already has more than % teams', new.id, new.max_teams;
  end if;
  select rw.slot into bad from roster_weeks rw
  where rw.league_id = new.id and not rw.slot = any(slots)
    and rw.week = (select max(week) from roster_weeks where league_id = new.id)
  limit 1;
  if bad is null then
    select slot into bad from pending_transactions
    where league_id = new.id and status = 'pending' and slot is not null and not slot = any(slots)
    limit 1;
  end if;
  if bad is not null then
    raise exception 'slot % is in use; move or drop that player first', bad;
  end if;
  return new;
end;
$$;

drop trigger if exists league_config_check on leagues;
create trigger league_config_check
  before update of n_f, n_d, n_g, n_x, n_s, max_teams on leagues
  for each row execute function league_config_check();

-- ### WAIVERS & MOVES ###

-- Claim = add player_id, drop drop_player_id. Priority within a team = created_at order.
create table if not exists waiver_ins (
  league_id int not null references leagues(id) on delete cascade,
  team_id int not null references teams(id) on delete cascade,
  player_id int not null references players(id),
  drop_player_id int not null references players(id),
  created_at timestamptz not null default clock_timestamp(),
  primary key (league_id, team_id, player_id)
);

-- Unpaired claims from the old Waiver In / Waiver Out lists can't be kept
alter table waiver_ins add column if not exists drop_player_id int references players(id);
delete from waiver_ins where drop_player_id is null;
alter table waiver_ins alter column drop_player_id set not null;
drop table if exists waiver_outs;

-- Public log of roster changes applied at rollover; week = the week they took effect
create table if not exists moves (
  id serial primary key,
  league_id int not null references leagues(id) on delete cascade,
  week date not null,
  team_id int not null references teams(id) on delete cascade,
  player_id int not null references players(id),
  kind text not null check (kind in ('add', 'drop')),
  source text not null,
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists moves_league_week on moves(league_id, week);
alter table moves drop constraint if exists moves_source_check;
alter table moves add constraint moves_source_check check (source in ('waiver', 'admin', 'trade'));



-- ### TRADES ###

-- Owner-to-owner. Pending until the receiver accepts (final) or the sender cancels.
-- Accepted trades apply at rollover before waivers; all rows are cleared every rollover.
create table if not exists trades (
  id serial primary key,
  league_id int not null references leagues(id) on delete cascade,
  from_team int not null references teams(id) on delete cascade,
  to_team int not null references teams(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default clock_timestamp(),
  accepted_at timestamptz,
  check (from_team <> to_team)
);

-- from_team = the team giving the player up
create table if not exists trade_players (
  trade_id int not null references trades(id) on delete cascade,
  player_id int not null references players(id),
  from_team int not null references teams(id) on delete cascade,
  primary key (trade_id, player_id)
);
create index if not exists trade_players_player on trade_players(player_id);



-- ### DRAFT ###

-- Default draft ranking per season (e.g. NHL.com top 200). Lower = better.
create table if not exists player_ranks (
  season int not null,
  player_id int not null references players(id),
  rank int not null,
  source text,
  primary key (season, player_id)
);

-- One per league season. Open: wishlists editable, order adjustable. Done: picks written.
create table if not exists drafts (
  id serial primary key,
  league_id int not null references leagues(id) on delete cascade,
  season int not null,
  type text not null default 'snake' check (type in ('snake', 'linear')),
  draft_order int[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  ran_at timestamptz,
  midweek_ran_at timestamptz,
  unique (league_id, season)
);

-- When the admin plans to run it (shown as a countdown; the draft still runs by hand)
alter table drafts add column if not exists scheduled_at timestamptz;
-- When the admin plans the post-draft midweek run (shown on hints/banner until it runs; still run by hand)
alter table drafts add column if not exists midweek_at timestamptz;

create table if not exists draft_wishlists (
  draft_id int not null references drafts(id) on delete cascade,
  team_id int not null references teams(id) on delete cascade,
  rank int not null,
  player_id int not null references players(id),
  primary key (draft_id, team_id, rank),
  unique (draft_id, team_id, player_id)
);

-- wish_rank: wishlist position the pick came from; null = auto (default ranking)
create table if not exists draft_picks (
  draft_id int not null references drafts(id) on delete cascade,
  overall int not null,
  round int not null,
  team_id int not null references teams(id) on delete cascade,
  player_id int not null references players(id),
  wish_rank int,
  primary key (draft_id, overall)
);



-- ### NICKNAMES ###

create table if not exists nicknames (
  league_id int not null references leagues(id) on delete cascade,
  team_id int not null references teams(id) on delete cascade,
  player_id int not null references players(id),
  nickname text not null constraint nickname_len check (char_length(nickname) between 1 and 20),
  primary key (league_id, team_id, player_id)
);
