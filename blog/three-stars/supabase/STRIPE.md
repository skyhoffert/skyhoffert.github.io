# Stripe setup for Dekes

One-time setup. Do it all in Stripe **test mode** first, then repeat steps 1-2 and 4-5 in live mode.

## 1. Products (Stripe dashboard → Product catalog)

Create one product per bundle, each with a one-time price and **metadata `dekes`** (the webhook reads this):

| Product | Price | Metadata |
|---|---|---|
| 10 Dekes | $3.00 | `dekes` = `10` |
| 20 Dekes (Supporter) | $5.00 | `dekes` = `20` |

Any single purchase of 20+ Dekes also makes the team a Three Stars Supporter for the league's season (`add_dekes` in `sql/08_dekes.sql`); no webhook change needed.

## 2. Payment Links (Stripe dashboard → Payment Links)

One link per product. Quantity: not adjustable. After payment: redirect to
`https://skyhoffert.github.io/blog/three-stars/`

Paste each link URL into `DEKE_BUNDLES` in `js/config.js`. The site appends `?client_reference_id=<team id>` itself.

## 3. Deploy the function (Supabase CLI via npx, run from `blog/three-stars`)

```
npx supabase login
npx supabase link --project-ref ctyjgcimmpwlmtsedkbk
npx supabase functions deploy stripe-webhook --no-verify-jwt --use-api
```

`--use-api` bundles on Supabase's side, so Docker isn't needed.

`--no-verify-jwt` is required: Stripe can't send a Supabase login token, the Stripe signature check is the auth.
If the CLI asks for a `config.toml`, run `npx supabase init` (it won't touch `supabase/functions`).

## 4. Webhook (Stripe dashboard → Developers → Webhooks → Add endpoint)

- URL: `https://ctyjgcimmpwlmtsedkbk.supabase.co/functions/v1/stripe-webhook`
- Event: `checkout.session.completed`
- Copy the signing secret (`whsec_...`).

## 5. Secrets

```
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_... SB_SECRET_KEY=sb_secret_...
```

`SB_SECRET_KEY` is the same `SUPABASE_SECRET_KEY` value as in `worker/.env` (Supabase reserves the `SUPABASE_` prefix for its own variables).
If a secret is missing the function replies `missing secrets: ...` (visible in Stripe's webhook delivery log).

## 6. Test

Sign in to a test league team, buy a bundle with card `4242 4242 4242 4242` (any future date, any CVC), then:

```
py worker\admin.py deke-log <team>
```

Should show a `stripe` row. If not: Stripe dashboard → Webhooks → the endpoint → failed deliveries show the function's reply.
Purchases that can't be tied to a team land in `admin.py unmatched`; credit them with `admin.py claim <session> <team>`.
To catch anything the webhook never received, run `admin.py stripe-check` now and then (needs `STRIPE_SECRET_KEY` in `worker/.env`).

Sandbox and live are fully separate: products, payment links, keys and webhooks made in one don't exist in the other.
Sandbox events only go to sandbox webhooks.

## 7. Going live

The function holds one set of Stripe secrets, so switching is all-or-nothing:

1. Live mode: products (same `dekes` metadata), payment links, restricted key (`rk_live_`, same 3 Read permissions), webhook (same URL + event).
2. `npx supabase secrets set STRIPE_SECRET_KEY=rk_live_... STRIPE_WEBHOOK_SECRET=whsec_...` (the live webhook's secret)
3. Swap the live payment link URLs into `DEKE_BUNDLES` in `js/config.js` (they start `https://buy.stripe.com/` without `test_`).
4. Redeploy the function so the unmatched safety net is live: `npx supabase functions deploy stripe-webhook --no-verify-jwt --use-api`
5. Put a live restricted key (Checkout Sessions: Read) in `worker/.env` as `STRIPE_SECRET_KEY` for `stripe-check`.
6. Buy the smallest bundle with a real card, check `deke-log`, then refund it in Stripe and `grant-dekes <team> -10 --note refund`.
