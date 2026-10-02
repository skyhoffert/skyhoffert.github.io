import { getDraft, getDraftPool, setWishlist } from '../api.js';
import { getMe } from '../session.js';
import { el, esc, setLeague, notFound, teamLabel, playerName, pill } from '../render.js';



// ### SECTIONS ###

const rankTag = p => `<small class="draft-rank">${p.rank ? `#${p.rank}` : 'NR'}</small>`;

function orderList(d, meId) {
    if (!d.order.length) return '<div class="empty">Draft order coming soon. Set your wishlist in the meantime.</div>';
    const items = d.order.map((t, i) => `
        <li class="${t.id === meId ? 'mine' : ''}"><span class="rank">${i + 1}</span>${teamLabel(t, { size: 'sm' })}</li>`).join('');
    const late = d.unordered.length
        ? `<p class="hint after-table">Not in the order yet: ${d.unordered.map(t => esc(t.name)).join(', ')}.</p>` : '';
    return `<ol class="draft-order card">${items}</ol>${late}`;
}

function picksBoard(picks, meId) {
    if (!picks.length) return '<div class="empty">No picks.</div>';
    const rounds = new Map();
    for (const p of picks) rounds.set(p.round, [...(rounds.get(p.round) ?? []), p]);
    return [...rounds].map(([r, ps]) => `
        <div class="card">
            <div class="card-head"><b>Round ${r}</b></div>
            <table><tbody>${ps.map(p => `
                <tr class="${p.team.id === meId ? 'mine' : ''}">
                    <td class="rank">${p.overall}</td>
                    <td>${teamLabel(p.team, { owner: false, size: 'sm' })}</td>
                    <td>${playerName(p.player)}${rankTag(p)}</td>
                    <td class="num">${p.wish_rank ? pill(`🎯 Wish #${p.wish_rank}`, 'pill-in') : pill('🤖 Auto', 'pill-trade')}</td>
                </tr>`).join('')}
            </tbody></table>
        </div>`).join('');
}



// ### COUNTDOWN ###

const pad = n => String(n).padStart(2, '0');

