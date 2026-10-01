// Stripe -> Dekes. Payment Links carry ?client_reference_id=<team id>; each Stripe Product has metadata dekes=<n>.
// Anything paid that can't be credited goes to unmatched_payments instead of being dropped.
// Deploy with --no-verify-jwt (Stripe can't send a Supabase JWT; the Stripe signature is the auth).
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SB_SECRET_KEY (the sb_secret_ key from worker/.env).
// SUPABASE_URL is provided by Supabase; SUPABASE_SERVICE_ROLE_KEY is a fallback for projects on legacy keys.
import Stripe from 'npm:stripe@17';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const env = (k: string) => Deno.env.get(k) ?? '';
const reply = (msg: string, status = 200) => new Response(msg, { status });

// Built on first request, not at boot: a missing secret then gets a readable 500 instead of a WORKER_ERROR crash
let stripe: Stripe, db: SupabaseClient;
const cryptoProvider = Stripe.createSubtleCryptoProvider();

function init(): string | null {
    const dbKey = env('SB_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
    const missing = [
        !env('STRIPE_SECRET_KEY') && 'STRIPE_SECRET_KEY',
        !env('STRIPE_WEBHOOK_SECRET') && 'STRIPE_WEBHOOK_SECRET',
        !dbKey && 'SB_SECRET_KEY',
        !env('SUPABASE_URL') && 'SUPABASE_URL',
    ].filter(Boolean);
    if (missing.length) return `missing secrets: ${missing.join(', ')}`;
    stripe ??= new Stripe(env('STRIPE_SECRET_KEY'));
    db ??= createClient(env('SUPABASE_URL'), dbKey, { auth: { persistSession: false } });
    return null;
}



// ### WEBHOOK ###

Deno.serve(async req => {
    const bad = init();
    if (bad) return reply(bad, 500);

    const body = await req.text();
    let event: Stripe.Event;
    try {
        event = await stripe.webhooks.constructEventAsync(
            body, req.headers.get('Stripe-Signature') ?? '', env('STRIPE_WEBHOOK_SECRET'), undefined, cryptoProvider);
    } catch (e) {
        return reply(`bad signature: ${(e as Error).message}`, 400);
    }
    if (event.type !== 'checkout.session.completed') return reply('ignored');

    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status !== 'paid') return reply('not paid');
    const amount = `${(s.amount_total ?? 0) / 100} ${s.currency ?? ''}`.trim();

    const items = await stripe.checkout.sessions.listLineItems(s.id, { expand: ['data.price.product'] });
    const dekes = items.data.reduce((n, li) => {
        const product = li.price?.product as Stripe.Product | undefined;
        return n + Number(product?.metadata?.dekes ?? 0) * (li.quantity ?? 1);
    }, 0);

    const team = Number(s.client_reference_id);
    const known = Number.isInteger(team) && team > 0
        && !!(await db.from('teams').select('id').eq('id', team).maybeSingle()).data;
    if (!known || !dekes) {
        const why = !dekes ? 'no dekes metadata' : `no/unknown team (${s.client_reference_id ?? 'none'})`;
        return parkUnmatched(s, dekes, amount, why);
    }

    // ref = session id: retries of the same event are ignored by add_dekes
    const { error } = await db.rpc('add_dekes', {
        p_team: team, p_delta: dekes, p_reason: 'stripe', p_ref: s.id, p_detail: amount,
    });
    if (error) return reply(error.message, 500);
    return reply('ok');
});



// ### UNMATCHED ###

// Paid but can't credit: keep it for admin.py unmatched/claim. 2xx so Stripe doesn't retry forever.
async function parkUnmatched(s: Stripe.Checkout.Session, dekes: number, amount: string, why: string) {
    const fields = (s.custom_fields ?? [])
        .map(f => `${f.label?.custom ?? f.key}: ${f.text?.value ?? f.dropdown?.value ?? f.numeric?.value ?? ''}`);
    const { error } = await db.from('unmatched_payments').upsert({
        session_id: s.id,
        dekes,
        amount,
        email: s.customer_details?.email ?? null,
        note: [why, ...fields].join(' | '),
    }, { onConflict: 'session_id', ignoreDuplicates: true });
    if (error) return reply(error.message, 500);
    return reply(`unmatched: ${why}`);
}
