# Pulsar — Agent Guidance

Personalized workout tracker PWA. React 18 + TypeScript + Vite, Chakra UI v2, Zustand,
IndexedDB (`idb`), deployed static to GitHub Pages. See `NOTES.md` for a full
architecture/findings write-up and `PLAN-ai-subscription.md` for the planned auth/AI/
billing direction — read both before proposing changes in those areas.

**This is a mobile-first, practically mobile-only app.** It's a PWA meant to be installed
on a phone and used one-handed mid-workout — the desktop/wide-viewport case is secondary
at best. All design and layout work going forward must be mobile-first-friendly:
- Default to the mobile layout and treat wider breakpoints as the enhancement, not the
  other way around — in Chakra's responsive props (`{{ base: ..., md: ... }}`), `base` is
  the one that actually matters most; don't design something that only looks right at
  `md`+ and hope `base` falls out reasonably.
- Test/verify any UI change at a real phone viewport width (~375-430px), not just the
  default wide browser window — a change that looks fine at 1400px can easily overflow,
  wrap badly, or produce unreachable touch targets at phone width.
- Keep touch targets and spacing appropriately sized for fingers, not mouse pointers.
- When in doubt about a layout tradeoff, prioritize the mobile experience over the desktop
  one.

## Things to keep in mind while developing

- **The "AI" features are currently mocked, not a small gap.** `RoutineChat.tsx` echoes
  the user's message back on a timer; `routineBuilderService.ts: generateRoutine` collects
  real goals/equipment/howMuch/additionalInfo input (see `constants/prompts.ts`) and stores
  it as the routine's initial `chatHistory` (unified 2026-07-31 — see `NOTES.md`), but then
  ignores it entirely when picking exercises, choosing random templates instead. Don't
  assume any AI call is real without checking — and don't quietly "finish" the mock without
  flagging it, since replacing it is a deliberate, staged effort (see
  `PLAN-ai-subscription.md`), not a drop-in fix.
- **Never put a real API key behind a `VITE_`-prefixed env var again.** The existing
  Google CSE key is already public in the client bundle (acceptable for a free-tier image
  search) — that pattern must not be reused for an LLM key or anything metered/abusable.
  Real AI calls must go through a server-side proxy (planned: Supabase Edge Function).
- **Data stays local-first for now.** Routines/workouts/exercises live in IndexedDB via
  `pulsarStore.ts` / `db/indexedDb.ts`. Don't add a backend sync path for this data
  without an explicit decision — sync is an intentionally deferred premium-tier phase.
- **Zustand's `persist()` middleware currently double-stores the whole app state in
  localStorage on top of IndexedDB** (see `NOTES.md`) — a likely source of stale-state
  bugs on boot. Don't build new features on top of this dual-write pattern; if touching
  `pulsarStore.ts`, prefer narrowing `persist`'s `partialize` to UI-only state rather than
  extending what gets persisted twice.
- **`WorkoutSession.tsx`'s workout-creation double-create/redirect race is fixed** (was:
  effect depended on `workouts`, but also caused `workouts` to change via `addWorkout`
  before `navigate()` resolved). Now uses a TanStack Query `useMutation` that reads fresh
  state via `usePulsarStore.getState()` instead of the reactive hook — see `NOTES.md` for
  the full writeup. If a similar double-fire bug shows up elsewhere, this is the pattern to
  reach for.
- **Vitest is set up** (`npm test`, config in `vitest.config.ts`, Node environment — no
  jsdom yet). Coverage is pure-logic modules (`src/utils/*.ts`, `src/services/
  freeExerciseDb.ts`, `src/assets/homeBackgrounds.ts`) — no components yet. When adding new
  pure logic, add tests alongside it rather than letting that become an afterthought;
  component tests will need jsdom/testing-library added when that becomes worth it.
- **GitHub Pages hosting is provisional.** Once any backend piece lands (auth, billing, AI
  proxy), the static frontend should move to Cloudflare Pages rather than keeping GitHub
  Pages alongside a separate API origin — see `PLAN-ai-subscription.md` for why.
- Login/subscription must stay **optional** — the app should remain fully useful with
  zero account, local-only data, and template-based (non-AI) routines. AI is the only
  thing that should ever require login + an active subscription.
