import { getStandings, getTeam, signIn, checkLeague, updateRosterPlayer, setWaiverIn, proposeTrade, respondTrade, cancelTrade, customizeTeam,
    getReactions, getMyReactions, react, buyPack } from './api.js';
import { LEAGUE, LEAGUES, ICONS, EMOJIS, PACKS, joinLeague, switchLeague, leaveLeague } from './config.js';
import { getMe, setMe } from './session.js';
import { el, esc, slotLabel, slotFits, emojiImg, nextRun } from './render.js';



// ### BASE ###

// onSubmit(action, formValues) returns {ok, error} or true. Resolves with the action on success, null if cancelled.
function openDialog({ title, sub = '', body = '', submitLabel = 'Save', cancelLabel = 'Cancel', extra = [], onSubmit }) {
    return new Promise(resolve => {
        const dlg = el(`
            <dialog class="dialog">
                <form method="dialog">
                    <h3>${esc(title)}</h3>
                    ${sub ? `<p class="sub">${sub}</p>` : ''}
                    ${body}
                    <p class="dialog-msg" role="status"></p>
                    <div class="dialog-actions">
                        ${extra.map(b => `<button type="button" class="btn-text ${b.cls ?? ''}" data-action="${b.action}">${esc(b.label)}</button>`).join('')}
                        <span class="spacer"></span>
                        <button type="button" class="btn-text" data-action="cancel">${esc(cancelLabel)}</button>
                        ${submitLabel ? `<button type="submit" class="btn-primary">${esc(submitLabel)}</button>` : ''}
                    </div>
                </form>
            </dialog>`);
        const form = dlg.querySelector('form');
        const msg = dlg.querySelector('.dialog-msg');
        const buttons = [...dlg.querySelectorAll('button')];
        let result = null;

        const run = async action => {
            buttons.forEach(b => (b.disabled = true));
            msg.textContent = 'Working…';
            try {
                const res = await onSubmit(action, Object.fromEntries(new FormData(form)));
                if (res === true || res?.ok) {
                    result = action;
                    dlg.close();
                    return;
                }
                msg.textContent = res?.error ?? 'Something went wrong.';
            } catch (e) {
                msg.textContent = e.message;
            }
            buttons.forEach(b => (b.disabled = false));
        };

        form.addEventListener('submit', e => { e.preventDefault(); run('submit'); });
        dlg.addEventListener('click', e => {
            const action = e.target.closest('button[data-action]')?.dataset.action;
            if (action === 'cancel') dlg.close();
            else if (action) run(action);
        });
        dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });

        document.body.append(dlg);
        dlg.showModal();
        dlg.querySelector('input:not([type=checkbox]), select')?.focus();
    });
}



// ### SIGN IN ###

export async function signInDialog() {
    const me = getMe();
    const { standings } = await getStandings();
    const teams = standings.map(s => s.team).sort((a, b) => a.name.localeCompare(b.name));
    const opts = teams.map(t => `<option value="${t.id}" ${me?.team.id === t.id ? 'selected' : ''}>${esc(t.name)} · ${esc(t.owner)}</option>`).join('');
    return openDialog({
        title: 'My Team',
        sub: me ? `Signed in as <b>${esc(me.team.name)}</b>` : 'Pick your team and enter its PIN.',
        body: `
            <label>Team<select name="team">${opts}</select></label>
            <label>PIN<input name="pin" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(me?.pin ?? '')}"></label>`,
        submitLabel: 'Sign in',
        extra: me ? [{ label: 'Sign out', action: 'forget', cls: 'danger' }] : [],
        onSubmit: async (action, f) => {
            if (action === 'forget') {
                setMe(null);
                return true;
            }
            if (f.pin.length < 6) return { error: 'PIN is at least 6 characters.' };
            const res = await signIn(Number(f.team), f.pin);
            if (res.ok) setMe({ team: res.team, pin: f.pin });
            return res;
        },
    });
}



// ### LEAGUE ###

// Name + password form, shared by the join page and the league dialog. Joins (and reloads) on success.
export const leagueFields = `
    <label>League name<input name="name" autocomplete="off" autocapitalize="words" spellcheck="false"></label>
    <label>League password<input name="pass" autocomplete="off" autocapitalize="off" spellcheck="false"></label>`;

