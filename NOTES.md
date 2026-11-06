# Pulsar — Engineering Notes

Living notes on the codebase's actual state, kept separate from `TODO.md` (which tracks
feature intent). This file tracks *how it's built* and *what to watch out for*. Started
2026-07-30 after a full read-through of the source.

## Snapshot

- React 18 + TypeScript + Vite PWA, Chakra UI v2, Zustand store, IndexedDB (`idb`) for
  persistence, deployed as a static site to GitHub Pages via Actions.
- ~12,000 lines across 72 files (as of 2026-07-31). 188 commits, April 2025 → present
  (long-running solo side project, bursts of activity — e.g. a big cluster on 2025-10-22,
  and again 2026-07-30/31 covering the PWA fix, streak/wake-lock bugs, and the History/
  stats-view + alert-unification + chat-history work noted below).
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

## AI features: real (BYOK) as of 2026-08-01, mocked before that

Historical note for context — until 2026-08-01 there was **no LLM integration at all**:
`RoutineChat.tsx` echoed the user's message back on a timer, and
`routineBuilderService.ts: generateRoutine` collected real user input but ignored it,
picking random `exerciseTemplates` instead. That's now Phase 1 of `PLAN-ai-features.md`,
implemented — see "Phase 1 AI (BYOK) shipped" below for what changed and how it works.
**The mock is gone as of 2026-11-06.** With no personal API key set
(`services/ai: getActiveAIProvider()` returns `null`), the wizard no longer fakes a
"custom" routine: it keyword-matches the answers against the routine templates
(`services/templateSearch.ts`) and lets the user pick one, and the routine chat shows an
"add your key in Settings" prompt instead of echoing. The app stays fully useful with zero
account, per `CLAUDE.md`, without pretending to be AI.

- The other real external API call in the app is exercise cover image search
  (`webUtils.ts: fetchExerciseSearchImageUrl`) — cached in `localStorage`, Workbox
  runtime-caching rule. It ran on Google Custom Search until 2026-07-30 (see below —
  replaced with Wikimedia Commons, no API key required).

~~**Implication:** "AI generation" isn't a small remaining task...~~ — resolved 2026-08-01,
see "Phase 1 AI (BYOK) shipped" below.

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

## Persistence: two storage layers doing overlapping jobs — FIXED 2026-07-31

`pulsarStore.ts` used to wrap the whole Zustand state in `persist()` (`localStorage`, key
`pulsar-store`) **in addition to** the manual IndexedDB read/write in `db/indexedDb.ts`
that `loadAll()`/`addX`/`updateX` already do. Practically, this meant:
- On boot, Zustand's `persist` middleware rehydrated `exercises`/`routines`/`workouts`
  from `localStorage` first (stale snapshot), then `usePulsarStoreInit` fired `loadAll()`
  and overwrote it from IndexedDB shortly after — a possible source of the "double
  actions" / flicker issues, and dead weight (localStorage has a ~5MB cap that
  routine/workout history with images would eventually approach).
- Every mutation (`addRoutine`, `updateWorkout`, etc.) wrote to IndexedDB *and* triggered
  a redundant full-state write to `localStorage`, for no benefit — nothing in
  `PulsarStoreState` actually needed to survive a reload outside of IndexedDB;
  `copiedRoutineDay` is clipboard-like and resetting it on refresh is normal, expected
  behavior, not a regression.

Fixed by removing `persist()` entirely rather than narrowing it with `partialize` — there
was nothing in this store's shape that justified keeping the middleware at all. Verified:
with the `pulsar-store` `localStorage` key manually deleted, the app loads identically
from IndexedDB alone, and the key is never recreated (no code path writes it anymore). If
a genuine cross-reload UI preference needs this store later, re-add `persist()` with an
explicit `partialize` scoped to just that field — don't default back to persisting
everything.

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

## History page became a real stats view — 2026-07-31

TODO's "Stats view," "Expanded streak calendar," and "Graphs and charts" are now covered by
`views/History.tsx`:
- `YearActivityCalendar.tsx` — went through two redesigns before landing: first a
  continuous GitHub-style week-column grid, then reverted per feedback to a 12-month grid
  of mini calendars (`SimpleGrid` of month boxes, each a 7-column day grid aligned to
  weekday via leading blank cells) — closer to a traditional "year at a glance" view than
  a contribution graph, and avoids the horizontal-scroll requirement the grid version had.
