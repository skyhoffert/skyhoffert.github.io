-- Reactions: one emoji per team on a public Moves line (current week) or a Recent Three Stars game.
-- Free for everyone. Emojis come from the team's pool: the starter set plus any emoji packs (all_packs(), 08).
-- Run after 08, then re-run 05.

drop function if exists reaction_emojis();
drop function if exists buy_reaction_item(int, int, text, text);
drop function if exists react(int, int, text, text, text, boolean);

-- Keep in sync w/ EMOJIS without a pack in js/config.js
create or replace function starter_emojis()
returns text[]
language sql
immutable
as $$
  select array['fire', 'trash', 'angry', 'cry', 'thumbsup', 'thumbsdown', 'eyes', 'skull', 'heart'];
$$;

-- Legacy: single emojis bought for 3 Dekes before packs; still in the owner's pool
create table if not exists team_emojis (
  team_id int not null references teams(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (team_id, emoji)
);

-- Passes: unused while reactions are free; kept so they can come back
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

-- starter + emoji packs + legacy singles
create or replace function emoji_pool(p_team int)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select array(
    select unnest(starter_emojis())
    union select unnest(p.items) from all_packs() p where p.kind = 'emoji' and p.id = any(team_pack_ids(p_team))
    union select emoji from team_emojis where team_id = p_team
  );
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
      'emojis', to_jsonb(emoji_pool(p_team)),
      'packs', to_jsonb(team_pack_ids(p_team))
    )
  end;
$$;

-- p_emoji null/'' removes your reaction.
create or replace function react(p_league int, p_team int, p_pin text, p_target text, p_emoji text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  e text := nullif(trim(coalesce(p_emoji, '')), '');
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
  insert into reactions (league_id, team_id, target, emoji) values (p_league, p_team, p_target, e)
  on conflict (league_id, team_id, target) do update set emoji = excluded.emoji, created_at = now();
  return jsonb_build_object('ok', true);
end;
$$;
