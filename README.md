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
  deploying.
- Production domain: `pulsarworkouts.app`, declared in `wrangler.jsonc` as a custom domain, so
  `wrangler deploy` attaches it (DNS record and certificate included). The domain's DNS must
  be on the same Cloudflare account, or the deploy fails.
- After changing bindings in `wrangler.jsonc`, run `npm run cf:types` to regenerate
  `worker/worker-configuration.d.ts`.

**GitHub Pages (old).** `deploy-pages.yml` and `pr-preview.yml` publish to the `gh-pages`
branch under `/pulsar/`. IndexedDB is per origin, so moving domains means exporting a backup
on the old site and restoring it on the new one.
