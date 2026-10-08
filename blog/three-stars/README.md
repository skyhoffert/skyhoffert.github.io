# Three Stars

Fantasy NHL where points come from the three stars of each game.

Docs:
- **README.md** (this): rules and how it's built.
- [worker/CLI.md](worker/CLI.md): every `ingest.py` / `admin.py` command.
- [worker/SERVER.md](worker/SERVER.md): Linux cron setup.
- [ISSUES.md](ISSUES.md): open bugs, to-dos, ideas. Dev-facing.
- [CHANGELOG.md](CHANGELOG.md): what shipped each week + what's coming, player-facing (shown at `#/changes`).

Daily: `admin.py checkin` checks ingest/rollover health, drafts, payments, feedback, ISSUES.md and changelog freshness.



## Rules

- **League**: 2026-27 regular season only (opened 2026-09-29). Preseason/playoffs/international games ignored.
- **Roster**: per-league slot counts on `leagues` (`n_f n_d n_g n_x n_s`, 0-9 each; default 2 F, 2 D, 1 G, 1 X, 0 S). X = Flex (F or D), S = Superflex (any). Slot names = type + number (`F1`, `X2`, `S1`), ordered F D G X S (`league_slots`). Players exclusive within a league. Lowering a count is refused while that slot is filled in the latest week.
- **Team cap**: `leagues.max_teams` (1-16, default 10), enforced on team insert.
- **Week**: Mon 00:00 → Sun 23:59 US/Eastern. Week ID = Monday's date (e.g. `2026-10-05`).
- **Preseason weeks**: weeks before the league's `first_scoring_week` show scores and placements but award no SP.
- **Scoring**: 1st star 30, 2nd 20, 3rd 10.
- **Bonuses**: +5 each, stackable, ties all get full bonus. Leaders computed among players rostered in that league that week.
  - Goals leader (goalies eligible)
  - Points leader, G+A (goalies eligible)
  - +/- leader (skaters only)
  - SV% leader, "Save Machine" (goalies only, 25+ shots against that week)
  - PIM leader (goalies eligible)
  - Fights leader, "Five for Fighting" (fighting majors, from landing penalty summary mapped by team + sweater)
- **Weekly placement**: every team gets a unique place 1..N by score, then star count (1sts+2nds+3rds), then team goals (goalies included), then team +/- (skaters only), then a stable coin flip (hash of week + team).
- **SP** (standing points): 1st 30, 2nd 20, 3rd 10 (hardcoded). Scoring weeks only; a 0-point team earns nothing. Shown provisionally during the live week, counted in standings once final.
- **Standings**: by SP, then # of 1sts, 2nds, 3rds, then total season points. Columns: SP and 1-2-3 record.
- **Admin transactions** (fixes): entered by admin as pending transactions, applied at rollover before trades and waivers. Direct edits (`admin.py set`) change a week immediately; used for late joiners' rosters.
- **Nicknames**: per (league, team, player), max 20 chars. Persist across weeks. Belong to owner: if player leaves, nickname goes dormant and returns if player comes back. Display: real name, italic nickname, pos · team.
- **League join**: visitors enter the exact league name (case-insensitive) + league password (`admin.py set-league-password`, bcrypt). Checked only on join; reads stay open by league id (no private data). Joined leagues + current league remembered per device; switch/join/leave via the league name in the header. No league joined = join screen (Help/Support still reachable).
- **My Team**: owner signs in on the site with team + PIN (6+ chars, bcrypt, `admin.py set-pin`). Remembered per device. Only your own current roster is editable. All writes have a 5s client-side cooldown.



## Draft

One auto draft per league season (`drafts`), run by the admin.

