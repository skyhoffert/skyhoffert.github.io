import { getTeam } from '../api.js';
import { refresh } from '../router.js';
import { getMe, loadMine } from '../session.js';
import { playerSheet, waiverInSheet } from '../dialogs.js';
import { el, esc, setLeague, notFound, teamBadge, rosterTable, weekNav, fmtWeek, ordinal, pill, playerName } from '../render.js';



// ### SECTIONS ###

function historyTable(history) {
    if (!history.length) return '<div class="empty">No weeks yet.</div>';
    const rows = history.map(h => `
        <tr>
            <td><a href="#/week/${h.week}">${fmtWeek(h.week)}</a>${h.is_scoring ? '' : ' <small class="muted">preseason</small>'}</td>
            <td class="num">${h.total_points}</td>
            <td class="num">${ordinal(h.week_rank)}</td>
            <td class="num">${h.is_winner ? '🏆' : ''}</td>
        </tr>`).join('');
    return `
        <table>
            <thead><tr><th>Week</th><th class="num">Pts</th><th class="num">Rank</th><th class="num">W</th></tr></thead>
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



// ### PAGE ###

export async function teamPage(id, week) {
    const me = getMe();
    const isMine = me?.team.id === Number(id);
    const [t, mine] = await Promise.all([getTeam(Number(id), week), isMine ? loadMine() : null]);
    if (!t) return notFound('Team');
    setLeague(t.league);

    const team = t.week.team;
    const st = t.standing ?? { wins: 0, total_points: 0, standing: null };
    const manage = !!mine && t.editable;
    const outs = Object.fromEntries((mine?.outs ?? []).map(o => [o.player_id, o.n]));
    const pills = Object.fromEntries(Object.entries(outs).map(([pid, n]) => [pid, pill(`Waiver Out #${n}`, 'pill-out')]));
    const hint = manage ? 'Tap a player to set a nickname or waive them out.'
        : t.editable && !me ? 'Sign in to manage your team.' : '';

    const page = el(`<div>
        <section class="team-hero" style="--team:${esc(team.color)}">
            ${teamBadge(team, 'lg')}
            <div>
                <h1>${esc(team.name)}</h1>
                <p class="sub">${esc(team.owner)}</p>
            </div>
            <div class="hero-stats">
                <div><b>${st.wins}</b><small>W</small></div>
                <div><b>${st.total_points}</b><small>Pts</small></div>
                <div><b>${ordinal(st.standing)}</b><small>Place</small></div>
            </div>
        </section>
        <section>
            <h2>Roster · ${t.week.total_points} pts</h2>
            ${weekNav(t.nav, `#/team/${team.id}/`)}
            ${hint ? `<p class="hint">${hint}</p>` : ''}
            <div class="card">${rosterTable(t.week.players, { editable: manage, pills: manage ? pills : {} })}</div>
        </section>
        ${mine ? waiverInsSection(mine.ins) : ''}
        <section>
            <h2>Weekly History</h2>
            ${historyTable(t.history)}
        </section>
    </div>`);

    page.addEventListener('click', async e => {
        const row = e.target.closest('tr.editable');
        if (!row) return;
        let done = null;
        if (row.dataset.player) {
            const p = t.week.players.find(x => x.id === Number(row.dataset.player));
            done = p && await playerSheet(p, outs[p.id]);
        } else if (row.dataset.in) {
            const p = mine.ins.find(x => x.id === Number(row.dataset.in));
            done = p && await waiverInSheet(p, p.n);
        }
        if (done) refresh();
    });
    return page;
}
