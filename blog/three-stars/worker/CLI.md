# Worker CLI

Two scripts, both run from `worker/` with the venv python. Both need `worker/.env` (see [SERVER.md](SERVER.md)).

```
.venv/bin/python ingest.py ...        # Linux
.venv\Scripts\python.exe admin.py ... # Windows
```

Any command takes `-h` for help.

## Conventions

- **Week**: any `YYYY-MM-DD` date; snapped to that week's Monday. "Current week" is computed in ET.
- **Player**: NHL id, or a name (full or partial, e.g. `mcdavid`, `"connor mcdavid"`). If the name matches more than one player, the command lists the matches and exits, so pass the id instead.
- **Slot**: one of `F1 F2 D1 D2 G X`.
- `league`, `team`, `id` are integer ids. Use `teams <league>` to find team ids.

## ingest.py

Pulls NHL data into Supabase. Cron runs it daily with no args.

```
ingest.py [--backfill START END] [--skip-players] [--no-rollover]
```

| Flag | Effect |
|---|---|
| (none) | Refresh all NHL rosters, ingest final regular-season games from the last 4 days, then roll over every league |
| `--backfill START END` | Ingest an inclusive date range instead of the last 4 days |
| `--skip-players` | Skip the roster refresh (faster) |
| `--no-rollover` | Skip the week rollover |

Rollover only runs once every game in the week that just ended is final. Any missing games from that week are ingested first.

## admin.py

```
admin.py <command> [args]
```

### Leagues & teams

| Command | Does |
|---|---|
| `leagues [query]` | List leagues: id, name, season, first scoring week, password status, hidden. `query` filters by name (partial, case-insensitive) |
| `create-league <id> <name> [--season 20262027] [--first-week 2026-10-05] [--public]` | New league. Hidden unless `--public` (hidden currently has no effect; reserved for a future league search) |
| `set-league-password <league> <password>` | Password players need (with the exact league name) to join on the site (4+ chars) |
| `create-team <league> <name> <owner> [--color #888888] [--icon img/teams/x.png]` | New team, prints its id |
| `edit-team <team> [--name] [--owner] [--color] [--icon]` | Change only the fields you pass |
| `set-pin <team> <pin>` | Owner PIN for edits on the frontend (6+ chars) |
| `teams <league>` | List teams: id, name, owner, color, PIN status, icon |

### Dekes

| Command | Does |
|---|---|
| `dekes <league>` | Deke balance per team |
| `grant-dekes <team> <n> [--note]` | Give Dekes (negative `n` takes them). For gifts, refunds, or a purchase the webhook missed |
| `deke-log <team>` | Every purchase, grant and spend (spends show `old -> new`) |
| `suggestions` | Icon ideas owners sent from the site |
| `unmatched [--all]` | Paid Stripe checkouts the webhook couldn't tie to a team (no team on the link, unknown team, or product missing `dekes` metadata). Shows session, Dekes, amount, email, reason |
| `claim <session> <team> [--dekes N]` | Credit a paid session (`cs_...`) to a team. Uses the session as the ledger ref, so repeating it or a late webhook can't double-credit. `--dekes` needed if the session isn't in `unmatched` |
| `stripe-check [--days 30]` | Lists paid Stripe checkouts that are neither credited nor in `unmatched` (e.g. webhook was down). Needs `STRIPE_SECRET_KEY` in `worker/.env` (restricted, Checkout Sessions: Read) |

### Players & rosters (direct edits)

These change a week's roster **immediately**. Use them for draft entry and fixes.

| Command | Does |
|---|---|
| `find <query>` | Search players by name |
| `roster <league> [--team T] [--week W]` | Show rosters (default: current week) |
| `set <league> <team> <slot> <player> [--week W]` | Put a player in a slot (default: current week) |
| `drop <league> <player> [--week W]` | Remove a player (default: current week) |

### Transactions (queued)

These are queued and applied at rollover. Default target week: **next week**.

| Command | Does |
|---|---|
| `txn-set <league> <team> <slot> <player> [--week W] [--note N]` | Queue a set |
| `txn-drop <league> <player> [--week W] [--note N]` | Queue a drop |
| `txns <league> [--all]` | List pending txns (`--all` also shows applied, failed and cancelled ones, with any errors) |
| `cancel <id>` | Cancel a pending txn |
| `waivers <league>` | Every team's waiver out/in lists, in priority order |
| `trades <league>` | Owner trades, pending and accepted |
| `cancel-trade <id>` | Delete a trade, even an accepted one |

### Misc

| Command | Does |
|---|---|
| `nick <league> <team> <player> <nickname>` | Set a team's nickname for a player (max 20 chars). Pass `""` to clear it |
| `rollover [league]` | Create the missing weeks for one league, or for all leagues if none is given. **Does not wait for games to be final**, unlike `ingest.py` |
| `seed-test [--week 2026-09-28] [--reset]` | Build hidden test league `0` with 5 random teams. `--reset` deletes it first and recreates it |

## Examples

```
admin.py create-league 1 "The Boys" --first-week 2026-10-05
admin.py create-team 1 "Pylon Patrol" Dave --color "#76B041"
admin.py leagues schwifty
admin.py set-league-password 1 pucks4life
admin.py set-pin 3 hunter22
admin.py set 1 3 F1 mcdavid
admin.py txn-drop 1 8478402 --note "trade w/ Bob"
admin.py roster 1 --team 3 --week 2026-10-12
ingest.py --backfill 2026-10-07 2026-10-12 --skip-players
```
