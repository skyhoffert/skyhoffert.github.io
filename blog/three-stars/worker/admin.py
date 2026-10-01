import argparse
import os
import random
import sys
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import requests

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
                              'first_scoring_week': a.first_week, 'hidden': not a.public}])
    print(f'league {a.id} created')


def cmd_leagues(a):
    params = {'order': 'id'}
    if a.query:
        params['name'] = f'ilike.*{a.query}*'
    for lg in db.select('leagues', **params):
        pw = 'password' if lg.get('pass_hash') else 'NO PASSWORD'
        hidden = 'hidden' if lg['hidden'] else ''
        print(f'  {lg["id"]:>4}  {lg["name"]:<32} {lg["season"]}  first {lg["first_scoring_week"]}  {pw:<11}  {hidden}')


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


def cmd_set_league_password(a):
    if len(a.password) < 4:
        sys.exit('League password must be at least 4 characters')
    db.rpc('set_league_password', p_league=a.league, p_pass=a.password)
    print(f'league {a.league} password set')


def cmd_dekes(a):
    for t in db.select('teams', league_id=f'eq.{a.league}', order='id'):
        print(f'  {t["id"]:>4}  {t["name"]:<28} {t["dekes"]:>4} dekes')


def cmd_grant_dekes(a):
    bal = db.rpc('add_dekes', p_team=a.team, p_delta=a.n, p_reason='grant', p_detail=a.note)
    print(f'team {a.team}: {a.n:+} dekes, balance {bal}')


def cmd_deke_log(a):
    for r in db.select('deke_ledger', team_id=f'eq.{a.team}', order='created_at'):
        print(f'  {r["created_at"][:16]}  {r["delta"]:>+4}  {r["reason"]:<6}  {r["detail"] or ""}')


def cmd_unmatched(a):
    rows = db.select('unmatched_payments', order='created_at')
    if not a.all:
        rows = [r for r in rows if r['claimed_team'] is None]
    for r in rows:
        done = f'claimed by team {r["claimed_team"]}' if r['claimed_team'] else ''
        print(f'  {r["created_at"][:16]}  {r["session_id"]}  {r["dekes"]:>3} dekes  {r["amount"] or "":<8}  '
              f'{r["email"] or "":<28}  {r["note"] or ""}  {done}')
    if not rows:
        print('  nothing unmatched')


# Credits a paid Stripe session to a team. Same ref as the webhook, so it can never double-credit.
def cmd_claim(a):
    um = db.select('unmatched_payments', session_id=f'eq.{a.session}')
    dekes = a.dekes if a.dekes is not None else (um[0]['dekes'] if um else None)
    if not dekes:
        sys.exit('not in unmatched (or 0 dekes): pass --dekes N')
    bal = db.rpc('add_dekes', p_team=a.team, p_delta=dekes, p_reason='stripe', p_ref=a.session,
                 p_detail=f'claimed{" " + um[0]["amount"] if um and um[0]["amount"] else ""}')
    if bal is None:
        print(f'{a.session} was already credited; nothing done')
    else:
        print(f'team {a.team}: +{dekes} dekes, balance {bal}')
    if um:
        db.update('unmatched_payments', {'claimed_team': a.team, 'claimed_at': datetime.now(ET).isoformat()},
                  session_id=f'eq.{a.session}')


# Paid Stripe checkouts vs deke_ledger: anything paid that neither credited nor parked in unmatched is flagged.
def cmd_stripe_check(a):
    key = os.environ.get('STRIPE_SECRET_KEY')
    if not key:
        sys.exit('set STRIPE_SECRET_KEY in worker/.env (restricted key, Checkout Sessions: Read)')
    since = int((datetime.now(ET) - timedelta(days=a.days)).timestamp())
    sessions, after = [], None
    while True:
        params = {'limit': 100, 'created[gte]': since, **({'starting_after': after} if after else {})}
        r = requests.get('https://api.stripe.com/v1/checkout/sessions', params=params, auth=(key, ''))
        if r.status_code >= 300:
            sys.exit(f'stripe: {r.status_code} {r.text}')
        page = r.json()
        sessions += [s for s in page['data'] if s['payment_status'] == 'paid']
        if not page['has_more']:
            break
        after = page['data'][-1]['id']

    credited = {r['ref'] for r in db.select('deke_ledger', select='ref', ref='not.is.null')}
    parked = {r['session_id']: r for r in db.select('unmatched_payments')}
    missing = parked_open = 0
    for s in sessions:
        when = datetime.fromtimestamp(s['created'], ET).strftime('%Y-%m-%d %H:%M')
        amt = f'{s["amount_total"] / 100} {s["currency"]}'
        if s['id'] in credited:
            continue
        if s['id'] in parked:
            if parked[s['id']]['claimed_team'] is None:
                parked_open += 1
            continue
        missing += 1
        email = (s.get('customer_details') or {}).get('email') or ''
        print(f'  MISSING  {when}  {s["id"]}  {amt:<8}  team ref {s.get("client_reference_id") or "none":<6}  {email}')
    print(f'{len(sessions)} paid in last {a.days} days, {missing} missing, {parked_open} waiting in unmatched')
    if missing:
        print('fix: admin.py claim <session> <team> --dekes N')


