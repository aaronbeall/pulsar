# Pulsar — Agent Guidance

Personalized workout tracker PWA. React 18 + TypeScript + Vite, Chakra UI v2, Zustand,
IndexedDB (`idb`), deployed static to GitHub Pages. See `NOTES.md` for a full
architecture/findings write-up, `PLAN-ai-features.md` for the full BYOK → hosted AI
roadmap (start here), and `PLAN-ai-subscription.md` for the auth/billing/proxy details
that roadmap's later phases depend on — read all three before proposing changes in those
areas.

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

- **Import React hooks directly** (`import { useState } from 'react'`) and call them as
  `useState(...)`, never `React.useState(...)`.
- **AI is bring-your-own-key only.** With a personal OpenAI key (Settings), routine
  generation and routine chat call OpenAI directly from the browser through the
  `services/ai` `AIProvider` interface. Without a key there is no AI and no mock: the
  user is asked for AI access at the moment they use an AI feature (never an explicit
  "turn on AI" step): wrap AI actions in `hooks/useAIGate.tsx`'s `requireAI`, which shows
  `components/AIAccessDialog.tsx` and then continues the action. That gate is also where
  premium subscriptions will be offered. The no-AI alternative for routine creation is the
  keyword template search (`services/templateSearch.ts`). Don't reintroduce a fake "AI" fallback. Hosted AI behind login/subscription is a
  later phase (see `PLAN-ai-subscription.md`).
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
- **Every modal, dialog, drawer and sheet keeps its open state in the URL** via
  `hooks/useUrlModal.ts` (`useUrlModal('key')` → `isOpen`/`value`/`open`/`close`/`leaveTo`), so
  the phone's Back button closes it instead of leaving the page. Don't drive a new overlay
  with `useState`/`useDisclosure`: add its param to `UrlModalKey` in `utils/urlModal.ts` and
  put its context (routine id, day...) in the value. Context that can't go in a URL stays in
  state, with `isStale` dropping the param after a reload. After closing, `await close()`
  before opening something else or navigating; to navigate away from inside a modal use
  `leaveTo` so Back from the destination doesn't reopen it.
- **Testing-only features live behind dev mode** (`src/utils/devMode.ts`: always on under
  `npm run dev`, toggled in any build with `?dev=1` / `?dev=0`). See `DEV-FEATURES.md` for the
  list. Gate any new debug/testing tool with `isDevMode()` and add it to that doc; never ship
  one to regular users ungated.
- **Vitest is set up** (`npm test`, config in `vitest.config.ts`, Node environment — no
  jsdom yet). Coverage is pure-logic modules (`src/utils/*.ts`, `src/services/
  freeExerciseDb.ts`, `src/assets/homeBackgrounds.ts`) — no components yet. When adding new
  pure logic, add tests alongside it rather than letting that become an afterthought;
  component tests will need jsdom/testing-library added when that becomes worth it.
- **Playwright e2e tests** cover the main happy paths (`npm run test:e2e`, specs in `e2e/`,
  see `e2e/README.md`). They run at a phone viewport with a pinned clock, no outside network,
  and OpenAI calls blocked unless mocked with `mockOpenAI`. When a UI change breaks a flow
  they cover, update the spec in the same change; when adding a new main flow, add one.
- **The site root is the marketing homepage; the app lives at `<base>app/`** (router basename,
  PWA scope and start URL all point there). The homepage is plain HTML/CSS/TS in `index.html` +
  `home/`, with no React; see `home/README.md`. Links into the app from outside it must include
  `app/`.
- **Hosting is moving to Cloudflare.** One Worker (`wrangler.jsonc`, `worker/`) serves the
  homepage, the app and the API from the same origin, so login cookies need no CORS. Static
  files are served before the Worker runs; API routes go under `/api/`. GitHub Pages
  workflows stay only until the Cloudflare deploy is confirmed live. See README "Deploying".
- **Accounts are Google sign-in via Better Auth in the Worker** (`worker/auth.ts`, D1
  migrations in `worker/migrations/`). The app reads `/api/me` through
  `hooks/useAccount.ts` (`services/account.ts`); where there's no API it behaves as if
  sign-in doesn't exist. The server stores identity, plan and AI usage only, never workout
  data or prompt text. Previews hide sign-in (`AUTH_ORIGINS`).
- Login/subscription must stay **optional** — the app should remain fully useful with
  zero account, local-only data, and template-based (non-AI) routines. Real AI requires
  *either* a personal API key (free, bring-your-own-key) *or* login + an active
  subscription (hosted, budget-capped) — never required just to use the app. See
  `PLAN-ai-features.md` for the full BYOK → hosted roadmap and why both paths exist.
