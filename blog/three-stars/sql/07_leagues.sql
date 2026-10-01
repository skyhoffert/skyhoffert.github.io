-- League join: exact name (case-insensitive) + league password. Checked only on join; reads stay open by id.
-- Run after 01-06, then re-run 05_rls.sql.

alter table leagues add column if not exists pass_hash text;
alter table leagues alter column hidden set default true;
create unique index if not exists leagues_name_lower on leagues (lower(trim(name)));



-- ### ADMIN (service role only) ###

create or replace function set_league_password(p_league int, p_pass text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pass is null or char_length(p_pass) < 4 then
    raise exception 'League password must be at least 4 characters';
  end if;
  update leagues set pass_hash = extensions.crypt(p_pass, extensions.gen_salt('bf')) where id = p_league;
  if not found then
    raise exception 'No league %', p_league;
  end if;
end;
$$;



-- ### JOIN (anon) ###

-- Same error for wrong name or wrong password so names can't be probed
create or replace function join_league(p_name text, p_pass text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select jsonb_build_object('ok', true, 'league', jsonb_build_object('id', id, 'name', name))
    from leagues
    where lower(trim(name)) = lower(trim(coalesce(p_name, '')))
      and pass_hash is not null
      and extensions.crypt(coalesce(p_pass, ''), pass_hash) = pass_hash
  ), jsonb_build_object('ok', false, 'error', 'League name or password is wrong.'));
$$;
