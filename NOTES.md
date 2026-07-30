# Pulsar — Engineering Notes

Living notes on the codebase's actual state, kept separate from `TODO.md` (which tracks
feature intent). This file tracks *how it's built* and *what to watch out for*. Started
2026-07-30 after a full read-through of the source.

## Snapshot

- React 18 + TypeScript + Vite PWA, Chakra UI v2, Zustand store, IndexedDB (`idb`) for
  persistence, deployed as a static site to GitHub Pages via Actions.
- ~9,100 lines across 51 files. 158 commits, April 2025 → Jan 2026 (long-running solo
  side project, bursts of activity — e.g. a big cluster on 2025-10-22).
- Vitest added 2026-07-30 (`npm test` / `npm run test:watch`, config in `vitest.config.ts`,
  Node environment — no jsdom, since only pure utils are covered so far). Basic coverage
  on `src/utils/workoutUtils.ts` (`getStreakInfo`, `getExerciseStats`, `getRoutineStats`,
  the day/routine lookup helpers), `nameUtils.ts`, and `webUtils.ts` (URL builders + the
  localStorage image-cache logic, mocked). Nothing else has coverage yet — components,
  services (`routineBuilderService.ts`), and the store are all still untested.
- Data model (`src/models/types.ts`) is clean and small: `Exercise`, `Routine` (with
  `dailySchedule` of `RoutineDay` → `ScheduledExercise`), `Workout` (→ `WorkoutExercise`).
  This is a good foundation; most of the app's complexity lives in the views/components
  consuming it, not the model.

## What's genuinely solid

- **RoutineEditor.tsx** (1030 lines, the largest file) is already well-optimized: split into
  memoized subcomponents (`SaveBar`, `ExerciseScheduleEditor`, `ExerciseDayEditor`,
  `DraggableExerciseEditorRow`, `AddExerciseRow`) with `useCallback`/`useMemo` throughout.
  The TODO item "Editor optimization is bad" is already checked off and the code backs
  that up — this was a real refactor, not just a checkbox.
- Streak logic (`workoutUtils.ts: getStreakInfo`) handles a genuinely hard problem (mixed
  rest days, partial weeks, "pending vs expired vs up_to_date" status) in one pure,
  testable function. It's dense but not spaghetti — a good candidate for the first unit
  tests since it's pure and already has known edge-case bugs (see below).
- Routine/workout/exercise CRUD is consistently routed through the Zustand store
  (`pulsarStore.ts`) rather than components touching IndexedDB directly — good separation.

## Key insight: the "AI" features are entirely mocked

This is the most important finding for planning purposes. The TODO lists "AI generation,"
"AI key prompt setting," and "AI chat suggestions" as unstarted MVP work, and the code
confirms there is **no LLM integration at all** yet, despite the UI already implying one:

- `RoutineChat.tsx` (`handleSend`) doesn't call any API — it echoes the user's message
  back after a `setTimeout` with the string `` `AI: I received your message: "${userMessage}"` ``.
- `routineBuilderService.ts: generateRoutine` collects real user input (goals, equipment,
  time, `additionalInfo` via `prompts.ts`) but then **ignores it entirely** — it just
  shuffles `exerciseTemplates` and picks 5 at random, wrapped in an artificial
  `await delay(2000)` to simulate "thinking." The routine name is a Mad-Libs generator
  (`funnyWords` array + `generateRandomRoutineName`).
- The only real external API call in the app is exercise cover image search
  (`webUtils.ts: fetchExerciseSearchImageUrl`) — that one's real, cached in `localStorage`,
  and has a Workbox runtime-caching rule. It ran on Google Custom Search until 2026-07-30
  (see below — replaced with Wikimedia Commons, no API key required).

**Implication:** "AI generation" isn't a small remaining task, it's the actual core
feature and hasn't started. Everything else in MVP is polish around a routine-management
app that currently has no personalization engine. Worth deciding early whether this is
built as a real LLM call (needs a backend/proxy — see security note below) or scoped down
for v1.

## Exercise resolution: now a 4-tier system — Google CSE retired 2026-07-30

Google Custom Search was actually broken in production (live-tested against the app's real
credentials: `403 PERMISSION_DENIED — This project does not have the access to Custom
Search JSON API`, a Google Cloud project config issue, reproducible, not transient). It
clearly worked at some point — 56 of the app's original 60 exercises had real,
correctly-matched `coverImageUrl`s pointing to Wikimedia Commons, and nothing in the static
`exerciseTemplates.ts` catalog has image URLs, so those could only have come from past
successful CSE searches. It failed completely silently (try/catch swallows the error, both
render sites just skip the image block when the URL is falsy) — a user creating a new
exercise had zero indication anything was wrong.

