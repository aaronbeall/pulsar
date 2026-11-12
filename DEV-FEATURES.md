# Dev mode and testing-only features

Pulsar has a few features that are only for testing. They're hidden from regular users behind
**dev mode** (`src/utils/devMode.ts`).

## Turning dev mode on and off

- **Local dev (`npm run dev`):** always on.
- **Any build (production, PR previews, the installed PWA):** open the app with `?dev=1` on any
  URL, for example `https://pulsarworkouts.app/app/settings?dev=1`. The app removes the param
  from the address bar and remembers the choice in localStorage (`pulsar:devMode`), so it stays on
  across reloads. It's per device and per origin.
- **To turn it off:** use **Turn off dev mode** in Settings › Developer, or open any URL with
  `?dev=0`. **Clear All Settings** also turns it off, because it clears localStorage.

`?dev`, `?dev=true` and `?dev=on` also turn it on, and `?dev=false` and `?dev=off` turn it off.

The production e2e build (`vite preview`) runs with dev mode off, like a real user would see it.
`e2e/dev-mode.spec.ts` checks the gating.

## What dev mode unlocks

| Feature | Where | What it does |
| --- | --- | --- |
| Log a day as done | Day sheet (`src/components/DaySheet.tsx`), opened by tapping a day on the Home streak calendar or the History year grid | A "Log as done (dev)" button on a past day or today with no finished workout, when the current routine has exercises that weekday. It saves a completed workout named "Manual Entry" (midnight to 23:59, no sets marked done). There's no confirmation and no undo, and there's no UI to delete a single workout. Use it to fake streak and history data. |
| OpenAI model override | Settings › Developer (`src/views/Settings.tsx`) | Free-text model name used for AI calls instead of the default (`DEFAULT_OPENAI_MODEL` in `src/store/aiSettingsStore.ts`). Outside dev mode the default is always used, even if an override was saved earlier. |
| Load test data | Settings › Developer (`src/components/TestPresetLoader.tsx`, presets in `src/utils/testPresets.ts`) | Pick a preset and tap **Load Test Data**. After a confirmation (`?loadPreset=<id>`, so Back cancels) it replaces everything in IndexedDB with that data set, through the same all-or-nothing path as restoring a backup, then goes to Home. Presets are built relative to the moment you load them, so streaks and "today" line up: New user, Just started, Long streak, Broken streak, Lapsed user, Two active routines, Routine switches (a retired routine with two schedule periods plus a never-used one), AI plan history (every kind of suggestion decision, one pending) and Workout in progress. Settings in localStorage are untouched. Save a backup first if you want your data back. |
| Preview share cards | Settings › Developer (`src/views/Settings.tsx`), opens `?share=dev` | The share sheet (`src/components/ShareSheet.tsx`) with every card (Workout, Streak, This week, This month, All time) filled with made-up numbers (`SAMPLE_CARDS` in `src/services/share/cards.ts`), in both sizes, for checking the designs without real data. Sharing and saving work as normal. `scripts/generate-og-image.mjs` uses it for the homepage's link preview image. |
| Clear All Settings | Settings › Developer | After a confirmation, runs `localStorage.clear()` and reloads. That removes the OpenAI key, model, color scheme, install-prompt dismissal, last-backup time, cached image lookups and the dev mode flag. Workout data in IndexedDB is kept. |

## Not dev-only

These ship to everyone on purpose:

- **Delete All Data** (Settings › Danger Zone): deletes this build's IndexedDB database after a
  confirmation. PR previews use their own database (`PulsarDB-pr-<n>`, see `src/db/indexedDb.ts`),
  so deleting data in a preview doesn't touch the live app's data.
- **Test key** (Settings › AI): one call to OpenAI to check the key.
- **`?activity=1`** on a routine URL: opens that routine's Activity drawer. The History view
  links to it.
- **`data-testid` attributes**: hooks for the e2e tests, harmless in production.

## Adding a new dev-only feature

Check `isDevMode()` from `src/utils/devMode.ts` and don't render the feature, or ignore its
action, when it's false. Then add a row to the table above.
