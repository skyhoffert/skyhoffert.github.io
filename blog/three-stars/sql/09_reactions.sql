-- Reactions: one emoji per team on a public Moves line (current week) or a Recent Three Stars game.
-- Reacting needs that week's pass (1 Deke) or a season pass (10 Dekes, the league's season).
-- Emojis come from the team's pool: fire is free, others 3 Dekes each.
-- Run after 08 (ledger reasons), then re-run 05.

-- Keep in sync w/ EMOJIS in js/config.js
create or replace function reaction_emojis()
returns text[]
language sql
immutable
as $$
  select array['fire', 'lamp', 'hat', 'trash', 'angry', 'star1', 'star2', 'star3',
               'heart', 'cry', 'poop', 'brain', 'thumbsup', 'thumbsdown', 'eyes', 'skull', 'O_O', 'sidemouth'];
$$;

create table if not exists team_emojis (
  team_id int not null references teams(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (team_id, emoji)
);

create table if not exists reaction_passes (
  team_id int not null references teams(id) on delete cascade,
  week date not null,
  created_at timestamptz not null default now(),
  primary key (team_id, week)
);

-- season = leagues.season of the team's league
create table if not exists season_passes (
  team_id int not null references teams(id) on delete cascade,
  season int not null,
  created_at timestamptz not null default now(),
  primary key (team_id, season)
);

-- target: 'game:<game id>' or 'move:<week>:<team id>:<source>' (one Moves line = a team's moves from one source)
create table if not exists reactions (
  league_id int not null references leagues(id) on delete cascade,
  team_id int not null references teams(id) on delete cascade,
  target text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (league_id, team_id, target)
);
create index if not exists reactions_league_target on reactions(league_id, target);



-- ### HELPERS ###

-- fire + bought
create or replace function emoji_pool(p_team int)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select array['fire'] || coalesce(array_agg(emoji order by created_at), '{}')
  from team_emojis where team_id = p_team and emoji <> 'fire';
$$;

create or replace function has_season_pass(p_team int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from season_passes sp
                 join teams t on t.id = sp.team_id join leagues l on l.id = t.league_id
                 where sp.team_id = p_team and sp.season = l.season);
$$;

create or replace function has_reaction_pass(p_team int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select has_season_pass(p_team)
      or exists (select 1 from reaction_passes where team_id = p_team and week = current_week());
$$;

-- Games: still in the Recent Three Stars window. Moves: this week's only, so they clear at rollover.
create or replace function reaction_target_ok(p_league int, p_target text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[] := string_to_array(p_target, ':');
begin
  -- NHL game ids are 10 digits; bigint cast so an oversized one can't overflow
  if p_target ~ '^game:\d{1,10}$' then
    return exists (select 1 from games g
                   where g.id = parts[2]::bigint and g.game_type = 2
                     and g.game_date >= (now() at time zone 'America/New_York')::date - 7
                     and exists (select 1 from game_stars st where st.game_id = g.id));
  elsif p_target ~ '^move:\d{4}-\d{2}-\d{2}:\d{1,9}:[a-z]+$' then
    return parts[2]::date = current_week()
      and exists (select 1 from moves m
                  where m.league_id = p_league and m.week = parts[2]::date
                    and m.team_id = parts[3]::int and m.source = parts[4]);
  end if;
  return false;
end;
$$;



-- ### PUBLIC ###

-- { target: [{emoji, team}] } for recent reactions; the page only shows targets it's displaying
create or replace function get_reactions(p_league int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(target, list), '{}'::jsonb)
  from (
    select r.target, jsonb_agg(jsonb_build_object('emoji', r.emoji, 'team', team_json(r.team_id)) order by r.created_at) as list
    from reactions r
    where r.league_id = p_league and r.created_at > now() - interval '9 days'
    group by r.target
  ) x;
$$;



-- ### OWNER ACTIONS (anon, PIN-gated) ###

create or replace function get_my_reactions(p_league int, p_team int, p_pin text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not pin_ok(p_league, p_team, p_pin)
    then jsonb_build_object('ok', false, 'error', 'Wrong PIN.')
    else jsonb_build_object(
      'ok', true,
      'dekes', (select dekes from teams where id = p_team),
      'pass', has_reaction_pass(p_team),
      'season_pass', has_season_pass(p_team),
      'emojis', to_jsonb(emoji_pool(p_team))
    )
  end;
$$;

-- p_emoji null/'' removes your reaction (free, no pass needed).
-- p_buy_pass buys this week's pass first, so one write (client cooldown) covers both.
create or replace function react(p_league int, p_team int, p_pin text, p_target text, p_emoji text, p_buy_pass boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  e text := nullif(trim(coalesce(p_emoji, '')), '');
  bought jsonb;
begin
  if not pin_ok(p_league, p_team, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN.');
  end if;
  if e is null then
    delete from reactions where league_id = p_league and team_id = p_team and target = p_target;
    return jsonb_build_object('ok', true);
  end if;
  if not e = any(emoji_pool(p_team)) then
    return jsonb_build_object('ok', false, 'error', 'That emoji isn''t in your pool yet.');
  end if;
  if not reaction_target_ok(p_league, p_target) then
    return jsonb_build_object('ok', false, 'error', 'Reactions are closed for this one.');
  end if;
  if not has_reaction_pass(p_team) then
    if not p_buy_pass then
      return jsonb_build_object('ok', false, 'error', 'You need this week''s reaction pass.');
    end if;
    bought := buy_reaction_item(p_league, p_team, p_pin, 'pass');
    if not (bought->>'ok')::boolean then
      return bought;
    end if;
  end if;
  insert into reactions (league_id, team_id, target, emoji) values (p_league, p_team, p_target, e)
  on conflict (league_id, team_id, target) do update set emoji = excluded.emoji, created_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

-- p_item: 'pass' (1 Deke, this week), 'season' (10 Dekes, rest of the league's season) or an emoji id (3 Dekes, permanent)
create or replace function buy_reaction_item(p_league int, p_team int, p_pin text, p_item text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  bal int;
  cost int := case p_item when 'pass' then 1 when 'season' then 10 else 3 end;
begin
  if not pin_ok(p_league, p_team, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN.');
  end if;
  select dekes into bal from teams where id = p_team for update;

  if p_item = 'pass' then
    if has_reaction_pass(p_team) then
      return jsonb_build_object('ok', false, 'error', 'You already have a pass for this week.');
    end if;
  elsif p_item = 'season' then
    if has_season_pass(p_team) then
      return jsonb_build_object('ok', false, 'error', 'You already have the season pass.');
    end if;
  elsif p_item = any(reaction_emojis()) and p_item <> 'fire' then
    if p_item = any(emoji_pool(p_team)) then
      return jsonb_build_object('ok', false, 'error', 'You already own that emoji.');
    end if;
  else
    return jsonb_build_object('ok', false, 'error', 'Unknown item.');
  end if;

  if bal < cost then
    return jsonb_build_object('ok', false, 'error', format('You need %s Dekes for this. Grab a bundle below.', cost));
  end if;

  if p_item = 'pass' then
    insert into reaction_passes (team_id, week) values (p_team, current_week());
    perform add_dekes(p_team, -1, 'pass', null, current_week()::text);
  elsif p_item = 'season' then
    insert into season_passes (team_id, season) values (p_team, (select season from leagues where id = p_league));
    perform add_dekes(p_team, -cost, 'season_pass', null, (select season from leagues where id = p_league)::text);
  else
    insert into team_emojis (team_id, emoji) values (p_team, p_item);
    perform add_dekes(p_team, -3, 'emoji', null, p_item);
  end if;
  return jsonb_build_object('ok', true, 'dekes', bal - cost);
end;
$$;
