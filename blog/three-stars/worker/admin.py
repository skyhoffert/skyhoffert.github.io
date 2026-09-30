import argparse
import random
import sys
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import db

ET = ZoneInfo('America/New_York')
SLOTS = ('F1', 'F2', 'D1', 'D2', 'G', 'X')
FWD = ('C', 'L', 'R')



### HELPERS ###

def week_of(d):
    return d - timedelta(days=d.weekday())


def current_week():
    return week_of(datetime.now(ET).date())


def parse_week(s, default):
    return week_of(date.fromisoformat(s)) if s else default


def full_name(p):
    return f'{p.get("first_name") or ""} {p["last_name"]}'.strip()


def resolve_player(q):
    if q.isdigit():
        rows = db.select('players', id=f'eq.{q}')
    else:
        last = q.split()[-1]
        rows = [p for p in db.select('players', last_name=f'ilike.*{last}*')
                if q.lower() in full_name(p).lower()]
    if len(rows) != 1:
        for p in rows[:20]:
            print(f'  {p["id"]}  {full_name(p)}  {p["position"]}  {p["nhl_team"]}')
        sys.exit(f'player "{q}": {len(rows)} matches, use an id')
    return rows[0]


def die_if_bad_slot(slot):
    if slot not in SLOTS:
        sys.exit(f'slot must be one of {SLOTS}')



### LEAGUES & TEAMS ###

def cmd_create_league(a):
    db.insert('leagues', [{'id': a.id, 'name': a.name, 'season': a.season,
                              'first_scoring_week': a.first_week, 'hidden': a.hidden}])
    print(f'league {a.id} created')


def cmd_create_team(a):
    row = {'league_id': a.league, 'name': a.name, 'owner': a.owner, 'color': a.color, 'icon_path': a.icon}
    t = db.insert('teams', [row])[0]
    print(f'team {t["id"]} created: {t["name"]} ({t["owner"]})')


def cmd_edit_team(a):
    vals = {k: v for k, v in (('name', a.name), ('owner', a.owner), ('color', a.color), ('icon_path', a.icon)) if v is not None}
    db.update('teams', vals, id=f'eq.{a.team}')
    print(f'team {a.team} updated')


def cmd_set_pin(a):
    if len(a.pin) < 6:
        sys.exit('PIN must be at least 6 characters')
    db.rpc('set_team_pin', p_team=a.team, p_pin=a.pin)
    print(f'team {a.team} PIN set')


def cmd_teams(a):
    for t in db.select('teams', league_id=f'eq.{a.league}', order='id'):
        pin = 'pin' if t.get('pin_hash') else 'NO PIN'
        print(f'  {t["id"]:>4}  {t["name"]:<28} {t["owner"]:<16} {t["color"]}  {pin:<6}  {t["icon_path"] or ""}')



### PLAYERS & ROSTERS ###

def cmd_find(a):
    last = a.query.split()[-1]
    rows = [p for p in db.select('players', last_name=f'ilike.*{last}*', order='last_name')
            if a.query.lower() in full_name(p).lower()]
    for p in rows:
        print(f'  {p["id"]}  {full_name(p):<28} {p["position"]}  {p["nhl_team"]}')


def cmd_roster(a):
    wk = parse_week(a.week, current_week())
    rows = db.select('roster_weeks', select='slot,team_id,player_id,players(first_name,last_name,position,nhl_team)',
                     league_id=f'eq.{a.league}', week=f'eq.{wk}', order='team_id')
    if a.team:
        rows = [r for r in rows if r['team_id'] == a.team]
    print(f'week {wk}')
    for r in sorted(rows, key=lambda r: (r['team_id'], SLOTS.index(r['slot']))):
        p = r['players']
        print(f'  team {r["team_id"]:>4}  {r["slot"]:<3} {r["player_id"]}  {full_name(p):<28} {p["position"]}  {p["nhl_team"]}')


def cmd_set(a):
    die_if_bad_slot(a.slot)
    p = resolve_player(a.player)
    wk = parse_week(a.week, current_week())
    db.rpc('apply_set', p_league=a.league, p_week=str(wk), p_team=a.team, p_slot=a.slot, p_player=p['id'])
    print(f'week {wk}: {full_name(p)} -> team {a.team} {a.slot}')


def cmd_drop(a):
    p = resolve_player(a.player)
    wk = parse_week(a.week, current_week())
    db.rpc('apply_drop', p_league=a.league, p_week=str(wk), p_player=p['id'])
    print(f'week {wk}: {full_name(p)} dropped')



### TRANSACTIONS ###

