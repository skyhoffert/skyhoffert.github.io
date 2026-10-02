import { getStandings } from '../api.js';
import { setLeague, slotSummary } from '../render.js';



// ### PAGE ###

export function helpPage() {
    // static page; fetch for the header's league name and this league's roster slots
    getStandings().then(s => {
        setLeague(s.league);
        const slots = document.querySelector('[data-slots]');
        if (slots && s.league?.slots) slots.innerHTML = `${s.league.slots.length} slots: ${slotSummary(s.league.slots)}`;
    }).catch(() => {});
    return `
        <section>
            <h1>Help</h1>
            <p class="sub">Fantasy hockey where every point comes from a game's three stars.</p>
        </section>

        <section>
            <h2>Leagues</h2>
            <div class="prose">
                <p>Join your league with its exact name and the league password from your commissioner. Your device
                remembers every league you've joined; tap the <b>league name</b> at the top left to switch, join
                another, or leave.</p>
            </div>
        </section>

        <section>
            <h2>Rosters</h2>
            <div class="prose">
                <p>Each team has <span data-slots>the slots your league sets: F, D, G, Flex (any F or D) and Superflex (any player)</span>.
                A player can only be on one team in the league.</p>
            </div>
        </section>

        <section>
            <h2>Scoring</h2>
            <div class="prose">
                <p>Whenever one of your players is named a star of an NHL regular season game:</p>
                <ul class="stat-list">
                    <li><span class="star s1">★</span><b>1st star</b><span>30 pts</span></li>
                    <li><span class="star s2">★</span><b>2nd star</b><span>20 pts</span></li>
                    <li><span class="star s3">★</span><b>3rd star</b><span>10 pts</span></li>
                </ul>
                <p>Each week, the league's top rostered players also earn bonuses of <b>+5</b> each. They stack, and ties all get the full bonus:</p>
                <ul class="stat-list">
                    <li><span class="chip chip-bonus">G</span><b>Goals leader</b><span>+5</span></li>
                    <li><span class="chip chip-bonus">PTS</span><b>Points leader</b> (goals + assists)<span>+5</span></li>
                    <li><span class="chip chip-bonus">+/-</span><b>Plus/minus leader</b> (skaters only)<span>+5</span></li>
                </ul>
            </div>
        </section>

        <section>
            <h2>Weeks &amp; standings</h2>
            <div class="prose">
                <p>Weeks run <b>Monday to Sunday</b> (Eastern). Every week, teams are ranked by points. Ties break on
                total stars, then team goals, then team +/-, then a coin flip.</p>
                <p>The top three teams each week earn <b>standing points (SP)</b>:</p>
                <ul class="stat-list">
                    <li><span class="chip chip-sp p1">1st</span><b>1st place</b><span>30 SP</span></li>
                    <li><span class="chip chip-sp p2">2nd</span><b>2nd place</b><span>20 SP</span></li>
                    <li><span class="chip chip-sp p3">3rd</span><b>3rd place</b><span>10 SP</span></li>
                </ul>
                <p>A team that scores 0 points earns no SP. During a live week SP shows as provisional
                (<span class="chip chip-sp p1 provisional">+30 SP?</span>) until the week is final.</p>
                <p>The season standings rank teams by SP, then most 1sts, 2nds, 3rds, then total season points.</p>
            </div>
        </section>

        <section>
            <h2>Draft</h2>
            <div class="prose">
                <p>New leagues start with an automatic draft. While it's open, a banner links to the <b>Draft</b> page
                (afterwards it lives at the bottom of History). Sign in and build a <b>wishlist</b> of up to three times
                your roster size, best first, then hit Save.</p>
                <p>The draft runs all at once in a snake order. On each of your picks you get the first wishlist player
                still available who fits an open slot. If none are left, you get the best available player by the
                default ranking (NHL.com's top 200). Results show which picks came from your wishlist.</p>
            </div>
        </section>

        <section>
            <h2>My team</h2>
            <div class="prose">
                <p>Tap the <b>profile icon</b> at the top right and sign in with your team and PIN. Your device
                remembers you, and your team button then takes you straight to your roster.</p>
                <p>From your team page you can give players a <b>nickname</b>.</p>
                <p>From the Players page you can put in a <b>waiver claim</b> on a free agent: pick who you'd drop for
                them. The new player takes the dropped player's slot, so the drop must be in a slot that fits. You
                can use the same drop on several claims as backups. Claims are private and ordered by when you
                added them.</p>
                <p>From another team's page you can propose a <b>trade</b>. They can accept or reject, and you can
                cancel while it's pending. Accepted trades are final.</p>
            </div>
        </section>

        <section>
            <h2>Dekes</h2>
            <div class="prose">
                <p><b>Dekes</b> let you customize your team. A new <b>team name</b>, <b>color</b> or
                <b>player nickname</b> costs 1 Deke; a new <b>icon</b> costs 2. They're cosmetic only and never affect scoring.
                Clearing a nickname or icon and waiver claims are always free.</p>
                <p><b>Reactions</b>: tap the <b>+</b> on one of this week's Moves or a Recent Three Stars game to react
                with an emoji. Reacting needs a <b>weekly reaction pass</b> (1 Deke, good until Monday's rollover) or a
                <b>season pass</b> (10 Dekes, every week for the rest of the season), and you
                can react with any emoji in your pool. Everyone starts with fire; each extra emoji costs 3 Dekes and is
                yours for good. One reaction per team on each item; change it while your pass is active, or remove it any time.</p>
                <p>Buy Dekes in bundles from the <b>Dekes</b> section of your team page. Every purchase helps keep
                Three Stars ad-free. Got an idea for a new icon? Send it with Message the Dev on the Support page.</p>
            </div>
        </section>

        <section>
            <h2>Monday rollover</h2>
            <div class="prose">
                <p>When a week ends, rosters carry over and changes happen in this order:</p>
                <ol>
                    <li>Commissioner fixes</li>
                    <li>Accepted trades, in the order they were accepted</li>
                    <li>Waivers. Lowest score last week picks first, then lowest SP, then lowest season points.
                    Right after a draft, before scoring starts, it's reverse draft order instead.
                    Each team gets at most one claim per round, in your order. A claim is skipped if the player
                    was already taken or its drop player has left your team.</li>
                </ol>
                <p>Unanswered trades expire and all waiver lists are cleared. Every move shows up on the Week and History pages.</p>
                <p>Some leagues get one <b>extra run</b> of trades and waivers after the draft. When one is coming, a
                banner at the top shows the time.</p>
            </div>
        </section>`;
}
