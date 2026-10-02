import { getTeam, getMyReactions } from '../api.js';
import { refresh } from '../router.js';
import { getMe, loadMine } from '../session.js';
import { playerSheet, waiverInSheet, proposeTradeDialog, tradeSheet, customizeDialog, customCost, buyReactionDialog } from '../dialogs.js';
import { DEKE_BUNDLES, EMOJIS, EMOJI_PRICE, PASS_PRICE, SEASON_PASS_PRICE } from '../config.js';
import { el, esc, setLeague, notFound, draftBanner, teamBadge, supporterStar, rosterTable, weekNav, fmtWeek, ordinal, pill, playerName, spChip, emojiImg, nextRun } from '../render.js';



// ### SECTIONS ###

function historyTable(history) {
    if (!history.length) return '<div class="empty">No weeks yet.</div>';
    const rows = history.map(h => `
        <tr>
            <td><a href="#/week/${h.week}">${fmtWeek(h.week)}</a>${h.is_scoring ? '' : ' <small class="muted">preseason</small>'}</td>
            <td class="num">${h.total_points}</td>
            <td class="num">${ordinal(h.week_rank)}</td>
            <td class="num">${spChip(h.sp, h.is_final)}</td>
        </tr>`).join('');
    return `
        <table>
            <thead><tr><th>Week</th><th class="num">Pts</th><th class="num">Place</th><th class="num">SP</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function waiverInsSection(ins) {
    const body = ins.length
        ? `<table><tbody>${ins.map(p => `
            <tr class="editable" data-in="${p.id}">
                <td>${playerName(p)}${pill(`Waiver In #${p.n}`, 'pill-in')}${pill(`Drop ${p.drop.name}`, 'pill-out')}</td>
            </tr>`).join('')}</tbody></table>`
        : '<div class="empty">No claims. Tap a free agent on the Players page to claim them.</div>';
    return `
        <section>
            <h2>Waiver Ins</h2>
            <p class="hint">Only you can see this. Processed ${esc(nextRun())}, #1 first. Tap a claim to change its drop or remove it.</p>
            ${body}
        </section>`;
}

function tradeLabel(tr) {
    if (tr.status === 'accepted') return pill(`Accepted · ${nextRun(true)}`, 'pill-trade');
    return tr.sent ? pill('Awaiting reply', 'pill-trade') : pill('Needs your reply', 'pill-in');
}

function tradesSection(trades) {
    const names = ps => ps.map(p => esc(p.name)).join(', ');
    const body = trades.length
        ? `<table><tbody>${trades.map(tr => `
            <tr class="editable" data-trade="${tr.id}">
                <td><span class="pname">
                    <b>${tr.sent ? 'To' : 'From'} ${esc(tr.other.name)}</b>
                    <small>Give: ${names(tr.give)}</small>
                    <small>Get: ${names(tr.get)}</small>
                </span>${tradeLabel(tr)}</td>
            </tr>`).join('')}</tbody></table>`
        : '<div class="empty">No trades. Open another team\'s page to propose one.</div>';
    return `
        <section>
            <h2>Trades</h2>
            <p class="hint">Only the two teams involved can see a trade. Accepted trades happen ${esc(nextRun())}; offers left unanswered expire then.</p>
            ${body}
        </section>`;
}

// { [player_id]: pill html } for players in any of my trades
function tradePills(trades) {
    const out = {};
    for (const tr of trades ?? []) {
        const text = tr.status === 'accepted' ? `Traded · ${nextRun(true)}` : 'Trade pending';
        for (const p of [...tr.give, ...tr.get]) out[p.id] = pill(text, 'pill-trade');
    }
    return out;
}

// r: get_my_reactions result {pass, emojis}. Pass tile + owned pool + shop of the rest.
function reactionTiles(r) {
    const owned = EMOJIS.filter(e => r.emojis.includes(e.id));
    const shop = EMOJIS.filter(e => !r.emojis.includes(e.id));
    const on = (label, sub) => `<div class="tile tile-on"><b>${label}</b><small>${sub}</small></div>`;
    const buy = (item, label, sub, cost) =>
        `<button type="button" class="tile" data-buy="${item}"><b>${label}</b><small>${sub}</small>${pill(`${cost} Deke${cost === 1 ? '' : 's'}`, 'pill-trade')}</button>`;
    const season = r.season_pass ? on('Season pass', 'Active all season') : buy('season', 'Season pass', 'Every week, rest of season', SEASON_PASS_PRICE);
    const week = r.season_pass ? '' : r.pass ? on('Weekly pass', 'Active until Monday') : buy('pass', 'Weekly pass', 'This week only', PASS_PRICE);
    const pass = `<div class="tiles ${week ? 'tiles-2' : ''}">${week}${season}</div>`;
    return `
        <h3 class="sub-h">Reactions</h3>
        <p class="hint">React to this week's Moves and Recent Three Stars games, one emoji each. Needs the weekly pass;
            you can use any emoji in your pool.</p>
        ${pass}
        <p class="label-h">Your pool</p>
        <div class="emoji-pool">${owned.map(e => `<span title="${esc(e.label)}">${emojiImg(e.id)}</span>`).join('')}</div>
        ${shop.length ? `
            <p class="label-h">Unlock · ${EMOJI_PRICE} Dekes each, yours for good</p>
            <div class="emoji-shop">${shop.map(e => `
                <button type="button" class="emoji-buy" data-buy="${e.id}" title="${esc(e.label)}">${emojiImg(e.id)}<small>${EMOJI_PRICE}</small></button>`).join('')}
            </div>` : ''}`;
}

function customizeSection(team, dekes, reactions) {
    const buy = DEKE_BUNDLES.map(b => {
        const extra = b.supporter ? '<span>+ Supporter ★</span>' : '';
        return b.url
            ? `<a class="deke-buy" href="${esc(b.url)}?client_reference_id=${team.id}" target="_blank" rel="noopener"><b>${b.dekes} Dekes</b><span>${b.price}</span>${extra}</a>`
            : `<span class="deke-buy disabled"><b>${b.dekes} Dekes</b><span>Soon</span>${extra}</span>`;
    }).join('');
    const tiles = [
        ['name', 'Name', `<span class="tile-val">${esc(team.name)}</span>`],
        ['color', 'Color', `<span class="swatch" style="background:${esc(team.color)}"></span>`],
        ['icon', 'Icon', teamBadge(team, 'sm')],
    ];
    return `
        <section>
            <h2>Dekes <span class="deke-count">${dekes}<small>${dekes === 1 ? 'deke' : 'dekes'}</small></span></h2>

            <h3 class="sub-h">Get More Dekes</h3>
            <p class="hint">Dekes are cosmetic only and help keep Three Stars ad-free.</p>
            <div class="deke-bundles">${buy}</div>
            <p class="hint">After paying, your Dekes show up here within a minute.</p>

            <h3 class="sub-h">Customize Your Team</h3>
            <p class="hint">Team name, color or a player nickname (tap a player above) cost 1 Deke each; a new icon costs 2.</p>
            <div class="tiles tiles-3">${tiles.map(([k, label, cur]) => `
                <button type="button" class="tile" data-custom="${k}"><b>${label}</b>${cur}${pill(`${customCost(k)} Deke${customCost(k) === 1 ? '' : 's'}`, 'pill-trade')}</button>`).join('')}
            </div>
            <p class="hint after-table">Want a new icon? Suggest one with <a href="#/support">Message the Dev</a> on the Support page.</p>

            ${reactions?.ok ? reactionTiles(reactions) : ''}
        </section>`;
}

async function openPropose(t, mine) {
    const my = await getTeam(mine.team.id, t.nav.week);
    const locked = Object.fromEntries(mine.ins.map(c => [c.drop.id, 'Waiver drop']));
    for (const tr of mine.trades) if (tr.status === 'accepted') for (const p of tr.give) locked[p.id] = 'Already traded';
    return proposeTradeDialog(t.week.team, t.week.players, my.week.players, locked);
}



// ### PAGE ###

export async function teamPage(id, week) {
    const me = getMe();
    const isMine = me?.team.id === Number(id);
    const [t, mine, reactions] = await Promise.all([
        getTeam(Number(id), week),
        me ? loadMine() : null,
        isMine ? getMyReactions(me.team.id, me.pin) : null,
    ]);
    if (!t) return notFound('Team');
    setLeague(t.league);

    const team = t.week.team;
    const st = t.standing ?? { sp: 0, place1: 0, place2: 0, place3: 0, standing: null };
    const manage = isMine && !!mine && t.editable;
    const canTrade = !isMine && !!mine && t.editable;
    const pills = t.editable ? tradePills(mine?.trades) : {};
    if (isMine && t.editable) for (const c of mine?.ins ?? []) pills[c.drop.id] = (pills[c.drop.id] ?? '') + pill(`Drop for #${c.n}`, 'pill-out');
    const hint = manage ? 'Tap a player to set a nickname. Waiver claims start from the Players page.'
        : t.editable && !me ? 'Sign in to manage your team.' : '';

    const page = el(`<div class="team-page" style="--team:${esc(team.color)}">
        ${draftBanner(t.league)}
        <section class="team-hero" style="--team:${esc(team.color)}">
            ${teamBadge(team, 'lg')}
            <div>
                <h1>${esc(team.name)}${supporterStar(team)}</h1>
                <p class="sub">${esc(team.owner)}${team.supporter ? ' · <span class="supporter-tag">Three Stars Supporter</span>' : ''}</p>
            </div>
            <div class="hero-stats">
                <div><b>${st.sp}</b><small>SP</small></div>
                <div><b>${st.place1}-${st.place2}-${st.place3}</b><small>1-2-3</small></div>
                <div><b>${ordinal(st.standing)}</b><small>Place</small></div>
            </div>
        </section>
        <section>
            <h2>Roster · ${t.week.total_points} pts</h2>
            ${weekNav(t.nav, `#/team/${team.id}/`)}
            ${hint ? `<p class="hint">${hint}</p>` : ''}
            <div class="card">${rosterTable(t.week.players, { editable: manage, pills })}</div>
            ${canTrade ? '<button type="button" class="btn-action" data-propose>Propose trade</button>' : ''}
        </section>
        ${isMine && mine ? tradesSection(mine.trades) : ''}
        ${isMine && mine ? waiverInsSection(mine.ins) : ''}
        <section>
            <h2>Weekly History</h2>
            ${historyTable(t.history)}
        </section>
        ${isMine && mine ? customizeSection(team, mine.dekes ?? 0, reactions) : ''}
    </div>`);

    page.addEventListener('click', async e => {
        if (e.target.closest('[data-propose]')) {
            if (await openPropose(t, mine)) refresh();
            return;
        }
        // customizeDialog success updates the session, which already triggers a refresh
        const custom = e.target.closest('[data-custom]');
        if (custom) return customizeDialog(custom.dataset.custom, mine.dekes ?? 0);
        const buy = e.target.closest('[data-buy]');
        if (buy) {
            if (await buyReactionDialog(buy.dataset.buy, mine.dekes ?? 0)) refresh();
            return;
        }
        const row = e.target.closest('tr.editable');
        if (!row) return;
        let done = null;
        if (row.dataset.trade) {
            const tr = mine.trades.find(x => x.id === Number(row.dataset.trade));
            done = tr && await tradeSheet(tr);
        } else if (row.dataset.player) {
            const p = t.week.players.find(x => x.id === Number(row.dataset.player));
            done = p && await playerSheet(p, mine.dekes ?? 0);
        } else if (row.dataset.in) {
            const p = mine.ins.find(x => x.id === Number(row.dataset.in));
            done = p && await waiverInSheet(p, p);
        }
        if (done) refresh();
    });
    return page;
}
