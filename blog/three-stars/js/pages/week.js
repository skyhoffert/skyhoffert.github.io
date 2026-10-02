import { getWeek, getReactions } from '../api.js';
import { getMe } from '../session.js';
import { setLeague, notFound, draftBanner, teamLabel, rosterTable, weekNav, fmtWeek, movesList, spChip, placeClass } from '../render.js';



// ### PAGE ###

function teamCard(t, isFinal) {
    return `
        <div class="card ${placeClass(t.sp)}">
            <div class="card-head">
                <span class="rank">${t.week_rank ?? '–'}</span>
                ${teamLabel(t.team)}
                ${spChip(t.sp, isFinal)}
                <span class="total">${t.total_points}<small>pts</small></span>
            </div>
            ${rosterTable(t.players)}
        </div>`;
}

export async function weekPage(week) {
    const [w, reactions] = await Promise.all([getWeek(week), getReactions()]);
    if (!w.league) return notFound('League');
    setLeague(w.league);
    // Reactions only live on the current week's moves; they clear at rollover
    const react = w.nav.week === w.nav.current_week ? { week: w.nav.week, reactions, meId: getMe()?.team.id } : null;
    return `
        ${draftBanner(w.league)}
        <section>
            <h1>Week of ${fmtWeek(w.nav.week)}</h1>
            ${weekNav(w.nav, '#/week/')}
            <div class="cards">${w.teams.map(t => teamCard(t, w.nav.is_final)).join('') || '<div class="empty">No teams.</div>'}</div>
        </section>
        <section>
            <h2>Moves</h2>
            ${movesList(w.moves, react) || '<div class="empty">No moves this week.</div>'}
        </section>`;
}
