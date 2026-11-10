# Marketing homepage

The site root is the marketing homepage, and the app lives under `app/`. Both are Vite
entries (`rollupOptions.input` in `vite.config.ts`) and deploy together:

| | Homepage | App |
| --- | --- | --- |
| Live | `https://aaronbeall.github.io/pulsar/` | `https://aaronbeall.github.io/pulsar/app/` |
| PR previews | `.../pulsar/pr-<n>/` | `.../pulsar/pr-<n>/app/` |
| Local (`npm run dev`) | `/` | `/app/` |

- The homepage's page is the root `index.html`; its styles, script and images are in this
  folder. The app's page is `app/index.html`, and its router basename is `<base>app/`
  (`src/main.tsx`).
- Static files in `public/` (icons, `free-exercise-db.json`) and built assets stay shared
  at `<base>`.
- The PWA's manifest `start_url` and `scope` and the service worker's scope are `<base>app/`,
  so the installed app opens straight into the app and the homepage is never cached by it.
- App deep links (`<base>app/workout/...`) are served the app's page by a small Vite plugin in
  dev and preview, and by `404.html` on GitHub Pages (`scripts/make-pages-404.mjs`), which
  sends any other missing path to the homepage.
- With a custom domain, set `PAGES_BASE` to `/` and the same layout becomes
  `pulsarworkouts.app/` and `pulsarworkouts.app/app/`.

## Files

- `../privacy/index.html`, `../terms/index.html`, `legal.css`: the Privacy Policy and Terms of
  Service, plain pages at `<base>privacy/` and `<base>terms/`. The app links to them (About,
  sign-in, upgrade buttons via `src/components/LegalLinks.tsx`), and Stripe and Google's OAuth
  consent screen point at them. Keep them in step with what the server actually stores.
- `index.html`, `home.css`: the page. Mobile-first; wider screens are the enhancement.
- `main.ts`: the pulsar hero, a particle system in plain WebGL (no three.js) with all
  motion computed in the vertex shader. It pauses when the hero is off screen or the tab is
  hidden, opens with an ignition reveal (shockwaves, then a fast spin that settles), draws one still frame under `prefers-reduced-motion`, and falls back to a CSS
  drawing without WebGL.
- `nebula.jpg`: the galactic backdrop behind the hero, generated procedurally by
  `python3 scripts/generate-home-nebula.py [seed]` (numpy + Pillow). Change the seed for a
  different sky.
- `shots/`: real app screenshots. Regenerate them after UI changes:

  ```sh
  npm run build && npx vite preview --port 4173 &
  node scripts/capture-home-shots.mjs
  ```

  The script drives the real app at a phone viewport in dark mode, with canned AI replies
  and a pinned clock, and logs past workouts through dev mode's calendar tap for the streak.
