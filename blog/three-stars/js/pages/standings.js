import { getStandings, getRecentStars } from '../api.js';
import { esc, setLeague, notFound, teamLabel, ownerChip, playerName, fmtDate, fmtWeek } from '../render.js';



// ### STANDINGS ###

function standingsTable(s) {
    if (!s.standings.length) return '<div class="empty">No teams yet.</div>';
    const rows = s.standings.map(r => `
        <tr>
            <td class="rank">${r.standing}</td>
            <td>${teamLabel(r.team)}</td>
            <td class="num big">${r.wins}</td>
            <td class="num">${r.total_points}</td>
            <td class="num muted">${r.week_points}</td>
        </tr>`).join('');
    return `
        <table class="standings">
            <thead><tr>
                <th></th><th>Team</th><th class="num">W</th><th class="num">Pts</th><th class="num">This wk</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}



// ### RECENT STARS ###

function starRow(s) {
    const p = s.player;
    const shot = p.headshot ? `<img class="headshot" src="${esc(p.headshot)}" alt="" loading="lazy">` : '<span class="headshot"></span>';
    return `
        <li class="star-row ${s.owner ? 'owned' : ''}">
            <span class="star s${s.star}">★</span>
            ${shot}
            ${playerName(p)}
            ${ownerChip(s.owner)}
            <span class="pts">+${s.points}</span>
        </li>`;
}

function recentFeed(games) {
    if (!games.length) return '<div class="empty">No recent games.</div>';
    return games.map(g => `
        <div class="game">
            <div class="game-head">
                <span><b>${esc(g.away)}</b> ${g.away_score ?? ''} @ <b>${esc(g.home)}</b> ${g.home_score ?? ''}</span>
                <small>${fmtDate(g.date)}</small>
            </div>
            <ol class="star-list">${g.stars.map(starRow).join('')}</ol>
        </div>`).join('');
}



// ### PAGE ###

export async function standingsPage() {
    const [s, recent] = await Promise.all([getStandings(), getRecentStars(3)]);
    if (!s.league) return notFound('League');
    setLeague(s.league);
    return `
        <section>
            <h1>Standings</h1>
            <p class="sub">Season ${String(s.league.season).replace(/(\d{4})(\d{4})/, '$1–$2')} · Ws count from week of ${fmtWeek(s.league.first_scoring_week)}</p>
            ${standingsTable(s)}
        </section>
        <section>
            <h2>Recent Three Stars</h2>
            <div class="games">${recentFeed(recent)}</div>
        </section>`;
}
