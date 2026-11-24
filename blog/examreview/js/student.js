import * as api from './api.js';
import { loadSet, renderMd, renderInline, parseNumber, formatEng, correctIndices, letter } from './set.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const SESSION_KEY = 'er:session';
const params = new URLSearchParams(location.search);
const roomParam = (params.get('room') || '').trim().toUpperCase();

let session = null;      // {code, playerId, nickname}
let set = null;
let ps = null;           // latest er_player_state result
let viewKey = '';
let unwatch = null;
let refreshTimer = null;
let seq = 0;

// Answer-in-progress for the current open question
let picked = null;       // single/tf: index; multi: Set of indices
let sent = null;         // last answer the server accepted (same shape as stored)

init();



// ### SESSION ###

function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

async function init() {
    const saved = readSession();
    if (saved && (!roomParam || roomParam === saved.code)) {
        session = saved;
        try {
            await enterRoom();
            return;
        } catch (e) {
            console.warn('resume failed', e);
        }
        leave();
    }
    showJoin(roomParam);
}

function showJoin(code = '', message = '') {
    viewKey = '';
    $('#hdr-left').textContent = 'Exam Review';
    $('#hdr-right').textContent = '';
    $('#view').innerHTML = `
        <h1>Join review</h1>
        ${message ? `<p class="error">${esc(message)}</p>` : ''}
        <form id="join">
            <input id="code" class="codeinput" placeholder="ROOM" maxlength="4" autocomplete="off" value="${esc(code)}" required>
            <input id="nick" placeholder="Nickname" maxlength="20" autocomplete="nickname" required>
            <button class="primary big" type="submit">Join</button>
            <p class="error" id="join-err"></p>
        </form>`;
    (code ? $('#nick') : $('#code')).focus();
    $('#join').onsubmit = async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        $('#join-err').textContent = '';
        try {
            const r = await api.join($('#code').value, $('#nick').value);
            session = { code: r.room, playerId: r.player_id, nickname: r.nickname };
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            await enterRoom();
        } catch (err) {
            $('#join-err').textContent = err.message;
            btn.disabled = false;
        }
    };
}

async function enterRoom() {
    const room = await api.getRoom(session.code);
    if (!room) throw new Error('Room not found');
    set = await loadSet(room.set_path);
    await refresh(true);
    if (!session) return; // kicked during the first refresh
    unwatch = api.watchRoom(session.code, () => refresh());
    refreshTimer = setInterval(refresh, 4000); // backup if the realtime socket drops (phones sleep a lot)
    document.addEventListener('visibilitychange', onVisible);
    setInterval(updateTimer, 250);
}

function onVisible() {
    if (document.visibilityState === 'visible') refresh();
}

function leave() {
    localStorage.removeItem(SESSION_KEY);
    session = null;
    unwatch?.();
    unwatch = null;
    clearInterval(refreshTimer);
    document.removeEventListener('visibilitychange', onVisible);
}

async function refresh(throwErrors = false) {
    if (!session) return;
    const my = ++seq;
    let s;
    try {
        s = await api.playerState(session.code, session.playerId);
    } catch (e) {
        if (throwErrors) throw e;
        console.warn('refresh failed', e);
        return;
    }
    if (my !== seq || !session) return; // a newer refresh is in flight
    api.syncClock(s.now);
    if (!s.player) {
        const code = session.code;
        leave();
        showJoin(code, 'You were removed from the room. You can rejoin with a different nickname.');
        return;
    }
    ps = s;
    render();
}



// ### RENDER ###

const room = () => ps.room;
const q = () => set.questions[ps.room.question_index];

function render() {
    $('#hdr-left').innerHTML = `<span class="me">${esc(session.nickname)}</span> · ${esc(session.code)}`;
    const r = room();
    const vk = `${r.state}:${r.question_index}`;
    const fresh = vk !== viewKey;
    viewKey = vk;

    if (r.state === 'lobby') return fresh && renderLobby();
    if (r.state === 'open') {
        if (fresh) return renderOpen();
        // Server has no answer but we think we sent one: the host re-opened (wiped) this question.
        if (!ps.answer && sent != null && !inFlight) sent = null;
        return updateSentStatus();
    }
    if (r.state === 'locked') return renderLocked();
    if (r.state === 'revealed') return renderRevealed();
    if (r.state === 'final') return renderFinal();
}

