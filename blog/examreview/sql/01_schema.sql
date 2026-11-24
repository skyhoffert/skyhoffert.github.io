-- Exam Review: schema, security, and RPCs.
-- Run once in the Supabase SQL editor of the exam-review project. Safe to re-run (tables use IF NOT EXISTS,
-- functions use CREATE OR REPLACE).
--
-- Security model:
--   * er_rooms is publicly readable (phones subscribe to it via Realtime). It holds no secrets.
--   * Everything else is only reachable through SECURITY DEFINER functions below.
--   * Host actions require the room's host key (er_room_keys, never readable by clients).
--   * A player's id is their secret; it's never exposed to other players.



-- ### TABLES ###

create table if not exists er_rooms (
    code           text primary key,
    set_path       text not null,
    state          text not null default 'lobby' check (state in ('lobby', 'open', 'locked', 'revealed', 'final')),
    question_index int not null default 0 check (question_index >= 0),
    timer_ends_at  timestamptz,
    graded         int[] not null default '{}',
    updated_at     timestamptz not null default now(),
    created_at     timestamptz not null default now()
);

create table if not exists er_room_keys (
    code     text primary key references er_rooms on delete cascade,
    host_key text not null
);

create table if not exists er_players (
    id        uuid primary key default gen_random_uuid(),
    room_code text not null references er_rooms on delete cascade,
    nickname  text not null,
    joined_at timestamptz not null default now(),
    unique (room_code, nickname)
);

create table if not exists er_bans (
    room_code text not null references er_rooms on delete cascade,
    nickname  text not null,
    primary key (room_code, nickname)
);

create table if not exists er_answers (
    room_code      text not null references er_rooms on delete cascade,
    player_id      uuid not null references er_players on delete cascade,
    question_index int not null,
    answer         jsonb not null,
    correct        boolean,
    answered_at    timestamptz not null default now(),
    primary key (player_id, question_index)
);

create index if not exists er_answers_room_q on er_answers (room_code, question_index);

alter table er_rooms     enable row level security;
alter table er_room_keys enable row level security;
alter table er_players   enable row level security;
alter table er_bans      enable row level security;
alter table er_answers   enable row level security;

drop policy if exists er_rooms_read on er_rooms;
create policy er_rooms_read on er_rooms for select using (true);
grant select on er_rooms to anon, authenticated;

do $$ begin
    alter publication supabase_realtime add table er_rooms;
exception when duplicate_object then null;
end $$;



-- ### INTERNAL HELPERS (not callable by clients) ###

