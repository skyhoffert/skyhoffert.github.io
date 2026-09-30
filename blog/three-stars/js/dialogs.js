import { getStandings, signIn, updateRosterPlayer, setWaiverIn } from './api.js';
import { getMe, setMe } from './session.js';
import { el, esc } from './render.js';



// ### BASE ###

// onSubmit(action, formValues) returns {ok, error} or true. Resolves with the action on success, null if cancelled.
function openDialog({ title, sub = '', body = '', submitLabel = 'Save', extra = [], onSubmit }) {
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
                        <button type="button" class="btn-text" data-action="cancel">Cancel</button>
                        <button type="submit" class="btn-primary">${esc(submitLabel)}</button>
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
            <label>PIN<input name="pin" type="password" autocomplete="current-password" value="${esc(me?.pin ?? '')}"></label>`,
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



// ### ROSTER PLAYER ###

export function playerSheet(player, outN) {
    const me = getMe();
    return openDialog({
        title: player.name,
        sub: `${esc(player.position)} · ${esc(player.nhl_team ?? '')}`,
        body: `
            <label>Nickname
                <input name="nickname" maxlength="20" autocomplete="off" value="${esc(player.nickname ?? '')}" placeholder="Leave blank to clear">
            </label>
            <label class="check">
                <input type="checkbox" name="out" ${outN ? 'checked' : ''}>
                <span>Waiver Out${outN ? ` <b>#${outN}</b>` : ''}<small>Dropped if one of your Waiver Ins succeeds. #1 goes first.</small></span>
            </label>`,
        onSubmit: (_, f) => updateRosterPlayer(me.team.id, me.pin, player.id, f.nickname, f.out === 'on'),
    });
}



// ### WAIVER IN ###

export function waiverInSheet(player, inN) {
    const me = getMe();
    return openDialog({
        title: inN ? `Waiver In #${inN}` : 'Waiver In',
        sub: `${esc(player.name)} · ${esc(player.position)} · ${esc(player.nhl_team ?? '')}`,
        body: inN
            ? '<p class="note">Remove this claim? Your other claims move up.</p>'
            : `<p class="note">Claim for <b>${esc(me.team.name)}</b>. Processed Monday morning; needs a Waiver Out whose slot fits.</p>`,
        submitLabel: inN ? 'Remove claim' : 'Claim',
        onSubmit: () => setWaiverIn(me.team.id, me.pin, player.id, !inN),
    });
}
