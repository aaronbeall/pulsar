# Pulsar
Personalized workout tracker

<img width="331" height="68" alt="image" src="https://github.com/user-attachments/assets/859f82e6-1e48-46d1-bdde-58a47e59cf8a" />


## Dev mode

Testing-only features (tap-to-log on the calendar, the OpenAI model override, Clear All Settings)
are hidden unless dev mode is on. It's always on under `npm run dev`; in any build, open the app
with `?dev=1` to turn it on and `?dev=0` to turn it off. See [DEV-FEATURES.md](DEV-FEATURES.md).

## Deploying

The site runs on Cloudflare at `pulsarworkouts.app`. One Worker, `pulsar`, serves everything: the homepage at `/`, the app
at `/app/`, and the API at `/api/`. Config is `wrangler.jsonc`;
the Worker is `worker/`. Static files from the Vite build are served first; the Worker only
sees paths with no file, and sends app routes to the app's page (`worker/fallback.ts`).
`www.pulsarworkouts.app` isn't served by the Worker: a Cloudflare Redirect Rule (the "Redirect
from WWW to root" template, on a proxied `www` DNS record) sends it to the bare domain with a
301, so the app, its data and sign-in all live on one origin.

- `npm run cf:dev` builds and serves the site the way Cloudflare will, on
  http://localhost:8787. `npm run dev` is still the fast loop for app work.
- `.github/workflows/cloudflare.yml` deploys `main` to production and then to staging, and
  deploys each PR as a Cloudflare Preview with its own URL, posted on the PR. See "Staging and
  PR previews" below.
- One-time setup: create the API token (template "Edit Cloudflare Workers") and add repo
  secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Without them the workflow skips
  deploying.
- Production domain: `pulsarworkouts.app`, declared in `wrangler.jsonc` as a custom domain, so
  `wrangler deploy` attaches it (DNS record and certificate included). The domain's DNS must
  be on the same Cloudflare account, or the deploy fails.
- After changing bindings in `wrangler.jsonc`, run `npm run cf:types` to regenerate
  `worker/worker-configuration.d.ts`.

