export const SUPABASE_URL = 'https://ctyjgcimmpwlmtsedkbk.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_VbYYEdmoMrfSK_RAaFEIGA_hNJM_0Z_';



// ### DEKES ###

// Stripe Payment Link per bundle (leave '' until created; button shows "Soon"). Team id is appended as client_reference_id.
export const DEKE_BUNDLES = [
    { dekes: 3, price: '$3', url: 'https://buy.stripe.com/9B6cN64ON1fj3Ek9LWenS03' },
    { dekes: 7, price: '$5', url: 'https://buy.stripe.com/eVq9AUbdb3nr8YE7DOenS04' },
    { dekes: 15, price: '$10', url: 'https://buy.stripe.com/bJe28s6WV1fj6QwgakenS05' },
];

// Reaction emojis, img/emoji/<id>.svg; keep in sync w/ reaction_emojis() in sql/09_reactions.sql. fire is free.
export const EMOJIS = [
    { id: 'fire', label: 'Fire' },
    { id: 'lamp', label: 'Goal lamp' },
    { id: 'hat', label: 'Hat trick' },
    { id: 'trash', label: 'Trash' },
    { id: 'angry', label: 'Angry' },
];
export const EMOJI_PRICE = 3;
export const PASS_PRICE = 1;

// Preset team icons; customize_team only accepts img/teams/<slug>.(svg|png)
export const ICONS = [
    { path: 'img/teams/zamboni-drivers.svg', label: 'Zamboni' },
    { path: 'img/teams/five-hole-heroes.svg', label: 'Net' },
    { path: 'img/teams/top-shelf-tacos.svg', label: 'Taco' },
    { path: 'img/teams/pylon-patrol.svg', label: 'Pylon' },
    { path: 'img/teams/chirp-chirp.svg', label: 'Bird' },
    { path: 'img/teams/stanley_cup.png', label: 'Cup' },
];



// ### LEAGUES ###

// Joined leagues [{id, name}] + current league id, remembered per device. Changing either reloads the app.
const LIST_KEY = 'ts:leagues', CUR_KEY = 'ts:league';

function read(k) {
    try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
}

function write(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

export const LEAGUES = read(LIST_KEY) ?? [];
const cur = read(CUR_KEY);
// Note: test league id is 0, so always compare against null
export const LEAGUE = LEAGUES.some(l => l.id === cur) ? cur : null;

const reload = () => location.replace(location.pathname);

export function joinLeague(league) {
    write(LIST_KEY, [...LEAGUES.filter(l => l.id !== league.id), league]);
    write(CUR_KEY, league.id);
    reload();
}

export function switchLeague(id) {
    write(CUR_KEY, id);
    reload();
}

export function leaveLeague(id) {
    const rest = LEAGUES.filter(l => l.id !== id);
    write(LIST_KEY, rest);
    write(CUR_KEY, rest[0]?.id ?? null);
    reload();
}
