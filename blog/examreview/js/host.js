import * as api from './api.js';
import {
    loadSet, renderMd, renderInline, questionStats, rankPlayers, grade,
    describeAnswer, describeCorrect, formatEng, letter,
} from './set.js';
import * as sound from './sound.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);



// ### SETUP ###

// The key arrives in the URL once, then lives in localStorage so it isn't visible in the projected address bar.
const params = new URLSearchParams(location.search);
const code = (params.get('room') || '').trim().toUpperCase();
let key = params.get('key');
if (code && key) {
    localStorage.setItem(`er:host:${code}`, key);
    history.replaceState(null, '', `?room=${code}`);
} else if (code) {
    key = localStorage.getItem(`er:host:${code}`);
}

const H = api.host(code, key);
let set = null;
let room = null;
let players = [];
let answers = [];
let bans = [];
let busy = false;
let locking = false;
let viewKey = '';
let lastTickSec = null;
let autoLocked = '';

const joinUrl = new URL(`./?room=${code}`, location.href).href;
const joinUrlShort = (location.host + location.pathname.replace(/host\.html$/, '')).replace(/\/$/, '');

init();

async function init() {
    if (!code || !key) return fatal('Missing room or host key. Open the host URL printed by <code>create_room.sql</code>.');
    $('#room-code').textContent = code;
    setupMute();
    try {
        const s = await H.state();
        set = await loadSet(s.room.set_path);
        $('#set-title').textContent = set.title;
        document.title = `${set.title} · Host`;
        apply(s);
    } catch (e) {
        return fatal(esc(e.message));
    }
    document.addEventListener('click', () => sound.unlock(), { capture: true });
    setInterval(poll, 1000);
    setInterval(timerLoop, 200);
}

function fatal(html) {
    document.body.innerHTML = `<div class="fatal"><h2>Can't open host screen</h2><p>${html}</p></div>`;
}

function setupMute() {
    const btn = $('#mute');
    const show = () => { btn.textContent = sound.isMuted() ? '🔇' : '🔊'; };
    btn.onclick = () => { sound.setMuted(!sound.isMuted()); show(); };
    show();
}

let polling = false;
async function poll() {
    if (polling) return;
    polling = true;
    try {
        apply(await H.state());
    } catch (e) {
        console.warn('poll failed', e);
    } finally {
        polling = false;
    }
}

function apply(s) {
    api.syncClock(s.now);
    room = s.room;
    players = s.players;
    answers = s.answers;
    bans = s.bans;
    render();
}

const q = () => set.questions[room.question_index];
const graded = i => room.graded.includes(i);



// ### ACTIONS ###

async function act(fn) {
    if (busy) return;
    busy = true;
    renderControls();
    try {
        await fn();
        apply(await H.state());
    } catch (e) {
        alert(e.message);
    } finally {
        busy = false;
        renderControls();
    }
}

async function openQuestion(i) {
    await H.update('open', i, set.questions[i].timer || null);
    sound.ding();
}

async function goTo(i) {
    i = Math.max(0, Math.min(set.questions.length - 1, i));
    if (graded(i)) await H.update('revealed', i);
    else await openQuestion(i);
}

// Lock first (server rejects later submits), then fetch the final answers and grade them.
async function lock() {
    if (locking) return;
    locking = true;
    try {
        const i = room.question_index;
        await H.update('locked', i);
        const s = await H.state();
        const results = {};
        for (const a of s.answers) results[a.player_id] = grade(set.questions[i], a.answer);
        await H.grade(i, results);
        sound.tick(true);
    } finally {
        locking = false;
    }
}

async function reveal() {
    await H.update('revealed', room.question_index);
    sound.reveal();
}

async function next() {
    const i = room.question_index;
    if (i < set.questions.length - 1) await goTo(i + 1);
    else await H.update('final', i);
}

async function back() {
    if (room.state === 'final') return goTo(room.question_index);
    if (room.question_index > 0) await goTo(room.question_index - 1);
}

async function reopen() {
    if (!confirm(`Re-open question ${room.question_index + 1}? This wipes its answers.`)) return;
    await H.resetQuestion(room.question_index);
    await openQuestion(room.question_index);
}

