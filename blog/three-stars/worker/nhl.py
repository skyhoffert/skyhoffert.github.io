import time
import requests

BASE = 'https://api-web.nhle.com/v1'
FINAL_STATES = ('OFF', 'FINAL')
REGULAR_SEASON = 2

MIN_INTERVAL = 0.5

_session = requests.Session()
_last = 0.0



### HTTP ###

def get(path):
    global _last
    for attempt in range(6):
        wait = MIN_INTERVAL - (time.monotonic() - _last)
        if wait > 0:
            time.sleep(wait)
        _last = time.monotonic()
        try:
            r = _session.get(f'{BASE}{path}', timeout=20)
            if r.status_code == 200:
                return r.json()
            if r.status_code == 404:
                return None
            if r.status_code == 429:
                delay = int(r.headers.get('retry-after', 30)) + 1
                print(f'  rate limited, waiting {delay}s')
                time.sleep(delay)
                continue
        except requests.RequestException:
            pass
        time.sleep(2 ** attempt)
    raise RuntimeError(f'NHL API failed: {path}')



### ENDPOINTS ###

def schedule(date):
    data = get(f'/schedule/{date.isoformat()}') or {}
    for day in data.get('gameWeek', []):
        if day['date'] == date.isoformat():
            return day['games']
    return []


def schedule_week(start):
    # All games in the 7 days from start, date attached; postponed games excluded
    data = get(f'/schedule/{start.isoformat()}') or {}
    out = []
    for day in data.get('gameWeek', []):
        for g in day['games']:
            if g.get('gameScheduleState', 'OK') == 'OK':
                out.append({**g, 'game_date': day['date']})
    return out


def landing(game_id):
    return get(f'/gamecenter/{game_id}/landing')


def boxscore(game_id):
    return get(f'/gamecenter/{game_id}/boxscore')


def team_abbrevs():
    data = get('/standings/now') or {}
    return [t['teamAbbrev']['default'] for t in data.get('standings', [])]


def roster(abbrev):
    return get(f'/roster/{abbrev}/current') or {}



### PARSING ###

def name_default(obj):
    return (obj or {}).get('default')


def roster_players(abbrev):
    r = roster(abbrev)
    out = []
    for group in ('forwards', 'defensemen', 'goalies'):
        for p in r.get(group, []):
            out.append({
                'id': p['id'],
                'first_name': name_default(p.get('firstName')),
                'last_name': name_default(p.get('lastName')),
                'position': p['positionCode'],
                'nhl_team': abbrev,
                'headshot': p.get('headshot'),
            })
    return out


def goalie_saves(p):
    if p.get('saves') is not None:
        return p['saves']
    # older boxscores only have "saves/shots"
    ssa = p.get('saveShotsAgainst') or ''
    return int(ssa.split('/')[0]) if '/' in ssa else None


def game_stats(box):
    # Goalie rows lack goals/assists; stored as 0
    out = []
    pbg = box.get('playerByGameStats', {})
    for side in ('awayTeam', 'homeTeam'):
        abbrev = box[side]['abbrev']
        for group in ('forwards', 'defense', 'goalies'):
            for p in pbg.get(side, {}).get(group, []):
                is_goalie = group == 'goalies'
                out.append({
                    'player_id': p['playerId'],
                    'goals': p.get('goals', 0),
                    'assists': p.get('assists', 0),
                    'plus_minus': None if is_goalie else p.get('plusMinus', 0),
                    'is_goalie': is_goalie,
                    'saves': goalie_saves(p) if is_goalie else None,
                    'name': name_default(p.get('name')),
                    'position': p.get('position'),
                    'nhl_team': abbrev,
                })
    return out


def three_stars(land):
    return [{'star': s['star'], 'player_id': s['playerId']} for s in land.get('summary', {}).get('threeStars', [])]
