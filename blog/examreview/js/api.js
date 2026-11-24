import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);



// ### RPC ###

async function rpc(fn, args) {
    const { data, error } = await db.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data;
}

// Player
export const join = (code, nickname) => rpc('er_join', { p_code: code, p_nickname: nickname });
export const playerState = (code, player) => rpc('er_player_state', { p_code: code, p_player: player });
export const submit = (code, player, question, answer) =>
    rpc('er_submit', { p_code: code, p_player: player, p_question: question, p_answer: answer });

// Host (key required)
export function host(code, key) {
    const call = (fn, args = {}) => rpc(fn, { p_code: code, p_key: key, ...args });
    return {
        state: () => call('er_host_state'),
        update: (state, question, timer = null) =>
            call('er_host_update', { p_state: state, p_question: question, p_timer: timer }),
        addTime: seconds => call('er_host_add_time', { p_seconds: seconds }),
        grade: (question, results) => call('er_host_grade', { p_question: question, p_results: results }),
        resetQuestion: question => call('er_host_reset_question', { p_question: question }),
        kick: (player, ban) => call('er_host_kick', { p_player: player, p_ban: ban }),
        unban: nickname => call('er_host_unban', { p_nickname: nickname }),
        exportAll: () => call('er_host_export'),
    };
}



// ### ROOM ###

export async function getRoom(code) {
    const { data, error } = await db.from('er_rooms').select('*').eq('code', code.toUpperCase()).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
}

// Calls onChange(row) whenever the room row updates. Returns an unsubscribe function.
export function watchRoom(code, onChange) {
    const ch = db.channel(`er-room-${code}`)
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'er_rooms', filter: `code=eq.${code}` },
            p => onChange(p.new))
        .subscribe();
    return () => db.removeChannel(ch);
}



// ### CLOCK ###

// Server-minus-local offset, refreshed from RPC results that include `now`, so timers agree across devices.
let offset = 0;
export function syncClock(serverNow) {
    if (serverNow) offset = new Date(serverNow).getTime() - Date.now();
}
export const serverNow = () => Date.now() + offset;
export function secondsLeft(room) {
    if (!room?.timer_ends_at) return null;
    return Math.max(0, (new Date(room.timer_ends_at).getTime() - serverNow()) / 1000);
}