def cmd_suggestions(a):
    teams = {t['id']: t['name'] for t in db.select('teams', select='id,name')}
    for s in db.select('icon_suggestions', order='created_at'):
        print(f'  {s["created_at"][:10]}  {teams.get(s["team_id"], s["team_id"]):<24}  {s["suggestion"]}')


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


def cmd_trades(a):
    for t in db.select('trades', select='*,trade_players(player_id,from_team,players(first_name,last_name,position))',
                       league_id=f'eq.{a.league}', order='id'):
        print(f'  {t["id"]:>4}  {t["status"]:<8}  team {t["from_team"]} -> team {t["to_team"]}')
        for tp in t['trade_players']:
            print(f'          from {tp["from_team"]:>4}  {tp["player_id"]}  {full_name(tp["players"])}  {tp["players"]["position"]}')


def cmd_cancel_trade(a):
    db.delete('trades', id=f'eq.{a.id}')
    print(f'trade {a.id} deleted')


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
    p.add_argument('--public', action='store_true', help='leagues are hidden by default')
    p.set_defaults(fn=cmd_create_league)

    p = sp.add_parser('leagues', help='list leagues; optional name search (case-insensitive, partial)')
    p.add_argument('query', nargs='?')
    p.set_defaults(fn=cmd_leagues)

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

    p = sp.add_parser('set-league-password', help='needed (with exact league name) to join on the site, 4+ chars')
    p.add_argument('league', type=int)
    p.add_argument('password')
    p.set_defaults(fn=cmd_set_league_password)

    p = sp.add_parser('dekes', help='Deke balances for a league')
    p.add_argument('league', type=int)
    p.set_defaults(fn=cmd_dekes)

    p = sp.add_parser('grant-dekes', help='give (or take, negative) Dekes; for gifts, refunds, failed webhooks')
    p.add_argument('team', type=int)
    p.add_argument('n', type=int)
    p.add_argument('--note')
    p.set_defaults(fn=cmd_grant_dekes)

    p = sp.add_parser('deke-log', help='every Deke purchase, grant and spend for a team')
    p.add_argument('team', type=int)
    p.set_defaults(fn=cmd_deke_log)

    p = sp.add_parser('unmatched', help='paid Stripe checkouts the webhook couldn\'t tie to a team')
    p.add_argument('--all', action='store_true', help='include already-claimed')
    p.set_defaults(fn=cmd_unmatched)

    p = sp.add_parser('claim', help='credit a paid Stripe session to a team (safe to repeat)')
    p.add_argument('session', help='cs_...')
    p.add_argument('team', type=int)
    p.add_argument('--dekes', type=int, help='required if the session isn\'t in unmatched')
    p.set_defaults(fn=cmd_claim)

    p = sp.add_parser('stripe-check', help='flag paid Stripe checkouts that never got credited')
    p.add_argument('--days', type=int, default=30)
    p.set_defaults(fn=cmd_stripe_check)

    p = sp.add_parser('suggestions', help='icon suggestions from owners')
    p.set_defaults(fn=cmd_suggestions)

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

    p = sp.add_parser('trades', help='pending + accepted owner trades')
    p.add_argument('league', type=int)
    p.set_defaults(fn=cmd_trades)

    p = sp.add_parser('cancel-trade', help='delete any trade, even accepted')
    p.add_argument('id', type=int)
    p.set_defaults(fn=cmd_cancel_trade)

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
