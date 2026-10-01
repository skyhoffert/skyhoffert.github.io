const routes = {};
let token = 0;
let rerun = () => {};

// Re-render the current route in place (e.g. after a write)
export const refresh = () => rerun({ keepScroll: true });



// ### ROUTER ###

// Handlers return an HTML string or a Node. Route: #/<name>/<param>/<param>...
export function route(name, handler) {
    routes[name] = handler;
}

export function start(app, onNav) {
    const run = async ({ keepScroll = false } = {}) => {
        const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
        const name = routes[parts[0]] ? parts[0] : 'standings';
        const my = ++token;
        const y = window.scrollY;
        onNav(name);
        if (!keepScroll) app.innerHTML = '<div class="loading">Loading…</div>';
        try {
            const out = await routes[name](...parts.slice(1));
            if (my !== token) return;
            app.replaceChildren();
            if (typeof out === 'string') app.innerHTML = out;
            else app.append(out);
        } catch (e) {
            if (my !== token) return;
            console.error(e);
            app.innerHTML = `<div class="empty">Something went wrong: ${e.message}</div>`;
        }
        window.scrollTo(0, keepScroll ? y : 0);
    };
    rerun = run;
    window.addEventListener('hashchange', () => run());
    return run();
}
