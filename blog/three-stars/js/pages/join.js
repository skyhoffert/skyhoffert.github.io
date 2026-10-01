import { el } from '../render.js';
import { leagueFields, tryJoin } from '../dialogs.js';



// ### PAGE ###

// Shown for every route until a league is joined on this device
export function joinPage() {
    const page = el(`
        <section class="join">
            <h1>Join a league</h1>
            <p class="sub">Fantasy hockey where every point comes from a game's three stars.</p>
            <form class="card form-card">
                <div class="card-head"><b>League sign in</b></div>
                <div class="form-body">
                    <p class="note">Enter your league's exact name and password. Ask your commissioner if you don't have them.</p>
                    ${leagueFields}
                    <p class="dialog-msg" role="status"></p>
                    <button class="btn-action" type="submit">Join</button>
                </div>
            </form>
            <p class="muted">New here? See <a href="#/help">how it works</a>.</p>
        </section>`);
    const form = page.querySelector('form');
    const msg = page.querySelector('.dialog-msg');
    form.addEventListener('submit', async e => {
        e.preventDefault();
        msg.textContent = 'Checking…';
        try {
            const res = await tryJoin(Object.fromEntries(new FormData(form)));
            msg.textContent = res.ok ? 'Joined!' : res.error ?? 'Something went wrong.';
        } catch (err) {
            msg.textContent = err.message;
        }
    });
    return page;
}
