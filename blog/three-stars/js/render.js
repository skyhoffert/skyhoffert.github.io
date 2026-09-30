// ### BASICS ###

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

export function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
}

export function setLeague(league) {
    if (!league) return;
    document.getElementById('league-name').textContent = league.name;
    document.title = `${league.name} · Three Stars`;
}

export const notFound = what => `<div class="empty">${esc(what)} not found.</div>`;



// ### FORMATTING ###

const d = iso => new Date(`${iso}T12:00:00`);
const md = dt => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function fmtWeek(iso) {
    const start = d(iso);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${md(start)} – ${md(end)}`;
}

export const fmtDate = iso => d(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export const signed = n => (n == null ? '–' : n > 0 ? `+${n}` : String(n));

export function ordinal(n) {
    if (n == null) return '–';
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const SLOT_LABEL = { F1: 'F', F2: 'F', D1: 'D', D2: 'D', G: 'G', X: 'FLEX' };



// ### TEAMS ###

export function teamBadge(team, size = 'md') {
    const initials = team.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const img = team.icon_path ? `<img src="${esc(team.icon_path)}" alt="" onerror="this.remove()">` : '';
    return `<span class="badge badge-${size}" style="--team:${esc(team.color)}"><span>${esc(initials)}</span>${img}</span>`;
}

export function teamLabel(team, { owner = true, size = 'md' } = {}) {
    return `<span class="team-label">${teamBadge(team, size)}` +
        `<span class="team-text"><b>${esc(team.name)}</b>${owner ? `<small>${esc(team.owner)}</small>` : ''}</span></span>`;
}

export function ownerChip(team) {
    if (!team) return '<span class="chip chip-fa">FA</span>';
    return `<span class="chip chip-team" style="--team:${esc(team.color)}">${esc(team.name)}</span>`;
}



// ### PLAYERS ###

export function playerName(p) {
    const nick = p.nickname ? `<small class="nick">${esc(p.nickname)}</small>` : '';
    return `<span class="pname"><b>${esc(p.name)}</b>${nick}<small>${esc(p.position)} · ${esc(p.nhl_team ?? '')}</small></span>`;
}

export function starPips(p) {
    const pip = (n, cls, title) => `<span class="star ${cls}" title="${title}">★</span>`.repeat(n || 0);
    const out = pip(p.firsts, 's1', '1st star') + pip(p.seconds, 's2', '2nd star') + pip(p.thirds, 's3', '3rd star');
    return out || '<span class="muted">–</span>';
}

export function bonusChips(p) {
    const chips = [];
    if (p.goals_leader) chips.push('<span class="chip chip-bonus" title="Goals leader +5">G</span>');
    if (p.points_leader) chips.push('<span class="chip chip-bonus" title="Points leader +5">PTS</span>');
    if (p.pm_leader) chips.push('<span class="chip chip-bonus" title="+/- leader +5">+/-</span>');
    return chips.join('');
}

export const pill = (text, cls = '') => `<span class="pill ${cls}">${esc(text)}</span>`;

// pills: { [player_id]: html } shown under the name
export function rosterTable(players, { editable = false, pills = {} } = {}) {
    if (!players.length) return '<div class="empty">No roster this week.</div>';
    const rows = players.map(p => `
        <tr${editable ? ` class="editable" data-player="${p.id}"` : ''}>
            <td class="slot">${SLOT_LABEL[p.slot]}</td>
            <td>${playerName(p)}${pills[p.id] ?? ''}</td>
            <td class="stars">${starPips(p)} ${bonusChips(p)}</td>
            <td class="num hide-sm">${p.games}</td>
            <td class="num hide-sm">${p.goals}-${p.assists}</td>
            <td class="num hide-sm">${signed(p.plus_minus)}</td>
            <td class="num pts">${p.total_points}</td>
        </tr>`).join('');
    return `
        <table class="roster">
            <thead><tr>
                <th></th><th>Player</th><th>Stars</th>
                <th class="num hide-sm">GP</th><th class="num hide-sm">G-A</th><th class="num hide-sm">+/-</th>
                <th class="num">Pts</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}



// ### MOVES ###

// One line per team + source: badge, name, +adds −drops, source chip
export function movesList(moves) {
    if (!moves?.length) return '';
    const groups = new Map();
    for (const m of moves) {
        const k = `${m.team.id}:${m.source}`;
        if (!groups.has(k)) groups.set(k, { team: m.team, source: m.source, items: [] });
        groups.get(k).items.push(m);
    }
    const items = [...groups.values()].map(g => `
        <li>
            ${teamBadge(g.team, 'sm')}
            <span class="moves-body">
                <b>${esc(g.team.name)}</b>
                ${g.items.map(m => `<span class="move ${m.kind}">${m.kind === 'add' ? '+' : '−'}${esc(m.player.name)} <small>${esc(m.player.position)}</small></span>`).join('')}
            </span>
            <span class="chip">${esc(g.source)}</span>
        </li>`).join('');
    return `<ul class="moves">${items}</ul>`;
}



// ### WEEKS ###

export function weekStatus(nav) {
    if (!nav.is_scoring) return '<span class="chip chip-pre">Preseason · no W</span>';
    if (nav.is_final) return '<span class="chip chip-final">Final</span>';
    return '<span class="chip chip-live">In progress</span>';
}

// base: hash prefix the week is appended to, e.g. '#/week/' or '#/team/3/'
export function weekNav(nav, base) {
    const link = (wk, label) => wk
        ? `<a class="btn" href="${base}${wk}">${label}</a>`
        : `<span class="btn disabled">${label}</span>`;
    const opts = nav.weeks.map(w => `<option value="${base}${w}" ${w === nav.week ? 'selected' : ''}>${fmtWeek(w)}${w === nav.current_week ? ' (now)' : ''}</option>`).join('');
    return `
        <div class="week-nav">
            ${link(nav.prev_week, '‹')}
            <select onchange="location.hash = this.value">${opts || `<option>${fmtWeek(nav.week)}</option>`}</select>
            ${link(nav.next_week, '›')}
            ${weekStatus(nav)}
        </div>`;
}
