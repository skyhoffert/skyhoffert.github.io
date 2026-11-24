// Synthesized projector sounds (no audio files). Browsers only allow audio after a click, so call unlock() from one.

const KEY = 'er:muted';
let ctx = null;
let muted = localStorage.getItem(KEY) === '1';

export function unlock() {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
}

export const isMuted = () => muted;
export function setMuted(m) {
    muted = m;
    localStorage.setItem(KEY, m ? '1' : '0');
}

function tone(freq, dur, { type = 'sine', gain = 0.2, delay = 0 } = {}) {
    if (muted || !ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
}

// New question on screen
export function ding() {
    tone(880, 0.7);
    tone(1320, 0.6, { gain: 0.12, delay: 0.09 });
}

// Answer revealed
export function reveal() {
    tone(523, 0.5, { gain: 0.15 });
    tone(659, 0.5, { gain: 0.15, delay: 0.1 });
    tone(784, 0.8, { gain: 0.18, delay: 0.2 });
}

// Last seconds of the timer (final = the 0 mark)
export function tick(final = false) {
    tone(final ? 440 : 1200, final ? 0.5 : 0.06, { type: final ? 'triangle' : 'square', gain: final ? 0.2 : 0.06 });
}