function renderLobby() {
    $('#hdr-right').textContent = '';
    $('#view').innerHTML = `
        <div class="wait">
            <div>
                <div class="spinner">🎓</div>
                <h1>You're in!</h1>
                <p class="muted">Watch the projector. Questions will appear here when we start.</p>
            </div>
        </div>`;
}

function qHeader() {
    return `Q${room().question_index + 1} / ${set.questions.length} <span class="timer-sm" id="timer-sm"></span>`;
}

function renderOpen() {
    const qq = q();
    $('#hdr-right').innerHTML = qHeader();
    sent = ps.answer?.answer ?? null;
    if (qq.type === 'multi') picked = new Set(Array.isArray(sent) ? sent : []);
    else picked = qq.type === 'numeric' ? null : sent;

    let controls;
    if (qq.type === 'numeric') {
        controls = `
            <form id="numform">
                <div class="numwrap">
                    <input id="num" inputmode="decimal" autocomplete="off" placeholder="e.g. 4.7k or 2.2e-3" value="${esc(sent?.raw ?? '')}">
                    ${qq.units ? `<span class="units">${esc(qq.units)}</span>` : ''}
                </div>
                <div class="preview" id="preview"></div>
                <button class="primary big" type="submit">Send answer</button>
            </form>`;
    } else {
        controls = `
            <div class="${qq.type === 'tf' ? 'tf' : ''}"><div class="tiles">${qq.choices.map((c, i) => `
                <button class="tile c${i % 6}" data-i="${i}">
                    <span class="letter"><span>${qq.type === 'tf' ? (i ? 'F' : 'T') : letter(i)}</span></span>
                    <span class="text">${renderInline(c.text, set.base)}</span>
                </button>`).join('')}</div></div>
            ${qq.type === 'multi' ? `<p class="muted center">Select all that apply</p><button class="primary big" id="send-multi" style="width:100%">Send answer</button>` : ''}`;
    }

    $('#view').innerHTML = `
        <div class="card">
            <div class="qtitle"><b>${renderInline(qq.title, set.base)}</b></div>
            <div class="md">${renderMd(qq.prompt, set.base)}</div>
        </div>
        ${controls}
        <p class="status" id="status"></p>`;

    if (qq.type === 'numeric') {
        const input = $('#num');
        const preview = () => {
            const raw = input.value.trim();
            const v = parseNumber(raw, qq.units);
            $('#preview').innerHTML = !raw ? '' : v == null
                ? `<span class="error">Can't read that number</span>`
                : `= ${esc(formatEng(v, qq.units))}`;
        };
        input.oninput = () => { preview(); updateSentStatus(); };
        preview();
        $('#numform').onsubmit = e => {
            e.preventDefault();
            const raw = input.value.trim();
            const v = parseNumber(raw, qq.units);
            if (v == null) return;
            input.blur();
            send({ v, raw });
        };
    } else {
        document.querySelectorAll('.tile').forEach(b => {
            b.onclick = () => {
                const i = +b.dataset.i;
                if (qq.type === 'multi') {
                    if (picked.has(i)) picked.delete(i);
                    else picked.add(i);
                    paintTiles();
                    updateSentStatus();
                } else {
                    picked = i;
                    paintTiles();
                    send(i);
                }
            };
        });
        $('#send-multi')?.addEventListener('click', () => send([...picked].sort((a, b) => a - b)));
        paintTiles();
    }
    updateSentStatus();
}

function paintTiles() {
    const qq = q();
    const any = qq.type === 'multi' ? picked.size > 0 : picked != null;
    document.querySelectorAll('.tile').forEach(b => {
        const i = +b.dataset.i;
        const on = qq.type === 'multi' ? picked.has(i) : picked === i;
        b.classList.toggle('picked', on);
        b.classList.toggle('unpicked', any && !on);
    });
}

