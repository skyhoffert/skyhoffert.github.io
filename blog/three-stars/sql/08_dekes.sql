-- Dekes: cosmetic currency. Bought via Stripe (edge function -> add_dekes) or granted by admin.
-- Spent 1 each on team name / color / icon / new player nickname (charged in update_roster_player, 04). Run after 07, then re-run 04 (get_my_team) and 05.

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
  check (reason in ('stripe', 'grant', 'starter', 'name', 'color', 'icon', 'nickname', 'pass', 'season_pass', 'emoji'));

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

create table if not exists icon_suggestions (
  id serial primary key,
  team_id int not null references teams(id) on delete cascade,
  suggestion text not null check (char_length(suggestion) between 1 and 200),
  created_at timestamptz not null default now()
);



-- ### CREDITS (service role only: edge function + admin.py) ###

-- Returns the new balance, or null if p_ref was already applied.
-- A single Stripe purchase of 40+ (the supporter bundle) also makes the team a Three Stars Supporter for its league's season.
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
    supporter_season = case when p_reason = 'stripe' and p_delta >= 40
      then (select season from leagues where id = t.league_id) else t.supporter_season end
  where t.id = p_team returning t.dekes into bal;
  if bal is null then
    raise exception 'No team %', p_team;
  end if;
  return bal;
end;
$$;

-- New teams start with 3 Dekes; via the ledger (not the column default) so balances stay auditable
create or replace function grant_starter_dekes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform add_dekes(new.id, 3, 'starter');
  return null;
end;
$$;

drop trigger if exists teams_starter_dekes on teams;
create trigger teams_starter_dekes after insert on teams
  for each row execute function grant_starter_dekes();



-- ### OWNER ACTIONS (anon, PIN-gated) ###

-- p_field: 'name' | 'color' (1 Deke) | 'icon' (2 Dekes; '' = none, free). Unchanged values are rejected, not charged.
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
  cost int := case when p_field <> 'icon' then 1 when v is null then 0 else 2 end;
begin
  if not pin_ok(p_league, p_team, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN.');
  end if;
  select * into t from teams where id = p_team for update;
  if t.dekes < cost then
    return jsonb_build_object('ok', false, 'error',
      format('You need %s Deke%s for this. Grab a bundle below.', cost, case when cost = 1 then '' else 's' end));
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
