# Three Stars: Plan

Fantasy NHL where points come from the three stars of each game.

## Rules
- **League**: "Three Savage Schwifty Stars", 2026-27 regular season only (opened 2026-09-29). Preseason/playoffs/international games ignored.
- **Roster**: 6 slots: 2 F, 2 D, 1 G, 1 Flex (F or D). Players exclusive within a league.
- **Week**: Mon 00:00 → Sun 23:59 US/Eastern. Week ID = Monday's date (e.g. `2026-10-05`).
- **Week 1** (`2026-09-28`) is preseason: scores and placements shown, no SP. SP starts at league's `first_scoring_week` (`2026-10-05`).
- **Scoring**: 1st star 30, 2nd 20, 3rd 10.
- **Bonuses**: +5 each, stackable, ties all get full bonus. Leaders computed among players rostered in that league that week.
  - Goals leader (goalies eligible)
  - Points leader, G+A (goalies eligible)
  - +/- leader (skaters only)
- **Weekly placement**: every team gets a unique place 1..N by score, then star count (1sts+2nds+3rds), then team goals (goalies included), then team +/- (skaters only), then a stable coin flip (hash of week + team).
- **SP** (standing points): 1st 30, 2nd 20, 3rd 10 (hardcoded). Scoring weeks only; a 0-point team earns nothing. Shown provisionally during the live week, counted in standings once final.
- **Standings**: by SP, then # of 1sts, 2nds, 3rds, then total season points. Columns: SP and 1-2-3 record (no total points).
- **Draft**: done offline. Admin enters rosters manually.
- **Admin transactions** (fixes): entered by admin as pending transactions, applied at rollover before trades and waivers.
- **Nicknames**: per (league, team, player), max 20 chars. Persist across weeks. Belong to owner: if player leaves, nickname goes dormant and returns if player comes back. Display: real name, italic nickname, pos · team.
- **League join**: visitors enter the exact league name (case-insensitive) + league password (`admin.py set-league-password`, bcrypt). Checked only on join; reads stay open by league id (no private data). Joined leagues + current league remembered per device; switch/join/leave via the league name in the header. No league joined = join screen (Help/Support still reachable).
- **My Team**: owner signs in on the site with team + PIN (6+ chars, bcrypt, set via `admin.py set-pin`). Remembered per device. Only your own current roster is editable. All writes have a 5s client-side cooldown.

## Dekes
- Cosmetic currency. 1 Deke = one change of team **name** (2-24 chars, unique in league), **color**, or **icon** (preset list in `js/config.js` `ICONS`, server accepts `img/teams/<slug>.(svg|png)`). A new/changed player nickname also costs 1 (charged in `update_roster_player`); clearing one and Waiver Out are free. Unchanged values aren't charged.
- Bundles (`DEKE_BUNDLES` in `js/config.js`): 3 for $3, 7 for $5, 15 for $10. Stripe Payment Links with `?client_reference_id=<team id>`; Stripe Product metadata `dekes=<n>`.
- `supabase/functions/stripe-webhook` verifies the Stripe signature and calls `add_dekes` with ref = checkout session id (idempotent). Setup: `supabase/STRIPE.md`.
- Safety net: paid checkouts the webhook can't credit (no/unknown team, missing `dekes` metadata) go to `unmatched_payments` → `admin.py unmatched` / `claim`. `admin.py stripe-check` compares Stripe's paid sessions against the ledger to catch anything the webhook never saw.
- Every purchase / grant / spend is in `deke_ledger` (spends log `old -> new`, doubles as a moderation trail). Admin: `dekes`, `grant-dekes`, `deke-log`, `suggestions`.
- New teams start with 3 (`starter` ledger entry, insert trigger on `teams`).
- Reactions: one emoji per team on a current-week Moves line or a Recent Three Stars game. Needs the weekly reaction pass (1 Deke). Emoji pool: fire free, others 3 Dekes each, permanent (`EMOJIS` in `js/config.js`, `img/emoji/<id>.svg`).
- Owners can suggest new icons for free (`icon_suggestions`).

