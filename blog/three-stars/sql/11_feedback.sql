-- Messages to the dev from the Support page: bugs, ideas, anything. Anyone can send (signed in or not);
-- the team is attached only when its PIN checks out. Read with admin.py feedback. Run after 04, then re-run 05.

create table if not exists feedback (
  id serial primary key,
  league_id int references leagues(id) on delete set null,
  team_id int references teams(id) on delete set null,
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) between 1 and 200),
  contact text check (char_length(contact) <= 40),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Limits were 1000/100
alter table feedback drop constraint if exists feedback_message_check;
alter table feedback add constraint feedback_message_check check (char_length(message) between 1 and 200);
alter table feedback drop constraint if exists feedback_contact_check;
alter table feedback add constraint feedback_contact_check check (char_length(contact) <= 40);



-- ### SEND (anon) ###

-- Global cap of 30 per hour so a spammer can't flood the table
create or replace function send_feedback(p_league int, p_team int, p_pin text, p_kind text, p_message text, p_contact text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  msg text := trim(coalesce(p_message, ''));
  who text := nullif(trim(coalesce(p_contact, '')), '');
  ok_team boolean := p_team is not null and pin_ok(p_league, p_team, p_pin);
begin
  if coalesce(p_kind, '') not in ('bug', 'idea', 'other') then
    return jsonb_build_object('ok', false, 'error', 'Pick a type.');
  end if;
  if char_length(msg) not between 1 and 200 then
    return jsonb_build_object('ok', false, 'error', 'Message must be 1-200 characters.');
  end if;
  if char_length(who) > 40 then
    return jsonb_build_object('ok', false, 'error', 'Contact max 40 characters.');
  end if;
  if (select count(*) from feedback where created_at > now() - interval '1 hour') >= 30 then
    return jsonb_build_object('ok', false, 'error', 'Lots of messages right now. Try again later.');
  end if;
  insert into feedback (league_id, team_id, kind, message, contact)
  values (case when exists (select 1 from leagues where id = p_league) then p_league end,
          case when ok_team then p_team end, p_kind, msg, who);
  return jsonb_build_object('ok', true);
end;
$$;
