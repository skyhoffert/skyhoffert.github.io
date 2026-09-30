import { getStandings } from '../api.js';
import { esc, setLeague, notFound, teamBadge } from '../render.js';



// ### PAGE ###

function teamCard(r) {
    const t = r.team;
    return `
        <a class="team-card" href="#/team/${t.id}" style="--team:${esc(t.color)}">
            ${teamBadge(t, 'lg')}
            <span class="team-text"><b>${esc(t.name)}</b><small>${esc(t.owner)}</small></span>
            <span class="record"><b>${r.wins} W</b><small>${r.total_points} pts</small></span>
        </a>`;
}

export async function teamsPage() {
    const s = await getStandings();
    if (!s.league) return notFound('League');
    setLeague(s.league);
    const teams = [...s.standings].sort((a, b) => a.team.name.localeCompare(b.team.name));
    return `
        <section>
            <h1>Teams</h1>
            <p class="sub">Tap a team to see its roster.</p>
            <div class="team-cards">${teams.map(teamCard).join('') || '<div class="empty">No teams yet.</div>'}</div>
        </section>`;
}