function countdownText(ms) {
    if (ms <= 0) return 'Any minute now';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    return `${d ? `${d}d ` : ''}${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

// Ticks every second; stops once the page is swapped out
function countdown(iso) {
    const at = new Date(iso);
    const when = at.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
    const box = el(`
        <div class="draft-clock card">
            <small>Draft runs ${esc(when)}</small>
            <b></b>
        </div>`);
    const out = box.querySelector('b');
    let seen = false;
    const tick = () => {
        if (box.isConnected) seen = true;
        else if (seen) return clearInterval(timer);
        out.textContent = countdownText(at - Date.now());
    };
    const timer = setInterval(tick, 1000);
    tick();
    return box;
}



// ### WISHLIST ###

function wishRows(list) {
    if (!list.length) return '<div class="empty">Empty. Add players below, best first. Leftover picks use the default ranking.</div>';
    return `<table><tbody>${list.map((p, i) => `
        <tr>
            <td class="rank">${i + 1}</td>
            <td>${playerName(p)}${rankTag(p)}</td>
            <td class="wish-btns">
                <button type="button" class="btn" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
                <button type="button" class="btn" data-down="${i}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
                <button type="button" class="btn" data-remove="${i}" aria-label="Remove">✕</button>
            </td>
        </tr>`).join('')}</tbody></table>`;
}

function poolRows(pool, list, max) {
    if (!pool.length) return '<div class="empty">No players match.</div>';
    const ids = new Set(list.map(p => p.id));
    return `<table><tbody>${pool.map(p => `
        <tr>
            <td>${playerName(p)}${rankTag(p)}</td>
            <td class="wish-btns">${ids.has(p.id)
                ? pill('On list', 'pill-in')
                : `<button type="button" class="btn" data-add="${p.id}" ${list.length >= max ? 'disabled' : ''} aria-label="Add">+</button>`}</td>
        </tr>`).join('')}</tbody></table>`;
}

function wishlistEditor(me, wishlist, max, firstPool) {
    let list = [...wishlist];
    let pool = firstPool;
    let saved = JSON.stringify(list.map(p => p.id));

    const box = el(`
        <section>
            <h2>Your Wishlist <span class="wish-count"></span></h2>
            <p class="hint">Only you can see this. When it's your pick you get the first player still available who fits an open slot,
                otherwise the best available by default rank (NHL.com top 200). Editable until the draft runs.</p>
            <div class="card wish-list"></div>
            <div class="wish-save">
                <button type="button" class="btn-action" data-save>Save</button>
                <span class="hint save-msg"></span>
            </div>
            <h3 class="sub-h">Add Players</h3>
            <form class="filters" onsubmit="return false">
                <input type="search" name="search" placeholder="Search name…" autocomplete="off">
                <select name="position">
                    <option value="">All positions</option>
                    <option value="F">Forwards</option>
                    <option value="D">Defense</option>
                    <option value="G">Goalies</option>
                </select>
            </form>
            <div class="card wish-pool"></div>
        </section>`);
    const $ = s => box.querySelector(s);
    const msg = $('.save-msg');

    const render = () => {
        const dirty = JSON.stringify(list.map(p => p.id)) !== saved;
        $('.wish-count').textContent = `${list.length} / ${max}`;
        $('.wish-list').innerHTML = wishRows(list);
        $('.wish-pool').innerHTML = poolRows(pool, list, max);
        $('[data-save]').disabled = !dirty;
        box.classList.toggle('dirty', dirty);
        if (dirty) msg.textContent = 'Unsaved changes. Tap Save.';
    };

    const form = $('form');
    let timer, seq = 0;
    form.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const my = ++seq;
            const res = await getDraftPool(Object.fromEntries(new FormData(form)));
            if (my !== seq) return;
            pool = res;
            render();
        }, 250);
    });

    box.addEventListener('click', async e => {
        const b = e.target.closest('button');
        if (!b || b.disabled) return;
        const swap = (i, j) => [list[i], list[j]] = [list[j], list[i]];
        if (b.dataset.up) swap(+b.dataset.up, +b.dataset.up - 1);
        else if (b.dataset.down) swap(+b.dataset.down, +b.dataset.down + 1);
        else if (b.dataset.remove) list.splice(+b.dataset.remove, 1);
        else if (b.dataset.add) {
            const p = pool.find(x => x.id === Number(b.dataset.add));
            if (p && list.length < max) list.push(p);
        } else if ('save' in b.dataset) {
            b.disabled = true;
            const ids = list.map(p => p.id);
            const res = await setWishlist(me.team.id, me.pin, ids);
            if (res.ok) saved = JSON.stringify(ids);
            render();
            msg.textContent = res.ok ? 'Saved ✓' : res.error;
            return;
        }
        render();
    });

    render();
    msg.textContent = '';
    return box;
}



// ### PAGE ###

export async function draftPage() {
    const me = getMe();
    const [g, pool] = await Promise.all([getDraft(me?.team.id, me?.pin), getDraftPool()]);
    if (!g.league) return notFound('League');
    setLeague(g.league);
    const d = g.draft;
    if (!d) return `<section><h1>Draft</h1><div class="empty">No draft this season.</div></section>`;

    const open = d.status === 'open';
    const meId = me?.team.id;
    const type = d.type === 'snake' ? 'Snake (order flips every round)' : 'Linear (same order every round)';
    const page = el(`<div>
        <section>
            <h1>Draft</h1>
            <p class="sub">${type} · ${g.league.slots.length} rounds · ${open ? 'Open, set your wishlist' : 'Complete'}</p>
            <div class="clock-slot"></div>
        </section>
        ${open ? `
            <section>
                <h2>Draft Order</h2>
                ${orderList(d, meId)}
            </section>
            <div class="wish-slot">${me && g.wishlist ? '' : '<p class="hint">Sign in to set your wishlist.</p>'}</div>`
        : `
            <section>
                <h2>Results</h2>
                <div class="cards">${picksBoard(g.picks, meId)}</div>
            </section>`}
    </div>`);

    if (open && d.scheduled_at) page.querySelector('.clock-slot').append(countdown(d.scheduled_at));
    if (open && me && g.wishlist) page.querySelector('.wish-slot').append(wishlistEditor(me, g.wishlist, d.wish_max, pool));
    return page;
}
