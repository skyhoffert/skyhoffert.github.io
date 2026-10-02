export const SUPABASE_URL = 'https://ctyjgcimmpwlmtsedkbk.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_VbYYEdmoMrfSK_RAaFEIGA_hNJM_0Z_';



// ### DEKES ###

// Stripe Payment Link per bundle (leave '' until created; button shows "Soon"). Team id is appended as client_reference_id.
// supporter: 40+ Dekes in one purchase also makes the team a Three Stars Supporter (add_dekes, sql/08)
export const DEKE_BUNDLES = [
    { dekes: 3, price: '$3', url: 'https://buy.stripe.com/9B6cN64ON1fj3Ek9LWenS03' },
    { dekes: 7, price: '$5', url: 'https://buy.stripe.com/eVq9AUbdb3nr8YE7DOenS04' },
    { dekes: 15, price: '$10', url: 'https://buy.stripe.com/bJe28s6WV1fj6QwgakenS05' },
    { dekes: 40, price: '$20', url: 'https://buy.stripe.com/aFa6oIftr2jn5Ms5vGenS06', supporter: true },
];
export const SUPPORTER_BUNDLE = DEKE_BUNDLES.find(b => b.supporter);

// Reaction emojis, img/emoji/<id>.<ext> (ext default svg); keep in sync w/ reaction_emojis() in sql/09_reactions.sql. fire is free.
export const EMOJIS = [
    { id: 'fire', label: 'Fire' },
    { id: 'lamp', label: 'Goal lamp' },
    { id: 'hat', label: 'Hat trick' },
    { id: 'trash', label: 'Trash' },
    { id: 'angry', label: 'Angry' },
    { id: 'star1', label: 'First star' },
    { id: 'star2', label: 'Second star' },
    { id: 'star3', label: 'Third star' },
    { id: 'heart', label: 'Heart' },
    { id: 'cry', label: 'Crying' },
    { id: 'poop', label: 'Poop' },
    { id: 'brain', label: 'Big brain' },
    { id: 'thumbsup', label: 'Thumbs up' },
    { id: 'thumbsdown', label: 'Thumbs down' },
    { id: 'eyes', label: 'Eyes' },
    { id: 'skull', label: 'Skull' },
    { id: 'O_O', label: 'O_O', ext: 'png' },
    { id: 'sidemouth', label: 'Side mouth', ext: 'png' },
];
export const EMOJI_PRICE = 3;
export const PASS_PRICE = 1;
export const SEASON_PASS_PRICE = 10;

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