def cmd_txn_set(a):
    die_if_bad_slot(a.slot)
    p = resolve_player(a.player)
    wk = parse_week(a.week, current_week() + timedelta(days=7))
    t = db.insert('pending_transactions', [{'league_id': a.league, 'target_week': str(wk), 'type': 'set',
                                               'team_id': a.team, 'player_id': p['id'], 'slot': a.slot, 'note': a.note}])[0]
    print(f'txn {t["id"]}: {full_name(p)} -> team {a.team} {a.slot} at week {wk}')


def cmd_txn_drop(a):
    p = resolve_player(a.player)
    wk = parse_week(a.week, current_week() + timedelta(days=7))
    t = db.insert('pending_transactions', [{'league_id': a.league, 'target_week': str(wk), 'type': 'drop',
                                               'player_id': p['id'], 'note': a.note}])[0]
    print(f'txn {t["id"]}: drop {full_name(p)} at week {wk}')


def cmd_txns(a):
    params = {'league_id': f'eq.{a.league}', 'order': 'id'}
    if not a.all:
        params['status'] = 'eq.pending'
    for t in db.select('pending_transactions', **params):
        print(f'  {t["id"]:>4}  {t["status"]:<9} wk {t["target_week"]}  {t["type"]:<4}  player {t["player_id"]}'
              f'  team {t["team_id"]} {t["slot"] or ""}  {t["note"] or ""}  {t["error"] or ""}')


def cmd_waivers(a):
    for kind in ('waiver_outs', 'waiver_ins'):
        rows = db.select(kind, select='team_id,player_id,players(first_name,last_name,position)',
                         league_id=f'eq.{a.league}', order='team_id,created_at')
        print(kind)
        n, last_team = 0, None
        for r in rows:
            n = n + 1 if r['team_id'] == last_team else 1
            last_team = r['team_id']
            print(f'  team {r["team_id"]:>4}  #{n}  {r["player_id"]}  {full_name(r["players"])}  {r["players"]["position"]}')


def cmd_cancel(a):
    db.update('pending_transactions', {'status': 'cancelled'}, id=f'eq.{a.id}', status='eq.pending')
    print(f'txn {a.id} cancelled')


NICK_MAX = 20


def cmd_nick(a):
    if len(a.nickname) > NICK_MAX:
        sys.exit(f'nickname too long ({len(a.nickname)} > {NICK_MAX} chars)')
    p = resolve_player(a.player)
    if a.nickname:
        db.upsert('nicknames', [{'league_id': a.league, 'team_id': a.team, 'player_id': p['id'], 'nickname': a.nickname}],
                  'league_id,team_id,player_id')
        print(f'{full_name(p)} is now "{a.nickname}" for team {a.team}')
    else:
        db.delete('nicknames', league_id=f'eq.{a.league}', team_id=f'eq.{a.team}', player_id=f'eq.{p["id"]}')
        print(f'nickname cleared for {full_name(p)}')


def cmd_rollover(a):
    ids = [a.league] if a.league is not None else [lg['id'] for lg in db.select('leagues', select='id')]
    for i in ids:
        print(f'league {i}: {db.rpc("rollover", p_league=i)} week(s) created')



### TEST LEAGUE ###

TEST_TEAMS = [
    ('Zamboni Drivers', 'Alice', '#E4572E', 'img/teams/zamboni-drivers.svg'),
    ('Five Hole Heroes', 'Bob', '#17BEBB', 'img/teams/five-hole-heroes.svg'),
    ('Top Shelf Tacos', 'Carol', '#FFC914', 'img/teams/top-shelf-tacos.svg'),
    ('Pylon Patrol', 'Dave', '#76B041', 'img/teams/pylon-patrol.svg'),
    ('Chirp Chirp', 'Erin', '#8E6C8A', 'img/teams/chirp-chirp.svg'),
]


def cmd_seed_test(a):
    week = parse_week(a.week, date(2026, 9, 28))
    if db.select('leagues', id='eq.0'):
        if not a.reset:
            sys.exit('league 0 exists, pass --reset to recreate')
        db.delete('leagues', id='eq.0')
    db.insert('leagues', [{'id': 0, 'name': 'Test League', 'season': 20262027,
                              'first_scoring_week': str(week), 'hidden': True}])

    # Prefer players who have actually played so scores are non-trivial
    played = {r['player_id'] for r in db.select('player_game_stats', select='player_id')}
    players = [p for p in db.select('players', select='id,position') if not played or p['id'] in played]
    random.shuffle(players)
    pools = {'F': [p for p in players if p['position'] in FWD],
             'D': [p for p in players if p['position'] == 'D'],
             'G': [p for p in players if p['position'] == 'G']}

    rows = []
    for name, owner, color, icon in TEST_TEAMS:
        t = db.insert('teams', [{'league_id': 0, 'name': name, 'owner': owner, 'color': color, 'icon_path': icon}])[0]
        picks = [('F1', 'F'), ('F2', 'F'), ('D1', 'D'), ('D2', 'D'), ('G', 'G'), ('X', random.choice('FD'))]
        for slot, pool in picks:
            rows.append({'league_id': 0, 'week': str(week), 'team_id': t['id'], 'player_id': pools[pool].pop()['id'], 'slot': slot})
        print(f'team {t["id"]}: {name}')
    db.insert('roster_weeks', rows)
    print(f'league 0 seeded at week {week}; rollover: {db.rpc("rollover", p_league=0)} week(s) created')



