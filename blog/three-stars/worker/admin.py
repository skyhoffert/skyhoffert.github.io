import argparse
import os
import random
import re
import sys
import time
import unicodedata
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

import db

ET = ZoneInfo('America/New_York')
SLOT_TYPES = 'FDGXS'
CONFIG = (('f', 'n_f'), ('d', 'n_d'), ('g', 'n_g'), ('x', 'n_x'), ('s', 'n_s'), ('max_teams', 'max_teams'))
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


def slot_key(slot):
    return SLOT_TYPES.index(slot[0]), slot


# Only checks the format; the DB trigger checks the league actually has the slot
def die_if_bad_slot(slot):
    if not re.fullmatch(r'[FDGXS][1-9]', slot):
        sys.exit('slot must be a type F D G X(flex) S(superflex) + number, e.g. F1, G1, X2')


def config_vals(a):
    return {col: getattr(a, arg) for arg, col in CONFIG if getattr(a, arg) is not None}


def add_config_args(p):
    p.add_argument('--f', type=int, help='forward slots (default 2)')
    p.add_argument('--d', type=int, help='defense slots (default 2)')
    p.add_argument('--g', type=int, help='goalie slots (default 1)')
    p.add_argument('--x', type=int, help='flex F/D slots (default 1)')
    p.add_argument('--s', type=int, help='superflex F/D/G slots (default 0)')
    p.add_argument('--max-teams', type=int, help='1-16 (default 10)')



### LEAGUES & TEAMS ###

def cmd_create_league(a):
    db.insert('leagues', [{'id': a.id, 'name': a.name, 'season': a.season,
                              'first_scoring_week': a.first_week, 'hidden': not a.public, **config_vals(a)}])
    print(f'league {a.id} created')


def config_str(lg):
    return f'{lg["n_f"]}F {lg["n_d"]}D {lg["n_g"]}G {lg["n_x"]}X {lg["n_s"]}S  max {lg["max_teams"]} teams'


# Lowering a slot count fails (DB trigger) while that slot is filled in the latest week
def cmd_league_config(a):
    vals = config_vals(a)
    if vals:
        db.update('leagues', vals, id=f'eq.{a.league}')
    print(f'league {a.league}: {config_str(db.select("leagues", id=f"eq.{a.league}")[0])}')


def cmd_leagues(a):
    params = {'order': 'id'}
    if a.query:
        params['name'] = f'ilike.*{a.query}*'
    for lg in db.select('leagues', **params):
        pw = 'password' if lg.get('pass_hash') else 'NO PASSWORD'
        hidden = 'hidden' if lg['hidden'] else ''
        print(f'  {lg["id"]:>4}  {lg["name"]:<32} {lg["season"]}  first {lg["first_scoring_week"]}  {pw:<11}  {hidden:<6}  {config_str(lg)}')


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
        print(f'  {t["id"]:>4}  {t["name"]:<28} {t["dekes"]:>4} dekes  {"supporter " + str(t["supporter_season"]) if t.get("supporter_season") else ""}')


def cmd_grant_dekes(a):
    bal = db.rpc('add_dekes', p_team=a.team, p_delta=a.n, p_reason='grant', p_detail=a.note)
    print(f'team {a.team}: {a.n:+} dekes, balance {bal}')


# Supporter for the team's league's current season
def cmd_supporter(a):
    t = db.select('teams', select='league_id', id=f'eq.{a.team}')[0]
    season = None if a.off else db.select('leagues', select='season', id=f'eq.{t["league_id"]}')[0]['season']
    db.update('teams', {'supporter_season': season}, id=f'eq.{a.team}')
    print(f'team {a.team} supporter {"off" if a.off else f"for season {season}"}')


# Free weekly reaction pass for every team in the league
def cmd_grant_pass(a):
    wk = parse_week(a.week, current_week())
    teams = db.select('teams', select='id', league_id=f'eq.{a.league}')
    db.upsert('reaction_passes', [{'team_id': t['id'], 'week': str(wk)} for t in teams], 'team_id,week', ignore=True)
    print(f'league {a.league}: reaction pass for week {wk} granted to {len(teams)} teams')


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


