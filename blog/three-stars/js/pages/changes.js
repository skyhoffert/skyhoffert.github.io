import { esc } from '../render.js';



// ### MARKDOWN ###

// Just what CHANGELOG.md uses: #/##/### headings, "- " lists, paragraphs, **bold**, `code`, [text](url)
function inline(s) {
    return esc(s)
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

function markdown(md) {
    const out = [];
    let list = false, para = [];
    const flush = () => {
        if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
        para = [];
        if (list) out.push('</ul>');
        list = false;
    };
    for (const raw of md.split(/\r?\n/)) {
        const line = raw.trim();
        const h = line.match(/^(#{1,3}) (.*)/);
        if (!line) flush();
        else if (h) {
            flush();
            out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
        } else if (line.startsWith('- ')) {
            if (para.length) flush();
            if (!list) out.push('<ul>');
            list = true;
            out.push(`<li>${inline(line.slice(2))}</li>`);
        } else para.push(line);
    }
    flush();
    return out.join('\n');
}



// ### PAGE ###

export async function changesPage() {
    const r = await fetch('CHANGELOG.md', { cache: 'no-cache' });
    if (!r.ok) return '<div class="empty">Changelog not found.</div>';
    // "# Title" + intro sit above the card, like other pages' h1 + sub
    const [head, ...rest] = (await r.text()).split(/\r?\n(?=## )/);
    return `
        <section class="changes">
            ${markdown(head).replace('<p>', '<p class="sub">')}
            <div class="prose">${markdown(rest.join('\n'))}</div>
        </section>`;
}