create or replace function er_check_host(p_code text, p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
    if not exists (select 1 from er_room_keys where code = upper(p_code) and host_key = p_key) then
        raise exception 'Invalid room or host key';
    end if;
end $$;

create or replace function er_new_code() returns text
language plpgsql set search_path = public as $$
declare
    v text;
    letters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ'; -- no I/O
begin
    loop
        v := '';
        for i in 1..4 loop
            v := v || substr(letters, 1 + floor(random() * length(letters))::int, 1);
        end loop;
        exit when not exists (select 1 from er_rooms where code = v);
    end loop;
    return v;
end $$;

-- Scores per player. The current question's results stay hidden while it's open/locked (no spoilers before reveal).
create or replace function er_scores(p_code text)
returns table (player_id uuid, nickname text, score int, rank int)
language sql stable security definer set search_path = public as $$
    with r as (select * from er_rooms where code = p_code),
    s as (
        select p.id, p.nickname,
               count(a.player_id) filter (
                   where a.correct and not (a.question_index = r.question_index and r.state in ('open', 'locked'))
               )::int as score
        from er_players p
        cross join r
        left join er_answers a on a.player_id = p.id
        where p.room_code = p_code
        group by p.id, p.nickname
    )
    select id, nickname, score, (rank() over (order by score desc))::int from s;
$$;

-- Used by create_room.sql (SQL editor only).
create or replace function er_create_room(p_set_path text)
returns table (room text, host_key text, host_url text, join_url text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
    v_code text := er_new_code();
    v_key  text := replace(gen_random_uuid()::text, '-', '');
    v_base text := 'https://skyhoffert.github.io/blog/examreview/';
begin
    insert into er_rooms (code, set_path) values (v_code, p_set_path);
    insert into er_room_keys (code, host_key) values (v_code, v_key);
    return query select v_code, v_key,
        v_base || 'host.html?room=' || v_code || '&key=' || v_key,
        v_base || '?room=' || v_code;
end $$;

revoke execute on function er_check_host(text, text) from public, anon, authenticated;
revoke execute on function er_new_code() from public, anon, authenticated;
revoke execute on function er_scores(text) from public, anon, authenticated;
revoke execute on function er_create_room(text) from public, anon, authenticated;



-- ### PLAYER RPCs ###

create or replace function er_join(p_code text, p_nickname text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
    v_code text := upper(trim(p_code));
    v_nick text := trim(p_nickname);
    v_id   uuid;
begin
    if not exists (select 1 from er_rooms where code = v_code) then
        raise exception 'Room % not found', v_code;
    end if;
    if v_nick = '' or char_length(v_nick) > 20 then
        raise exception 'Nickname must be 1-20 characters';
    end if;
    if exists (select 1 from er_bans where room_code = v_code and nickname = v_nick) then
        raise exception 'That nickname is not allowed';
    end if;
    if exists (select 1 from er_players where room_code = v_code and nickname = v_nick) then
        raise exception 'That nickname is already taken';
    end if;
    if (select count(*) from er_players where room_code = v_code) >= 100 then
        raise exception 'Room is full';
    end if;
    insert into er_players (room_code, nickname) values (v_code, v_nick) returning id into v_id;
    return jsonb_build_object('player_id', v_id, 'nickname', v_nick, 'room', v_code);
end $$;

-- Everything a phone needs to render. player = null means not in the room (never joined, or kicked).
create or replace function er_player_state(p_code text, p_player uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
    r er_rooms;
    p er_players;
    a er_answers;
    v_score int;
    v_rank  int;
    v_count int;
begin
    select * into r from er_rooms where code = upper(p_code);
    if not found then
        raise exception 'Room not found';
    end if;
    select * into p from er_players where id = p_player and room_code = r.code;
    select * into a from er_answers where player_id = p_player and question_index = r.question_index;
    select s.score, s.rank into v_score, v_rank from er_scores(r.code) s where s.player_id = p_player;
    select count(*) into v_count from er_players where room_code = r.code;

    return jsonb_build_object(
        'room', to_jsonb(r),
        'now', now(),
        'player', case when p.id is null then null else jsonb_build_object('id', p.id, 'nickname', p.nickname) end,
        'answer', case when a.player_id is null then null else jsonb_build_object(
            'answer', a.answer,
            'correct', case when r.state in ('revealed', 'final') then a.correct end
        ) end,
        'score', v_score,
        'rank', v_rank,
        'players', v_count
    );
end $$;

create or replace function er_submit(p_code text, p_player uuid, p_question int, p_answer jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
    r er_rooms;
begin
    -- FOR SHARE: a concurrent lock waits for this submit to finish, so the host's post-lock fetch sees it.
    select * into r from er_rooms where code = upper(p_code) for share;
    if not found then
        raise exception 'Room not found';
    end if;
    if r.state <> 'open' or r.question_index <> p_question then
        raise exception 'Answers are locked';
    end if;
    if not exists (select 1 from er_players where id = p_player and room_code = r.code) then
        raise exception 'You are not in this room';
    end if;
    if pg_column_size(p_answer) > 2000 then
        raise exception 'Answer too large';
    end if;
    insert into er_answers (room_code, player_id, question_index, answer)
    values (r.code, p_player, p_question, p_answer)
    on conflict (player_id, question_index)
    do update set answer = excluded.answer, correct = null, answered_at = now();
end $$;



-- ### HOST RPCs (all require the host key) ###

create or replace function er_host_state(p_code text, p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
    r er_rooms;
begin
    perform er_check_host(p_code, p_key);
    select * into r from er_rooms where code = upper(p_code);
    return jsonb_build_object(
        'room', to_jsonb(r),
        'now', now(),
        'players', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', p.id,
                'nickname', p.nickname,
                'joined_at', p.joined_at,
                'score', (select count(*) from er_answers a where a.player_id = p.id and a.correct)
            ) order by p.joined_at)
            from er_players p where p.room_code = r.code
        ), '[]'::jsonb),
        'answers', coalesce((
            select jsonb_agg(jsonb_build_object(
                'player_id', a.player_id,
                'answer', a.answer,
                'correct', a.correct,
                'answered_at', a.answered_at
            ))
            from er_answers a where a.room_code = r.code and a.question_index = r.question_index
        ), '[]'::jsonb),
        'bans', coalesce((select jsonb_agg(nickname order by nickname) from er_bans where room_code = r.code), '[]'::jsonb)
    );
end $$;

-- p_timer: seconds from now, or null for no timer.
create or replace function er_host_update(p_code text, p_key text, p_state text, p_question int, p_timer numeric)
returns void
language plpgsql security definer set search_path = public as $$
begin
    perform er_check_host(p_code, p_key);
    update er_rooms set
        state = p_state,
        question_index = p_question,
        timer_ends_at = case when p_timer is null or p_timer <= 0 then null
                             else now() + make_interval(secs => p_timer) end,
        updated_at = now()
    where code = upper(p_code);
end $$;

create or replace function er_host_add_time(p_code text, p_key text, p_seconds numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
    perform er_check_host(p_code, p_key);
    update er_rooms set
        timer_ends_at = greatest(coalesce(timer_ends_at, now()), now()) + make_interval(secs => p_seconds),
        updated_at = now()
    where code = upper(p_code) and state = 'open';
end $$;

-- p_results: {"<player uuid>": true|false, ...}
create or replace function er_host_grade(p_code text, p_key text, p_question int, p_results jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
    perform er_check_host(p_code, p_key);
    update er_answers a
    set correct = (p_results ->> a.player_id::text)::boolean
    where a.room_code = upper(p_code) and a.question_index = p_question and p_results ? a.player_id::text;

    update er_rooms
    set graded = array(select distinct x from unnest(graded || p_question) x order by x),
        updated_at = now()
    where code = upper(p_code);
end $$;

-- Wipes a question's answers so it can be re-run.
create or replace function er_host_reset_question(p_code text, p_key text, p_question int) returns void
language plpgsql security definer set search_path = public as $$
begin
    perform er_check_host(p_code, p_key);
    delete from er_answers where room_code = upper(p_code) and question_index = p_question;
    update er_rooms set graded = array_remove(graded, p_question), updated_at = now() where code = upper(p_code);
end $$;

create or replace function er_host_kick(p_code text, p_key text, p_player uuid, p_ban boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
    v_nick text;
begin
    perform er_check_host(p_code, p_key);
    delete from er_players where id = p_player and room_code = upper(p_code) returning nickname into v_nick;
    if p_ban and v_nick is not null then
        insert into er_bans (room_code, nickname) values (upper(p_code), v_nick) on conflict do nothing;
    end if;
end $$;

create or replace function er_host_unban(p_code text, p_key text, p_nickname text) returns void
language plpgsql security definer set search_path = public as $$
begin
    perform er_check_host(p_code, p_key);
    delete from er_bans where room_code = upper(p_code) and nickname = p_nickname;
end $$;

create or replace function er_host_export(p_code text, p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
    perform er_check_host(p_code, p_key);
    return jsonb_build_object(
        'players', coalesce((
            select jsonb_agg(jsonb_build_object('id', id, 'nickname', nickname, 'joined_at', joined_at) order by joined_at)
            from er_players where room_code = upper(p_code)
        ), '[]'::jsonb),
        'answers', coalesce((
            select jsonb_agg(jsonb_build_object(
                'player_id', player_id, 'question_index', question_index,
                'answer', answer, 'correct', correct, 'answered_at', answered_at
            ))
            from er_answers where room_code = upper(p_code)
        ), '[]'::jsonb)
    );
end $$;



-- ### GRANTS (explicit, in case the project doesn't auto-grant to anon) ###

grant execute on function er_join(text, text) to anon, authenticated;
grant execute on function er_player_state(text, uuid) to anon, authenticated;
grant execute on function er_submit(text, uuid, int, jsonb) to anon, authenticated;
grant execute on function er_host_state(text, text) to anon, authenticated;
grant execute on function er_host_update(text, text, text, int, numeric) to anon, authenticated;
grant execute on function er_host_add_time(text, text, numeric) to anon, authenticated;
grant execute on function er_host_grade(text, text, int, jsonb) to anon, authenticated;
grant execute on function er_host_reset_question(text, text, int) to anon, authenticated;
grant execute on function er_host_kick(text, text, uuid, boolean) to anon, authenticated;
grant execute on function er_host_unban(text, text, text) to anon, authenticated;
grant execute on function er_host_export(text, text) to anon, authenticated;