def cmd_feedback(a):
    params = {'order': 'created_at', 'select': '*,teams(name)'}
    if not a.all:
        params['done'] = 'is.false'
    rows = db.select('feedback', **params)
    for r in rows:
        who = r['teams']['name'] if r.get('teams') else 'anon'
        print(f'  #{r["id"]:<4} {r["created_at"][:16]}  {r["kind"]:<5}  league {r["league_id"]}  {who}'
              f'{"  (" + r["contact"] + ")" if r["contact"] else ""}{"  [done]" if r["done"] else ""}')
        print('        ' + r['message'].replace('\n', '\n        '))
    if not rows:
        print('  no messages')


def cmd_feedback_done(a):
    db.update('feedback', {'done': True}, id=f'in.({",".join(map(str, a.ids))})')
    print(f'marked done: {a.ids}')


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
    for r in sorted(rows, key=lambda r: (r['team_id'], slot_key(r['slot']))):
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
    rows = db.select('waiver_ins', select='team_id,player_id,drop_player_id,'
                     'add:players!waiver_ins_player_id_fkey(first_name,last_name,position),'
                     'drop:players!waiver_ins_drop_player_id_fkey(first_name,last_name,position)',
                     league_id=f'eq.{a.league}', order='team_id,created_at')
    n, last_team = 0, None
    for r in rows:
        n = n + 1 if r['team_id'] == last_team else 1
        last_team = r['team_id']
        print(f'  team {r["team_id"]:>4}  #{n}  add {r["player_id"]} {full_name(r["add"])} {r["add"]["position"]}'
              f'  drop {r["drop_player_id"]} {full_name(r["drop"])} {r["drop"]["position"]}')
    if not rows:
        print('  no claims')


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



### DRAFT ###

RANK_LINE = re.compile(r'^\s*(\d{1,3})\.\s+(.+?),\s*([FDG]),\s*([A-Z]{3})\b')
BUCKET = {'F': FWD, 'D': ('D',), 'G': ('G',)}


def norm(s):
    return re.sub(r'[^a-z]', '', unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower())


# PostgREST caps a response at 1000 rows
def select_all(table, **params):
    out, off = [], 0
    while True:
        page = db.select(table, limit=1000, offset=off, **params)
        out += page
        if len(page) < 1000:
            return out
        off += 1000


# [(rank, name, F/D/G, team)] from the NHL.com rankings PDF, or a text file with the same "N. Name, P, TEAM" lines
def parse_ranks(path):
    if path.lower().endswith('.pdf'):
        import pypdf
        text = '\n'.join(p.extract_text() or '' for p in pypdf.PdfReader(path).pages)
    else:
        text = open(path, encoding='utf-8').read()
    rows = {}
    for line in text.splitlines():
        m = RANK_LINE.match(line)
        if m:
            rows.setdefault(int(m[1]), (int(m[1]), m[2].strip(), m[3], m[4]))
    return [rows[k] for k in sorted(rows)]


def match_rank(by_name, by_last, name, bucket, team):
    pos = BUCKET[bucket]
    cands = [p for p in by_name.get(norm(name), []) if p['position'] in pos]
    if len(cands) > 1:
        cands = [p for p in cands if p['nhl_team'] == team]
    if not cands:
        cands = [p for p in by_last.get(norm(name.split()[-1]), []) if p['position'] in pos and p['nhl_team'] == team]
    return cands


