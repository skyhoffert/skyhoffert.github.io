// Question sets: loading, parsing, rendering, grading, stats. Format documented in PLAN.md and sets/demo/demo.md.
//
// Answer shapes (stored as jsonb):
//   single / tf : choice index (number)
//   multi       : sorted array of choice indices
//   numeric     : { v: number, raw: string }



// ### LOAD + PARSE ###

const FIELDS = ['type', 'answer', 'tolerance', 'units', 'timer', 'topic'];
const TYPES = ['single', 'multi', 'numeric', 'tf'];

export async function loadSet(path) {
    const url = new URL(path, location.href);
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Couldn't load question set ${path} (${res.status})`);
    const set = parseSet(await res.text());
    set.path = path;
    set.base = url.href;
    return set;
}

export function parseSet(text) {
    text = text.replace(/\r\n?/g, '\n');
    let meta = {};
    const fm = text.match(/^---\n([\s\S]*?)\n---[ \t]*(\n|$)/);
    if (fm) {
        meta = parseFields(fm[1]);
        text = text.slice(fm[0].length);
    }
    const defaultTimer = toInt(meta.default_timer, 0);
    const warnings = [];
    const questions = text.split(/^##\s*Q:/m).slice(1)
        .map((block, i) => parseQuestion(block, i, defaultTimer, warnings));
    if (!questions.length) warnings.push('No questions found (each question starts with "## Q: <title>").');
    return { title: meta.title || 'Exam Review', defaultTimer, questions, warnings };
}

function parseFields(s) {
    const o = {};
    for (const line of s.split('\n')) {
        const m = line.match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/);
        if (m) o[m[1].toLowerCase()] = m[2];
    }
    return o;
}

function parseQuestion(block, index, defaultTimer, warnings) {
    const lines = block.split('\n');
    const title = lines.shift().trim();
    const where = `Q${index + 1} "${title}"`;

    // Leading "key: value" lines (blank lines allowed) are fields; everything after is the prompt.
    const fields = {};
    let j = 0;
    for (; j < lines.length; j++) {
        if (!lines[j].trim()) continue;
        const m = lines[j].match(/^([a-z_]+)\s*:\s*(.*?)\s*$/i);
        if (!m || !FIELDS.includes(m[1].toLowerCase())) break;
        fields[m[1].toLowerCase()] = m[2];
    }

    const choices = [];
    const body = [];
    for (const line of lines.slice(j)) {
        const m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/);
        if (m) choices.push({ text: m[2].trim(), correct: m[1] !== ' ' });
        else body.push(line);
    }

    let type = (fields.type || '').toLowerCase();
    if (!type) {
        if (choices.length) type = choices.filter(c => c.correct).length > 1 ? 'multi' : 'single';
        else if (/^(true|false)$/i.test(fields.answer || '')) type = 'tf';
        else type = 'numeric';
    }
    if (type === 'truefalse' || type === 'bool') type = 'tf';
    if (type === 'mc') type = 'single';

    const q = {
        index,
        title,
        type,
        topic: fields.topic || null,
        prompt: body.join('\n').trim(),
        timer: fields.timer != null ? toInt(fields.timer, 0) : defaultTimer,
    };

    if (!TYPES.includes(type)) {
        warnings.push(`${where}: unknown type "${type}" (use single, multi, numeric or tf).`);
        q.type = 'single';
        q.choices = choices;
    } else if (type === 'single' || type === 'multi') {
        q.choices = choices;
        const n = choices.filter(c => c.correct).length;
        if (choices.length < 2) warnings.push(`${where}: needs at least 2 choices ("- [ ] text" / "- [x] text").`);
        if (type === 'single' && n !== 1) warnings.push(`${where}: single-answer question has ${n} correct choices marked.`);
        if (type === 'multi' && n < 1) warnings.push(`${where}: no correct choices marked with [x].`);
    } else if (type === 'tf') {
        const ans = (fields.answer || '').toLowerCase();
        if (ans !== 'true' && ans !== 'false') warnings.push(`${where}: tf question needs "answer: true" or "answer: false".`);
        q.choices = [
            { text: 'True', correct: ans === 'true' },
            { text: 'False', correct: ans === 'false' },
        ];
    } else if (type === 'numeric') {
        q.units = fields.units || '';
        q.answer = parseNumber(fields.answer || '', q.units);
        if (q.answer == null) warnings.push(`${where}: numeric question needs a valid "answer:" (got "${fields.answer ?? ''}").`);
        q.tolerance = parseTolerance(fields.tolerance, q.units);
        if (!q.tolerance) {
            warnings.push(`${where}: couldn't read tolerance "${fields.tolerance}", using 1%.`);
            q.tolerance = { rel: 0.01 };
        }
    }
    return q;
}

function toInt(s, dflt) {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : dflt;
}



// ### NUMBERS ###

const SI = { f: 1e-15, p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9, T: 1e12 };

// "4.7k", "2.2u", "1e-3", "330 mV", "-1,200" → number, or null if unreadable. units: optional unit text to allow/strip.
export function parseNumber(raw, units = '') {
    let s = String(raw ?? '').trim().replace(/[\s,]/g, '').replace(/[−–]/g, '-');
    if (!s) return null;
    const m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(.*)$/);
    if (!m) return null;
    let v = parseFloat(m[1]);
    let suffix = m[2];
    const u = units.replace(/\s/g, '');
    const isUnit = t => !t || (u && t.toLowerCase() === u.toLowerCase());
    if (!isUnit(suffix)) {
        if (suffix.toLowerCase().startsWith('meg')) {
            v *= 1e6;
            suffix = suffix.slice(3);
        } else if (SI[suffix[0]] != null) {
            v *= SI[suffix[0]];
            suffix = suffix.slice(1);
        } else {
            return null;
        }
        if (!isUnit(suffix)) return null;
    }
    return Number.isFinite(v) ? v : null;
}