### MAIN ###

def main():
    ap = argparse.ArgumentParser(description='Three Stars admin')
    sp = ap.add_subparsers(dest='cmd', required=True)

    p = sp.add_parser('create-league')
    p.add_argument('id', type=int)
    p.add_argument('name')
    p.add_argument('--season', type=int, default=20262027)
    p.add_argument('--first-week', default='2026-10-05')
    p.add_argument('--hidden', action='store_true')
    p.set_defaults(fn=cmd_create_league)

    p = sp.add_parser('create-team')
    p.add_argument('league', type=int)
    p.add_argument('name')
    p.add_argument('owner')
    p.add_argument('--color', default='#888888')
    p.add_argument('--icon', help='e.g. img/teams/3.png')
    p.set_defaults(fn=cmd_create_team)

    p = sp.add_parser('edit-team')
    p.add_argument('team', type=int)
    p.add_argument('--name')
    p.add_argument('--owner')
    p.add_argument('--color')
    p.add_argument('--icon')
    p.set_defaults(fn=cmd_edit_team)

    p = sp.add_parser('set-pin', help='owner PIN for frontend edits, 6+ chars')
    p.add_argument('team', type=int)
    p.add_argument('pin')
    p.set_defaults(fn=cmd_set_pin)

    p = sp.add_parser('teams')
    p.add_argument('league', type=int)
    p.set_defaults(fn=cmd_teams)

    p = sp.add_parser('find')
    p.add_argument('query')
    p.set_defaults(fn=cmd_find)

    p = sp.add_parser('roster')
    p.add_argument('league', type=int)
    p.add_argument('--team', type=int)
    p.add_argument('--week')
    p.set_defaults(fn=cmd_roster)

    p = sp.add_parser('set', help='edit a week directly (draft entry, fixes); default current week')
    p.add_argument('league', type=int)
    p.add_argument('team', type=int)
    p.add_argument('slot')
    p.add_argument('player', help='NHL id or name')
    p.add_argument('--week')
    p.set_defaults(fn=cmd_set)

    p = sp.add_parser('drop', help='edit a week directly; default current week')
    p.add_argument('league', type=int)
    p.add_argument('player')
    p.add_argument('--week')
    p.set_defaults(fn=cmd_drop)

    p = sp.add_parser('txn-set', help='pending: player to team slot; default next week')
    p.add_argument('league', type=int)
    p.add_argument('team', type=int)
    p.add_argument('slot')
    p.add_argument('player')
    p.add_argument('--week')
    p.add_argument('--note')
    p.set_defaults(fn=cmd_txn_set)

    p = sp.add_parser('txn-drop', help='pending: drop player; default next week')
    p.add_argument('league', type=int)
    p.add_argument('player')
    p.add_argument('--week')
    p.add_argument('--note')
    p.set_defaults(fn=cmd_txn_drop)

    p = sp.add_parser('txns')
    p.add_argument('league', type=int)
    p.add_argument('--all', action='store_true')
    p.set_defaults(fn=cmd_txns)

    p = sp.add_parser('waivers', help='all teams\' pending waiver lists')
    p.add_argument('league', type=int)
    p.set_defaults(fn=cmd_waivers)

    p = sp.add_parser('cancel')
    p.add_argument('id', type=int)
    p.set_defaults(fn=cmd_cancel)

    p = sp.add_parser('nick', help='empty nickname clears')
    p.add_argument('league', type=int)
    p.add_argument('team', type=int)
    p.add_argument('player')
    p.add_argument('nickname')
    p.set_defaults(fn=cmd_nick)

    p = sp.add_parser('rollover')
    p.add_argument('league', type=int, nargs='?')
    p.set_defaults(fn=cmd_rollover)

    p = sp.add_parser('seed-test')
    p.add_argument('--week', help='first week, default 2026-09-28')
    p.add_argument('--reset', action='store_true')
    p.set_defaults(fn=cmd_seed_test)

    a = ap.parse_args()
    a.fn(a)


if __name__ == '__main__':
    main()
