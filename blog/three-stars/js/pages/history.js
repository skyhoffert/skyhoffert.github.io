import { getHistory } from '../api.js';
import { esc, setLeague, notFound, teamBadge, supporterStar, weekStatus, fmtWeek, movesList, spChip, placeClass, copyBtn, weekText } from '../render.js';



// ### PAGE ###

function weekRow(w, league) {
    const teams = w.teams.map(t => `
        <span class="hist-team ${placeClass(t.sp)}">
            <small>${t.week_rank}</small>
            ${teamBadge(t.team, 'sm')}
            <span>${esc(t.team.name)}${supporterStar(t.team)}</span>
            <b>${t.total_points}</b>
            ${spChip(t.sp, w.is_final)}
        </span>`).join('');
    return `
        <div class="card hist-week">
            <div class="card-head">
                <a href="#/week/${w.week}"><b>${fmtWeek(w.week)}</b></a>
                ${weekStatus(w)}
                ${w.is_final ? copyBtn(weekText(league, w, w.teams), 'Copy recap') : ''}
            </div>
            <div class="hist-teams">${teams}</div>
            ${w.moves?.length ? `<div class="hist-moves">${movesList(w.moves)}</div>` : ''}
        </div>`;
}

function draftCard(league) {
    if (!league.draft_status) return '';
    const open = league.draft_status === 'open';
    return `
        <a class="card hist-draft" href="#/draft">
            <div class="card-head">
                <b>${league.season.toString().replace(/(\d{4})(\d{4})/, '$1–$2')} Draft</b>
                <span class="chip ${open ? 'chip-live' : 'chip-final'}">${open ? 'Open' : 'Results'}</span>
                <span class="draft-go">›</span>
            </div>
        </a>`;
}

export async function historyPage() {
    const h = await getHistory();
    if (!h.league) return notFound('League');
    setLeague(h.league);
    return `
        <section>
            <h1>History</h1>
            <div class="cards">
                ${h.weeks.map(w => weekRow(w, h.league)).join('') || '<div class="empty">No weeks yet.</div>'}
                ${draftCard(h.league)}
            </div>
        </section>`;
}