- **Setup**: `ranks-import` loads the season's default ranking (`player_ranks`; 2026-27 = NHL.com top 200, 199/200 matched). `draft-init` opens the draft with a random order (`--no-order` = TBD, `--linear` instead of snake); re-run to re-roll or `draft-order` to set by hand. `draft-time` sets the countdown shown on the draft page (display only).
- **Wishlists**: owners rank up to 3× slot count players on `#/draft`, private, editable until the draft runs. Keyed by draft, so each season starts fresh.
- **Pool**: players with a current `nhl_team`, refreshed within 2 days of the latest roster refresh (`draft_pool`), minus anyone rostered in the league.
- **Run** (`admin.py draft` → `run_draft`, one transaction): refuses unless open, the order lists every team exactly once, and rosters are empty or at the current week. Rounds = slot count; snake reverses even rounds. Each pick: the team's first wishlist player still free with an open slot that fits, else the best default-ranked pool player that fits, unranked by last name. Slot choice: specific type, then X, then S. Writes the current week's `roster_weeks`, logs `draft_picks` (`wish_rank` null = auto), sets `done`. `p_rounds` runs only that many rounds from where it left off.
- **Slow draft** (`admin.py draft --slow SECS`): one round per `run_draft` call, then sets `drafts.next_round_at` and sleeps, so owners can react to picks. Status stays `open` (wishlists editable, order locked) until the last round; Ctrl-C and re-run to resume. Wishlists hide/drop players already picked (`set_wishlist` returns them as `taken`).
- **After**: `admin.py midweek` (`run_midweek`) runs one extra trades + waivers pass on the current week, once per draft. `admin.py midweek-time` posts when (`drafts.midweek_at`, in `league_json` until it runs) for the banner and hints. Waivers before `first_scoring_week` with a done draft use reverse draft order (also at the following Monday rollover).
- **UI**: `#/draft` has no nav tab. Banner on Standings/Week/Teams/Team while open; card at the bottom of History always. Open: order, countdown, wishlist editor (red border when unsaved); polls every 10s (3s once a round is due, immediately at countdown zero and on tab return), so a slow draft shows picks live with a countdown to the next round ("Paused" when stopped). ↻ button + last-updated time. Done: results by round, 🎯 wishlist / 🤖 auto.
- **Late joiners**: no empty-slot waiver claims yet; admin fills their roster with `set`.



## Dekes

- Cosmetic currency. 1 Deke = one change of team **name** (2-24 chars, unique in league), **color** or **icon** (None is free; preset list in `js/config.js` `ICONS`, server accepts `img/teams/<slug>.(svg|png)` if not in an unowned icon pack). A new/changed player nickname also costs 1 (charged in `update_roster_player`); clearing one is free. Unchanged values aren't charged.
- Bundles (`DEKE_BUNDLES` in `js/config.js`): 10 for $3, 20 for $5 (Supporter bundle). New teams start with 10 (`grant_starter_dekes`). Stripe Payment Links with `?client_reference_id=<team id>`; Stripe Product metadata `dekes=<n>`.
- **Three Stars Supporter** (`teams.supporter_season`): set to the league's season by any single Stripe purchase of 20+ Dekes (`add_dekes`) or `admin.py supporter`. Shown only while it matches `leagues.season` (`team_json.supporter`). Gold ring on the team badge + gold ★ after the name. The Support page pitches the Supporter bundle.
- `supabase/functions/stripe-webhook` verifies the Stripe signature and calls `add_dekes` with ref = checkout session id (idempotent). Setup: `supabase/STRIPE.md`.
- Safety net: paid checkouts the webhook can't credit go to `unmatched_payments` → `admin.py unmatched` / `claim`. `admin.py stripe-check` compares Stripe's paid sessions against the ledger.
- Every purchase / grant / spend is in `deke_ledger` (spends log `old -> new`, doubles as a moderation trail).
- New teams start with 3 (`starter` ledger entry, insert trigger on `teams`).
- Reactions: one emoji per team on a current-week Moves line or a Recent Three Stars game. Free; the pass tables/helpers (`reaction_passes`, `season_passes`) are kept but unused. Emoji pool: starter set (`starter_emojis()` in `09`) + owned emoji packs + legacy single buys (`team_emojis`). `EMOJIS` in `js/config.js`; `img/emoji/<id>.svg`, or `.png` with `ext: 'png'`.
- Packs: bought once, permanent (`team_packs`, `buy_pack`). Contents in `all_packs()` in `08` and `PACKS` + `pack` tags on `EMOJIS`/`ICONS` in `js/config.js`. Emoji packs add to the pool; icon packs unlock team icons (`icon_unlocked`, checked by `customize_team`). Current: Classics (5), Faces (10), Hockey Icons (5).
- Icon ideas go through Message the Dev (Support page). The old `icon_suggestions` / `suggest_icon` path is unused by the UI; `admin.py suggestions` still lists past ones.



