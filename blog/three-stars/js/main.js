import { route, start, refresh } from './router.js';
import { getMe, onMeChange } from './session.js';
import { signInDialog } from './dialogs.js';
import { esc, teamBadge } from './render.js';
import { standingsPage } from './pages/standings.js';
import { weekPage } from './pages/week.js';
import { teamsPage } from './pages/teams.js';
import { teamPage } from './pages/team.js';
import { historyPage } from './pages/history.js';
import { playersPage } from './pages/players.js';



// ### ROUTES ###

route('standings', standingsPage);
route('week', weekPage);
route('teams', teamsPage);
route('team', teamPage);
route('history', historyPage);
route('players', playersPage);

start(document.getElementById('app'), name => {
    const page = name === 'team' ? 'teams' : name;
    for (const a of document.querySelectorAll('#nav a')) {
        a.classList.toggle('active', a.dataset.page === page);
    }
});



// ### MY TEAM ###

const meBtn = document.getElementById('me-btn');

function renderMe() {
    const me = getMe();
    meBtn.innerHTML = me
        ? `${teamBadge(me.team, 'sm')}<span>${esc(me.team.name)}</span>`
        : 'Sign in';
    meBtn.classList.toggle('signed-in', !!me);
}

meBtn.addEventListener('click', signInDialog);
onMeChange(() => { renderMe(); refresh(); });
renderMe();