export async function tryJoin(f) {
    if (!f.name?.trim() || !f.pass) return { error: 'Enter the league name and password.' };
    const res = await checkLeague(f.name, f.pass);
    if (res.ok) joinLeague(res.league);
    return res;
}

export function leagueDialog() {
    const cur = LEAGUES.find(l => l.id === LEAGUE);
    const others = LEAGUES.filter(l => l.id !== LEAGUE);
    const opts = others.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
    return openDialog({
        title: 'League',
        sub: cur ? `Viewing <b>${esc(cur.name)}</b>` : 'Join your league with its exact name and password.',
        body: `
            ${others.length ? `<label>Switch to<select name="switch"><option value="">Stay here</option>${opts}</select></label>
                <p class="note">Or join another league:</p>` : ''}
            ${leagueFields}`,
        submitLabel: 'Go',
        extra: cur ? [{ label: 'Leave league', action: 'leave', cls: 'danger' }] : [],
        onSubmit: async (action, f) => {
            if (action === 'leave') {
                leaveLeague(LEAGUE);
                return true;
            }
            if (f.name?.trim() || f.pass) return tryJoin(f);
            if (f.switch !== undefined && f.switch !== '') {
                switchLeague(Number(f.switch));
                return true;
            }
            return { error: others.length ? 'Pick a league or enter a new one.' : 'Enter the league name and password.' };
        },
    });
}



// ### CUSTOMIZE (Dekes) ###

const CUSTOM = {
    name: {
        title: 'Rename Team',
        body: t => `<label>Team name<input name="value" maxlength="24" autocomplete="off" value="${esc(t.name)}"></label>`,
    },
    color: {
        title: 'Team Color',
        body: t => `<label>Team color<input name="value" type="color" class="color-input" value="${esc(t.color)}"></label>`,
    },
    icon: {
        title: 'Team Icon',
        body: (t, packs) => `<div class="icon-grid">
            ${[{ path: '', label: 'None' }, ...ICONS.filter(i => !i.pack || packs.includes(i.pack))].map(i => `
                <label class="icon-opt">
                    <input type="radio" name="value" value="${esc(i.path)}" ${(t.icon_path ?? '') === i.path ? 'checked' : ''}>
                    <span class="badge badge-lg" style="--team:${esc(t.color)}">${i.path ? `<img src="${esc(i.path)}" alt="">` : `<span>${esc(t.name.slice(0, 2).toUpperCase())}</span>`}</span>
                    <small>${esc(i.label)}</small>
                </label>`).join('')}
        </div>`,
    },
};

// Spends Dekes; on success the session team is refreshed (header button, page). packs: owned pack ids (unlock icons).
export function customizeDialog(field, dekes, packs = []) {
    const me = getMe();
    const c = CUSTOM[field];
    const cost = dekesWord(1);
    return openDialog({
        title: c.title,
        sub: `Costs <b>${cost}</b>${field === 'icon' ? ' (None is free)' : ''}. You have <b>${dekes}</b>.`,
        body: c.body(me.team, packs),
        submitLabel: `Spend ${cost}`,
        onSubmit: async (action, f) => {
            const res = await customizeTeam(me.team.id, me.pin, field, f.value ?? '');
            if (res.ok) setMe({ ...me, team: res.team });
            return res;
        },
    });
}



// ### REACTIONS + PACKS (Dekes) ###

const dekesWord = n => `${n} Deke${n === 1 ? '' : 's'}`;

// Who reacted with what, in EMOJIS order
function reactWho(list) {
    if (!list.length) return '<p class="note">No reactions yet.</p>';
    return `<ul class="react-who">${EMOJIS.filter(e => list.some(r => r.emoji === e.id)).map(e => `
        <li>${emojiImg(e.id)}<span>${list.filter(r => r.emoji === e.id).map(r => esc(r.team.name)).join(', ')}</span></li>`).join('')}
    </ul>`;
}

