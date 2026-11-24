-- Delete rooms (and their players, answers, bans, keys) older than 30 days.
-- Export results from the host's final screen first if you want them.

delete from er_rooms where created_at < now() - interval '30 days';
