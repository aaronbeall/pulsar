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
- The only real external API call in the app is Google Programmable Search (CSE) for
  exercise cover images (`webUtils.ts: fetchExerciseSearchImageUrl`) — that one's real,
  cached in `localStorage`, and has a Workbox runtime-caching rule.

**Implication:** "AI generation" isn't a small remaining task, it's the actual core
feature and hasn't started. Everything else in MVP is polish around a routine-management
app that currently has no personalization engine. Worth deciding early whether this is
built as a real LLM call (needs a backend/proxy — see security note below) or scoped down
for v1.

## Security/config note: Google CSE key is a public client secret

`.env` → `VITE_GOOGLE_CSE_API_KEY` / `VITE_GOOGLE_CSE_ID` are bundled into the client JS
(Vite `VITE_` prefix = public by design) and also injected as GitHub Actions secrets into
a **static** build (`.github/workflows/jekyll-gh-pages.yml`). Anyone can extract the key
from the deployed bundle and burn the CSE quota. Low stakes today (free tier, side
project), but if real AI generation gets added later, the same pattern must NOT be reused
for an LLM API key — that needs a server-side proxy (e.g. a small Cloudflare
Worker/Vercel function) or it will get scraped and abused within hours of going public.

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

## PWA caching bug (matches TODO: "Caching on new builds results in broken SVG image")

`vite.pwa.config.ts` precaches `**/*.{js,css,html,png,svg,ico}` via Workbox with
`registerType: 'autoUpdate'`. Classic vite-plugin-pwa footgun: precache manifest revisions
its own build assets by content hash, but the exercise cover/icon images referenced via
`coverImageUrl`/`iconImageUrl` are runtime-fetched URLs from Google CSE, not build assets —
those aren't in the precache manifest and rely on the browser HTTP cache, which can go
stale/opaque across deploys since there's no `runtimeCaching` rule for arbitrary image
hosts (only `googleapis.com/customsearch` is covered). Likely fix: add a `runtimeCaching`
entry (`CacheFirst`, image destination matcher) for the actual image URLs Google returns,
not just the search API call.

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