## Waivers
- **Waiver Out**: owner toggles on their current roster players (Team page). Ordered by toggle time (#1 dropped first); removing one renumbers. Pill "Waiver Out #N".
- **Waiver In**: owner claims free agents (Players page). Ordered the same way. Pill "Waiver In #N"; private "Waiver Ins" list on own Team page.
- Lists are private (PIN). No limits or blocking; extra Ins just fail.
- **Processing** at Monday rollover, after admin transactions, only once every game of the ended week is final (worker guard):
  - Priority: lowest ended-week score, then lowest season SP, then lowest season points, then random.
  - Round-robin: each round every team (priority order) gets at most one successful claim.
  - Claim succeeds if player was unrostered and not dropped this run, and the team has an Out whose slot fits; the highest-priority fitting Out is dropped.
  - Unmatched Outs are kept (no empty slots). All lists cleared afterwards.
- **Moves**: public log (`moves` table) of waiver, trade and admin adds/drops, shown at bottom of Week page and History cards.

## Trades
- Owner proposes from another team's page: 1-for-1, one dropdown per team. Backend supports any N-for-N (same count each side) if the UI ever wants it.
- Incoming players take the outgoing players' slots (specific slot before Flex); proposal fails if positions don't fit.
- Can't trade a Waiver Out player (remove the Out first). Can't Waiver Out a player in a pending or accepted trade.
- **Pending**: sender can cancel; receiver accepts or rejects. Private to the two teams (Trades section on own Team page, pills on rosters).
- **Accepted** is final for both sides; only admin can kill it (`admin.py cancel-trade`). Accepting deletes other pending trades sharing any of its players.
- **Rollover**: admin txns → accepted trades (acceptance order, re-validated) → waivers. Every trade row is then deleted; unanswered ones expire. History lives in `moves` (source `trade`).

## Architecture
```
NHL API (api-web.nhle.com)
   │
worker (Python; dev/manual runs on Windows, daily cron on Linux home server)
   │  secret key
Supabase "Three Stars Backend"
   │  RPCs only (security definer, anon execute)
Frontend (GH Pages, plain HTML/CSS/JS, publishable key)
```
- Nothing on home server exposed to the internet. No Flask.
- Smart backend, dumb frontend: pages call one RPC each and render the returned `jsonb`.
- Supabase URL: `https://ctyjgcimmpwlmtsedkbk.supabase.co`
- Publishable key: `sb_publishable_VbYYEdmoMrfSK_RAaFEIGA_hNJM_0Z_`
- Secret key lives only in `worker/.env` (gitignored). Never committed.

## Supabase (`sql/`)
Applied by pasting into the dashboard SQL editor in order. Naming: plain names, no prefix or version suffix.

- `01_schema.sql`
  - `leagues(id, name, season, first_scoring_week)`
  - `teams(id, league_id, name, owner, color #RRGGBB, icon_path)`
  - `players(id = NHL id, first_name, last_name, position, nhl_team, updated_at)`
  - `games(id = NHL game id, game_date ET, season, game_type, home, away, state, ingested_at)`
  - `game_stars(game_id, star 1-3, player_id)`
  - `player_game_stats(game_id, player_id, goals, assists, plus_minus, is_goalie)`
  - `roster_weeks(league_id, week, team_id, player_id, slot)`: weekly snapshots, unique (league_id, week, player_id)
  - `pending_transactions(id, league_id, target_week, type, team_id, player_id, slot, status, created_at, applied_at)`
  - `nicknames(league_id, team_id, player_id, nickname)`
  - `waiver_outs`, `waiver_ins(league_id, team_id, player_id, created_at)`, `moves(league_id, week, team_id, player_id, kind, source)`
- `02_views.sql`: `player_week_points` → `roster_week_points` (bonuses) → `team_week_scores` (placement + SP) → `season_standings`. Raw data + views, so stat corrections flow through automatically.
- `03_rpc.sql`: `get_standings`, `get_week`, `get_team`, `get_history`, `get_players`, `get_recent_stars` (page-ready `jsonb`), `rollover(league)`, admin helpers.
- `04_waivers.sql`: `process_waivers`, PIN-gated owner RPCs `get_my_team`, `update_roster_player`, `set_waiver_in`.
- `06_trades.sql`: `trade_plan`, `process_trades`, PIN-gated `propose_trade`, `respond_trade`, `cancel_trade`. Run before `04` (its `get_my_team` uses `trade_json`).
- `07_leagues.sql`: `leagues.pass_hash`, unique lower(name), `set_league_password` (service), anon `join_league(name, pass)`. Run before `05`.
- `08_dekes.sql`: `teams.dekes`, `deke_ledger`, `icon_suggestions`, service `add_dekes`, PIN-gated `customize_team`, `suggest_icon`. Run after `07`, then re-run `04` (`get_my_team` returns `dekes`) and `05`.
- `09_reactions.sql`: `team_emojis`, `reaction_passes`, `reactions`, anon `get_reactions`, PIN-gated `get_my_reactions`, `react`, `buy_reaction_item`. Run after `08`, then `05`.
- `05_rls.sql`: RLS on all tables, no anon table access. Anon may only execute `get_*` and the owner RPCs. Re-run after adding tables/functions.

**Rollover** (`rollover`): catch-up and idempotent. Ensures snapshots exist for every week up to the current one. For each missing week: copy the previous week, apply pending admin transactions, process trades, process waivers, log moves. Runs atomically. Safe to run late, twice, or from two machines.

## Worker (`worker/`)
Cross-platform (Windows + Linux): `pathlib`, `zoneinfo` + `tzdata`, `python-dotenv`.
- `nhl.py`: only module touching the NHL API.
- `ingest.py`: each run: refresh player universe (all current NHL rosters, incl. injured; unknown box score players auto-inserted) → ingest yesterday's final games + re-fetch prior 3 days (corrections) → `rollover` for every league. `--backfill START END` for ranges. All writes are upserts.
- `admin.py`: create league/team, set roster, add pending transaction, set nickname, `seed-test`.
- `db.py`: thin PostgREST wrapper over `requests` (no `supabase-py`; avoids new `sb_secret_` key compat issues).
- `requirements.txt`: `requests`, `python-dotenv`, `tzdata`. Venv at `worker/.venv`.
- `.env.example`: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.

Usage (Windows): `py worker\ingest.py`, `py worker\ingest.py --backfill 2026-09-29 2026-09-30`, `py worker\admin.py ...`

Schedule: daily 6am ET (latest games end ~1:30am ET).
- Linux: cron with `CRON_TZ=America/New_York`, venv. No Docker.
- Windows fallback: Task Scheduler.

## Leagues
- **Real**: "Three Savage Schwifty Stars", `first_scoring_week = 2026-10-05`.
- **Test**: league id 0, 5 fake owners, random valid rosters via `admin.py seed-test`. Joined like any league (name + password). Used to exercise rollover/transactions/bonuses safely.
- Every table carries `league_id` for future multi-league support.

## Frontend
```
index.html
style.css
js/api.js          RPC calls
js/router.js       hash routes
js/render.js       shared render helpers
js/pages/*.js      one per page
img/teams/<slug>.svg|png team icons
```
`supabase-js@2` from jsdelivr, no build step. Split JS further where it helps clarity.

Pages (hash routes, linkable):
1. **Home / Standings** (`#/standings`): SP, 1-2-3 record, recent three stars feed with fantasy owners tagged.
2. **This Week** (`#/week`): live team scores in placement order, SP chips (provisional until final), per-player breakdown (stars, bonuses).
3. **Team** (`#/team/<id>`): SP + 1-2-3 header, roster by slot, weekly history (place, SP).
4. **Week History** (`#/week/<monday>`): any past week's scores, placements, SP.
5. **Players** (`#/players`): search all NHL players, owner or FA, season stars.

## Future work
- **Report tool**: let players flag offensive team names / nicknames for admin review (deke_ledger already records who changed what).
- **Public league search**: `leagues.hidden` (default true) is reserved for this; nothing reads it yet.
- **Anti-dominance**: one strong roster could run away with SP. Ideas: worst-SP-first waiver priority (already partly there), deeper SP for bigger leagues, late-season multiplier weeks, playoff weeks among top N.
- **Per-league SP values**: store place values on `leagues` (e.g. 12-team league pays 4 deep). Currently hardcoded 30/20/10 in `team_week_scores`.
- **Season replay**: hidden league replaying 2025-26 to sanity-check SP. API serves old games fine; backfill works as-is. Needs `leagues.end_week` so rollover stops at season end, and `seed-test` targeting any league/week.
- **Performance**: if live views get slow, convert `team_week_scores` to a materialized view refreshed by the worker after each ingest.

## Build order
1. Verify NHL API endpoints (three stars location, box score G/A/+/- fields).
2. SQL: schema, views, RPCs, RLS.
3. Worker: `nhl.py` + `ingest.py`, backfill from 2026-09-29.
4. `admin.py` + seed test league → validate scoring/bonuses/SP in SQL.
5. Frontend pages.
6. Rollover/transaction test on league 0.
7. Real league: enter draft, set up Linux cron (+ Task Scheduler command).