export async function reactDialog(target) {
    const me = getMe();
    const [all, mine] = await Promise.all([getReactions(), me && getMyReactions(me.team.id, me.pin)]);
    const list = all[target] ?? [];
    if (!mine?.ok) {
        return openDialog({
            title: 'Reactions',
            body: reactWho(list) + (me ? '' : '<p class="hint">Sign in to react.</p>'),
            submitLabel: null, cancelLabel: 'Close',
        });
    }
    const cur = list.find(r => r.team.id === me.team.id)?.emoji;
    // Pool is the picker; locked ones are just a teaser (first few + count) since the list will grow
    const owned = EMOJIS.filter(e => mine.emojis.includes(e.id));
    const locked = EMOJIS.filter(e => !mine.emojis.includes(e.id));
    const grid = owned.map(e => `
        <label class="emoji-opt" title="${esc(e.label)}">
            <input type="radio" name="emoji" value="${e.id}" ${e.id === cur ? 'checked' : ''}>
            ${emojiImg(e.id)}
        </label>`).join('');
    const more = locked.length > 4 ? `<span class="more">+${locked.length - 4}</span>` : '';
    const teaser = locked.length ? `
        <div class="emoji-locked">
            ${locked.slice(0, 4).map(e => `<span title="${esc(e.label)}">${emojiImg(e.id)}</span>`).join('')}${more}
            <small>Unlock more with emoji packs on your team page.</small>
        </div>` : '';
    return openDialog({
        title: 'React',
        body: `${reactWho(list)}<div class="emoji-grid">${grid}</div>${teaser}`,
        submitLabel: cur ? 'Change reaction' : 'React',
        extra: cur ? [{ label: 'Remove', action: 'remove', cls: 'danger' }] : [],
        onSubmit: (action, f) => {
            if (action === 'remove') return react(me.team.id, me.pin, target, '');
            if (!f.emoji) return { error: 'Pick an emoji.' };
            if (f.emoji === cur) return { error: 'That\'s already your reaction.' };
            return react(me.team.id, me.pin, target, f.emoji);
        },
    });
}

// Pack contents as small images; icons sit on the team color like a badge
export function packPreview(pack, color) {
    return pack.kind === 'emoji'
        ? EMOJIS.filter(e => e.pack === pack.id).map(e => emojiImg(e.id)).join('')
        : ICONS.filter(i => i.pack === pack.id).map(i => `<span class="badge" style="--team:${esc(color)}"><img src="${esc(i.path)}" alt=""></span>`).join('');
}

export function buyPackDialog(id, dekes) {
    const me = getMe();
    const p = PACKS.find(x => x.id === id);
    const what = p.kind === 'emoji' ? 'Reaction emojis' : 'Team icons';
    return openDialog({
        title: `${p.label} Pack`,
        sub: `Costs <b>${dekesWord(p.price)}</b>. You have <b>${dekes}</b>.`,
        body: `<div class="pack-preview">${packPreview(p, me.team.color)}</div>
            <p class="note">${what}, yours for good.</p>`,
        submitLabel: `Spend ${dekesWord(p.price)}`,
        onSubmit: () => buyPack(me.team.id, me.pin, id),
    });
}



// ### ROSTER PLAYER ###

export function playerSheet(player, dekes) {
    const me = getMe();
    return openDialog({
        title: player.name,
        sub: `${esc(player.position)} · ${esc(player.nhl_team ?? '')}`,
        body: `
            <label>Nickname
                <input name="nickname" maxlength="20" autocomplete="off" value="${esc(player.nickname ?? '')}" placeholder="Leave blank to clear">
            </label>
            <p class="hint">A new nickname costs <b>1 Deke</b> (you have ${dekes}). Clearing one is free.</p>`,
        onSubmit: (_, f) => updateRosterPlayer(me.team.id, me.pin, player.id, f.nickname),
    });
}



// ### WAIVER IN ###

