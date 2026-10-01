import { stick, puck } from './render.js';
import { getMe } from './session.js';

// Full-page deke animation shown on load. Each pass: stick pushes puck from behind, puck slides ahead,
// stick lifts over it (flipping) and lands on the far side to catch it at the other extent.
const MIN_MS = 2000;
const SWEEP_MS = 1400;                      // full left-right-left cycle
const STICK = 80, PUCK = 22;
const BLADE_X = 6.5 / 24 * STICK, BLADE_Y = 19.5 / 24 * STICK;   // blade center in svg box; pivot for flip + tilt
const HEEL = 5.5 / 24 * STICK;              // blade center -> heel, horizontal
const SHAFT_DEG = 25;                     // glyph's shaft lean from vertical
const HANDS = 1000;                          // shaft aims at a point this far above stage center (fake overhead view)
const CONTACT = 4;                          // puck center -> blade center when touching
const LAG = 18, LIFT = 20;                  // max puck lead over stick, stick hop height while crossing
const WORDS = ['deke-ing', 'whiffing', 'shooting', 'passing', 'hitting', 'pinging', 'top-chedding', 'slapping', 'snapping',
    'wristing', 'saving', 'gloving', 'deflecting', 'tipping', 'fighting'];

const overlay = document.getElementById('loader');
let raf = 0;



// ### ANIMATION ###

function init() {
    const stage = overlay.querySelector('.loader-stage');
    stage.innerHTML = puck('loader-puck') + stick('loader-stick');
    cycleWords(overlay.querySelector('.loader-word'));
    const s = stage.querySelector('.loader-stick');
    const p = stage.querySelector('.loader-puck');
    s.style.cssText = `width:${STICK}px;height:${STICK}px;top:${-20.5 / 24 * STICK}px;transform-origin:${BLADE_X}px ${BLADE_Y}px`;
    p.style.cssText = `width:${PUCK}px;height:${PUCK}px;top:${-18 / 24 * PUCK}px`;
    const team = getMe()?.team?.color;
    s.style.color = team || '#1a2230';
    stage.style.setProperty('--rink', team || '#000');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return place(s, p, 0, CONTACT, 1, 0);

    const t0 = performance.now();
    const frame = now => {
        const half = (now - t0) / (SWEEP_MS / 2);
        const u = half % 1;
        const dir = Math.floor(half) % 2 ? -1 : 1;
        const amp = stage.clientWidth / 2 - STICK;
        const px = -dir * amp * Math.cos(Math.PI * u);
        // crossing: stick goes from behind puck (-dir) to in front (+dir); scaleX passes through 0 = the flip
        const e = smooth((u - .45) / .4);
        const side = -dir * Math.cos(Math.PI * e);
        const blade = px + side * CONTACT - dir * LAG * Math.sin(Math.PI * u) * (1 - e);
        place(s, p, px, blade, side, LIFT * Math.sin(Math.PI * e));
        raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
}

// swap word at the dim point of each pulse so the change is hidden
function cycleWords(w) {
    let i = Math.floor(Math.random() * WORDS.length);
    w.textContent = `${WORDS[i]}…`;
    w.addEventListener('animationiteration', () => {
        i = (i + 1 + Math.floor(Math.random() * (WORDS.length - 1))) % WORDS.length;
        w.textContent = `${WORDS[i]}…`;
    });
}

const smooth = x => (x = Math.min(1, Math.max(0, x)), x * x * (3 - 2 * x));

// sx +1 = glyph as drawn (toe points left, shaft rises right of puck), -1 = mirrored
function place(s, p, px, blade, sx, lift) {
    const aim = Math.atan2(-(blade + HEEL * sx), HANDS) * 180 / Math.PI;
    s.style.transform = `translate(${blade - BLADE_X}px, ${-lift}px) rotate(${aim - SHAFT_DEG * sx}deg) scaleX(${sx})`;
    p.style.transform = `translateX(${px - PUCK / 2}px)`;
}



// ### LIFECYCLE ###

// Hide once `ready` settles and the page has been up MIN_MS
export async function finishLoader(ready) {
    await Promise.allSettled([ready, new Promise(r => setTimeout(r, MIN_MS - performance.now()))]);
    overlay.classList.add('done');
    overlay.addEventListener('transitionend', () => { cancelAnimationFrame(raf); overlay.remove(); }, { once: true });
}

init();
