import { SUPABASE_URL, SUPABASE_KEY, LEAGUE } from './config.js';
import { remainingMs, mark } from './cooldown.js';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);



// ### RPC ###

async function call(fn, args = {}) {
    const { data, error } = await db.rpc(fn, { p_league: LEAGUE, ...args });
    if (error) throw new Error(error.message);
    return data;
}

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



// ### WRITES ###

// All writes go through here so the cooldown applies to every one. Returns {ok, error?, ...}.
async function mutate(fn, args) {
    const wait = remainingMs();
    if (wait > 0) return { ok: false, error: `Slow down! Try again in ${Math.ceil(wait / 1000)}s.` };
    mark();
    return call(fn, args);
}

export const getMyTeam = (team, pin) => call('get_my_team', { p_team: team, p_pin: pin });

// Same RPC as getMyTeam, but throttled since it's a PIN attempt
export const signIn = (team, pin) => mutate('get_my_team', { p_team: team, p_pin: pin });

export const updateRosterPlayer = (team, pin, player, nickname, waiverOut) => mutate('update_roster_player', {
    p_team: team, p_pin: pin, p_player: player, p_nickname: nickname, p_waiver_out: waiverOut,
});

export const setWaiverIn = (team, pin, player, on) =>
    mutate('set_waiver_in', { p_team: team, p_pin: pin, p_player: player, p_on: on });
