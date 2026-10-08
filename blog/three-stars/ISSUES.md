# Issues

Bugs and to-dos. `admin.py checkin` lists every `- ` line under **Open**. When something ships, delete it here and add it to the week's entry in CHANGELOG.md (player-facing, shown at `#/changes`).

## Open

- Verify the Linux cron (6am ET `ingest.py`) is set up and running (worker/SERVER.md). Monday rollover depends on it.
- Late joiners after a draft can't waiver into empty slots (claims need a drop). Workaround: admin `set`. Fix idea: drop-less claims into open slots.
- Wishlist edits are lost silently if you leave the draft page without saving.
- NHL `/roster` feed can omit active players (Nikishin 8482100, CAR, missing 2026-10-02), so they're never in the pool. Added by hand 10-02; drops out of `draft_pool` once a refresh lands 2+ days later (~10-05 cron) unless the feed picks him up. Fix idea: refresh also re-checks pool players missing from rosters via `/player/{id}/landing` (`currentTeamAbbrev`).
- Transition to custom URL.

## Ideas

- **Secure owner sign-in** (not this season): replace team id + shared PIN (stored in localStorage, sent with every write) with real accounts, e.g. Supabase Auth magic links, owners linked to teams, RPCs using `auth.uid()` instead of `pin_ok`.
- **Report tool**: let players flag offensive team names / nicknames for admin review (deke_ledger already records who changed what).
- **Public league search**: `leagues.hidden` (default true) is reserved for this; nothing reads it yet.
- **Anti-dominance**: one strong roster could run away with SP. Ideas: deeper SP for bigger leagues, late-season multiplier weeks, playoff weeks among top N.
- **Per-league SP values**: store place values on `leagues` (e.g. 12-team league pays 4 deep). Currently hardcoded 30/20/10 in `team_week_scores`.
- **Season replay**: hidden league replaying 2025-26 to sanity-check SP. Needs `leagues.end_week` so rollover stops at season end, and `seed-test` targeting any league/week.
- **Performance**: if live views get slow, convert `team_week_scores` to a materialized view refreshed by the worker after each ingest.
- **Draft admin UI** instead of CLI; auto-run the draft at `scheduled_at`.
- **Commish** Need "commissioner" style league editing and control so people can do custom leagues.
- **Bench** Add possibility for bench players which are inactive for a week, but still "owned" by an owner. Weekly rollover would adjust active vs. inactive. Or time before first game Monday to adjust.
- **D Flex** Add Defensive flex option for D/G flex position.
- **Bonus Pt Adj** Option to adjust amount of bonus points for weekly bonuses.
- **Bonus Eligible Players** Option for weekly bonus points including non-rostered players.
- **Upcoming Games** Show upcoming games by the recent games.
- **Missing Recents** It is possible to miss some of yesterday's games if more than 10 in one day.
- **Live Games** Show live stats for current games.