## Waivers

- **Waiver In** = paired claim: add a free agent, drop a named player from own current roster whose slot fits the add. Made from the Players page (or edited from the Team page). Ordered by creation time; re-claiming changes the drop and keeps the spot.
- The same drop can back several claims (fallback chain). Claims are private (PIN), no limits.
- **Processing** at Monday rollover (and the post-draft `midweek` run), after admin transactions and trades:
  - Priority: lowest ended-week score, then lowest season SP, then lowest season points, then random. Before `first_scoring_week` with a done draft: reverse draft order.
  - Round-robin: each round every team (priority order) gets at most one successful claim.
  - Claim succeeds if the add was unrostered and not dropped this run, and the drop is still on the team in a slot the add fits. The add takes the drop's slot.
  - All claims cleared afterwards.
- **Moves**: public log (`moves` table) of waiver, trade and admin adds/drops, shown at bottom of Week page and History cards.



## Trades

- Owner proposes from another team's page: 1-for-1, one dropdown per team. Backend supports any N-for-N.
- Incoming players take the outgoing players' slots (goalies placed first; specific slot before X before S); proposal fails if positions don't fit.
- Can't trade a player who is a waiver claim's drop. Can't use a player in a pending or accepted trade as a drop.
- **Pending**: sender can cancel; receiver accepts or rejects. Private to the two teams.
- **Accepted** is final for both sides; only admin can kill it (`admin.py cancel-trade`). Accepting deletes other pending trades sharing any of its players.
- **Rollover**: admin txns → accepted trades (acceptance order, re-validated) → waivers. Every trade row is then deleted; unanswered ones expire.



## Feedback

Support page "Message the Dev" form → `feedback` table (`send_feedback`; team attached when the PIN checks out; 30/hour global cap). Read with `admin.py feedback`, close with `feedback-done`.



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
- Nothing on home server exposed to the internet.
- Smart backend, dumb frontend: pages call one RPC each and render the returned `jsonb`.
- Supabase URL: `https://ctyjgcimmpwlmtsedkbk.supabase.co`
- Publishable key: `sb_publishable_VbYYEdmoMrfSK_RAaFEIGA_hNJM_0Z_`
- Secret key lives only in `worker/.env` (gitignored). Never committed.



## Supabase (`sql/`)

Applied by pasting into the dashboard SQL editor. Every file is idempotent. Fresh setup order: `01 02 03 06 07 08 04 09 10 11 05`. After changing one file, re-run it and then `05`.

