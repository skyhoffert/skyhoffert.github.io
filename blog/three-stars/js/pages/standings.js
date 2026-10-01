import { getStandings, getRecentStars, getReactions } from '../api.js';
import { getMe } from '../session.js';
import { esc, setLeague, notFound, teamLabel, ownerChip, playerName, fmtDate, fmtWeek, reactionBar } from '../render.js';



// ### STANDINGS ###

function standingsTable(s) {
    if (!s.standings.length) return '<div class="empty">No teams yet.</div>';
    const rows = s.standings.map(r => `
        <tr class="${r.standing <= 3 ? `rank${r.standing}` : ''}" style="--team:${esc(r.team.color)}">
            <td class="rank"><span>${r.standing}</span></td>
            <td>${teamLabel(r.team)}</td>
            <td class="num big">${r.sp}</td>
            <td class="num muted">${r.place1}-${r.place2}-${r.place3}</td>
        </tr>`).join('');
    return `
        <table class="standings">
            <thead><tr>
                <th></th><th>Team</th><th class="num">SP</th><th class="num">1-2-3</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}



// ### RECENT STARS ###

// e.g. "1G · 1A", "2A", "32SV"; zeros left out
function gameLine(s) {
    const parts = [];
    if (s.is_goalie && s.saves != null) parts.push(`${s.saves}SV`);
    if (s.goals) parts.push(`${s.goals}G`);
    if (s.assists) parts.push(`${s.assists}A`);
    return parts.length ? `<span class="game-line">${parts.join(' · ')}</span>` : '';
}

function starRow(s) {
    const p = s.player;
    const shot = p.headshot ? `<img class="headshot" src="${esc(p.headshot)}" alt="" loading="lazy">` : '<span class="headshot"></span>';
    return `
        <li class="star-row ${s.owner ? 'owned' : ''}">
            <span class="star s${s.star}">★</span>
            ${shot}
            ${playerName(p)}
            ${gameLine(s)}
            ${ownerChip(s.owner)}
            <span class="pts">+${s.points}</span>
        </li>`;
}

function recentFeed(games, reactions) {
    if (!games.length) return '<div class="empty">No recent games.</div>';
    const meId = getMe()?.team.id;
    return games.slice(0, 10).map(g => `
        <div class="game">
            <div class="game-head">
                <span><b>${esc(g.away)}</b> ${g.away_score ?? ''} @ <b>${esc(g.home)}</b> ${g.home_score ?? ''}</span>
                <small>${fmtDate(g.date)}</small>
                ${reactionBar(`game:${g.game_id}`, reactions, meId)}
            </div>
            <ol class="star-list">${g.stars.map(starRow).join('')}</ol>
        </div>`).join('');
}



// ### PAGE ###

export async function standingsPage() {
    const [s, recent, reactions] = await Promise.all([getStandings(), getRecentStars(3), getReactions()]);
    if (!s.league) return notFound('League');
    setLeague(s.league);
    return `
        <section>
            <h1>Standings</h1>
            <p class="sub">Season ${String(s.league.season).replace(/(\d{4})(\d{4})/, '$1–$2')} · SP count from week of ${fmtWeek(s.league.first_scoring_week)}</p>
            <p class="hint">Each week: 1st 30 SP, 2nd 20, 3rd 10.</p>
            ${standingsTable(s)}
        </section>
        <section>
            <h2>Recent Three Stars</h2>
            <div class="games">${recentFeed(recent, reactions)}</div>
        </section>`;
}
