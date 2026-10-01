import { getTeam, getMyReactions } from '../api.js';
import { refresh } from '../router.js';
import { getMe, loadMine } from '../session.js';
import { playerSheet, waiverInSheet, proposeTradeDialog, tradeSheet, customizeDialog, suggestIconDialog, buyReactionDialog } from '../dialogs.js';
import { DEKE_BUNDLES, EMOJIS, EMOJI_PRICE, PASS_PRICE } from '../config.js';
import { el, esc, setLeague, notFound, teamBadge, rosterTable, weekNav, fmtWeek, ordinal, pill, playerName, spChip, emojiImg } from '../render.js';



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
                <td>${playerName(p)}${pill(`Waiver In #${p.n}`, 'pill-in')}</td>
            </tr>`).join('')}</tbody></table>`
        : '<div class="empty">No claims. Tap a free agent on the Players page to claim them.</div>';
    return `
        <section>
            <h2>Waiver Ins</h2>
            <p class="hint">Only you can see this. Processed Monday morning. Tap a claim to remove it.</p>
            ${body}
        </section>`;
}

function tradeLabel(tr) {
    if (tr.status === 'accepted') return pill('Accepted · Monday', 'pill-trade');
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
            <p class="hint">Only the two teams involved can see a trade. Accepted trades happen Monday morning; offers left unanswered expire then.</p>
            ${body}
        </section>`;
}

// { [player_id]: pill html } for players in any of my trades
function tradePills(trades) {
    const out = {};
    for (const tr of trades ?? []) {
        const text = tr.status === 'accepted' ? 'Traded · Monday' : 'Trade pending';
        for (const p of [...tr.give, ...tr.get]) out[p.id] = pill(text, 'pill-trade');
    }
    return out;
}

// r: get_my_reactions result {pass, emojis}. Owned/active rows aren't tappable.
function reactionRows(r) {
    const row = (buy, label, sub, tag) => `
        <tr${buy ? ` class="editable" data-buy="${buy}"` : ''}>
            <td><span class="pname"><b>${label}</b><small>${sub}</small></span>${tag}</td>
        </tr>`;
    const pass = r.pass
        ? row(null, 'Reaction pass', 'Active until Monday\'s rollover', pill('Active', 'pill-in'))
        : row('pass', 'Reaction pass', 'Needed to react this week', pill(`${PASS_PRICE} Deke`, 'pill-trade'));
    const emojis = EMOJIS.map(e => {
        const owned = r.emojis.includes(e.id);
        const tag = e.id === 'fire' ? pill('Free', 'pill-in') : owned ? pill('Owned', 'pill-in') : pill(`${EMOJI_PRICE} Dekes`, 'pill-trade');
        return row(owned ? null : e.id, `${emojiImg(e.id)} ${esc(e.label)}`, owned ? 'In your pool' : 'Adds to your pool for good', tag);
    }).join('');
    return `
        <h3 class="sub-h">Reactions</h3>
        <p class="hint">React to this week's Moves and Recent Three Stars games, one emoji each. Needs the weekly pass;
            you can use any emoji in your pool.</p>
        <table><tbody>${pass}${emojis}</tbody></table>`;
}

function customizeSection(team, dekes, reactions) {
    const buy = DEKE_BUNDLES.map(b => b.url
        ? `<a class="deke-buy" href="${esc(b.url)}?client_reference_id=${team.id}" target="_blank" rel="noopener"><b>${b.dekes} Dekes</b><span>${b.price}</span></a>`
        : `<span class="deke-buy disabled"><b>${b.dekes} Dekes</b><span>Soon</span></span>`).join('');
    const rows = [['name', 'Team name', esc(team.name)], ['color', 'Color', esc(team.color)], ['icon', 'Icon', 'Pick from the icon set']];
    return `
        <section>
            <h2>Dekes <span class="deke-count">${dekes}<small>${dekes === 1 ? 'deke' : 'dekes'}</small></span></h2>

            <h3 class="sub-h">Get More Dekes</h3>
            <p class="hint">Dekes are cosmetic only and help keep Three Stars ad-free.</p>
            <div class="deke-bundles">${buy}</div>
            <p class="hint">After paying, your Dekes show up here within a minute.</p>

            <h3 class="sub-h">Customize Your Team</h3>
            <p class="hint">Each change costs 1 Deke: team name, color, icon, or a player nickname (tap a player above).</p>
            <table><tbody>${rows.map(([k, label, cur]) => `
                <tr class="editable" data-custom="${k}">
                    <td><span class="pname"><b>${label}</b><small>${cur}</small></span>${pill('1 Deke', 'pill-trade')}</td>
                </tr>`).join('')}</tbody></table>
            <p class="hint after-table">Want a new icon? <button type="button" class="link-btn" data-suggest>Suggest one</button> (free).</p>

            ${reactions?.ok ? reactionRows(reactions) : ''}
        </section>`;
}

async function openPropose(t, mine) {
    const my = await getTeam(mine.team.id, t.nav.week);
    const locked = Object.fromEntries(mine.outs.map(o => [o.player_id, 'Waiver Out']));
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
    const outs = isMine ? Object.fromEntries((mine?.outs ?? []).map(o => [o.player_id, o.n])) : {};
    const pills = t.editable ? tradePills(mine?.trades) : {};
    for (const [pid, n] of Object.entries(outs)) pills[pid] = pill(`Waiver Out #${n}`, 'pill-out');
    const hint = manage ? 'Tap a player to set a nickname or waive them out.'
        : t.editable && !me ? 'Sign in to manage your team.' : '';

    const page = el(`<div class="team-page" style="--team:${esc(team.color)}">
        <section class="team-hero" style="--team:${esc(team.color)}">
            ${teamBadge(team, 'lg')}
            <div>
                <h1>${esc(team.name)}</h1>
                <p class="sub">${esc(team.owner)}</p>
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
        if (e.target.closest('[data-suggest]')) return suggestIconDialog();
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
            done = p && await playerSheet(p, outs[p.id], mine.dekes ?? 0);
        } else if (row.dataset.in) {
            const p = mine.ins.find(x => x.id === Number(row.dataset.in));
            done = p && await waiverInSheet(p, p.n);
        }
        if (done) refresh();
    });
    return page;
}
