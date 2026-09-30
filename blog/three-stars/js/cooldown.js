// Client-side throttle for every write request. Persisted so a refresh doesn't reset it.
const KEY = 'ts:last-write';
export const COOLDOWN_MS = 5000;

let last = 0;
try { last = Number(localStorage.getItem(KEY)) || 0; } catch {}



// ### COOLDOWN ###

export function remainingMs() {
    return Math.max(0, last + COOLDOWN_MS - Date.now());
}

export function mark() {
    last = Date.now();
    try { localStorage.setItem(KEY, String(last)); } catch {}
}