def cmd_ranks_import(a):
    rows = parse_ranks(a.file)
    missing = sorted(set(range(1, max((r[0] for r in rows), default=0) + 1)) - {r[0] for r in rows})
    print(f'parsed {len(rows)} ranks' + (f', missing numbers {missing}' if missing else ''))
    players = select_all('players', select='id,first_name,last_name,position,nhl_team')
    by_name, by_last = {}, {}
    for p in players:
        by_name.setdefault(norm(full_name(p)), []).append(p)
        by_last.setdefault(norm(p['last_name'].split()[-1]), []).append(p)

    out, misses, seen = [], [], {}
    for rank, name, bucket, team in rows:
        cands = match_rank(by_name, by_last, name, bucket, team)
        if len(cands) != 1:
            misses.append((rank, name, bucket, team, cands))
            continue
        p = cands[0]
        if p['id'] in seen:
            misses.append((rank, name, bucket, team, [p]))
            continue
        seen[p['id']] = rank
        if p['nhl_team'] != team:
            print(f'  note #{rank} {name}: list says {team}, DB says {p["nhl_team"]}')
        out.append({'season': a.season, 'player_id': p['id'], 'rank': rank, 'source': a.source})

    for rank, name, bucket, team, cands in misses:
        print(f'  MISS #{rank} {name} {bucket} {team}: ' +
              (', '.join(f'{p["id"]} {full_name(p)} {p["position"]} {p["nhl_team"]}' for p in cands) or 'no candidates'))
    print(f'{len(out)} matched, {len(misses)} missed' + ('' if not misses else f'; fix with: rank-set {a.season} <rank> <player id>'))
    if a.dry_run:
        print('dry run, nothing written')
        return
    db.delete('player_ranks', season=f'eq.{a.season}', source=f'eq.{a.source}')
    db.upsert('player_ranks', out, 'season,player_id')
    print(f'season {a.season}: {len(out)} ranks written ({a.source})')


def cmd_rank_set(a):
    p = resolve_player(a.player)
    db.upsert('player_ranks', [{'season': a.season, 'player_id': p['id'], 'rank': a.rank, 'source': a.source}], 'season,player_id')
    print(f'season {a.season}: #{a.rank} {full_name(p)} {p["position"]} {p["nhl_team"]}')


def league_draft(league):
    lg = db.select('leagues', id=f'eq.{league}')
    if not lg:
        sys.exit(f'no league {league}')
    d = db.select('drafts', league_id=f'eq.{league}', season=f'eq.{lg[0]["season"]}')
    return lg[0], (d[0] if d else None)


def print_order(league, order):
    names = {t['id']: t for t in db.select('teams', league_id=f'eq.{league}')}
    for i, t in enumerate(order, 1):
        print(f'  {i:>2}. team {t:>4}  {names[t]["name"]:<28} {names[t]["owner"]}')


def save_order(lg, d, order, typ=None):
    if d and d['status'] == 'done':
        sys.exit(f'draft already ran at {d["ran_at"]}')
    if d and db.select('draft_picks', select='overall', draft_id=f'eq.{d["id"]}', limit=1):
        sys.exit('draft is in progress (slow draft); order is locked')
    vals ={'draft_order': order, **({'type': typ} if typ else {})}
    if d:
        db.update('drafts', vals, id=f'eq.{d["id"]}')
    else:
        db.insert('drafts', [{'league_id': lg['id'], 'season': lg['season'], **vals}])


def cmd_draft_init(a):
    lg, d = league_draft(a.league)
    order = [t['id'] for t in db.select('teams', select='id', league_id=f'eq.{a.league}')]
    if not order:
        sys.exit('league has no teams')
    random.shuffle(order)
    if a.no_order:
        order = []
    save_order(lg, d, order, 'linear' if a.linear else 'snake')
    print(f'league {a.league} draft open ({"linear" if a.linear else "snake"}), ' + ('order TBD' if a.no_order else 'random order:'))
    print_order(a.league, order)


def cmd_draft_order(a):
    lg, d = league_draft(a.league)
    if not d:
        sys.exit('no draft yet: run draft-init first')
    teams = {t['id'] for t in db.select('teams', select='id', league_id=f'eq.{a.league}')}
    if len(a.teams) != len(set(a.teams)) or set(a.teams) != teams:
        sys.exit(f'order must list every team in league {a.league} exactly once: {sorted(teams)}')
    save_order(lg, d, a.teams)
    print(f'league {a.league} draft order set:')
    print_order(a.league, a.teams)


