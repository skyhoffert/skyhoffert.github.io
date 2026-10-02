import { getStandings, sendFeedback } from '../api.js';
import { SUPPORTER_BUNDLE as B } from '../config.js';
import { getMe, loadMine } from '../session.js';
import { el, esc, setLeague, teamBadge } from '../render.js';



// ### FEEDBACK ###

function feedbackForm(me) {
    const form = el(`
        <form class="card form-card feedback-card">
            <div class="card-head"><b>Message the Dev</b></div>
            <div class="form-body">
                <p class="note">Found a bug, have an idea, or just want to say something? It goes straight to the developer.
                    ${me ? `Sent as <b>${esc(me.team.name)}</b>.` : ''}</p>
                <label>Type
                    <select name="kind">
                        <option value="bug">Bug</option>
                        <option value="idea">Idea</option>
                        <option value="other">Other</option>
                    </select>
                </label>
                <label>Message<textarea name="message" rows="4" maxlength="1000" required></textarea></label>
                <label>How to reach you (optional)<input name="contact" maxlength="100" autocomplete="off"></label>
                <p class="dialog-msg" role="status"></p>
                <button class="btn-action" type="submit">Send</button>
            </div>
        </form>`);
    const msg = form.querySelector('.dialog-msg');
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(form));
        msg.textContent = 'Sending…';
        try {
            const res = await sendFeedback(me?.team.id, me?.pin, f.kind, f.message, f.contact);
            if (!res.ok) return msg.textContent = res.error;
            form.reset();
            msg.textContent = 'Sent. Thanks!';
        } catch (err) {
            msg.textContent = err.message;
        }
    });
    return form;
}



// ### PAGE ###

function cta(me) {
    if (me?.team.supporter) return `<p class="supporter-thanks">${teamBadge(me.team)}<span><b>${esc(me.team.name)}</b> is a
        <span class="supporter-tag">Three Stars Supporter</span>. Thank you!</span></p>`;
    if (!B.url) return '<p class="muted">The Supporter bundle is coming soon.</p>';
    if (!me) return '<p class="muted">Sign in to your team (profile icon, top right) to grab it.</p>';
    return `<a class="btn-action" href="${esc(B.url)}?client_reference_id=${me.team.id}" target="_blank" rel="noopener">
        Get ${B.dekes} Dekes · ${B.price}</a>`;
}

export async function supportPage() {
    getStandings().then(s => setLeague(s.league)).catch(() => {});
    // refreshes the saved team so a fresh purchase shows as supporter
    if (getMe()) await loadMine().catch(() => {});
    const me = getMe();
    const page = el(`<div>
        <section>
            <h1>Support</h1>
            <p class="sub">Three Stars is a free passion project.</p>
            <div class="card support-card">
                <div class="card-head"><b>Become a Supporter</b></div>
                <div class="prose">
                    <p class="no-ads"><b>No ads. Ever.</b> Three Stars will <b>never</b> show ads; it runs entirely on players like you.</p>                    <p>The <b>Supporter bundle</b> is <b>${B.dekes} Dekes for ${B.price}</b>, about a full season of reaction passes,
                    emojis, nicknames and team makeovers. It also makes your team a <span class="supporter-tag">Three Stars Supporter</span>
                    for the season: a gold ring on your team badge and a <span class="supporter-star">★</span> next to your name everywhere
                    in the league.</p>
                    ${cta(me)}
                    <p class="muted">Smaller bundles are in the Dekes section of your team page.</p>
                </div>
            </div>
        </section>
        <section class="feedback-slot"></section>
        <section>
            <a class="card changes-card" href="#/changes">
                <div class="card-head"><b>What's New</b><span class="draft-go">›</span></div>
                <div class="prose"><p>See what changed each week and what's coming next.</p></div>
            </a>
        </section>
    </div>`);
    page.querySelector('.feedback-slot').append(feedbackForm(me));
    return page;
}
