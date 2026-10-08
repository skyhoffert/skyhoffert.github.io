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
- **Slot**: type + number, within the league's config (`league-config`): `F` forward, `D` defense, `G` goalie, `X` flex (F/D), `S` superflex (any). Default league: `F1 F2 D1 D2 G1 X1`.
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
| `leagues [query]` | List leagues: id, name, season, first scoring week, password status, hidden, slot config, team cap. `query` filters by name (partial, case-insensitive) |
| `create-league <id> <name> [--season 20262027] [--first-week 2026-10-05] [--public] [config flags]` | New league. Hidden unless `--public` (hidden currently has no effect; reserved for a future league search) |
| `league-config <league> [--f N] [--d N] [--g N] [--x N] [--s N] [--max-teams N]` | Show, or change, slot counts (0-9 each; defaults 2/2/1/1/0) and team cap (1-16, default 10). Lowering a count fails while that slot is filled in the latest week; move/drop the player first. New slots start empty (fill with `set`) |
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
| `supporter <team> [--off]` | Mark (or unmark) a team as Three Stars Supporter for its league's current season. Automatic on any single 20+ Deke Stripe purchase |
| `grant-pass <league> [--week W]` | Free weekly reaction pass for every team in the league (default current week). Safe to repeat. Unused while reactions are free |
| `deke-log <team>` | Every purchase, grant and spend (spends show `old -> new`) |
| `checkin` | Daily dev check. Players/games ingest freshness, yesterday's games stored + starred vs the NHL schedule, each league's roster week vs current, failed txns, draft state (order set, missed scheduled time, posted midweek pending / missed), unmatched payments, new feedback, open items in `ISSUES.md`. `!!` lines need attention |
| `feedback [--all]` | Messages from the Support page "Message the Dev" form (bugs, ideas), unhandled only unless `--all` |
| `feedback-done <id> ...` | Mark messages handled |
| `suggestions` | Old icon ideas (before Message the Dev replaced the icon form) |
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
| `waivers <league>` | Every team's waiver claims (add + drop), in priority order |
| `trades <league>` | Owner trades, pending and accepted |
| `cancel-trade <id>` | Delete a trade, even an accepted one |

### Draft

See [README.md](../README.md#draft). One draft per league season.

| Command | Does |
|---|---|
| `ranks-import <file> [--season 20262027] [--source S] [--dry-run]` | Default draft ranking from the NHL.com rankings PDF (or a text file of `N. Name, P, TEAM` lines). Prints misses |
| `rank-set <season> <rank> <player>` | Set one player's default rank (fix a miss) |
| `draft-init <league> [--linear] [--no-order]` | Open the draft with a random order (snake unless `--linear`). Re-run to re-roll, until the draft runs. `--no-order` opens wishlists with the order TBD. Wishlists survive re-runs |
| `draft-order <league> <team> ...` | Set the full order by hand, first pick first; must list every team once |
| `draft-time <league> "YYYY-MM-DD HH:MM" \| --clear` | Planned draft time (Eastern), shown as a countdown on the draft page. Doesn't run anything |
| `draft-show <league>` | Order, wishlist counts, picks once done |
| `draft <league> [--skip-players] [--slow SECS]` | Refresh NHL rosters, then run the whole draft into the current week. Locks wishlists. `--slow 120`: one round every 120s, owners edit wishlists in between (countdown on the draft page). Keep the terminal open; Ctrl-C and re-run to resume from the next round. Order is locked once round 1 runs |
| `draft-reset <league> --yes` | **Test leagues.** Reopen the draft: deletes its picks and ALL the league's rosters and moves. Wishlists and order kept |
| `draft-watch <league> [--slow 120] [--allow-reset] [--once]` | Polls feedback every 10s until Ctrl-C (`--once`: ~55s, for cron every minute). Owners in the league send a Message the Dev: `start draft [secs]` (10-600, also resumes), `stop draft` (pause; start resumes), `cancel draft` (stop + reset), `reset draft` (works on a finished draft). Cancel/reset need `--allow-reset`. Runs `draft --slow` detached, logs `draft-<league>.log`; `draft-<league>.run`/`.stop` files coordinate |
| `midweek <league>` | One extra trades + waivers pass after the draft, priority reverse draft order. Once per draft |
| `midweek-time <league> "YYYY-MM-DD HH:MM" \| --clear` | Planned midweek time (Eastern). Until midweek runs: banner on Standings/Teams/Week/Team, and waiver/trade hints say that time instead of "Monday morning". Doesn't run anything |

### Misc

| Command | Does |
|---|---|
| `nick <league> <team> <player> <nickname>` | Set a team's nickname for a player (max 20 chars). Pass `""` to clear it |
| `rollover [league]` | Create the missing weeks for one league, or for all leagues if none is given. **Does not wait for games to be final**, unlike `ingest.py` |
| `seed-test [--week 2026-09-28] [--reset] [config flags]` | Build hidden test league `0` with 5 random teams filling every slot. `--reset` deletes it first and recreates it |

## Examples

```
admin.py create-league 1 "The Boys" --first-week 2026-10-05
admin.py create-team 1 "Pylon Patrol" Dave --color "#76B041"
admin.py leagues schwifty
admin.py set-league-password 1 pucks4life
admin.py set-pin 3 hunter22
admin.py set 1 3 F1 mcdavid
admin.py league-config 1 --f 3 --s 1 --max-teams 12
admin.py txn-drop 1 8478402 --note "trade w/ Bob"
admin.py roster 1 --team 3 --week 2026-10-12
ingest.py --backfill 2026-10-07 2026-10-12 --skip-players
```
