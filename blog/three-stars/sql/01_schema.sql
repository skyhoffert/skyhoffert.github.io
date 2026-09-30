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
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

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



-- ### ROSTERS ###

-- Slots: F1 F2 (forwards), D1 D2, G, X (flex: forward or defense)
create table if not exists roster_weeks (
  league_id int not null references leagues(id) on delete cascade,
  week date not null check (extract(isodow from week) = 1),
  team_id int not null references teams(id) on delete cascade,
  player_id int not null references players(id),
  slot text not null check (slot in ('F1', 'F2', 'D1', 'D2', 'G', 'X')),
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
  if not (
    (new.slot in ('F1', 'F2') and pos in ('C', 'L', 'R')) or
    (new.slot in ('D1', 'D2') and pos = 'D') or
    (new.slot = 'G' and pos = 'G') or
    (new.slot = 'X' and pos in ('C', 'L', 'R', 'D'))
  ) then
    raise exception 'player % (position %) not allowed in slot %', new.player_id, pos, new.slot;
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
  slot text check (slot in ('F1', 'F2', 'D1', 'D2', 'G', 'X')),
  note text,
  status text not null default 'pending' check (status in ('pending', 'applied', 'failed', 'cancelled')),
  error text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  check (type = 'drop' or (team_id is not null and slot is not null))
);

-- ### WAIVERS & MOVES ###

-- Priority within a team's list = created_at order
create table if not exists waiver_outs (
  league_id int not null references leagues(id) on delete cascade,
  team_id int not null references teams(id) on delete cascade,
  player_id int not null references players(id),
  created_at timestamptz not null default clock_timestamp(),
  primary key (league_id, team_id, player_id)
);

create table if not exists waiver_ins (
  league_id int not null references leagues(id) on delete cascade,
  team_id int not null references teams(id) on delete cascade,
  player_id int not null references players(id),
  created_at timestamptz not null default clock_timestamp(),
  primary key (league_id, team_id, player_id)
);

-- Public log of roster changes applied at rollover; week = the week they took effect
create table if not exists moves (
  id serial primary key,
  league_id int not null references leagues(id) on delete cascade,
  week date not null,
  team_id int not null references teams(id) on delete cascade,
  player_id int not null references players(id),
  kind text not null check (kind in ('add', 'drop')),
  source text not null check (source in ('waiver', 'admin')),
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists moves_league_week on moves(league_id, week);



-- ### NICKNAMES ###

create table if not exists nicknames (
  league_id int not null references leagues(id) on delete cascade,
  team_id int not null references teams(id) on delete cascade,
  player_id int not null references players(id),
  nickname text not null constraint nickname_len check (char_length(nickname) between 1 and 20),
  primary key (league_id, team_id, player_id)
);
