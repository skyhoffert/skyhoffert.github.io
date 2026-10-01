import { finishLoader } from './loader.js';
import { route, start, refresh } from './router.js';
import { getMe, onMeChange } from './session.js';
import { signInDialog, leagueDialog, reactDialog } from './dialogs.js';
import { LEAGUE } from './config.js';
import { esc, teamBadge } from './render.js';
import { standingsPage } from './pages/standings.js';
import { weekPage } from './pages/week.js';
import { teamsPage } from './pages/teams.js';
import { teamPage } from './pages/team.js';
import { historyPage } from './pages/history.js';
import { playersPage } from './pages/players.js';
import { helpPage } from './pages/help.js';
import { supportPage } from './pages/support.js';
import { joinPage } from './pages/join.js';



// ### ROUTES ###

// No league joined: only help/support work, everything else falls back to the join screen
const joined = LEAGUE !== null;
document.body.classList.toggle('no-league', !joined);

route('standings', joined ? standingsPage : joinPage);
if (joined) {
    route('week', weekPage);
    route('teams', teamsPage);
    route('team', teamPage);
    route('history', historyPage);
    route('players', playersPage);
}
route('help', helpPage);
route('support', supportPage);

finishLoader(start(document.getElementById('app'), name => {
    const mine = name === 'team' && location.hash.split('/')[2] === String(getMe()?.team.id);
    const page = mine ? null : name === 'team' ? 'teams' : name;
    for (const a of document.querySelectorAll('#nav a')) {
        a.classList.toggle('active', a.dataset.page === page);
    }
    document.getElementById('my-team').classList.toggle('active', mine);
}));



// ### MY TEAM ###

const meBtn = document.getElementById('me-btn');
const myTeam = document.getElementById('my-team');

function renderMe() {
    const me = getMe();
    myTeam.hidden = !me;
    if (me) {
        myTeam.href = `#/team/${me.team.id}`;
        myTeam.style.setProperty('--team', me.team.color);
        myTeam.innerHTML = `${teamBadge(me.team, 'sm')}<span>${esc(me.team.name)}</span>`;
    }
    const label = me ? `Signed in as ${me.team.name}` : 'Sign in';
    meBtn.title = label;
    meBtn.setAttribute('aria-label', label);
    meBtn.classList.toggle('signed-in', !!me);
}

// Reaction bars live on several pages (Standings games, Week moves)
document.getElementById('app').addEventListener('click', async e => {
    const bar = e.target.closest('[data-react]');
    if (bar && await reactDialog(bar.dataset.react)) refresh();
});

meBtn.addEventListener('click', signInDialog);
document.getElementById('league-btn').addEventListener('click', leagueDialog);
onMeChange(() => { renderMe(); refresh(); });
renderMe();
