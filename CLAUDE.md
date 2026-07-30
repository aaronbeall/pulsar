# Pulsar — Agent Guidance

Personalized workout tracker PWA. React 18 + TypeScript + Vite, Chakra UI v2, Zustand,
IndexedDB (`idb`), deployed static to GitHub Pages. See `NOTES.md` for a full
architecture/findings write-up and `PLAN-ai-subscription.md` for the planned auth/AI/
billing direction — read both before proposing changes in those areas.

## Things to keep in mind while developing

- **The "AI" features are currently mocked, not a small gap.** `RoutineChat.tsx` echoes
  the user's message back on a timer; `routineBuilderService.ts: generateRoutine` collects
  real goals/equipment/time input and then ignores it, picking random exercise templates
  instead. Don't assume any AI call is real without checking — and don't quietly "finish"
  the mock without flagging it, since replacing it is a deliberate, staged effort (see
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
- **`WorkoutSession.tsx`'s workout-creation effect has a suspected race** (effect depends
  on `workouts`, but also causes `workouts` to change via `addWorkout` before `navigate()`
  resolves) — likely root cause of the reported double-create/redirect bugs. Be cautious
  adding more logic to that effect until it's fixed; don't paper over symptoms there.
- **Vitest is set up** (`npm test`, config in `vitest.config.ts`, Node environment — no
  jsdom yet). Coverage so far is `src/utils/*.ts` only (pure functions). When adding new
  pure logic elsewhere (e.g. `routineBuilderService.ts`), add tests alongside it rather
  than letting the util-only pattern silently become the ceiling; component tests will
  need jsdom/testing-library added when that becomes worth it.
- **GitHub Pages hosting is provisional.** Once any backend piece lands (auth, billing, AI
  proxy), the static frontend should move to Cloudflare Pages rather than keeping GitHub
  Pages alongside a separate API origin — see `PLAN-ai-subscription.md` for why.
- Login/subscription must stay **optional** — the app should remain fully useful with
  zero account, local-only data, and template-based (non-AI) routines. AI is the only
  thing that should ever require login + an active subscription.