`getAddedExercise` / `createRoutineFromTemplate` in `routineBuilderService.ts` now resolve
an exercise name through four tiers, each one only reached if the previous misses:

1. **Live exercises already in the store** — unchanged.
2. **Curated `exerciseTemplates.ts`** (114 hand-tuned entries, `timed`/`relativeWeight`
   metadata, tightly coupled to `dailyWorkoutTemplates.ts`'s 43 day templates by exact
   name) — unchanged, deliberately left alone. Considered replacing this catalog outright
   with free-exercise-db (873 entries) but rejected it: free-exercise-db has no `timed`
   equivalent and the naming wouldn't line up cleanly with the hand-crafted day templates,
   so a wholesale swap risked breaking that curation for marginal gain. Kept as its own tier
   instead — see `freeExerciseDb.ts` file header for the fuller reasoning.
3. **`freeExerciseDb.ts`** — new. [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
   (873 exercises, real photos, Unlicense/public domain), bundled as a static asset
   (`public/free-exercise-db.json`, pruned from the source's ~1MB to ~310KB by dropping
   fields Pulsar doesn't use) rather than fetched from a third party at runtime — exercise
   *lookup* then never depends on an external service staying up (exactly the failure mode
   that killed Google CSE); only the actual per-exercise photo bytes are fetched from
   `raw.githubusercontent.com` on demand, same as any other image src.
   `timed` is inferred from category (`cardio`/`stretching` → timed, everything else →
   reps). Verified end-to-end in the running app: "Barbell Squat" (absent from the curated
   catalog) resolves here with a real photo, zero live network calls.
4. **Live Wikimedia Commons search** (`fetchExerciseSearchImageUrl` in `webUtils.ts`) — free,
   no API key, CORS-enabled via `origin=*`. Only ever reached for names in neither catalog
   above (verified: a nonsense name correctly falls through to here and returns empty,
   not an error).

**Why not wger** (a purpose-built, free, open-source fitness API — the obvious "just use a
domain-specific live query API" answer): tested it live and its `exercise-translation`
search endpoint doesn't actually filter — identical result count for `search=Squat` and a
nonsense string. Great structured data (828 exercises, real images) sitting behind a search
parameter that's a no-op through the public API as discoverable. Even used properly it
would only work in bulk-fetch-then-locally-match mode, which is structurally identical to
the free-exercise-db approach, just with less coverage — so it wasn't a real alternative to
tier 3, just supporting evidence that "bulk dataset, not live query" is the right shape for
the domain-specific tier.

**Remaining known trade-off**: live Wikimedia search (tier 4) has real relevance limits for
specific/compound names not covered by tiers 2-3 — "face pull" matched an unrelated
ethnographic photo in testing (a keyword collision: Commons search is closer to full-text
search over file metadata than content-aware image ranking). Only matters for names outside
both the curated catalog and free-exercise-db's 873 entries, which should now be the
minority case.

Also removed as part of retiring Google CSE: `VITE_GOOGLE_CSE_ID`/`VITE_GOOGLE_CSE_API_KEY`
from `.env`, the custom `ImportMetaEnv` augmentation in `vite-env.d.ts`, the workflow
secrets in `.github/workflows/jekyll-gh-pages.yml`, and the Google-specific Workbox
runtime-caching rule in `vite.config.ts` (repointed at Wikimedia's API host; `globPatterns`
also extended to precache `*.json` so `free-exercise-db.json` works offline from first
install). No security concern either way now — nothing secret to expose. If real AI
generation gets a paid LLM key later (see below), that must NOT reuse the old "public
client-side key" pattern regardless — needs a server-side proxy.

## Bug root cause: double-navigation / duplicate-workout issue — FIXED 2026-07-30

TODO listed "Clicking day to start workout creates it but redirects back to workout" and
"Some actions like switching sometimes cause double actions" as open issues. Root cause
was in `WorkoutSession.tsx`'s workout-creation `useEffect`: it depended on `workouts`
(`[sessionId, workouts, routines, ...]`), but its own body called `addWorkout()` which
mutates `workouts` in the store, so the effect could re-fire on the `workouts` state
change while `sessionId` was still unset, racing the `navigate('/workout/session/:id')`
call. Fixed by replacing the imperative "create" half with a TanStack Query `useMutation`
(new dependency — `@tanstack/react-query`, provider wired up in `main.tsx`) whose
`mutationFn` reads fresh state via `usePulsarStore.getState()` rather than the reactive
hook values, triggered from an effect that only depends on `[sessionId, searchParams]`
plus a `useRef` re-entrancy guard. Verified manually: repeated clicks on the same day now
resolve to the same session id instead of creating duplicates (checked directly in
IndexedDB). `SwitchRoutineDialog.tsx`'s `handleSwitch`/`handleUseBoth` also got a
`if (switching) return;` guard as a secondary contributor to the same "double actions"
report. Also fixed same day: the wake lock not surviving backgrounding (added a
`visibilitychange` re-request), `getStreakInfo` counting inactive-routine workouts forever
(now filters by `routineId` membership in active routines), the streak calendar showing
an X for today's not-yet-done cell instead of a neutral pending state, and the
"routine updated" banner being too visually subtle to notice. See `TODO.md` Issues section
for the checked-off items and the git history around 2026-07-30 for the actual diffs.

## Persistence: two storage layers doing overlapping jobs

`pulsarStore.ts` wraps the whole Zustand state in `persist()` (defaults to `localStorage`,
key `pulsar-store`) **in addition to** the manual IndexedDB read/write in `db/indexedDb.ts`
that `loadAll()`/`addX`/`updateX` already do. Practically:
- On boot, Zustand's `persist` middleware rehydrates `exercises`/`routines`/`workouts`
  from `localStorage` first (stale snapshot), then `usePulsarStoreInit` fires `loadAll()`
  and overwrites it from IndexedDB shortly after — a possible source of the "double
  actions" / flicker issues, and definitely dead weight (localStorage has a ~5MB cap that
  routine/workout history with images will eventually approach).
- Recommend: pass `partialize` to `persist()` to only keep UI prefs (e.g. `copiedRoutineDay`
  isn't even worth persisting across reloads) and drop `exercises`/`routines`/`workouts`
  from the localStorage snapshot entirely, since IndexedDB is already the source of truth.

## PWA was never actually installable — FIXED 2026-07-30

The bug reported as "Caching on new builds results in broken SVG image" had a much bigger
root cause than its name suggested: `vite-plugin-pwa` was only configured in
`vite.pwa.config.ts`, a completely orphaned file — `npm run build` / `vite build` always
resolve the default `vite.config.ts`, which never included the PWA plugin at all. Verified
by building and inspecting `dist/`: no `sw.js`, no `manifest.webmanifest`, no `<link
rel="manifest">` in `index.html` — the deployed site had zero service worker and was not
actually installable on any platform, despite `public/site.webmanifest` and all the icon
files sitting there unused. A second latent bug in that same dead config: it hardcoded
manifest/icon paths at the domain root (`/pwa-192x192.png`), which would 404 once actually
served from the GitHub Pages `/pulsar/` subpath.

Fixed by merging the plugin into the real `vite.config.ts` with relative
`start_url`/`scope`/icon paths (resolve correctly under any base), adding the
missing Apple/mobile meta tags and `apple-touch-icon` link to `index.html` (found and
fixed a pre-existing double-slash bug in the `%BASE_URL%` icon href pattern while at it),
reconciling the manifest's stale purple branding (`#6200ee`) to the app's actual cyan
(`#06b6d4`), and adding a proper `CacheFirst` runtime-caching rule keyed on image
*destination* rather than a single URL host — the original rule only covered the CSE
search API call, not the arbitrary-host image URLs it returns, which was the literal
"broken SVG" symptom. Deleted the now-fully-redundant `vite.pwa.config.ts` and the stale
static `public/site.webmanifest` (the plugin generates its own from config). Verified via
real `vite build` at both root and `BASE=/pulsar/`, plus `vite preview` + `curl` checks
confirming `manifest.webmanifest` (served as `application/manifest+json`), `sw.js`, and
all icons resolve with correct paths and content-types.

## Suggested priority order (independent of TODO.md's own grouping)

1. **Decide the AI story** — this blocks the app's core value prop, not just a checkbox.
   Even a cheap real LLM call (with a proxy) beats the current random-picker, which will
   read as broken/fake the moment a user notices the routine ignores their goals.
2. ~~Fix the WorkoutSession double-create race~~ — done 2026-07-30, see above.
3. **Drop redundant localStorage persistence** — small, removes a class of stale-state bugs.
4. ~~First Vitest coverage on `workoutUtils.ts`~~ — done 2026-07-30, see above. Next
   natural extension: `routineBuilderService.ts`'s pure functions (`normalizeExerciseName`,
   `findExistingExercise`, `searchExerciseSuggestions`), then component-level tests once
   there's a reason to add jsdom/testing-library.
5. Multi-routine support (TODO's "Handle multiple routines" section) is a data-model-level
   change — `Routine.active` is currently a single boolean with no notion of "inactive but
   has history," which is *why* the streak-calendar/alert bugs involving inactive routines
   keep recurring. Worth fixing at the model level rather than patching each call site.
