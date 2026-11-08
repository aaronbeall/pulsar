# Marketing homepage

A small static page, separate from the app, built as a second Vite entry
(`rollupOptions.input` in `vite.config.ts`). It deploys with the app:

- Live: `https://aaronbeall.github.io/pulsar/home/`
- PR previews: `https://aaronbeall.github.io/pulsar/pr-<n>/home/`
- Local: `npm run dev`, then open `/home/`

The app stays at the site root, so no app route or PWA behavior changes. Every
"Open the app" link is relative (`../`), so it works on the live site, previews and a
future custom domain. The app's service worker skips `home/` (it isn't precached, and the
SPA navigation fallback never answers for it).

When Pulsar moves to its own domain, the plan would be to swap these: homepage at `/`, app
at `/app/`. That's a base-path change plus moving this folder, not a rewrite.

## Files

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
