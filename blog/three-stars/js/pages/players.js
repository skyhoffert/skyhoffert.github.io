import { getPlayers } from '../api.js';
import { getMe, loadMine } from '../session.js';
import { waiverInSheet } from '../dialogs.js';
import { el, esc, setLeague, notFound, playerName, ownerChip, starPips, signed, pill, nextRun } from '../render.js';



// ### TABLE ###

// ins: { [player_id]: n } for the signed-in team; null when signed out
function playersTable(players, ins) {
    if (!players.length) return '<div class="empty">No players match.</div>';
    const rows = players.map((p, i) => {
        const claimable = ins && !p.owner;
        return `
        <tr${claimable ? ` class="editable" data-player="${p.id}"` : ''}>
            <td class="rank muted">${i + 1}</td>
            <td>${playerName(p)}${ins?.[p.id] ? pill(`Waiver In #${ins[p.id]}`, 'pill-in') : ''}</td>
            <td>${ownerChip(p.owner)}</td>
            <td class="num hide-sm">${p.games}</td>
            <td class="num hide-sm">${p.goals}-${p.assists}</td>
            <td class="num hide-sm">${signed(p.plus_minus)}</td>
            <td class="stars">${starPips(p)}</td>
            <td class="num pts">${p.star_points}</td>
        </tr>`;
    }).join('');
    return `
        <table>
            <thead><tr>
                <th></th><th>Player</th><th>Owner</th>
                <th class="num hide-sm">GP</th><th class="num hide-sm">G-A</th><th class="num hide-sm">+/-</th>
                <th>Stars</th><th class="num">Star pts</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

const insMap = mine => mine ? Object.fromEntries(mine.ins.map(p => [p.id, p.n])) : null;
const claimOf = (mine, id) => mine?.ins.find(p => p.id === id) ?? null;



// ### PAGE ###

export async function playersPage() {
    const [first, firstMine] = await Promise.all([getPlayers(), getMe() ? loadMine() : null]);
    if (!first.league) return notFound('League');
    setLeague(first.league);

    let players = first.players;
    let mine = firstMine;
    let ins = insMap(mine);
    const hint = ins ? `Tap a free agent to put in a waiver claim. Next processed ${esc(nextRun())}.` : 'Sign in to claim free agents.';

    const page = el(`
        <section>
            <h1>Players</h1>
            <p class="hint">${hint}</p>
            <form class="filters" onsubmit="return false">
                <input type="search" name="search" placeholder="Search name or nickname…" autocomplete="off">
                <select name="position">
                    <option value="">All positions</option>
                    <option value="F">Forwards</option>
                    <option value="D">Defense</option>
                    <option value="G">Goalies</option>
                </select>
                <select name="owner">
                    <option value="">All players</option>
                    <option value="fa">Free agents</option>
                    <option value="owned">Rostered</option>
                </select>
            </form>
            <div class="results">${playersTable(players, ins)}</div>
        </section>`);

    const form = page.querySelector('form');
    const results = page.querySelector('.results');
    let timer, seq = 0;

    const load = async () => {
        const my = ++seq;
        const [data, m] = await Promise.all([getPlayers(Object.fromEntries(new FormData(form))), getMe() ? loadMine() : null]);
        if (my !== seq) return;
        players = data.players;
        mine = m;
        ins = insMap(mine);
        results.innerHTML = playersTable(players, ins);
    };

    form.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(load, 250);
    });
    results.addEventListener('click', async e => {
        const row = e.target.closest('tr.editable');
        if (!row) return;
        const p = players.find(x => x.id === Number(row.dataset.player));
        if (p && await waiverInSheet(p, claimOf(mine, p.id))) load();
    });
    return page;
}
