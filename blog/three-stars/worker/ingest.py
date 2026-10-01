import argparse
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import db
import nhl

ET = ZoneInfo('America/New_York')
RECHECK_DAYS = 4



### PLAYERS ###

def refresh_players():
    by_id = {}
    for abbrev in nhl.team_abbrevs():
        for p in nhl.roster_players(abbrev):
            by_id[p['id']] = p
    rows = list(by_id.values())
    now = datetime.now(ET).isoformat()
    for r in rows:
        r['updated_at'] = now
    db.upsert('players', rows, 'id')
    print(f'players: {len(rows)} refreshed')


def ensure_players(stubs):
    # Box score / star players missing from rosters (call-ups); never overwrites existing rows
    rows = [s for s in stubs if s.get('last_name') and s.get('position')]
    db.upsert('players', rows, 'id', ignore=True)



### GAMES ###

def ingest_game(g):
    gid = g['id']
    box = nhl.boxscore(gid)
    land = nhl.landing(gid)
    if not box or not land:
        print(f'  {gid}: missing data, skipped')
        return False

    stats = nhl.game_stats(box)
    stars = nhl.three_stars(land)
    stubs = [{'id': s['player_id'], 'last_name': s['name'], 'position': s['position'], 'nhl_team': s['nhl_team']} for s in stats]
    stubs += [{'id': s['playerId'], 'last_name': nhl.name_default(s.get('name')), 'position': s.get('position'), 'nhl_team': s.get('teamAbbrev')}
              for s in land.get('summary', {}).get('threeStars', [])]
    ensure_players(stubs)

    db.upsert('games', [{
        'id': gid,
        'game_date': g['game_date'],
        'season': g['season'],
        'game_type': g['gameType'],
        'away': g['awayTeam']['abbrev'],
        'home': g['homeTeam']['abbrev'],
        'away_score': box['awayTeam'].get('score'),
        'home_score': box['homeTeam'].get('score'),
        'state': box.get('gameState', g['gameState']),
        'ingested_at': datetime.now(ET).isoformat(),
    }], 'id')
    db.upsert('player_game_stats', [{
        'game_id': gid,
        'player_id': s['player_id'],
        'goals': s['goals'],
        'assists': s['assists'],
        'plus_minus': s['plus_minus'],
        'is_goalie': s['is_goalie'],
        'saves': s['saves'],
    } for s in stats], 'game_id,player_id')
    db.upsert('game_stars', [{'game_id': gid, **s} for s in stars], 'game_id,star')

    line = ', '.join(f'{s["star"]}:{s["player_id"]}' for s in stars) or 'no stars yet'
    print(f'  {gid} {g["awayTeam"]["abbrev"]}@{g["homeTeam"]["abbrev"]}: {len(stats)} players, stars {line}')
    return True


def ingest_date(d):
    n = 0
    for g in nhl.schedule(d):
        if g['gameType'] != nhl.REGULAR_SEASON or g['gameState'] not in nhl.FINAL_STATES:
            continue
        g['game_date'] = d.isoformat()
        n += ingest_game(g)
    print(f'{d}: {n} games ingested')



### ROLLOVER ###

def ended_week_ready():
    # Waiver priority uses the ended week's scores, so every game in it must be final and stored
    today = datetime.now(ET).date()
    start = today - timedelta(days=today.weekday() + 7)
    games = [g for g in nhl.schedule_week(start) if g['gameType'] == nhl.REGULAR_SEASON]
    unfinished = [g for g in games if g['gameState'] not in nhl.FINAL_STATES]
    if unfinished:
        print(f'rollover waiting: {len(unfinished)} game(s) from week of {start} not final')
        return False
    ids = [g['id'] for g in games]
    stored = {r['id'] for r in db.select('games', select='id', id=f'in.({",".join(map(str, ids))})')} if ids else set()
    for d in sorted({g['game_date'] for g in games if g['id'] not in stored}):
        print(f'rollover: ingesting missing games from {d}')
        ingest_date(date.fromisoformat(d))
    return True


def rollover_all():
    if not ended_week_ready():
        return
    for lg in db.select('leagues', select='id,name', order='id'):
        n = db.rpc('rollover', p_league=lg['id'])
        print(f'rollover league {lg["id"]} ({lg["name"]}): {n} week(s) created')



### MAIN ###

def main():
    ap = argparse.ArgumentParser(description='Ingest NHL games into Supabase')
    ap.add_argument('--backfill', nargs=2, metavar=('START', 'END'), help='inclusive date range YYYY-MM-DD')
    ap.add_argument('--skip-players', action='store_true', help='skip roster refresh')
    ap.add_argument('--no-rollover', action='store_true')
    args = ap.parse_args()

    if args.backfill:
        start, end = (date.fromisoformat(x) for x in args.backfill)
    else:
        end = datetime.now(ET).date()
        start = end - timedelta(days=RECHECK_DAYS)

    if not args.skip_players:
        refresh_players()
    d = start
    while d <= end:
        ingest_date(d)
        d += timedelta(days=1)
    if not args.no_rollover:
        rollover_all()


if __name__ == '__main__':
    main()