- `01_schema.sql`: all tables. `leagues` (+ slot config), `teams`, `players`, `games`, `game_stars`, `player_game_stats`, `roster_weeks` (weekly snapshots, unique (league_id, week, player_id)), `pending_transactions`, `waiver_ins`, `moves`, `trades`/`trade_players`, `player_ranks`, `drafts`, `draft_wishlists`, `draft_picks`, `nicknames`. Slot helpers `slot_list`, `league_slots`, `slot_fits`.
- `02_views.sql`: `player_week_points` → `roster_week_points` (bonuses) → `team_week_scores` (placement + SP) → `season_standings`. Raw data + views, so stat corrections flow through automatically.
- `03_rpc.sql`: JSON helpers (`league_json` includes `draft_status`), page RPCs `get_standings`, `get_week`, `get_team`, `get_history`, `get_players`, `get_recent_stars`, `rollover(league)`, admin helpers `apply_set`/`apply_drop`.
- `04_waivers.sql`: `process_waivers`, PIN-gated `get_my_team`, `update_roster_player`, `set_waiver_in`.
- `06_trades.sql`: `trade_plan`, `process_trades`, PIN-gated `propose_trade`, `respond_trade`, `cancel_trade`.
- `07_leagues.sql`: `leagues.pass_hash`, `set_league_password` (service), anon `join_league`.
- `08_dekes.sql`: `teams.dekes`, `deke_ledger`, `team_packs`, `icon_suggestions`, service `add_dekes`, `all_packs()`, PIN-gated `customize_team`, `buy_pack`, `suggest_icon`.
- `09_reactions.sql`: `starter_emojis()`, `team_emojis`, `reaction_passes`, `season_passes`, `reactions`, anon `get_reactions`, PIN-gated `get_my_reactions`, `react`.
- `10_draft.sql`: `draft_pool`, anon `get_draft`, `get_draft_pool`, PIN-gated `set_wishlist`, service `run_draft`, `run_midweek`.
- `11_feedback.sql`: `feedback`, anon `send_feedback`.
- `05_rls.sql`: RLS on all tables, no anon table access. Anon may only execute the granted `get_*` and owner RPCs. Re-run after adding tables/functions.

**Rollover** (`rollover`): catch-up and idempotent. For each missing week up to the current one: copy the previous week, apply pending admin transactions, process trades, process waivers, log moves. Atomic; safe to run late, twice, or from two machines.



## Worker (`worker/`)

Cross-platform (Windows + Linux): `pathlib`, `zoneinfo` + `tzdata`, `python-dotenv`. Commands: [CLI.md](worker/CLI.md).
- `nhl.py`: only module touching the NHL API.
- `ingest.py`: refresh player universe (all current NHL rosters, incl. injured; unknown box score players auto-inserted) → ingest final games from the last 4 days (corrections) → `rollover` for every league once the ended week is all final.
- `admin.py`: leagues/teams, rosters, transactions, draft, Dekes, feedback, `checkin`, `seed-test`.
- `db.py`: thin PostgREST wrapper over `requests` (no `supabase-py`).
- `requirements.txt`: `requests`, `python-dotenv`, `tzdata`, `pypdf` (`ranks-import`). Venv at `worker/.venv`.

Schedule: daily 6am ET (latest games end ~1:30am ET). Linux cron ([SERVER.md](worker/SERVER.md)); Windows Task Scheduler fallback.



## Leagues

- **Real**: id 1 "Three Savage Schwifty Stars", 3F 2D 1G 1X, `first_scoring_week = 2026-10-05`.
- **Test**: id 0 "Test League" (5 fake owners, `seed-test`); id 9 "Draft Test" (draft test, delete when done).
- Every table carries `league_id`.



## Frontend

```
index.html
style.css
CHANGELOG.md       fetched and rendered by #/changes
js/api.js          RPC calls
js/router.js       hash routes
js/render.js       shared render helpers
js/config.js       Supabase keys, Deke bundles, emojis, icons, joined leagues
js/pages/*.js      one per page
img/teams/         team icons
img/emoji/         reaction emojis
```
`supabase-js@2` from jsdelivr, no build step.

Pages (hash routes, linkable):
- **Standings** `#/standings` (home): SP, 1-2-3 record, recent three stars feed with owners tagged.
- **Week** `#/week[/<monday>]`: team scores in placement order, SP chips, per-player breakdown, moves.
- **Teams** `#/teams`, **Team** `#/team/<id>[/<monday>]`: roster by slot, weekly history; own team adds trades, waiver claims, Dekes, reactions.
- **History** `#/history`: every week's results + moves; Draft card at the bottom.
- **Players** `#/players`: search, owner or FA, season stars; claim free agents.
- **Draft** `#/draft` (no tab): see Draft above.
- **Help** `#/help`, **Support** `#/support` (Supporter bundle, Message the Dev, What's New card), **What's New** `#/changes` (no tab).
- Join screen when no league is joined on the device.
