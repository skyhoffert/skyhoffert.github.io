import os
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')

REST = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1'
KEY = os.environ['SUPABASE_SECRET_KEY']

HEADERS = {'apikey': KEY, 'Content-Type': 'application/json'}
# Legacy JWT service keys also need the bearer header; new sb_secret_ keys must not use it
if KEY.startswith('eyJ'):
    HEADERS['Authorization'] = f'Bearer {KEY}'

_session = requests.Session()
_session.headers.update(HEADERS)



### CORE ###

def _check(r):
    if r.status_code >= 300:
        raise RuntimeError(f'{r.request.method} {r.url} -> {r.status_code}: {r.text}')
    return r.json() if r.text else None


def select(table, **params):
    params.setdefault('select', '*')
    return _check(_session.get(f'{REST}/{table}', params=params))


def insert(table, rows):
    r = _session.post(f'{REST}/{table}', json=rows, headers={'Prefer': 'return=representation'})
    return _check(r)


def upsert(table, rows, on_conflict, ignore=False):
    if not rows:
        return
    pref = 'resolution=ignore-duplicates' if ignore else 'resolution=merge-duplicates'
    for i in range(0, len(rows), 500):
        r = _session.post(
            f'{REST}/{table}',
            params={'on_conflict': on_conflict},
            json=rows[i:i + 500],
            headers={'Prefer': f'{pref},return=minimal'},
        )
        _check(r)


def update(table, values, **params):
    return _check(_session.patch(f'{REST}/{table}', params=params, json=values, headers={'Prefer': 'return=representation'}))


def delete(table, **params):
    return _check(_session.delete(f'{REST}/{table}', params=params))


def rpc(fn, **args):
    return _check(_session.post(f'{REST}/rpc/{fn}', json=args))
