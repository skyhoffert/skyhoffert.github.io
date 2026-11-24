// Bot students for rehearsing. Uses the same public RPCs as real phones.
import * as api from './api.js';
import { loadSet, correctIndices, formatEng } from './set.js';

const $ = s => document.querySelector(s);
const NAMES = ['Ohm', 'Volta', 'Ampere', 'Tesla', 'Faraday', 'Kirchhoff', 'Maxwell', 'Hertz', 'Gauss', 'Henry',
    'Joule', 'Watt', 'Siemens', 'Weber', 'Coulomb', 'Thevenin', 'Norton', 'Bode', 'Nyquist', 'Laplace',
    'Fourier', 'Shannon', 'Heaviside', 'Edison', 'Lovelace', 'Hopper', 'Noether', 'Curie', 'Turing', 'Boole'];

let bots = [];
let set = null;
let code = '';
let pollTimer = null;
let timeouts = [];
let prev = { state: null, q: null };

const params = new URLSearchParams(location.search);
$('#room').value = (params.get('room') || '').toUpperCase();
$('#start').onclick = start;
$('#stop').onclick = stop;

function log(msg) {
    const el = $('#log');
    el.textContent += `${new Date().toLocaleTimeString()}  ${msg}\n`;
    el.scrollTop = el.scrollHeight;
}

const rand = n => Math.floor(Math.random() * n);
const pct = id => Math.max(0, Math.min(100, +$(id).value || 0)) / 100;

async function start() {
    code = $('#room').value.trim().toUpperCase();
    const n = Math.max(1, Math.min(40, +$('#count').value || 1));
    $('#start').disabled = true;
    try {
        const room = await api.getRoom(code);
        if (!room) throw new Error(`Room ${code} not found`);
        set = await loadSet(room.set_path);
        log(`Loaded "${set.title}" (${set.questions.length} questions)`);
        const tag = Math.random().toString(36).slice(2, 4);
        const names = [...NAMES].sort(() => Math.random() - 0.5);
        for (let i = 0; i < n; i++) {
            const nick = `🤖${names[i % names.length]}${i >= names.length ? i : ''}-${tag}`;
            try {
                const r = await api.join(code, nick);
                bots.push({ id: r.player_id, nick, alive: true });
                log(`${nick} joined`);
            } catch (e) {
                log(`${nick} couldn't join: ${e.message}`);
            }
        }
        prev = { state: null, q: null };
        pollTimer = setInterval(poll, 1000);
        poll();
        $('#stop').disabled = false;
    } catch (e) {
        log(`Error: ${e.message}`);
        $('#start').disabled = false;
    }
}

function stop() {
    clearInterval(pollTimer);
    timeouts.forEach(clearTimeout);
    timeouts = [];
    bots = [];
    log('Stopped (bots stay in the room until kicked)');
    $('#start').disabled = false;
    $('#stop').disabled = true;
}

async function poll() {
    let room;
    try {
        room = await api.getRoom(code);
    } catch (e) {
        return log(`poll failed: ${e.message}`);
    }
    if (!room) return;
    const changed = room.state !== prev.state || room.question_index !== prev.q;
    if (changed) log(`Room → ${room.state}${room.state === 'lobby' || room.state === 'final' ? '' : ` (Q${room.question_index + 1})`}`);
    if (changed && room.state === 'open') scheduleAnswers(room);
    prev = { state: room.state, q: room.question_index };
}

function scheduleAnswers(room) {
    const q = set.questions[room.question_index];
    if (!q) return;
    const span = Math.max(3, Math.min(q.timer ? q.timer * 0.8 : 12, 15));
    for (const bot of bots) {
        if (!bot.alive || Math.random() < pct('#skip')) continue;
        const delay = 1000 + Math.random() * span * 1000;
        timeouts.push(setTimeout(() => answer(bot, room.question_index, q), delay));
    }
}

async function answer(bot, qi, q) {
    const right = Math.random() < pct('#acc');
    const a = makeAnswer(q, right);
    try {
        await api.submit(code, bot.id, qi, a);
        log(`${bot.nick} answered ${JSON.stringify(a)}${right ? ' ✓' : ''}`);
    } catch (e) {
        if (/not in this room/i.test(e.message)) {
            bot.alive = false;
            log(`${bot.nick} was kicked`);
        } else {
            log(`${bot.nick}: ${e.message}`);
        }
    }
}

function makeAnswer(q, right) {
    if (q.type === 'numeric') {
        const ans = q.answer ?? 1;
        const v = right ? ans : ans * [2, 0.5, 10, -1, 1.5, 0.1][rand(6)];
        return { v, raw: formatEng(v).replace(' ', '') };
    }
    const want = correctIndices(q);
    const n = q.choices.length;
    if (q.type === 'multi') {
        if (right) return want;
        let pick;
        do {
            pick = [...Array(n).keys()].filter(() => Math.random() < 0.5);
        } while (!pick.length || JSON.stringify(pick) === JSON.stringify(want));
        return pick;
    }
    if (right || n < 2) return want[0] ?? 0;
    const wrong = [...Array(n).keys()].filter(i => i !== want[0]);
    return wrong[rand(wrong.length)];
}
