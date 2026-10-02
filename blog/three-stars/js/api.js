import { SUPABASE_URL, SUPABASE_KEY, LEAGUE } from './config.js';
import { remainingMs, mark } from './cooldown.js';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);



// ### RPC ###

async function rpc(fn, args) {
    const { data, error } = await db.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data;
}

const call = (fn, args = {}) => rpc(fn, { p_league: LEAGUE, ...args });

export const getStandings = () => call('get_standings');
export const getRecentStars = (days = 3) => call('get_recent_stars', { p_days: days });
export const getWeek = week => call('get_week', { p_week: week ?? null });
export const getTeam = (team, week) => call('get_team', { p_team: team, p_week: week ?? null });
export const getHistory = () => call('get_history');
export const getPlayers = ({ search, position, owner, limit } = {}) => call('get_players', {
    p_search: search || null,
    p_position: position || null,
    p_owner: owner || null,
    p_limit: limit || 100,
});

// team/pin optional: with them the result includes your private wishlist
export const getDraft = (team, pin) => call('get_draft', { p_team: team ?? null, p_pin: pin ?? null });
export const getDraftPool = ({ search, position } = {}) => call('get_draft_pool', {
    p_search: search || null,
    p_position: position || null,
    p_limit: 50,
});



// ### WRITES ###

// All writes go through here so the cooldown applies to every one. Returns {ok, error?, ...}.
async function mutate(fn, args, send = call) {
    const wait = remainingMs();
    if (wait > 0) return { ok: false, error: `Slow down! Try again in ${Math.ceil(wait / 1000)}s.` };
    mark();
    return send(fn, args);
}

// Not league-scoped; throttled since it's a password attempt
export const checkLeague = (name, pass) => mutate('join_league', { p_name: name, p_pass: pass }, rpc);

export const getMyTeam = (team, pin) => call('get_my_team', { p_team: team, p_pin: pin });

// Same RPC as getMyTeam, but throttled since it's a PIN attempt
export const signIn = (team, pin) => mutate('get_my_team', { p_team: team, p_pin: pin });

export const updateRosterPlayer = (team, pin, player, nickname) =>
    mutate('update_roster_player', { p_team: team, p_pin: pin, p_player: player, p_nickname: nickname });

// drop null removes the claim
export const setWaiverIn = (team, pin, player, drop) =>
    mutate('set_waiver_in', { p_team: team, p_pin: pin, p_player: player, p_drop: drop });

export const proposeTrade = (team, pin, toTeam, give, get) =>
    mutate('propose_trade', { p_team: team, p_pin: pin, p_to_team: toTeam, p_give: give, p_get: get });

export const respondTrade = (team, pin, trade, accept) =>
    mutate('respond_trade', { p_team: team, p_pin: pin, p_trade: trade, p_accept: accept });

export const cancelTrade = (team, pin, trade) =>
    mutate('cancel_trade', { p_team: team, p_pin: pin, p_trade: trade });

// field: 'name' | 'color' (1 Deke) | 'icon' (2 Dekes)
export const customizeTeam = (team, pin, field, value) =>
    mutate('customize_team', { p_team: team, p_pin: pin, p_field: field, p_value: value });


// Decoration only: a failure here shouldn't take the page down
export const getReactions = () => call('get_reactions').catch(() => ({}));
export const getMyReactions = (team, pin) => call('get_my_reactions', { p_team: team, p_pin: pin }).catch(() => null);

// emoji '' removes; buyPass also buys this week's pass (1 Deke) in the same write
export const react = (team, pin, target, emoji, buyPass = false) =>
    mutate('react', { p_team: team, p_pin: pin, p_target: target, p_emoji: emoji, p_buy_pass: buyPass });

// players: ids in priority order; replaces the whole wishlist
export const setWishlist = (team, pin, players) =>
    mutate('set_wishlist', { p_team: team, p_pin: pin, p_players: players });

// kind: 'bug' | 'idea' | 'other'; team/pin optional (attaches your team when the PIN checks out)
export const sendFeedback = (team, pin, kind, message, contact) =>
    mutate('send_feedback', { p_team: team ?? null, p_pin: pin ?? null, p_kind: kind, p_message: message, p_contact: contact || null });

// item: 'pass' or an emoji id
export const buyReactionItem = (team, pin, item) =>
    mutate('buy_reaction_item', { p_team: team, p_pin: pin, p_item: item });