// "2%" → {rel: 0.02}; "0.05" or "50m" → {abs: 0.05}; empty → {rel: 0.01}
export function parseTolerance(raw, units = '') {
    const s = String(raw ?? '').trim();
    if (!s) return { rel: 0.01 };
    if (s.endsWith('%')) {
        const p = parseFloat(s);
        return Number.isFinite(p) ? { rel: Math.abs(p) / 100 } : null;
    }
    const a = parseNumber(s.replace(/^±/, ''), units);
    return a == null ? null : { abs: Math.abs(a) };
}

export function withinTolerance(v, answer, tol) {
    const err = Math.abs(v - answer);
    if (tol.abs != null) return err <= tol.abs * (1 + 1e-9) + 1e-15;
    if (answer === 0) return err <= 1e-12;
    return err <= Math.abs(answer) * tol.rel * (1 + 1e-9);
}

const PREFIXES = [[1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f']];

// 4700, "Ω" → "4.7 kΩ"
export function formatEng(v, units = '') {
    if (v == null || !Number.isFinite(v)) return '—';
    const sp = units ? ' ' : '';
    if (v === 0) return `0${sp}${units}`;
    const abs = Math.abs(v);
    const [scale, prefix] = PREFIXES.find(([s]) => abs >= s * 0.9995) ?? PREFIXES[PREFIXES.length - 1];
    const mant = Number((v / scale).toPrecision(4));
    if (!prefix && !units) return String(mant);
    return `${mant} ${prefix}${units}`.trim();
}

export function formatTolerance(q) {
    if (q.tolerance.abs != null) return `± ${formatEng(q.tolerance.abs, q.units)}`;
    return `± ${Number((q.tolerance.rel * 100).toPrecision(3))}%`;
}



// ### GRADING + STATS ###

export function correctIndices(q) {
    return (q.choices || []).map((c, i) => (c.correct ? i : -1)).filter(i => i >= 0);
}

export function grade(q, a) {
    if (a == null) return false;
    if (q.type === 'numeric') return q.answer != null && typeof a.v === 'number' && withinTolerance(a.v, q.answer, q.tolerance);
    const want = correctIndices(q);
    if (q.type === 'multi') {
        if (!Array.isArray(a)) return false;
        const got = [...new Set(a)].sort((x, y) => x - y);
        return got.length === want.length && got.every((v, k) => v === want[k]);
    }
    return want.length === 1 && a === want[0];
}

// Human-readable answer text: "B", "A, C", "4.7 kΩ"
export function describeAnswer(q, a) {
    if (a == null) return '—';
    if (q.type === 'numeric') return a.raw ? `${a.raw} (${formatEng(a.v, q.units)})` : formatEng(a.v, q.units);
    const list = Array.isArray(a) ? a : [a];
    if (!list.length) return '(none)';
    return list.map(i => (q.type === 'tf' ? q.choices[i]?.text : letter(i))).join(', ');
}

export function describeCorrect(q) {
    if (q.type === 'numeric') return `${formatEng(q.answer, q.units)} (${formatTolerance(q)})`;
    return correctIndices(q).map(i => (q.type === 'tf' ? q.choices[i].text : letter(i))).join(', ');
}

export const letter = i => String.fromCharCode(65 + i);

// answers: [{answer, correct}] for one question
export function questionStats(q, answers) {
    const answered = answers.length;
    const correct = answers.filter(a => a.correct ?? grade(q, a.answer)).length;
    const stats = {
        answered,
        correct,
        pct_correct: answered ? Math.round((1000 * correct) / answered) / 10 : 0,
    };
    if (q.type === 'numeric') {
        const wrong = new Map();
        for (const a of answers) {
            if (a.correct ?? grade(q, a.answer)) continue;
            const v = a.answer?.v;
            if (typeof v !== 'number') continue;
            const key = Number(v.toPrecision(6));
            wrong.set(key, (wrong.get(key) || 0) + 1);
        }
        stats.common_wrong = [...wrong].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([value, count]) => ({ value, count }));
    } else {
        stats.option_counts = q.choices.map((_, i) =>
            answers.filter(a => (Array.isArray(a.answer) ? a.answer.includes(i) : a.answer === i)).length);
    }
    return stats;
}

// players: [{id, nickname, score}] → adds rank (ties share), sorted
export function rankPlayers(players) {
    const sorted = [...players].sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
    let rank = 0;
    sorted.forEach((p, i) => {
        if (i === 0 || p.score !== sorted[i - 1].score) rank = i + 1;
        p.rank = rank;
    });
    return sorted;
}



// ### RENDER (Markdown + KaTeX) ###

// Requires globals: marked (marked@12 UMD), katex.
function withMath(md, render) {
    const math = [];
    const stash = (tex, display) => `@@MATH${math.push({ tex, display }) - 1}@@`;
    md = md
        .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => stash(t, true))
        .replace(/(^|[^\\])\$([^$\n]+?)\$/g, (_, pre, t) => pre + stash(t, false))
        .replace(/\\\$/g, '$');
    const html = render(md);
    return html.replace(/@@MATH(\d+)@@/g, (_, i) => {
        const { tex, display } = math[i];
        return katex.renderToString(tex, { displayMode: display, throwOnError: false });
    });
}

function markedFor(base) {
    return new marked.Marked({
        walkTokens(t) {
            if (t.type === 'image' && base && !/^([a-z]+:|\/)/i.test(t.href)) t.href = new URL(t.href, base).href;
        },
    });
}

export const renderMd = (md, base) => withMath(md || '', s => markedFor(base).parse(s));
export const renderInline = (md, base) => withMath(md || '', s => markedFor(base).parseInline(s));