def set_draft_time(a, col, label):
    lg, d = league_draft(a.league)
    if not d:
        sys.exit('no draft yet: run draft-init first')
    if not a.clear and not a.when:
        sys.exit('pass "YYYY-MM-DD HH:MM" or --clear')
    at = None if a.clear else datetime.fromisoformat(a.when).replace(tzinfo=ET)
    db.update('drafts', {col: at.isoformat() if at else None}, id=f'eq.{d["id"]}')
    print(f'league {a.league} {label} time ' + (at.strftime('%a %b %d %I:%M %p ET') if at else 'cleared'))


# Countdown on the draft page only; the draft still runs by hand
def cmd_draft_time(a):
    set_draft_time(a, 'scheduled_at', 'draft')


# Shown in the banner + trade/waiver hints until midweek runs; still run by hand
def cmd_midweek_time(a):
    set_draft_time(a, 'midweek_at', 'midweek')


def print_picks(draft_id):
    picks = db.select('draft_picks', select='overall,round,team_id,wish_rank,players(first_name,last_name,position,nhl_team)',
                      draft_id=f'eq.{draft_id}', order='overall')
    for p in picks:
        pl = p['players']
        src = f'wish #{p["wish_rank"]}' if p['wish_rank'] else 'auto'
        print(f'  {p["overall"]:>3}  R{p["round"]}  team {p["team_id"]:>4}  {full_name(pl):<28} {pl["position"]}  {pl["nhl_team"]:<4} {src}')


def cmd_draft_show(a):
    lg, d = league_draft(a.league)
    if not d:
        sys.exit('no draft yet: run draft-init first')
    print(f'league {a.league} season {d["season"]}: {d["type"]}, {d["status"]}'
          f'{", scheduled " + d["scheduled_at"][:16] if d.get("scheduled_at") else ""}'
          f'{", ran " + d["ran_at"][:16] if d["ran_at"] else ""}{", midweek " + d["midweek_ran_at"][:16] if d["midweek_ran_at"] else ""}'
          f'{", midweek posted " + d["midweek_at"][:16] if d.get("midweek_at") and not d["midweek_ran_at"] else ""}')
    print_order(a.league, d['draft_order'])
    counts = {}
    for w in db.select('draft_wishlists', select='team_id', draft_id=f'eq.{d["id"]}'):
        counts[w['team_id']] = counts.get(w['team_id'], 0) + 1
    print('wishlists: ' + (', '.join(f'team {t} {n}' for t, n in sorted(counts.items())) or 'none'))
    if d['status'] == 'done':
        print_picks(d['id'])


def cmd_draft(a):
    lg, d = league_draft(a.league)
    if not d or d['status'] != 'open':
        sys.exit('no open draft for this league')
    if not a.skip_players:
        import ingest
        ingest.refresh_players()
    if not a.slow:
        res = db.rpc('run_draft', p_league=a.league)
        print(f'week {res["week"]}: {res["picks"]} picks, {res["from_wishlist"]} from wishlists')
        print_picks(d['id'])
        return
    # Slow: one round, then a gap for wishlist edits. Ctrl-C (or the stop file) and re-run to resume from the next round.
    # The run file is a heartbeat so draft-watch knows one is going.
    run, stop = draft_file(a.league, 'run'), draft_file(a.league, 'stop')
    stop.unlink(missing_ok=True)
    try:
        while True:
            run.touch()
            res = db.rpc('run_draft', p_league=a.league, p_rounds=1)
            print(f'round {res["round"]}/{res["rounds"]}: {res["picks"]} picks, {res["from_wishlist"]} from wishlists', flush=True)
            if res['done']:
                break
            at = datetime.now(timezone.utc) + timedelta(seconds=a.slow)
            db.update('drafts', {'next_round_at': at.isoformat()}, id=f'eq.{d["id"]}')
            print(f'  next round at {at.astimezone(ET):%I:%M:%S %p} ET', flush=True)
            while (left := (at - datetime.now(timezone.utc)).total_seconds()) > 0:
                if stop.exists():
                    stop.unlink(missing_ok=True)
                    db.update('drafts', {'next_round_at': None}, id=f'eq.{d["id"]}')
                    print('  stopped; re-run to resume', flush=True)
                    return
                run.touch()
                time.sleep(min(2, left))
    finally:
        run.unlink(missing_ok=True)
    print_picks(d['id'])