- `WeeklyActivityGraph.tsx` — extracted from `RoutineActivityDrawer.tsx`'s previously
  inline `ActivityGraph` (started/completed/perfect stacked bar chart by weekday) so both
  the per-routine Activity drawer and the global History page render the identical chart,
  just scoped to different `workouts` arrays. SVG bars are sized to fill the viewBox width
  evenly (symmetric side padding) rather than a fixed pixel width with dead space.
- `getHistoryTimeline` (`historyStats.ts`) — merges every workout with each routine's
  `createdAt` into one newest-first feed, so routine-creation events now show up inline in
  the Workout History list (gray "Created" badge) instead of only being visible via the
  Routine History section's date ranges.

## Home and Workout landing now share one set of status-alert components — 2026-07-31

`Home.tsx` had its own `TodayCard.tsx` duplicating the same status logic (emoji rotation,
button icon/text by `WorkoutStatus`) already implemented across `TimeToWorkoutAlert.tsx`,
`RestDayAlert.tsx`, `FinishedWorkoutAlert.tsx`, and `NoActiveRoutinesAlert.tsx` on the
Workout landing page — but the two had drifted: `TodayCard` had status-differentiated
titles and a `StatusBadge` checkmark that the Workout-page alerts lacked, and `TodayCard`
couldn't distinguish "zero active routines" from a real rest day (it showed a misleading
"Rest Day — recovery is part of the plan" when there was no plan at all). Merged the
better bits into the shared components (`TimeToWorkoutAlert` now varies its title by
status; `FinishedWorkoutAlert` now shows the checkmark badge) and deleted `TodayCard.tsx`
— `Home.tsx` now renders the same four alert components as `WorkoutLanding.tsx`, keyed off
`activeRoutines` computed the same way in both places.

Related bug in `WorkoutLanding.tsx` fixed the same day: `activeRoutines` was computed with
the favorites filter baked in (`routines.filter(r => r.active && (!showFavoritesOnly ||
r.favorite))`), and that same filtered array fed the status alert and the week `Timeline`
— so toggling "Show Favorites" could flip today's status to "Rest Day" or hide days from
the week schedule if the actual scheduled routine wasn't marked favorite. Fixed by never
favorite-filtering `activeRoutines`; the toggle now only scopes the separate Inactive
Routines list.

## Routine chat history unified — 2026-07-31

`Routine.prompts` (the setup-wizard's structured goals/equipment/howMuch/additionalInfo
answers) and `Routine.responses` (an array of `{date, prompt, response, dismissed}` AI
replies, seeded once at creation and never appended to since `RoutineChat.tsx` is fully
local/ephemeral state — see above) were two separate, awkwardly-shaped fields doing what's
conceptually one thing: a chat transcript. Replaced both with a single
`chatHistory: RoutineChatMessage[]` (`{id, role: 'user'|'ai', message, date, dismissed?}`)
on `Routine`. No migration path for existing local IndexedDB data — this is a straight
type/shape change, not a backward-compatible one.
- `routineBuilderService.ts`'s new `buildWizardChatHistory` turns the wizard's answers
  directly into the initial ai-question/user-answer stream at creation time, instead of
  `WorkoutRoutine.tsx` reconstructing it from two fields on every mount.
- The wizard itself (`WorkoutSetup.tsx`) no longer needs named prompt keys at all — since
  it's just a linear 4-step flow feeding one array, `responses` is now a plain positional
  `string[]` matched to `workoutPrompts` by index. `WizardPromptKey`/`RoutinePromptKey` and
  the `key` field on each `workoutPrompts` entry were removed entirely.