let sending = 0;
let inFlight = false;
async function send(answer) {
    const qi = room().question_index;
    const my = ++sending;
    inFlight = true;
    setStatus('Sending…');
    try {
        await api.submit(session.code, session.playerId, qi, answer);
        if (my !== sending) return;
        sent = answer;
        updateSentStatus();
    } catch (e) {
        if (my === sending) setStatus(`<span class="error">${esc(e.message)}</span>`);
        refresh();
    } finally {
        if (my === sending) inFlight = false;
    }
}

function setStatus(html) {
    const el = $('#status');
    if (el) el.innerHTML = html;
}

function sameAnswer(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function updateSentStatus() {
    const qq = q();
    if (!$('#status')) return;
    if (sent == null) return setStatus('Not answered yet');
    let current;
    if (qq.type === 'multi') current = [...picked].sort((a, b) => a - b);
    else if (qq.type === 'numeric') {
        const raw = $('#num')?.value.trim();
        current = sent.raw === raw ? sent : null;
    } else current = picked;
    if (!sameAnswer(current, sent)) return setStatus('<span class="error">Changed. Tap Send to update your answer</span>');
    setStatus(`✓ Answer sent: <b>${esc(answerText(qq, sent))}</b><br>You can change it until time's up`);
}

function answerText(qq, a) {
    if (a == null) return '';
    if (qq.type === 'numeric') return formatEng(a.v, qq.units);
    const list = Array.isArray(a) ? a : [a];
    if (!list.length) return '(none)';
    return list.map(i => (qq.type === 'tf' ? qq.choices[i].text : letter(i))).join(', ');
}

function correctText(qq) {
    if (qq.type === 'numeric') return formatEng(qq.answer, qq.units);
    return correctIndices(qq).map(i => qq.type === 'tf' ? qq.choices[i].text : `${letter(i)}: ${renderInline(qq.choices[i].text, set.base)}`).join('<br>');
}

function renderLocked() {
    const qq = q();
    const a = ps.answer?.answer;
    $('#hdr-right').innerHTML = qHeader();
    $('#view').innerHTML = `
        <div class="wait"><div>
            <div class="spinner">🔒</div>
            <h1>Answers locked</h1>
            <p>${a != null ? `Your answer: <b>${esc(answerText(qq, a))}</b>` : `<span class="muted">No answer submitted</span>`}</p>
            <p class="muted">Waiting for the reveal…</p>
        </div></div>`;
}

function renderRevealed() {
    const qq = q();
    const a = ps.answer;
    const cls = !a ? 'none' : a.correct ? 'good' : 'bad';
    const icon = !a ? '⏸' : a.correct ? '✅' : '❌';
    const headline = !a ? 'No answer' : a.correct ? 'Correct!' : 'Not quite';
    $('#hdr-right').innerHTML = qHeader();
    $('#view').innerHTML = `
        <div class="result ${cls}">
            <div class="icon">${icon}</div>
            <div class="headline">${headline}</div>
            ${a ? `<p>You answered <b>${esc(answerText(qq, a.answer))}</b></p>` : ''}
        </div>
        <div class="card" style="margin-top:1em">
            <div class="muted">Correct answer</div>
            <div style="font-size:1.2em;font-weight:700">${correctText(qq)}</div>
        </div>
        ${scoreRow()}`;
}

function scoreRow() {
    return `<div class="stat-row card">
        <div><b>${ps.score ?? 0}</b><span class="muted">correct</span></div>
        <div><b>#${ps.rank ?? '–'}</b><span class="muted">of ${ps.players}</span></div>
    </div>`;
}

function renderFinal() {
    $('#hdr-right').textContent = '';
    const medal = { 1: '🥇', 2: '🥈', 3: '🥉' }[ps.rank] || '🏁';
    $('#view').innerHTML = `
        <div class="wait"><div>
            <div class="spinner">${medal}</div>
            <h1>That's a wrap!</h1>
            <p class="muted">Good luck on the final.</p>
        </div></div>
        ${scoreRow()}`;
}

function updateTimer() {
    const el = $('#timer-sm');
    if (!el || !ps) return;
    const left = room().state === 'open' ? api.secondsLeft(room()) : null;
    if (left == null) {
        el.textContent = '';
        return;
    }
    const sec = Math.ceil(left);
    el.textContent = `· ⏱ ${sec}s`;
    el.classList.toggle('low', sec <= 5);
}
