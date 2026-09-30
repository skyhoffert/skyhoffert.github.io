# Three Stars: Plan

Fantasy NHL where points come from the three stars of each game.

## Rules
- **League**: "Three Savage Schwifty Stars", 2026-27 regular season only (opened 2026-09-29). Preseason/playoffs/international games ignored.
- **Roster**: 6 slots: 2 F, 2 D, 1 G, 1 Flex (F or D). Players exclusive within a league.
- **Week**: Mon 00:00 → Sun 23:59 US/Eastern. Week ID = Monday's date (e.g. `2026-10-05`).
- **Week 1** (`2026-09-28`) is preseason: scores shown, no Ws. Ws start at league's `first_scoring_week` (`2026-10-05`).
- **Scoring**: 1st star 30, 2nd 20, 3rd 10.
- **Bonuses**: +5 each, stackable, ties all get full bonus. Leaders computed among players rostered in that league that week.
  - Goals leader (goalies eligible)
  - Points leader, G+A (goalies eligible)
  - +/- leader (skaters only)
- **Season**: top weekly score gets a W (ties → all tied get W). Standings by Ws, tiebreak total points.
- **Draft**: done offline. Admin enters rosters manually.
- **Admin transactions** (trades, fixes): entered by admin as pending transactions, applied at rollover before waivers. Owner-driven trades TBD.
- **Nicknames**: per (league, team, player), max 20 chars. Persist across weeks. Belong to owner: if player leaves, nickname goes dormant and returns if player comes back. Display: real name, italic nickname, pos · team.
- **My Team**: owner signs in on the site with team + PIN (6+ chars, bcrypt, set via `admin.py set-pin`). Remembered per device. Only your own current roster is editable. All writes have a 5s client-side cooldown.

## Waivers
- **Waiver Out**: owner toggles on their current roster players (Team page). Ordered by toggle time (#1 dropped first); removing one renumbers. Pill "Waiver Out #N".
- **Waiver In**: owner claims free agents (Players page). Ordered the same way. Pill "Waiver In #N"; private "Waiver Ins" list on own Team page.
- Lists are private (PIN). No limits or blocking; extra Ins just fail.
- **Processing** at Monday rollover, after admin transactions, only once every game of the ended week is final (worker guard):
  - Priority: lowest ended-week score, then lowest season points, then random.
  - Round-robin: each round every team (priority order) gets at most one successful claim.
  - Claim succeeds if player was unrostered and not dropped this run, and the team has an Out whose slot fits; the highest-priority fitting Out is dropped.
  - Unmatched Outs are kept (no empty slots). All lists cleared afterwards.
- **Moves**: public log (`moves` table) of waiver and admin adds/drops, shown at bottom of Week page and History cards.

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
- `02_views.sql`: `player_week_points` → `team_week_scores` (roster join + bonuses) → `week_winners` → `season_standings`. Raw data + views, so stat corrections flow through automatically.
- `03_rpc.sql`: `get_standings`, `get_week`, `get_team`, `get_history`, `get_players`, `get_recent_stars` (page-ready `jsonb`), `rollover(league)`, admin helpers.
- `04_waivers.sql`: `process_waivers`, PIN-gated owner RPCs `get_my_team`, `update_roster_player`, `set_waiver_in`.
- `05_rls.sql`: RLS on all tables, no anon table access. Anon may only execute `get_*` and the owner RPCs. Re-run after adding tables/functions.

**Rollover** (`rollover`): catch-up and idempotent. Ensures snapshots exist for every week up to the current one. For each missing week: copy the previous week, apply pending admin transactions, process waivers, log moves. Runs atomically. Safe to run late, twice, or from two machines.

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
- **Test**: league id 0, 5 fake owners, random valid rosters via `admin.py seed-test`. Hidden, visible via `?league=0`. Used to exercise rollover/transactions/bonuses safely.
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
1. **Home / Standings** (`#/standings`): Ws, total points, recent three stars feed with fantasy owners tagged.
2. **This Week** (`#/week`): live team scores, per-player breakdown (stars, bonuses).
3. **Team** (`#/team/<id>`): roster by slot, weekly history.
4. **Week History** (`#/week/<monday>`): any past week's scores + winner.
5. **Players** (`#/players`): search all NHL players, owner or FA, season stars.

## Build order
1. Verify NHL API endpoints (three stars location, box score G/A/+/- fields).
2. SQL: schema, views, RPCs, RLS.
3. Worker: `nhl.py` + `ingest.py`, backfill from 2026-09-29.
4. `admin.py` + seed test league → validate scoring/bonuses/Ws in SQL.
5. Frontend pages.
6. Rollover/transaction test on league 0.
7. Real league: enter draft, set up Linux cron (+ Task Scheduler command).
