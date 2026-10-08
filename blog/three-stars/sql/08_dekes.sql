-- Dekes: cosmetic currency. Bought via Stripe (edge function -> add_dekes) or granted by admin.
-- Spent 1 each on team name / color / icon / new player nickname (charged in update_roster_player, 04), and on packs.
-- Run after 07, then re-run 04 (get_my_team), 09 and 05.

alter table teams add column if not exists dekes int not null default 0;
alter table teams drop constraint if exists teams_dekes_nonneg;
alter table teams add constraint teams_dekes_nonneg check (dekes >= 0);

-- Every change to a balance. ref = Stripe checkout session id, unique so webhook retries can't double-credit.
create table if not exists deke_ledger (
  id serial primary key,
  team_id int not null references teams(id) on delete cascade,
  delta int not null,
  reason text not null,
  ref text unique,
  detail text,
  created_at timestamptz not null default now()
);

-- Separate from the table so re-running this file updates the list
alter table deke_ledger drop constraint if exists deke_ledger_reason_check;
alter table deke_ledger add constraint deke_ledger_reason_check
  check (reason in ('stripe', 'grant', 'starter', 'name', 'color', 'icon', 'nickname', 'pass', 'season_pass', 'emoji', 'pack'));

-- Paid Stripe checkouts the webhook couldn't tie to a team (no/unknown client_reference_id).
-- Resolved by hand: admin.py unmatched / claim.
create table if not exists unmatched_payments (
  session_id text primary key,
  dekes int not null,
  amount text,
  email text,
  note text,
  created_at timestamptz not null default now(),
  claimed_team int references teams(id) on delete set null,
  claimed_at timestamptz
);

-- Bought once, yours for good. Contents in all_packs().
create table if not exists team_packs (
  team_id int not null references teams(id) on delete cascade,
  pack text not null,
  created_at timestamptz not null default now(),
  primary key (team_id, pack)
);

create table if not exists icon_suggestions (
  id serial primary key,
  team_id int not null references teams(id) on delete cascade,
  suggestion text not null check (char_length(suggestion) between 1 and 200),
  created_at timestamptz not null default now()
);



-- ### CREDITS (service role only: edge function + admin.py) ###

-- Returns the new balance, or null if p_ref was already applied.
-- A single Stripe purchase of 20+ (the supporter bundle) also makes the team a Three Stars Supporter for its league's season.
create or replace function add_dekes(p_team int, p_delta int, p_reason text, p_ref text default null, p_detail text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  bal int;
begin
  insert into deke_ledger (team_id, delta, reason, ref, detail)
  values (p_team, p_delta, p_reason, p_ref, p_detail)
  on conflict (ref) do nothing;
  if not found then
    return null;
  end if;
  update teams t set dekes = t.dekes + p_delta,
    supporter_season = case when p_reason = 'stripe' and p_delta >= 20
      then (select season from leagues where id = t.league_id) else t.supporter_season end
  where t.id = p_team returning t.dekes into bal;
  if bal is null then
    raise exception 'No team %', p_team;
  end if;
  return bal;
end;
$$;

-- New teams start with 10 Dekes; via the ledger (not the column default) so balances stay auditable
create or replace function grant_starter_dekes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform add_dekes(new.id, 10, 'starter');
  return null;
end;
$$;

drop trigger if exists teams_starter_dekes on teams;
create trigger teams_starter_dekes after insert on teams
  for each row execute function grant_starter_dekes();



-- ### PACKS ###

-- Keep in sync w/ PACKS (+ pack on EMOJIS / ICONS) in js/config.js. items: emoji ids (kind emoji) or team icon paths (kind icon).
create or replace function all_packs()
returns table (id text, kind text, price int, items text[])
language sql
immutable
as $$
  values
    ('classics', 'emoji', 5, array['hat', 'brain', 'lamp', 'star1', 'star2', 'star3', 'poop']),
    ('faces', 'emoji', 10, array['O_O', 'sidemouth']),
    ('hockey', 'icon', 5, array['img/teams/puck.svg', 'img/teams/crossed-sticks.svg', 'img/teams/skate.svg',
      'img/teams/helmet.svg', 'img/teams/goalie-mask.svg', 'img/teams/jersey.svg', 'img/teams/whistle.svg',
      'img/teams/goal-light.svg', 'img/teams/tooth.svg']);
$$;

create or replace function team_pack_ids(p_team int)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(pack order by created_at), '{}') from team_packs where team_id = p_team;
$$;

