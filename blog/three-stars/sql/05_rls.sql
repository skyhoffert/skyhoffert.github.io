-- Re-run after any schema change: Supabase grants anon access to new tables/functions by default.

-- ### TABLES ###

alter table leagues enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table games enable row level security;
alter table game_stars enable row level security;
alter table player_game_stats enable row level security;
alter table roster_weeks enable row level security;
alter table pending_transactions enable row level security;
alter table nicknames enable row level security;
alter table waiver_outs enable row level security;
alter table waiver_ins enable row level security;
alter table moves enable row level security;

-- Also covers views, which would otherwise bypass RLS as owner
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;



-- ### FUNCTIONS ###

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function get_standings(int) to anon, authenticated;
grant execute on function get_week(int, date) to anon, authenticated;
grant execute on function get_team(int, int, date) to anon, authenticated;
grant execute on function get_history(int) to anon, authenticated;
grant execute on function get_players(int, text, text, text, int) to anon, authenticated;
grant execute on function get_recent_stars(int, int) to anon, authenticated;
grant execute on function get_my_team(int, int, text) to anon, authenticated;
grant execute on function update_roster_player(int, int, text, int, text, boolean) to anon, authenticated;
grant execute on function set_waiver_in(int, int, text, int, boolean) to anon, authenticated;
