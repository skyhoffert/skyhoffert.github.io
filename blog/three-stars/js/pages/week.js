import { getWeek } from '../api.js';
import { setLeague, notFound, teamLabel, rosterTable, weekNav, fmtWeek, movesList } from '../render.js';



// ### PAGE ###

function teamCard(t) {
    return `
        <div class="card ${t.is_winner ? 'winner' : ''}">
            <div class="card-head">
                <span class="rank">${t.week_rank ?? '–'}</span>
                ${teamLabel(t.team)}
                ${t.is_winner ? '<span class="trophy" title="Week winner">🏆</span>' : ''}
                <span class="total">${t.total_points}<small>pts</small></span>
            </div>
            ${rosterTable(t.players)}
        </div>`;
}

export async function weekPage(week) {
    const w = await getWeek(week);
    if (!w.league) return notFound('League');
    setLeague(w.league);
    return `
        <section>
            <h1>Week of ${fmtWeek(w.nav.week)}</h1>
            ${weekNav(w.nav, '#/week/')}
            <div class="cards">${w.teams.map(teamCard).join('') || '<div class="empty">No teams.</div>'}</div>
        </section>
        <section>
            <h2>Moves</h2>
            ${movesList(w.moves) || '<div class="empty">No moves this week.</div>'}
        </section>`;
}