-- Free unless it's in an icon pack the team doesn't own
create or replace function icon_unlocked(p_team int, p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from all_packs() p
                     where p.kind = 'icon' and p_path = any(p.items) and p.id <> all(team_pack_ids(p_team)));
$$;



-- ### OWNER ACTIONS (anon, PIN-gated) ###

-- p_field: 'name' | 'color' | 'icon' (1 Deke; icon '' = none, free). Unchanged values are rejected, not charged.
create or replace function customize_team(p_league int, p_team int, p_pin text, p_field text, p_value text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  t teams;
  v text := nullif(trim(coalesce(p_value, '')), '');
  old text;
  cost int := case when p_field = 'icon' and v is null then 0 else 1 end;
begin
  if not pin_ok(p_league, p_team, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN.');
  end if;
  select * into t from teams where id = p_team for update;
  if t.dekes < cost then
    return jsonb_build_object('ok', false, 'error',
      format('You need %s Deke%s for this. Grab a bundle on your team page.', cost, case when cost = 1 then '' else 's' end));
  end if;

  if p_field = 'name' then
    if v is null or char_length(v) not between 2 and 24 then
      return jsonb_build_object('ok', false, 'error', 'Team name must be 2-24 characters.');
    end if;
    if exists (select 1 from teams where league_id = p_league and id <> p_team and lower(name) = lower(v)) then
      return jsonb_build_object('ok', false, 'error', 'Another team in the league already has that name.');
    end if;
    old := t.name;
  elsif p_field = 'color' then
    if v is null or v !~ '^#[0-9A-Fa-f]{6}$' then
      return jsonb_build_object('ok', false, 'error', 'Pick a color.');
    end if;
    v := lower(v);
    old := lower(t.color);
  elsif p_field = 'icon' then
    if v is not null and v !~ '^img/teams/[a-z0-9_-]+\.(svg|png)$' then
      return jsonb_build_object('ok', false, 'error', 'Pick one of the listed icons.');
    end if;
    if v is not null and not icon_unlocked(p_team, v) then
      return jsonb_build_object('ok', false, 'error', 'Unlock that icon''s pack first.');
    end if;
    old := t.icon_path;
  else
    return jsonb_build_object('ok', false, 'error', 'Unknown change.');
  end if;

  if v is not distinct from old then
    return jsonb_build_object('ok', false, 'error', 'That''s already your current one, no Deke spent.');
  end if;

  update teams set
    name = case when p_field = 'name' then v else name end,
    color = case when p_field = 'color' then v else color end,
    icon_path = case when p_field = 'icon' then v else icon_path end
  where id = p_team;
  perform add_dekes(p_team, -cost, p_field, null, coalesce(old, '(none)') || ' -> ' || coalesce(v, '(none)'));

  return jsonb_build_object('ok', true, 'team', team_json(p_team), 'dekes', t.dekes - cost);
end;
$$;

create or replace function buy_pack(p_league int, p_team int, p_pin text, p_pack text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  p record;
  bal int;
begin
  if not pin_ok(p_league, p_team, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN.');
  end if;
  select * into p from all_packs() a where a.id = p_pack;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Unknown pack.');
  end if;
  select dekes into bal from teams where id = p_team for update;
  if p_pack = any(team_pack_ids(p_team)) then
    return jsonb_build_object('ok', false, 'error', 'You already have that pack.');
  end if;
  if bal < p.price then
    return jsonb_build_object('ok', false, 'error', format('You need %s Dekes for this. Grab a bundle on your team page.', p.price));
  end if;
  insert into team_packs (team_id, pack) values (p_team, p_pack);
  perform add_dekes(p_team, -p.price, 'pack', null, p_pack);
  return jsonb_build_object('ok', true, 'dekes', bal - p.price);
end;
$$;

-- Free; owners pitch new preset icons
create or replace function suggest_icon(p_league int, p_team int, p_pin text, p_text text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v text := trim(coalesce(p_text, ''));
begin
  if not pin_ok(p_league, p_team, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN.');
  end if;
  if char_length(v) not between 1 and 200 then
    return jsonb_build_object('ok', false, 'error', 'Suggestion must be 1-200 characters.');
  end if;
  insert into icon_suggestions (team_id, suggestion) values (p_team, v);
  return jsonb_build_object('ok', true);
end;
$$;
