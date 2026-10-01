import { getStandings } from '../api.js';
import { setLeague } from '../render.js';



// ### PAGE ###

export function helpPage() {
    // static page; fetch only so the header shows the league name
    getStandings().then(s => setLeague(s.league)).catch(() => {});
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
                <p>Each team has 6 slots: <b>2 F</b>, <b>2 D</b>, <b>1 G</b> and <b>1 Flex</b> (any F or D).
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
            <h2>My team</h2>
            <div class="prose">
                <p>Tap the <b>profile icon</b> at the top right and sign in with your team and PIN. Your device
                remembers you, and your team button then takes you straight to your roster.</p>
                <p>From your team page you can give players a <b>nickname</b>, and mark players as <b>Waiver Out</b>.
                From the Players page you can claim free agents as <b>Waiver In</b>. Both lists are private, ordered by
                when you added them.</p>
                <p>From another team's page you can propose a <b>trade</b>. They can accept or reject, and you can
                cancel while it's pending. Accepted trades are final.</p>
            </div>
        </section>

        <section>
            <h2>Dekes</h2>
            <div class="prose">
                <p><b>Dekes</b> let you customize your team. Each change costs 1 Deke: a new <b>team name</b>,
                <b>color</b>, <b>icon</b>, or a new <b>player nickname</b>. They're cosmetic only and never affect scoring.
                Clearing a nickname and Waiver Outs are always free.</p>
                <p><b>Reactions</b>: tap the <b>+</b> on one of this week's Moves or a Recent Three Stars game to react
                with an emoji. Reacting needs a <b>weekly reaction pass</b> (1 Deke, good until Monday's rollover), and you
                can react with any emoji in your pool. Everyone starts with fire; each extra emoji costs 3 Dekes and is
                yours for good. One reaction per team on each item; change it while your pass is active, or remove it any time.</p>
                <p>Buy Dekes in bundles from the <b>Dekes</b> section of your team page. Every purchase helps keep
                Three Stars ad-free. Got an idea for a new icon? Suggest it there for free.</p>
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
                    Each team gets at most one claim per round, and a claim only succeeds if one of your
                    Waiver Outs fits the player's position.</li>
                </ol>
                <p>Unanswered trades expire and all waiver lists are cleared. Every move shows up on the Week and History pages.</p>
            </div>
        </section>`;
}