**Accounts (Google sign-in).** Optional accounts use [Better Auth](https://better-auth.com)
inside the Worker (`worker/auth.ts`), stored in the D1 database `pulsar`
(`worker/migrations/`). The server keeps only name, email, Google account link and
sessions. The app asks `/api/me` whether sign-in is offered and shows Settings > Account
only when it is.

- Local: copy `.dev.vars.example` to `.dev.vars`, fill in a Google OAuth client, run
  `npx wrangler d1 migrations apply pulsar --local`, then `npm run cf:dev`. For hot reload,
  run `wrangler dev` and `PULSAR_API=http://localhost:8787 npm run dev` side by side.
- Production setup, once:
  1. Google Cloud console > APIs & Services > OAuth consent screen: app name "Pulsar
     Workouts", home page `https://pulsarworkouts.app`, authorized domain
     `pulsarworkouts.app`. Then Credentials: create an OAuth client of type
     "Web application" with redirect URIs `https://pulsarworkouts.app/api/auth/callback/google`
     and `http://localhost:8787/api/auth/callback/google`.
  2. `npx wrangler secret put BETTER_AUTH_SECRET` (a long random string, e.g.
     `openssl rand -base64 32`), then `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
  3. If sign-in should also work on another origin (say the workers.dev URL), add it to
     `AUTH_ORIGINS` in `wrangler.jsonc` and register its callback URL with Google.
- Staging and PR previews have sign-in too; see "Staging and PR previews" below.

**Hosted AI.** Signed-in accounts get Pulsar AI without their own key: `/api/ai/plan` and
`/api/ai/edit` (`worker/ai/`) build the prompt with the app's own prompt code, reserve one
call from the account's allowance, call OpenAI with Pulsar's key and stream the reply back.
Allowances (free: 1 plan + 2 edits per account) and model prices are in
`worker/ai/plans.ts`; usage is in the `ai_usage` table.

- Production setup: `npx wrangler secret put OPENAI_API_KEY` with a key from a dedicated
  OpenAI project, and set a monthly budget on that project as a last line of defence.
- Guardrails: per-account allowance and cost cap (checked atomically before each call), and
  `AI_DAILY_BUDGET_USD` in `wrangler.jsonc`, a daily spend across all accounts after which
  hosted AI answers "busy" until midnight UTC.
- Local testing without spending: point `OPENAI_URL` in `.dev.vars` at a fake server that
  answers like OpenAI's streaming API.

**Pulsar AI subscriptions (Stripe).** $3.99/month or $29.99/year through Stripe Checkout with
[Managed Payments](https://docs.stripe.com/payments/managed-payments), so Stripe is the
merchant of record and handles sales tax and VAT. `worker/billing/`: `/api/billing/checkout`
and `/api/billing/portal` send the browser to Stripe; `/api/billing/webhook` verifies Stripe's
signature and keeps the `subscription` table in step. An active (or past-due, while Stripe
retries) subscription switches the account to the Pulsar AI tier in `worker/ai/plans.ts`.

- Setup, in test mode first:
  1. Stripe Dashboard > Settings > Business > Public details: business name "Pulsar
     Workouts", website `https://pulsarworkouts.app`, statement descriptor "PULSAR WORKOUTS".
     Then Settings > Managed Payments: activate it.
  2. Create a product "Pulsar AI" with tax code `txcd_10103000` (SaaS, personal use) and two
     recurring prices: $3.99 monthly, $29.99 yearly. Put their ids in `STRIPE_PRICE_MONTHLY`
     and `STRIPE_PRICE_YEARLY` in `wrangler.jsonc`.
  3. Settings > Billing > Customer portal: allow cancelling and updating the payment method.
  4. Developers > Webhooks: add `https://pulsarworkouts.app/api/billing/webhook` with events
     `checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted`,
     `.paused`, `.resumed`, `invoice.paid` and `invoice.payment_failed`.
  5. `npx wrangler secret put STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (the endpoint's
     `whsec_...`).
- Locally, `stripe listen --forward-to localhost:8787/api/billing/webhook` prints a webhook
  secret for `.dev.vars`; or point `STRIPE_API_BASE` at a fake server.
- An account with an active subscription can't be deleted until it's cancelled, since
  deleting the account wouldn't stop Stripe billing.
- Before taking real payments: publish a privacy policy and terms, and switch to live keys.
- The deploy workflow creates the D1 database if needed and applies migrations on `main`
  only, so a PR's migration never touches production before it merges.

### Staging and PR previews

Staging (`staging.pulsarworkouts.app`) and every PR preview run the real API with Google
sign-in, hosted AI and Stripe test checkout, without touching production's database, keys or
money.

| | Production | Staging | PR preview |
| --- | --- | --- | --- |
| Address | `pulsarworkouts.app` | `staging.pulsarworkouts.app` | Cloudflare Preview `pr-<n>`, linked on the PR |
| Worker | `pulsar` | `pulsar-staging` (`env.staging` in `wrangler.jsonc`) | A Preview of `pulsar` (`previews` in `wrangler.jsonc`) |
| Database | `pulsar` | `pulsar-staging` | `pulsar-staging` (shared) |
| Secrets | Cloudflare Worker settings | `STAGING_*` GitHub secrets | `STAGING_*` GitHub secrets |
| Stripe | Test now, live at launch | Always test mode | Always test mode |
| Deploys | Push to `main` | Push to `main`, or the manual run | Every push to the PR |

- **Sign-in on previews.** Google only redirects to registered addresses, so previews sign in
  through staging with Better Auth's `oAuthProxy` plugin (`AUTH_PROXY_URL`): Google returns to
  staging, which hands the profile back to the preview, encrypted with the shared
  `BETTER_AUTH_SECRET`. Only staging's callback is registered with Google.
- **Stripe on previews.** Checkout returns to the address that started it; Stripe's test
  webhook goes to staging, which writes to the same database the preview reads.
- **Database changes.** A PR's preview deploy applies its new migrations to `pulsar-staging`.
  When a PR that changed `worker/migrations/` is closed without merging, the workflow empties
  `pulsar-staging` and rebuilds it from main's migrations (`scripts/reset-staging-db.sh`).
  This signs everyone out of staging and clears test data. Production only gets a migration
  when its PR merges. Keep migrations additive (add, don't drop or rename) so other open
  previews keep working; remove old columns in a later PR.
- **Manual runs.** Actions > Cloudflare > Run workflow, on any branch: `deploy-staging`,
  `deploy-production` or `reset-staging-database`.
- Staging and previews show a badge in the app header, install as "Pulsar Staging" (previews:
  "Pulsar Workouts (PR #n)"), and send `X-Robots-Tag: noindex`.

Setup, once:

1. **Google Cloud console**, in production's OAuth client: add the redirect URI
   `https://staging.pulsarworkouts.app/api/auth/callback/google`.
2. **Stripe, test mode**: Developers > Webhooks > add
   `https://staging.pulsarworkouts.app/api/billing/webhook` with the same events as
   production's, and copy its signing secret.
3. **OpenAI**: a separate "Pulsar staging" project with its own key and a low monthly budget.
4. **GitHub** > Settings > Secrets and variables > Actions, repository secrets:
   - `STAGING_BETTER_AUTH_SECRET`: a new random string (`openssl rand -base64 32`), not
     production's
   - `STAGING_GOOGLE_CLIENT_ID`, `STAGING_GOOGLE_CLIENT_SECRET`: production's OAuth client
   - `STAGING_OPENAI_API_KEY`: the staging key
   - `STAGING_STRIPE_SECRET_KEY`: the test-mode `sk_test_...`
   - `STAGING_STRIPE_WEBHOOK_SECRET`: the staging webhook's `whsec_...`

The first deploy creates the `pulsar-staging` database, the `pulsar-staging` Worker and the
`staging.pulsarworkouts.app` domain. Staging and previews deploy without these secrets too,
just without sign-in, hosted AI or checkout.
