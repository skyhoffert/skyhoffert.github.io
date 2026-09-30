import { LEAGUE } from './config.js';
import { getMyTeam } from './api.js';

// "My Team" sign-in: { team: {id, name, owner, color, icon_path}, pin }, remembered per league on this device
const KEY = `ts:me:${LEAGUE}`;
const listeners = [];

let me = null;
try { me = JSON.parse(localStorage.getItem(KEY)); } catch {}



// ### SESSION ###

export const getMe = () => me;

export function setMe(v) {
    me = v;
    try {
        if (v) localStorage.setItem(KEY, JSON.stringify(v));
        else localStorage.removeItem(KEY);
    } catch {}
    listeners.forEach(f => f());
}

export const onMeChange = f => listeners.push(f);

// Private waiver lists; signs out if the PIN stopped working
export async function loadMine() {
    if (!me) return null;
    const res = await getMyTeam(me.team.id, me.pin);
    if (!res.ok) {
        setMe(null);
        return null;
    }
    return res;
}
