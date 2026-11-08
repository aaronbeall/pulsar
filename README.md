# Pulsar
Personalized workout tracker

<img width="331" height="68" alt="image" src="https://github.com/user-attachments/assets/859f82e6-1e48-46d1-bdde-58a47e59cf8a" />


## Dev mode

Testing-only features (tap-to-log on the calendar, the OpenAI model override, Clear All Settings)
are hidden unless dev mode is on. It's always on under `npm run dev`; in any build, open the app
with `?dev=1` to turn it on and `?dev=0` to turn it off. See [DEV-FEATURES.md](DEV-FEATURES.md).

## Deploying

The site is moving from GitHub Pages to Cloudflare. Both run until the Cloudflare deploy is
confirmed live; then the GitHub Pages workflows go away.

**Cloudflare (new).** One Worker, `pulsar`, serves everything: the homepage at `/`, the app
at `/app/`, and the API at `/api/` (only `/api/health` so far). Config is `wrangler.jsonc`;
the Worker is `worker/`. Static files from the Vite build are served first; the Worker only
sees paths with no file, and sends app routes to the app's page (`worker/fallback.ts`).

- `npm run cf:dev` builds and serves the site the way Cloudflare will, on
  http://localhost:8787. `npm run dev` is still the fast loop for app work.
- `.github/workflows/cloudflare.yml` deploys `main` to production and uploads each PR as a
  preview version with its own URL (`pr-<n>-pulsar.<account>.workers.dev`), posted on the PR.
- One-time setup: create the API token (template "Edit Cloudflare Workers") and add repo
  secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Without them the workflow skips
  deploying. Add the custom domain (pulsarfit.app) to the Worker in the Cloudflare dashboard
  under Settings > Domains & Routes.
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
  1. Google Cloud console > APIs & Services > Credentials: create an OAuth client of type
     "Web application" with redirect URIs `https://pulsarfit.app/api/auth/callback/google`
     and `http://localhost:8787/api/auth/callback/google`.
  2. `npx wrangler secret put BETTER_AUTH_SECRET` (a long random string, e.g.
     `openssl rand -base64 32`), then `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
  3. If sign-in should also work on another origin (say the workers.dev URL), add it to
     `AUTH_ORIGINS` in `wrangler.jsonc` and register its callback URL with Google.
- PR previews hide sign-in: each has its own host, which Google won't redirect back to.

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
- The deploy workflow creates the D1 database if needed and applies migrations on `main`
  only, so a PR's migration never touches production before it merges.

**GitHub Pages (old).** `deploy-pages.yml` and `pr-preview.yml` publish to the `gh-pages`
branch under `/pulsar/`. IndexedDB is per origin, so moving domains means exporting a backup
on the old site and restoring it on the new one.
