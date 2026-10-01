import { getHistory } from '../api.js';
import { esc, setLeague, notFound, teamBadge, weekStatus, fmtWeek, movesList, spChip, placeClass } from '../render.js';



// ### PAGE ###

function weekRow(w) {
    const teams = w.teams.map(t => `
        <span class="hist-team ${placeClass(t.sp)}">
            <small>${t.week_rank}</small>
            ${teamBadge(t.team, 'sm')}
            <span>${esc(t.team.name)}</span>
            <b>${t.total_points}</b>
            ${spChip(t.sp, w.is_final)}
        </span>`).join('');
    return `
        <div class="card hist-week">
            <div class="card-head">
                <a href="#/week/${w.week}"><b>${fmtWeek(w.week)}</b></a>
                ${weekStatus(w)}
            </div>
            <div class="hist-teams">${teams}</div>
            ${w.moves?.length ? `<div class="hist-moves">${movesList(w.moves)}</div>` : ''}
        </div>`;
}

export async function historyPage() {
    const h = await getHistory();
    if (!h.league) return notFound('League');
    setLeague(h.league);
    return `
        <section>
            <h1>History</h1>
            <div class="cards">${h.weeks.map(weekRow).join('') || '<div class="empty">No weeks yet.</div>'}</div>
        </section>`;
}
