# IL MANO — one-time launch & handoff checklist

Written for the store owner. About 45 minutes of clicking, plus waiting on DNS (minutes to a few hours).
`yourdomain.com` below means the domain bought at GoDaddy. Steps marked 🧑 need a human at a login screen — nothing can click them for you.

## 0. Accounts you need (all free to open)
GoDaddy (domain) · Vercel (hosting) · Stripe (payments) · Resend (email) · Upstash (via Vercel Storage) · GitHub (the code + the `/admin` editor).

## 1. Take over the hosting 🧑
1. Create a Vercel account → Settings → add the developer to your team (or have them transfer the project to you: Project → Settings → Transfer).
2. Vercel → project → **Storage** → Upstash Redis → connect. This fills `UPSTASH_REDIS_REST_URL` / `_TOKEN` for you.

## 2. Domain: GoDaddy → Vercel 🧑
1. Vercel → project → **Settings → Domains → Add** `yourdomain.com` (and `www.yourdomain.com`; Vercel redirects one to the other).
2. Vercel shows the exact DNS records to use — **copy those, not the ones below if they differ**. Typically:
   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `76.76.21.21` |
   | CNAME | `www` | `cname.vercel-dns.com` |
3. GoDaddy → My Products → your domain → **DNS** → delete any existing `A @` "parked" record and `www` CNAME → add the two above → Save.
4. Back in Vercel the domain turns green (HTTPS is automatic). The `vercel.app` address keeps working but customers will only see your domain.

## 3. Email: Resend 🧑
1. resend.com → **Domains → Add Domain** → `yourdomain.com`.
2. Resend lists DNS records (a few `TXT` and an `MX`). Add each one at GoDaddy → DNS exactly as shown (GoDaddy wants the Name without `.yourdomain.com`). Click **Verify**.
3. Resend → **API Keys** → create one → keep it for step 5.

## 4. Payments: Stripe 🧑
1. Stripe → **Activate account** (business details, bank account, ID). Required before live cards work.
2. Turn off "Test mode" → **Developers → API keys**. You need the **Publishable key** (`pk_live_…`) and **Secret key** (`sk_live_…`).
3. Create the webhook (one command; needs the secret key; replace both placeholders):
   ```
   curl https://api.stripe.com/v1/webhook_endpoints -u sk_live_XXXX: \
     -d url=https://yourdomain.com/api/stripe-webhook \
     -d "enabled_events[]=payment_intent.amount_capturable_updated" \
     -d "enabled_events[]=payment_intent.succeeded" \
     -d "enabled_events[]=payment_intent.canceled" \
     -d "enabled_events[]=payment_intent.payment_failed"
   ```
   The reply contains `"secret": "whsec_…"` — that is `STRIPE_WEBHOOK_SECRET`. (Or do it in Dashboard → Developers → Webhooks with the same URL and four events.)
4. Orders are **authorized, not charged**. To charge one when it ships: Dashboard → Payments → *Uncaptured* → Capture.

## 5. Put the secrets in Vercel (never in git)
Vercel → project → **Settings → Environment Variables** (Production). Or per variable in a terminal: `vercel env add NAME production`.

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from step 4 |
| `CAPTURE_ADMIN_SECRET` | run `openssl rand -hex 32` |
| `RESEND_API_KEY` | from step 3 |
| `ORDER_EMAIL_FROM` | `IL MANO <orders@yourdomain.com>` |
| `GITHUB_OAUTH_ID` / `GITHUB_OAUTH_SECRET` | step 6 |
| `ORDER_NOTIFY_EMAIL` | **leave unset** (it sends every customer's email to one inbox; only for testing) |

## 6. The `/admin` editor 🧑
1. GitHub → Settings → Developer settings → **OAuth Apps → New**. Homepage `https://yourdomain.com`, callback `https://yourdomain.com/api/callback`. Copy the Client ID and a new Client Secret into step 5.
2. In the repo, change `base_url` in `admin/config.yml` to `https://yourdomain.com` (and `repo:` if the repo moved to your GitHub).
3. Add whoever edits content as a collaborator with **write** access on the repo.

## 7. Go live (developer does this part)
1. In `/admin` → **Shipping & tax** → paste the `pk_live_…` key into **Stripe publishable key** → save. (Without this, live cards fail: the secret and publishable keys must both be live.)
2. Redeploy: `vercel --prod` (changing env vars does nothing until you redeploy).
3. Test on **the real domain**, not a preview link: place a small real order → confirm it appears in Stripe as *Uncaptured*, the confirmation email arrives in the customer's inbox, and the webhook shows "Succeeded" in Stripe → Webhooks. Then cancel/refund it.

## Not done yet, needs a decision from you
- A business postal address for the email footer (required for marketing-style email under US law). Add it in `api/_lib/email.js`.