def cmd_midweek(a):
    res = db.rpc('run_midweek', p_league=a.league)
    print(f'week {res["week"]}: {res["trades"]} trade(s), {res["waivers"]} waiver claim(s) applied')


# Wipes the league's rosters + moves too, so test leagues only
def draft_reset(league):
    lg, d = league_draft(league)
    if not d:
        sys.exit('no draft yet: run draft-init first')
    db.delete('draft_picks', draft_id=f'eq.{d["id"]}')
    db.delete('roster_weeks', league_id=f'eq.{league}')
    db.delete('moves', league_id=f'eq.{league}')
    db.update('drafts', {'status': 'open', 'ran_at': None, 'midweek_ran_at': None, 'next_round_at': None}, id=f'eq.{d["id"]}')
    print(f'league {league} draft reset: picks, rosters, moves cleared; open')


def cmd_draft_reset(a):
    if not a.yes:
        sys.exit(f'deletes ALL rosters and moves in league {a.league}; pass --yes')
    draft_reset(a.league)


def draft_file(league, kind):
    return Path(__file__).parent / f'draft-{league}.{kind}'


def draft_running(league):
    run = draft_file(league, 'run')
    return run.exists() and time.time() - run.stat().st_mtime < 30


# Asks a running slow draft to stop; waits up to 15s for it to exit
def draft_stop(league):
    if not draft_running(league):
        return
    draft_file(league, 'stop').touch()
    for _ in range(15):
        if not draft_running(league):
            return
        time.sleep(1)


# Polls every 10s until Ctrl-C (--once: ~55s, for cron). An owner in the league sends one via Message the Dev:
#   start draft [secs]  start, or resume a stopped one (default --slow)
#   stop draft          pause after the current round; start resumes
#   cancel draft        stop + reset   (--allow-reset only)
#   reset draft         reset, even a finished draft (--allow-reset only)
def cmd_draft_watch(a):
    end = time.time() + 55 if a.once else float('inf')
    print(f'watching league {a.league} feedback for draft commands (Ctrl-C to quit)', flush=True)
    while True:
        rows = db.select('feedback', select='id,team_id,message', done='is.false', league_id=f'eq.{a.league}',
                         team_id='not.is.null', order='created_at')
        for r in rows:
            m = re.fullmatch(r'(start|stop|cancel|reset) draft(?: (\d+))?', r['message'].strip().lower())
            if not m:
                continue
            db.update('feedback', {'done': True}, id=f'eq.{r["id"]}')
            cmd, secs = m[1], min(max(int(m[2] or a.slow), 10), 600)
            print(f'{datetime.now(ET):%m-%d %H:%M:%S} #{r["id"]} team {r["team_id"]}: {r["message"].strip()}', flush=True)
            if cmd == 'stop':
                draft_stop(a.league)
                print('  stopped', flush=True)
            elif cmd in ('cancel', 'reset'):
                if not a.allow_reset:
                    print('  skipped: --allow-reset not set', flush=True)
                    continue
                draft_stop(a.league)
                draft_reset(a.league)
            else:
                lg, d = league_draft(a.league)
                if not d or d['status'] != 'open' or draft_running(a.league):
                    print('  skipped: draft not open or already running', flush=True)
                    continue
                import subprocess
                log = open(Path(__file__).parent / f'draft-{a.league}.log', 'a')
                subprocess.Popen([sys.executable, '-u', __file__, 'draft', str(a.league), '--slow', str(secs), '--skip-players'],
                                 stdout=log, stderr=log, cwd=Path(__file__).parent, start_new_session=True,
                                 creationflags=getattr(subprocess, 'CREATE_NEW_PROCESS_GROUP', 0))
                draft_file(a.league, 'run').touch()
                print(f'  started: --slow {secs}, log draft-{a.league}.log', flush=True)
        if time.time() > end:
            return
        time.sleep(10)



