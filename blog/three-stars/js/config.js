export const SUPABASE_URL = 'https://ctyjgcimmpwlmtsedkbk.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_VbYYEdmoMrfSK_RAaFEIGA_hNJM_0Z_';



// ### DEKES ###

// Stripe Payment Link per bundle (leave '' until created; button shows "Soon"). Team id is appended as client_reference_id.
// supporter: 20+ Dekes in one purchase also makes the team a Three Stars Supporter (add_dekes, sql/08)
export const DEKE_BUNDLES = [
    { dekes: 10, price: '$3', url: 'https://buy.stripe.com/cNi3cw3KJ7DHdeUcY8enS07' },
    { dekes: 20, price: '$5', url: 'https://buy.stripe.com/fZu7sMbdb6zDfn2f6genS08', supporter: true },
];
export const SUPPORTER_BUNDLE = DEKE_BUNDLES.find(b => b.supporter);

// Unlockable packs, bought once and kept for good; keep in sync w/ all_packs() in sql/08_dekes.sql.
// Contents: EMOJIS / ICONS entries tagged with the pack id.
export const PACKS = [
    { id: 'classics', kind: 'emoji', label: 'Classics', price: 5 },
    { id: 'faces', kind: 'emoji', label: 'Faces', price: 10 },
    { id: 'hockey', kind: 'icon', label: 'Hockey Icons', price: 5 },
];

// Reaction emojis, img/emoji/<id>.<ext> (ext default svg). No pack = starter (starter_emojis() in sql/09_reactions.sql).
export const EMOJIS = [
    { id: 'fire', label: 'Fire' },
    { id: 'heart', label: 'Heart' },
    { id: 'thumbsup', label: 'Thumbs up' },
    { id: 'thumbsdown', label: 'Thumbs down' },
    { id: 'eyes', label: 'Eyes' },
    { id: 'cry', label: 'Crying' },
    { id: 'angry', label: 'Angry' },
    { id: 'skull', label: 'Skull' },
    { id: 'trash', label: 'Trash' },
    { id: 'lamp', label: 'Goal lamp', pack: 'classics' },
    { id: 'hat', label: 'Hat trick', pack: 'classics' },
    { id: 'star1', label: 'First star', pack: 'classics' },
    { id: 'star2', label: 'Second star', pack: 'classics' },
    { id: 'star3', label: 'Third star', pack: 'classics' },
    { id: 'brain', label: 'Big brain', pack: 'classics' },
    { id: 'poop', label: 'Poop', pack: 'classics' },
    { id: 'O_O', label: 'O_O', ext: 'png', pack: 'faces' },
    { id: 'sidemouth', label: 'Side mouth', ext: 'png', pack: 'faces' },
];

// Preset team icons; customize_team only accepts img/teams/<slug>.(svg|png), and pack icons only once the pack is owned
export const ICONS = [
    { path: 'img/teams/zamboni-drivers.svg', label: 'Zamboni' },
    { path: 'img/teams/five-hole-heroes.svg', label: 'Net' },
    { path: 'img/teams/top-shelf-tacos.svg', label: 'Taco' },
    { path: 'img/teams/pylon-patrol.svg', label: 'Pylon' },
    { path: 'img/teams/chirp-chirp.svg', label: 'Bird' },
    { path: 'img/teams/stanley_cup.png', label: 'Cup' },
    { path: 'img/teams/lightning.svg', label: 'Lightning' },
    { path: 'img/teams/flame.svg', label: 'Flame' },
    { path: 'img/teams/snowflake.svg', label: 'Snowflake' },
    { path: 'img/teams/crown.svg', label: 'Crown' },
    { path: 'img/teams/shield.svg', label: 'Shield' },
    { path: 'img/teams/anchor.svg', label: 'Anchor' },
    { path: 'img/teams/rocket.svg', label: 'Rocket' },
    { path: 'img/teams/pizza.svg', label: 'Pizza' },
    { path: 'img/teams/coffee.svg', label: 'Coffee' },
    { path: 'img/teams/puck.svg', label: 'Puck', pack: 'hockey' },
    { path: 'img/teams/crossed-sticks.svg', label: 'Sticks', pack: 'hockey' },
    { path: 'img/teams/skate.svg', label: 'Skate', pack: 'hockey' },
    { path: 'img/teams/helmet.svg', label: 'Helmet', pack: 'hockey' },
    { path: 'img/teams/goalie-mask.svg', label: 'Mask', pack: 'hockey' },
    { path: 'img/teams/jersey.svg', label: 'Jersey', pack: 'hockey' },
    { path: 'img/teams/whistle.svg', label: 'Whistle', pack: 'hockey' },
    { path: 'img/teams/goal-light.svg', label: 'Goal light', pack: 'hockey' },
    { path: 'img/teams/tooth.svg', label: 'Tooth', pack: 'hockey' },
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