- The "How long can you work out?" prompt was reworded to "How much can you work out?"
  with examples spanning days-only, time-only, and both ("3 days a week, 30 min daily, 45
  min 3x a week, or as much as I need") — the old wording implied duration-only.
- `RoutineChat.tsx` now uses the shared `RoutineChatMessage` type instead of its own local
  `ChatMessage` interface, generating `id`/`date` on send. At the time this was still fully
  local/mocked and not persisted — both fixed the next day, see below.

## Phase 1 AI (BYOK) shipped — 2026-08-01

`PLAN-ai-features.md`'s Phase 1 is implemented: real OpenAI calls for both routine
generation and chat-suggested edits, gated behind a personal API key the user pastes into
Settings (`views/Settings.tsx`'s new "AI" card) — no login, no backend. (Originally this
fell back to the old random-picker/echo mock; that was replaced 2026-11-06, see "No-key
path and AI hardening" below.)

- **`services/ai/`** (new dir) — `types.ts` (`AIProvider`, `AIRoutineResponse`,
  `AIChangeResponse`, `AIError`), `byokProvider.ts` (direct `fetch` to OpenAI,
  `gpt-4o-mini`, `response_format: json_object`, two system prompts — one for initial
  generation, one for change suggestions), `index.ts` (`getActiveAIProvider()` — the one
  function everything else calls; Phase 4's `hostedProvider` will slot in here later
  behind the same interface, per the plan).
- **`store/aiSettingsStore.ts`** (new) — the API key, `localStorage`-only, deliberately its
  own tiny store rather than added to `pulsarStore.ts` (which had its own redundant
  `persist()` removed the day before — see above).
- The model only ever sees/produces **exercise names**, never internal `exerciseId`s —
  `routineBuilderService.ts: resolveAIExercises` (new, exported) resolves names to real
  `Exercise` records via the exact same `getAddedExercise` pipeline template routines
  already used, reused by both the initial-generation path and by `RoutineChat.tsx` when
  resolving a change patch's proposed exercises.
- **`models/types.ts`**: new `RoutineChange` (`{id, status, patch}`, per-day `setDay`/
  `clearDay` ops — not a full-schedule replace, so the diff UI shows exactly which days
  changed), `RoutineChatMessage.pendingChangeId` linking a chat message to the change it
  proposes, `Routine.changes?: RoutineChange[]`.
- **`components/RoutineChangeCard.tsx`** (new) — inline per-day diff + Accept/Reject,
  rendered under any chat message with a `pendingChangeId`. Accept applies the patch via
  the same `updateRoutine` call manual edits already use — `RoutineEditor.tsx` needed
  **zero changes**, exactly as the plan predicted.
- **Fixed the same day: `RoutineChat.tsx` chat history was never actually persisted**
  (despite `chatHistory` living on `Routine` since 2026-07-31) — sending a message only
  ever updated local component state, so a refresh silently discarded the live
  conversation. `RoutineChat` now takes `routine: Routine` as its prop (not
  `chatHistory`/`setChatHistory`) and calls `updateRoutine` on every send, so both the
  wizard-seeded history and every later exchange now survive reloads. `WorkoutRoutine.tsx`
  simplified accordingly — no more local `chatHistory` state/syncing effect.

### Regression found and fixed the same day: `isLoading` checks that were always `false`

`Home.tsx`, `History.tsx`, and `WorkoutLanding.tsx` all computed
`isLoading = routines === undefined || workouts === undefined` — but `pulsarStore.ts`'s
`routines`/`workouts` are typed as arrays and initialized to `[]`, **never** `undefined`,
so this was always `false`, regardless of whether `loadAll()` had actually finished. It
went unnoticed because `persist()`'s stale `localStorage` rehydration (removed 2026-07-31)
almost always provided a non-empty `routines` array synchronously before first paint,
masking the bug for any returning user. Without it, a hard reload now genuinely starts
with `routines = []` until IndexedDB's async load resolves — and `WorkoutLanding.tsx`'s
"no routines → redirect to /setup" effect fired immediately on that empty transient state,
bouncing straight to the setup wizard on every fresh load regardless of existing data.
Fixed by using the store's actual `loading` boolean (`usePulsarLoading()`) in all three
views instead of the broken `undefined` check. A good example of a fix (removing
`persist()`) correctly exposing a pre-existing, previously-invisible bug rather than
causing a new one — worth remembering next time "it worked before this change" comes up.

## Suggested priority order (independent of TODO.md's own grouping)

1. ~~Decide the AI story~~ — Phase 1 (BYOK) shipped 2026-08-01, see above. Phases 2-4
   (auth, billing, hosted/subscription-gated AI) remain, per `PLAN-ai-features.md`.
2. ~~Fix the WorkoutSession double-create race~~ — done 2026-07-30, see above.
3. ~~Drop redundant localStorage persistence~~ — done 2026-07-31, see above.
4. ~~First Vitest coverage on `workoutUtils.ts`~~ — done 2026-07-30, see above. Next
   natural extension: `routineBuilderService.ts`'s pure functions (`normalizeExerciseName`,
   `findExistingExercise`, `searchExerciseSuggestions`), then component-level tests once
   there's a reason to add jsdom/testing-library.
5. Multi-routine support (TODO's "Handle multiple routines" section) is a data-model-level
   change — `Routine.active` is currently a single boolean with no notion of "inactive but
   has history," which is *why* the streak-calendar/alert bugs involving inactive routines
   keep recurring. Worth fixing at the model level rather than patching each call site.

## No-key path and AI hardening — 2026-11-06

Decided with Aaron: bring-your-own-key is the only AI path for now, and without a key the
app does template matching and nothing else.
- **No key → keyword template search.** `services/templateSearch.ts` (pure, tested) holds the
  ranking that used to live inside `RoutineTemplateChooser.tsx`, rewritten: stopwords and
  numbers dropped, everyday phrasings mapped to template vocabulary ("lose weight" → fat
  loss, "get stronger" → strength, "run a marathon" → running/endurance), weighted bag of
  words per template (name and keywords count most), half credit for related word forms.
  The old version did raw substring regex counts, so words like "a"/"to" matched every
  template. The wizard's last step becomes "Find matching routines" and opens the chooser
  ranked by the answers. The random routine generator was deleted (`generateRandomRoutineName`
  stays — the chooser's "Random" name button uses it).
- **AI failures surface instead of silently downgrading.** `generateRoutine` throws `AIError`
  (now with `no_key`/`quota`/`model` codes, OpenAI's own error message on other failures);
  the wizard shows a toast and keeps the answers so the user can retry or pick a template.
- **Responses are validated.** `services/ai/normalize.ts` (pure, tested) coerces day names
  ("wed", "monday"), numeric strings, reps-and-duration-together, and drops empty days or
  `setDay` ops with no exercises, throwing `parse_error` when nothing usable is left.
- **Chat has context.** `suggestRoutineChange` now takes prior chat turns (last 12) so
  follow-ups like "yes, do that" work; the routine schedule goes in the system message.
  The chat builds on the latest stored routine (`usePulsarStore.getState()`) rather than a
  possibly stale prop, and accepting a change uses `utils/routineChangeUtils.ts:
  applyRoutineChange` (pure, tested), which keeps days in Sunday–Saturday order.
- **Model is configurable**, default `gpt-5-mini` with `reasoning_effort: low` (sent only to
  gpt-5/o-series models). `gpt-4o-mini` was the original default but OpenAI retires it
  2027-01-14. Prompts now steer the model toward the curated `exerciseTemplates` names so
  most exercises resolve with good metadata and images; ad hoc exercises the model gives a
  `duration` for are created as timed.
- Verified end to end in the built app at iPhone 13 size with OpenAI mocked via Playwright
  route interception (no real key available): no-key template flow, AI generation, a chat
  change proposal accepted, a plain question answered, persistence across reload, and a 401
  surfacing as a toast. Not yet run against the real OpenAI API.
- Old routines without `chatHistory` were intentionally not migrated (Aaron: existing local
  data can be reset).
- **AI access gate** (`components/AIAccessDialog.tsx` + `hooks/useAIGate.tsx`; reworked the
  same day per Aaron's feedback, replacing an earlier explicit "turn on AI" dialog). AI is
  never something you switch on: AI features always look available, and using one without
  access opens a paywall-style gate at that moment, the same way a subscription prompt will
  later. `requireAI(action, { reason, alternative })` runs the action immediately when AI is
  available; otherwise it shows the gate and runs the same action once a verified key is
  saved, so the user never repeats what they started. Wired into the wizard's "Make my
  routine!" (alternative: "Match a template instead", the keyword template search) and the
  routine chat's send (the message is sent after unlocking). The gate shows a disabled
  "Pulsar Premium, coming soon" option above "Use your own OpenAI key"; the subscription
  check will slot into `useAIGate` beside the key check. Settings only manages the key (Add,
  Test, Change, Remove, model override). Gotcha found while testing: the gate often opens
  from an Enter keypress, so it sets `initialFocusRef` to the key field; otherwise focus
  lands on the close button and the same Enter dismisses the dialog.