// claim: existing {n, drop} or null. Drop choices = my current roster players whose slot fits the claimed player.
export async function waiverInSheet(player, claim) {
    const me = getMe();
    const mine = await getTeam(me.team.id);
    const fits = mine.week.players.filter(p => slotFits(p.slot, player.position));
    const opts = fits.map(p => `<option value="${p.id}" ${claim?.drop.id === p.id ? 'selected' : ''}>` +
        `${esc(p.name)} · ${slotLabel(p.slot)} · ${esc(p.position)}</option>`).join('');
    const body = fits.length
        ? `<label>Drop<select name="drop">${opts}</select></label>
            <p class="note"><small>Processed ${esc(nextRun())}. ${esc(player.name)} takes the dropped player's slot.
            If the claim fails, nobody is dropped.</small></p>`
        : `<p class="note">None of your roster slots fit a ${esc(player.position)}.</p>`;
    return openDialog({
        title: claim ? `Waiver In #${claim.n}` : 'Waiver In',
        sub: `${esc(player.name)} · ${esc(player.position)} · ${esc(player.nhl_team ?? '')}`,
        body,
        submitLabel: !fits.length ? null : claim ? 'Save' : 'Claim',
        cancelLabel: fits.length ? 'Cancel' : 'Close',
        extra: claim ? [{ label: 'Remove claim', action: 'remove', cls: 'danger' }] : [],
        onSubmit: (action, f) => setWaiverIn(me.team.id, me.pin, player.id, action === 'remove' ? null : Number(f.drop)),
    });
}



// ### TRADES ###

// locked: { [player_id]: reason } shown disabled
function tradeSelect(label, name, players, locked = {}) {
    const opts = players.map(p => `<option value="${p.id}" ${locked[p.id] ? 'disabled' : ''}>` +
        `${esc(p.name)} · ${slotLabel(p.slot)} · ${esc(p.position)}${locked[p.id] ? ` (${esc(locked[p.id])})` : ''}</option>`).join('');
    return `<label>${label}<select name="${name}"><option value="">Pick a player…</option>${opts}</select></label>`;
}

// UI is 1-for-1; backend supports N-for-N
export function proposeTradeDialog(other, theirPlayers, myPlayers, myLocked) {
    const me = getMe();
    return openDialog({
        title: 'Propose trade',
        sub: `With <b>${esc(other.name)}</b> · ${esc(other.owner)}`,
        body: `
            ${tradeSelect('You give', 'give', myPlayers, myLocked)}
            ${tradeSelect('You get', 'get', theirPlayers)}
            <p class="note"><small>Positions must fit each other's slot. If accepted, it happens ${esc(nextRun())} before waivers. Unanswered offers expire then.</small></p>`,
        submitLabel: 'Send offer',
        onSubmit: (_, f) => {
            if (!f.give || !f.get) return { error: 'Pick a player from each side.' };
            return proposeTrade(me.team.id, me.pin, other.id, [Number(f.give)], [Number(f.get)]);
        },
    });
}

export function tradeSheet(trade) {
    const me = getMe();
    const names = ps => ps.map(p => `<b>${esc(p.name)}</b> <small>${esc(p.position)}</small>`).join(', ');
    const body = `
        <p class="note">You give: ${names(trade.give)}</p>
        <p class="note">You get: ${names(trade.get)}</p>`;
    const sub = `${trade.sent ? 'To' : 'From'} <b>${esc(trade.other.name)}</b> · ${esc(trade.other.owner)}`;

    if (trade.status === 'accepted') {
        return openDialog({
            title: 'Trade accepted', sub,
            body: body + `<p class="note"><small>Final. Happens ${esc(nextRun())} before waivers.</small></p>`,
            submitLabel: null, cancelLabel: 'Close',
        });
    }
    if (trade.sent) {
        return openDialog({
            title: 'Trade offer', sub,
            body: body + `<p class="note"><small>Waiting on their reply. Expires ${esc(nextRun())}.</small></p>`,
            submitLabel: 'Cancel offer', cancelLabel: 'Close',
            onSubmit: () => cancelTrade(me.team.id, me.pin, trade.id),
        });
    }
    return openDialog({
        title: 'Trade offer', sub,
        body: body + `<p class="note"><small>Accepting is final; neither side can back out. Happens ${esc(nextRun())} before waivers.</small></p>`,
        submitLabel: 'Accept', cancelLabel: 'Close',
        extra: [{ label: 'Reject', action: 'reject', cls: 'danger' }],
        onSubmit: action => respondTrade(me.team.id, me.pin, trade.id, action !== 'reject'),
    });
}
