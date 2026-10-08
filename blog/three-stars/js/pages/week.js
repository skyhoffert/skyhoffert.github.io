import { getWeek, getReactions } from '../api.js';
import { getMe } from '../session.js';
import { setLeague, notFound, draftBanner, teamLabel, rosterTable, weekNav, fmtWeek, movesList, spChip, placeClass, copyBtn, weekText, teamText } from '../render.js';



// ### PAGE ###

function teamCard(t, nav, league) {
    return `
        <div class="card ${placeClass(t.sp)}">
            <div class="card-head">
                <span class="rank">${t.week_rank ?? '–'}</span>
                ${teamLabel(t.team)}
                ${spChip(t.sp, nav.is_final)}
                <span class="total">${t.total_points}<small>pts</small></span>
                ${nav.is_final ? copyBtn(teamText(league, nav, t), 'Copy') : ''}
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
    const copyAll = w.nav.is_final && w.teams.length ? copyBtn(weekText(w.league, w.nav, w.teams), 'Copy recap') : '';
    return `
        ${draftBanner(w.league)}
        <section>
            <h1>Week of ${fmtWeek(w.nav.week)}</h1>
            ${weekNav(w.nav, '#/week/', copyAll)}
            <div class="cards">${w.teams.map(t => teamCard(t, w.nav, w.league)).join('') || '<div class="empty">No teams.</div>'}</div>
        </section>
        <section>
            <h2>Moves</h2>
            ${movesList(w.moves, react) || '<div class="empty">No moves this week.</div>'}
        </section>`;
}
