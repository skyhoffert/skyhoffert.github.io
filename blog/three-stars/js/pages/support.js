import { getStandings } from '../api.js';
import { setLeague } from '../render.js';

const DONATE = 'https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=7H9DRMQQNF7JC&currency_code=USD';



// ### PAGE ###

export function supportPage() {
    getStandings().then(s => setLeague(s.league)).catch(() => {});
    return `
        <section>
            <h1>Support</h1>
            <p class="sub">Three Stars is a free passion project.</p>
            <div class="card support-card">
                <div class="card-head"><b>Enjoying Three Stars?</b></div>
                <div class="prose">
                    <p class="no-ads"><b>No ads. Ever.</b> Three Stars will <b>never</b> show ads; it runs entirely on support from players like you.</p>
                    <p>If you're having fun, consider tossing a few bucks my way to help keep it running and fund new features!</p>
                    <p>Want something for it? Grab a bundle of <b>Dekes</b> on your team page to customize your team's name, color or icon.</p>
                    <a class="btn-action" href="${DONATE}" target="_blank" rel="noopener">Donate via PayPal</a>
                    <p class="muted">Questions, bugs or ideas: <a href="mailto:skyhoffert.contact@gmail.com">skyhoffert.contact@gmail.com</a></p>
                </div>
            </div>
        </section>`;
}