### CHECK-IN ###

ISSUES = Path(__file__).parent.parent / 'ISSUES.md'
CHANGELOG = Path(__file__).parent.parent / 'CHANGELOG.md'


def hours_ago(iso):
    return (datetime.now(ET) - datetime.fromisoformat(iso)).total_seconds() / 3600


# Open items = "- " lines under "## Open" in ISSUES.md
def open_issues():
    if not ISSUES.exists():
        return None
    out, on = [], False
    for line in ISSUES.read_text(encoding='utf-8').splitlines():
        if line.startswith('## '):
            on = line[3:].strip().lower() == 'open'
        elif on and line.startswith('- '):
            out.append(line[2:].strip())
    return out


def cmd_checkin(a):
    import nhl
    warns = []

    def check(ok, msg):
        print(f'  {"ok" if ok else "!!"}  {msg}')
        if not ok:
            warns.append(msg)

    def note(msg):
        print(f'  --  {msg}')

    print('Ingest')
    p = db.select('players', select='updated_at', order='updated_at.desc', limit=1)
    check(bool(p) and hours_ago(p[0]['updated_at']) < 30,
          f'players refreshed {hours_ago(p[0]["updated_at"]):.0f}h ago' if p else 'no players')
    g = db.select('games', select='ingested_at', order='ingested_at.desc', limit=1)
    check(bool(g) and hours_ago(g[0]['ingested_at']) < 30,
          f'last game ingest {hours_ago(g[0]["ingested_at"]):.0f}h ago' if g else 'no games')
    yday = datetime.now(ET).date() - timedelta(days=1)
    try:
        final = [x['id'] for x in nhl.schedule(yday) if x['gameType'] == nhl.REGULAR_SEASON and x['gameState'] in nhl.FINAL_STATES]
        ids = ','.join(map(str, final))
        stored = {r['id'] for r in db.select('games', select='id', id=f'in.({ids})')} if final else set()
        starred = {r['game_id'] for r in db.select('game_stars', select='game_id', game_id=f'in.({ids})')} if final else set()
        check(len(stored) == len(final), f'{yday}: {len(stored)}/{len(final)} final games stored')
        if final:
            check(len(starred) == len(final), f'{yday}: {len(starred)}/{len(final)} games have three stars')
    except Exception as e:
        check(False, f'NHL schedule check failed: {e}')

    print('Leagues')
    cur = current_week()
    for lg in db.select('leagues', order='id'):
        name = f'{lg["id"]} {lg["name"]}'
        last = db.select('roster_weeks', select='week', league_id=f'eq.{lg["id"]}', order='week.desc', limit=1)
        if not last:
            note(f'{name}: no rosters yet')
        else:
            wk = date.fromisoformat(last[0]['week'])
            check(wk >= cur, f'{name}: rosters at week {wk}' + ('' if wk >= cur else f', current is {cur} (rollover not done)'))
        failed = db.select('pending_transactions', select='id', league_id=f'eq.{lg["id"]}', status='eq.failed')
        if failed:
            check(False, f'{name}: {len(failed)} failed admin txn(s) (txns {lg["id"]} --all)')
        d = db.select('drafts', league_id=f'eq.{lg["id"]}', season=f'eq.{lg["season"]}')
        if not d:
            continue
        d = d[0]
        if d['status'] == 'open':
            teams = {t['id'] for t in db.select('teams', select='id', league_id=f'eq.{lg["id"]}')}
            wl = {w['team_id'] for w in db.select('draft_wishlists', select='team_id', draft_id=f'eq.{d["id"]}')}
            note(f'{name}: draft open, {len(wl)}/{len(teams)} teams have wishlists')
            check(set(d['draft_order']) == teams, f'{name}: draft order ' + ('set' if set(d['draft_order']) == teams else 'not set or missing teams (draft-init)'))
            if d.get('scheduled_at') and hours_ago(d['scheduled_at']) > 0:
                check(False, f'{name}: draft was scheduled {d["scheduled_at"][:16]} UTC and hasn\'t run (draft {lg["id"]})')
        elif not d['midweek_ran_at'] and d.get('midweek_at'):
            if hours_ago(d['midweek_at']) > 0:
                check(False, f'{name}: midweek was posted for {d["midweek_at"][:16]} UTC and hasn\'t run (midweek {lg["id"]})')
            else:
                note(f'{name}: midweek posted for {d["midweek_at"][:16]} UTC (midweek {lg["id"]})')

    print('Payments')
    um = db.select('unmatched_payments', select='session_id', claimed_team='is.null')
    check(not um, f'{len(um)} unmatched payment(s) (unmatched)' if um else 'no unmatched payments')

    print('Feedback')
    fb = db.select('feedback', select='id,kind,message,created_at', done='is.false', order='created_at')
    if not fb:
        note('no new messages')
    for r in fb:
        note(f'#{r["id"]} {r["created_at"][:10]} {r["kind"]}: {" ".join(r["message"].split())[:90]}')
    if fb:
        warns.append(f'{len(fb)} feedback message(s)')

    print('Issues')
    issues = open_issues()
    if issues is None:
        note('no ISSUES.md')
    else:
        note(f'{len(issues)} open in ISSUES.md')
        for i in issues:
            note(i)

    print('Changelog')
    weeks = re.findall(r'^## Week of (.+)$', CHANGELOG.read_text(encoding='utf-8'), re.M) if CHANGELOG.exists() else []
    newest = max((datetime.strptime(w.strip(), '%b %d, %Y').date() for w in weeks), default=None)
    check(newest is not None and newest >= cur - timedelta(days=7),
          f'newest entry: week of {newest}' + ('' if newest and newest >= cur - timedelta(days=7) else ', add this week\'s (CHANGELOG.md)')
          if newest else 'no "## Week of Mon D, YYYY" entries in CHANGELOG.md')

    print(f'\n{len(warns)} thing(s) need attention' if warns else '\nall good')



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
    lg = db.insert('leagues', [{'id': 0, 'name': 'Test League', 'season': 20262027,
                                   'first_scoring_week': str(week), 'hidden': True, **config_vals(a)}])[0]
    pool_of = {'F': lambda: 'F', 'D': lambda: 'D', 'G': lambda: 'G',
               'X': lambda: random.choice('FD'), 'S': lambda: random.choice('FFFDDG')}
    slots = [f'{t}{i}' for t in SLOT_TYPES for i in range(1, lg[f'n_{t.lower()}'] + 1)]

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
        for slot in slots:
            pool = pool_of[slot[0]]()
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
    add_config_args(p)
    p.set_defaults(fn=cmd_create_league)

    p = sp.add_parser('league-config', help='show or change roster slot counts and team cap')
    p.add_argument('league', type=int)
    add_config_args(p)
    p.set_defaults(fn=cmd_league_config)

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

    p = sp.add_parser('supporter', help='mark a team as Three Stars Supporter for its league\'s season (auto on any 40+ Deke purchase)')
    p.add_argument('team', type=int)
    p.add_argument('--off', action='store_true')
    p.set_defaults(fn=cmd_supporter)

    p = sp.add_parser('grant-pass', help='free weekly reaction pass for every team in a league (default current week)')
    p.add_argument('league', type=int)
    p.add_argument('--week')
    p.set_defaults(fn=cmd_grant_pass)

    p = sp.add_parser('deke-log',help='every Deke purchase, grant and spend for a team')
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

    p = sp.add_parser('checkin', help='daily dev check: ingest/rollover health, drafts, payments, feedback, ISSUES.md')
    p.set_defaults(fn=cmd_checkin)

    p = sp.add_parser('feedback', help='messages sent from the Support page (unhandled only unless --all)')
    p.add_argument('--all', action='store_true')
    p.set_defaults(fn=cmd_feedback)

    p = sp.add_parser('feedback-done', help='mark feedback messages handled')
    p.add_argument('ids', type=int, nargs='+')
    p.set_defaults(fn=cmd_feedback_done)

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

    p = sp.add_parser('ranks-import', help='default draft ranking from the NHL.com rankings PDF (or a text file of "N. Name, P, TEAM" lines)')
    p.add_argument('file')
    p.add_argument('--season', type=int, default=20262027)
    p.add_argument('--source', default='nhl.com top 200')
    p.add_argument('--dry-run', action='store_true', help='match and report only')
    p.set_defaults(fn=cmd_ranks_import)

    p = sp.add_parser('rank-set', help='set one player\'s default draft rank (fix ranks-import misses)')
    p.add_argument('season', type=int)
    p.add_argument('rank', type=int)
    p.add_argument('player')
    p.add_argument('--source', default='nhl.com top 200')
    p.set_defaults(fn=cmd_rank_set)

    p = sp.add_parser('draft-init', help='open the league\'s draft with a random order; re-run to re-roll until it runs')
    p.add_argument('league', type=int)
    p.add_argument('--linear', action='store_true', help='same order every round (default snake)')
    p.add_argument('--no-order', action='store_true', help='open for wishlists, order TBD (re-run without it to roll)')
    p.set_defaults(fn=cmd_draft_init)

    p = sp.add_parser('draft-order', help='set the full draft order by hand')
    p.add_argument('league', type=int)
    p.add_argument('teams', type=int, nargs='+', help='team ids, first pick first')
    p.set_defaults(fn=cmd_draft_order)

    p = sp.add_parser('draft-time', help='when the draft will run, for the countdown on the draft page (ET)')
    p.add_argument('league', type=int)
    p.add_argument('when', nargs='?', help='"YYYY-MM-DD HH:MM" Eastern, e.g. "2026-10-03 17:00"')
    p.add_argument('--clear', action='store_true')
    p.set_defaults(fn=cmd_draft_time)

    p = sp.add_parser('draft-show', help='draft order, wishlist counts, picks')
    p.add_argument('league', type=int)
    p.set_defaults(fn=cmd_draft_show)

    p = sp.add_parser('draft', help='run the draft now into the current week (refreshes NHL rosters first)')
    p.add_argument('league', type=int)
    p.add_argument('--skip-players', action='store_true', help='skip the roster refresh')
    p.add_argument('--slow', type=int, metavar='SECS', help='one round at a time, SECS apart for wishlist edits; re-run to resume')
    p.set_defaults(fn=cmd_draft)

    p = sp.add_parser('draft-reset', help='TEST LEAGUES: reopen the draft, deleting picks, all rosters and moves')
    p.add_argument('league', type=int)
    p.add_argument('--yes', action='store_true')
    p.set_defaults(fn=cmd_draft_reset)

    p = sp.add_parser('draft-watch', help='cron: owners start/stop/cancel/reset the slow draft via Message the Dev')
    p.add_argument('league', type=int)
    p.add_argument('--slow', type=int, default=120, metavar='SECS', help='default gap for "start draft" with no secs')
    p.add_argument('--allow-reset', action='store_true', help='also honor "cancel draft" / "reset draft" (test leagues only)')
    p.add_argument('--once', action='store_true', help='poll ~55s then exit (cron every minute)')
    p.set_defaults(fn=cmd_draft_watch)

    p = sp.add_parser('midweek', help='one extra trades + waivers pass after the draft, reverse draft order; once per draft')
    p.add_argument('league', type=int)
    p.set_defaults(fn=cmd_midweek)

    p = sp.add_parser('midweek-time', help='when midweek will run, shown to players until it does (ET)')
    p.add_argument('league', type=int)
    p.add_argument('when', nargs='?', help='"YYYY-MM-DD HH:MM" Eastern, e.g. "2026-10-04 04:00"')
    p.add_argument('--clear', action='store_true')
    p.set_defaults(fn=cmd_midweek_time)

    p = sp.add_parser('seed-test')
    p.add_argument('--week', help='first week, default 2026-09-28')
    p.add_argument('--reset', action='store_true')
    add_config_args(p)
    p.set_defaults(fn=cmd_seed_test)

    a = ap.parse_args()
    a.fn(a)


if __name__ == '__main__':
    main()