function kickMenu(ev, player) {
    ev.stopPropagation();
    closeMenu();
    const m = document.createElement('div');
    m.className = 'menu';
    m.id = 'menu';
    m.innerHTML = `
        <div class="who">${esc(player.nickname)}</div>
        <button data-k="kick">Kick</button>
        <button data-k="ban" class="danger">Kick &amp; ban name</button>
        <button data-k="x" class="ghost">Cancel</button>`;
    m.style.left = `${Math.min(ev.clientX, innerWidth - 220)}px`;
    m.style.top = `${Math.min(ev.clientY, innerHeight - 180)}px`;
    m.onclick = e => {
        const k = e.target.dataset.k;
        if (!k) return;
        closeMenu();
        if (k !== 'x') act(() => H.kick(player.id, k === 'ban'));
    };
    document.body.append(m);
    setTimeout(() => document.addEventListener('click', closeMenu, { once: true }));
}

function closeMenu() {
    $('#menu')?.remove();
}

async function downloadResults() {
    const data = await H.exportAll();
    const byQ = new Map();
    for (const a of data.answers) {
        if (!byQ.has(a.question_index)) byQ.set(a.question_index, []);
        byQ.get(a.question_index).push(a);
    }
    const isRight = a => a.correct ?? grade(set.questions[a.question_index], a.answer);

    const questions = set.questions.map((qq, i) => {
        const st = questionStats(qq, byQ.get(i) || []);
        const out = {
            index: i + 1, title: qq.title, type: qq.type, topic: qq.topic,
            correct_answer: describeCorrect(qq),
            answered: st.answered, correct: st.correct, pct_correct: st.pct_correct,
        };
        if (st.option_counts) out.option_counts = Object.fromEntries(st.option_counts.map((n, k) => [qq.type === 'tf' ? qq.choices[k].text : letter(k), n]));
        if (st.common_wrong) out.common_wrong = st.common_wrong.map(w => ({ value: formatEng(w.value, qq.units), count: w.count }));
        return out;
    });

    const students = rankPlayers(data.players.map(p => {
        const mine = data.answers.filter(a => a.player_id === p.id).sort((a, b) => a.question_index - b.question_index);
        return {
            nickname: p.nickname,
            score: mine.filter(isRight).length,
            answers: mine.map(a => ({
                index: a.question_index + 1,
                answer: describeAnswer(set.questions[a.question_index], a.answer),
                correct: isRight(a),
            })),
        };
    })).map(s => ({ rank: s.rank, nickname: s.nickname, total_correct: s.score, answers: s.answers }));

    const out = {
        set: { title: set.title, path: set.path, room: code, exported_at: new Date().toISOString(), questions: set.questions.length },
        questions,
        students,
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `examreview-${code}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
}



// ### RENDER ###

// The stage skeleton is rebuilt only when the view changes; live parts update in place (no flicker, no replayed animations).
function render() {
    $('#player-count').textContent = `👥 ${players.length}`;
    const vk = `${room.state}:${room.question_index}`;
    if (vk !== viewKey) {
        viewKey = vk;
        lastTickSec = null;
        autoLocked = '';
        renderStage();
        renderControls();
    }
    renderLive();
}

function setHtml(sel, html) {
    const el = $(sel);
    if (el && el.dataset.html !== html) {
        el.innerHTML = html;
        el.dataset.html = html;
    }
}

function renderStage() {
    const st = $('#stage');
    if (room.state === 'lobby') {
        st.innerHTML = `
            <div class="lobby">
                <div class="join-card">
                    <div class="qr" id="qr"></div>
                    <div class="url">${esc(joinUrlShort)}</div>
                    <div class="bigcode">${code}</div>
                </div>
                <div>
                    <h2 id="lobby-count"></h2>
                    <div class="chips" id="chips"></div>
                    <div id="bans"></div>
                    ${set.warnings.length ? `<div class="warnings"><b>⚠ Question set warnings</b><ul>${set.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
                </div>
            </div>`;
        const qr = qrcode(0, 'M');
        qr.addData(joinUrl);
        qr.make();
        $('#qr').innerHTML = `<img alt="QR code to join" style="image-rendering:pixelated" src="${qr.createDataURL(10, 2)}">`;
        return;
    }
    if (room.state === 'final') {
        st.innerHTML = `<h1 class="center">🏁 Final results</h1><div id="final"></div>`;
        return;
    }

    const qq = q();
    const head = `
        <div class="qhead">
            <span class="qnum">Question ${room.question_index + 1} / ${set.questions.length}</span>
            ${qq.topic ? `<span class="topic">${esc(qq.topic)}</span>` : ''}
            <span class="spacer"></span>
            <div class="answered" id="answered"></div>
            <div class="timer hidden" id="timer"></div>
        </div>
        <h1 class="qtitle">${renderInline(qq.title, set.base)}</h1>
        <div class="md">${renderMd(qq.prompt, set.base)}</div>`;

    if (room.state === 'revealed') {
        st.innerHTML = `
            <div class="reveal-grid">
                <div>${head}<div id="stats"></div></div>
                <div class="board" id="board"></div>
            </div>`;
    } else {
        st.innerHTML = `${head}
            <div id="locked-banner"></div>
            ${qq.type === 'numeric'
                ? `<div class="numeric-box">🔢 Enter a number${qq.units ? ` in ${esc(qq.units)}` : ''} on your phone</div>`
                : tilesHtml(qq)}`;
    }
}

function tilesHtml(qq, { counts = null, reveal = false } = {}) {
    const max = counts ? Math.max(1, ...counts) : 1;
    return `<div class="tiles">${qq.choices.map((c, i) => `
        <div class="tile c${i % 6}${reveal ? (c.correct ? ' right' : ' dim') : ''}">
            ${counts ? `<div class="bar" style="width:${(100 * counts[i]) / max}%"></div>` : ''}
            <span class="letter"><span>${qq.type === 'tf' ? (i ? 'F' : 'T') : letter(i)}</span></span>
            <span class="text">${renderInline(c.text, set.base)}</span>
            ${counts ? `<span class="count">${counts[i]}</span>` : ''}
        </div>`).join('')}</div>`;
}

function renderLive() {
    if (room.state === 'lobby') {
        $('#lobby-count').textContent = players.length ? `${players.length} joined` : 'Waiting for students…';
        // Chips are rebuilt only when the roster changes; handlers are re-bound each time.
        const html = players.map(p => `<button class="chip" data-id="${p.id}">${esc(p.nickname)}</button>`).join('');
        const chips = $('#chips');
        if (chips.dataset.html !== html) {
            chips.innerHTML = html;
            chips.dataset.html = html;
            chips.querySelectorAll('.chip').forEach(b => {
                b.onclick = e => kickMenu(e, players.find(p => p.id === b.dataset.id));
            });
        }
        renderBans();
        return;
    }
    if (room.state === 'final') return renderFinal();

    const n = players.length;
    const a = answers.length;
    setHtml('#answered', room.state === 'revealed' ? '' :
        a >= n && n > 0
            ? `<span class="allin">All in ✓</span><small>${a}/${n} answered</small>`
            : `${a}/${n}<small>answered</small>`);
    if (room.state === 'locked') setHtml('#locked-banner', `<div class="banner">⏱ Time's up! ${a}/${n} answered</div>`);
    if (room.state === 'revealed') {
        renderStats();
        renderBoard('#board', 'Leaderboard');
    }
}

function renderBans() {
    const html = bans.length
        ? `<p class="muted" style="font-size:.7em;margin-top:1.5em">Banned names (click to unban): ${bans.map(b => `<button class="chip ghost" data-nick="${esc(b)}">${esc(b)} ✕</button>`).join(' ')}</p>`
        : '';
    const el = $('#bans');
    if (el.dataset.html === html) return;
    el.innerHTML = html;
    el.dataset.html = html;
    el.querySelectorAll('button').forEach(b => {
        b.onclick = () => act(() => H.unban(b.dataset.nick));
    });
}

function renderStats() {
    const qq = q();
    const st = questionStats(qq, answers);
    let html = `<div style="display:flex;gap:2em;align-items:baseline;margin:.6em 0">
        <div><div class="pct">${st.pct_correct}%</div><div class="muted">correct (${st.correct}/${st.answered})</div></div>
        <div><div class="muted">Answer</div><div class="correct-answer">${esc(describeCorrect(qq))}</div></div>
    </div>`;
    if (qq.type === 'numeric') {
        html += st.common_wrong.length
            ? `<div class="muted">Most common wrong answers</div><ul class="wrong-list">${st.common_wrong.map(w =>
                `<li><span>${esc(formatEng(w.value, qq.units))}</span><b>${w.count}</b></li>`).join('')}</ul>`
            : '';
    } else {
        html += tilesHtml(qq, { counts: st.option_counts, reveal: true });
    }
    setHtml('#stats', html);
}

function boardRows(list) {
    return list.map(p => `<li><span class="rk">${p.rank}</span><span class="nm">${esc(p.nickname)}</span><span class="sc">${p.score}</span><button class="x" data-id="${p.id}" title="Kick">✕</button></li>`).join('');
}

function bindKicks(sel) {
    document.querySelectorAll(`${sel} .x`).forEach(b => {
        b.onclick = e => kickMenu(e, players.find(p => p.id === b.dataset.id));
    });
}

function renderBoard(sel, title) {
    const html = `<h3>${title}</h3><ol>${boardRows(rankPlayers(players))}</ol>`;
    const el = $(sel);
    if (el.dataset.html === html) return;
    setHtml(sel, html);
    bindKicks(sel);
}

function renderFinal() {
    const ranked = rankPlayers(players);
    const top = ranked.slice(0, 3);
    const step = (p, cls) => p ? `<div class="step ${cls}"><div class="who">${esc(p.nickname)}</div><div class="block">${p.score}</div></div>` : '';
    const html = `
        <div class="podium">${step(top[1], 'p2')}${step(top[0], 'p1')}${step(top[2], 'p3')}</div>
        <div class="board" style="max-width:30em;margin:0 auto"><h3>Everyone (${set.questions.length} questions)</h3><ol>${boardRows(ranked)}</ol></div>`;
    const el = $('#final');
    if (el.dataset.html === html) return;
    setHtml('#final', html);
    bindKicks('#final');
}

function renderControls() {
    const c = $('#controls');
    const n = set.questions.length;
    const i = room.question_index;
    const btn = (label, fn, cls = '', disabled = false) => ({ label, fn, cls, disabled });
    const items = [];

    if (room.state === 'lobby') {
        items.push(btn('Start ▶', () => goTo(0), 'primary', !n));
    } else if (room.state === 'open') {
        items.push(btn('🔒 Lock now', lock, 'primary'));
        items.push(room.timer_ends_at
            ? btn('+15 s', () => H.addTime(15))
            : btn(`⏱ Start ${set.defaultTimer || 30}s timer`, () => H.addTime(set.defaultTimer || 30)));
    } else if (room.state === 'locked') {
        items.push(btn('Reveal answer ▶', reveal, 'primary'));
        items.push(btn('↺ Re-open', reopen));
    } else if (room.state === 'revealed') {
        items.push(i < n - 1 ? btn('Next question ▶', next, 'primary') : btn('🏁 Finish', next, 'primary'));
        items.push(btn('↺ Re-open', reopen));
    } else if (room.state === 'final') {
        items.push(btn('⬇ Download results', downloadResults, 'primary'));
    }

    c.innerHTML = '';
    for (const it of items) c.append(makeButton(it));
    const sp = document.createElement('span');
    sp.className = 'spacer';
    c.append(sp);

    if (room.state !== 'lobby') {
        c.append(makeButton(btn('◀ Back', back, 'ghost', room.state !== 'final' && i === 0)));
        const sel = document.createElement('select');
        sel.disabled = busy;
        sel.innerHTML = `<option value="">Jump to…</option>` + set.questions.map((qq, k) =>
            `<option value="${k}">${graded(k) ? '✓' : '·'} ${k + 1}. ${esc(qq.title.slice(0, 40))}</option>`).join('');
        sel.onchange = () => {
            if (sel.value !== '') act(() => goTo(+sel.value));
        };
        c.append(sel);
    }
}

function makeButton({ label, fn, cls, disabled }) {
    const b = document.createElement('button');
    b.textContent = label;
    if (cls) b.className = cls;
    b.disabled = disabled || busy;
    b.onclick = () => act(fn);
    return b;
}



// ### TIMER ###

function timerLoop() {
    const el = $('#timer');
    if (!room || !el) return;
    const left = room.state === 'open' ? api.secondsLeft(room) : null;
    if (left == null) {
        el.classList.add('hidden');
        return;
    }
    const sec = Math.ceil(left);
    el.classList.remove('hidden');
    el.textContent = sec;
    el.classList.toggle('low', sec <= 5);
    if (sec <= 5 && sec > 0 && sec !== lastTickSec) {
        lastTickSec = sec;
        sound.tick();
    }
    // One auto-lock attempt per question view; if it fails, the Lock button is still there.
    if (left <= 0 && !locking && !busy && autoLocked !== viewKey) {
        autoLocked = viewKey;
        act(lock);
    }
}
