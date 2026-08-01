# Plan: AI Features — from BYOK testing to subscription-gated hosted AI

Updated 2026-07-31 after confirming the actual destination: BYOK (bring-your-own-key) is
**a testing/validation step, not the end state.** The real goal is the funnel already
sketched in `PLAN-ai-subscription.md`: optional login → subscribe → Pulsar-hosted AI paid
for out of subscription revenue, with a cost ceiling. This doc reconciles the two —
BYOK ships first because it's zero-infra and proves the AI actually works, but it's built
so none of that work gets thrown away once auth/billing/hosted-AI land on top.

## The bridge: one `AIProvider` interface, two implementations

The thing that makes BYOK-first *not* a dead end is never letting UI code call OpenAI
directly. Everything (`WorkoutSetup.tsx`, `RoutineChat.tsx`, `routineBuilderService.ts`)
talks to one interface; only the interface's implementation changes later.

```ts
// src/services/ai/types.ts
export interface AIRoutinePlan {
  name: string;
  description: string;
  dailySchedule: Array<{
    day: DayOfWeek;
    kind: string;
    exercises: Array<{ name: string; sets: number; reps?: number; duration?: number }>;
  }>;
}

export interface AIProvider {
  generateRoutine(answers: { goals: string; equipment: string; howMuch: string; additionalInfo: string }): Promise<AIRoutinePlan>;
  suggestRoutineChange(routine: Routine, userMessage: string): Promise<RoutineChange>;
}
```

- **Phase 1 (below): `byokProvider.ts`** — implements `AIProvider` by calling OpenAI
  directly from the browser with the user's own stored key.
- **Phase 4 (below): `hostedProvider.ts`** — implements the *same* `AIProvider` interface
  by calling a Supabase Edge Function instead, which holds Pulsar's own key server-side.
- `getActiveAIProvider(): AIProvider | null` picks between them (logic in "Provider
  selection," below) and everything upstream — the wizard, the chat UI, the diff/accept
  card — only ever calls through the interface. It never knows or cares which is active.

**What actually carries forward vs. what gets duplicated:** the `AIRoutinePlan`/
`RoutineChange` TypeScript shapes, the exercise-name→`Exercise` resolution pipeline (only
ever runs client-side against the local IndexedDB store, regardless of which provider
produced the plan), and every UI component built in Phase 1 all carry forward unchanged.
The literal *prompt wording* sent to the LLM does not automatically carry into the Edge
Function — Deno (Supabase Functions' runtime) can't import frontend TS files without a
shared workspace package, which is more infra than this needs right now. Treat the Phase 4
Edge Function's prompt as a deliberate, acceptable duplicate of Phase 1's, kept in sync by
hand (or move both into a small shared package later if the duplication becomes a real
maintenance cost — not worth building preemptively for one prompt).

## Phase 1 — BYOK AI (ships now, no backend)

Validates the actual product value (does AI-generated content beat the random-picker?)
and the prompt/schema/UI work, with zero infrastructure risk.

### 1a. Routine generation

**New files**
- **`src/store/aiSettingsStore.ts`** — tiny, deliberately separate from `pulsarStore.ts`
  (which just had its own redundant `persist()` removed — see `NOTES.md` 2026-07-31; a new
  setting has no business re-introducing that pattern). Holds `openaiApiKey: string | null`
  in `localStorage` (`pulsar:openaiApiKey`). Exposes
  `useOpenAiApiKey(): [string | null, (key: string | null) => void]`.
- **`src/services/ai/types.ts`** — the `AIProvider`/`AIRoutinePlan` shapes above, plus
  `RoutineChange` (see 1b).
- **`src/services/ai/byokProvider.ts`** — implements `AIProvider`:
  - `generateRoutine`: `POST https://api.openai.com/v1/chat/completions`,
    `Authorization: Bearer ${apiKey}`, `response_format: { type: 'json_object' }`
    (model: `gpt-4o-mini` — cheap, supports JSON mode; confirm before building), system
    prompt describing the `AIRoutinePlan` shape.
  - Exercise **names** come back from the model, not `exerciseId`s — resolve each via the
    *existing* resolution pipeline (`getAddedExercise`/`createNewExercise` in
    `routineBuilderService.ts`, the same 4-tier lookup already used for template-based
    routines). Don't build a second resolution path.
  - Error handling: 401 (bad key), 429 (rate limit), network failure → distinct toasts;
    all fall through to the existing random-picker so a bad/expired key degrades
    gracefully instead of hard-failing routine creation.
- **`src/services/ai/index.ts`** — `getActiveAIProvider()` (see "Provider selection").

**Changed files**
- **`routineBuilderService.ts: generateRoutine`** — if `getActiveAIProvider()` returns
  non-null, call it and map the `AIRoutinePlan` into a `Routine` (still building
  `chatHistory` via the existing `buildWizardChatHistory`, with a real closing AI message
  instead of the canned one). No provider → unchanged random-picker fallback, so the app
  stays fully functional with zero setup either way.
- **`views/Settings.tsx`** — new card, same style as Appearance/Photo Credits: password-
  masked key input, a "Test key" button (cheap `GET /v1/models` call, no completion spend),
  a link to OpenAI's key page, and status text ("AI generation active" / "Add a key above
  to enable AI-personalized routines — otherwise Pulsar picks from templates").
- **`views/WorkoutSetup.tsx`** — if no provider is active, a small inline note under "Make
  my routine!" so the template fallback is visible, not a silent downgrade.

### 1b. Chat-suggested edits (diff review, accept/reject)

Depends on 1a's provider plumbing.

**New model (`models/types.ts`)**
```ts
export interface RoutineChange {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  summary: string; // e.g. "Add 2 cardio days, remove Friday leg day"
  patch: {
    dailySchedule?: Array<
      | { op: 'setDay'; day: DayOfWeek; kind: string; exercises: ScheduledExercise[] }
      | { op: 'clearDay'; day: DayOfWeek } // turn into a rest day
    >;
    description?: string;
  };
}
```
- `RoutineChatMessage` gains optional `pendingChangeId?: string` so the `ai` message that
  proposes a change can render its diff/accept/reject UI inline.
- `Routine` gains `pendingChanges?: RoutineChange[]` — separate from `chatHistory` so the
  transcript stays a pure log and changes have their own lifecycle.
- Deliberately per-day ops, not a full-schedule replace — lets the diff UI show which
  specific days changed instead of an opaque "routine updated," and lets the summary read
  the way a human would describe the change.

**New/changed files**
- **`AIProvider.suggestRoutineChange`** (implemented in `byokProvider.ts`) — same JSON-mode
  pattern as 1a, system-prompted with the routine's current `dailySchedule`.
- **`components/RoutineChat.tsx`** — `handleSend`: if a provider is active, call
  `suggestRoutineChange` instead of the mock echo; the resulting message carries
  `pendingChangeId`, rendered via `RoutineChangeCard`. No provider → unchanged mock echo.
- **`components/RoutineChangeCard.tsx`** (new) — renders inline: `summary`, a compact
  per-day diff (reuse `DayKindBadge` styling), Accept/Reject buttons.
  - **Accept**: apply `patch` via the same `updateRoutine` store action manual edits
    already use — no new persistence path. Mark the change `accepted`.
  - **Reject**: mark `rejected`, routine untouched.
- **`components/RoutineEditor.tsx`** — **no change needed.** Changes apply through the same
  `updateRoutine` call manual edits use; the editor doesn't need to know whether an update
  came from dragging exercises around or an accepted AI suggestion.

## Phase 2 — optional auth (Supabase)

= `PLAN-ai-subscription.md` Phase 0-1, unchanged. No AI behavior changes yet — this phase
is purely "can a user log in and get a stable `user_id`," reachable from Settings, never
forced at launch. Can be built in parallel with Phase 1 since it doesn't touch AI at all.

## Phase 3 — subscription billing (Stripe)

= `PLAN-ai-subscription.md` Phase 2, unchanged. Checkout + webhook + `subscriptions` table.
Still no AI behavior change — this just makes "is this logged-in user an active
subscriber" a queryable fact for Phase 4 to gate on.

## Phase 4 — hosted AI proxy, subscription-gated

= `PLAN-ai-subscription.md` Phase 3, now concrete: add `hostedProvider.ts` implementing
the same `AIProvider` interface from Phase 1, calling Supabase Edge Functions
(`ai-generate-routine`, `ai-chat`) instead of OpenAI directly. The Edge Functions hold
Pulsar's own LLM key (never the client), verify the Supabase JWT, check
`subscriptions.status == 'active'`, and enforce the two-layer cost ceiling already
designed in `PLAN-ai-subscription.md` (per-user daily cap + global circuit breaker) — this
is the "budget for AI enabled features" you're after. `RoutineChat.tsx`,
`WorkoutSetup.tsx`, `RoutineChangeCard.tsx` need **zero changes** — they already only know
about the `AIProvider` interface.

### Provider selection (`src/services/ai/index.ts`)

```ts
export function getActiveAIProvider(): AIProvider | null {
  if (isLoggedIn() && hasActiveSubscription()) return hostedProvider; // Phase 4
  if (hasOpenAiKey()) return byokProvider;                            // Phase 1
  return null; // falls back to templates/random-picker, as today
}
```
Subscribers get the hosted, budget-capped path automatically — no need to also hold a
personal key once subscribed.

## Open product question — BYOK's fate once Phase 4 ships

Not resolving this now; flagging so it doesn't get decided by default. Once hosted AI
exists, options for the BYOK path:
1. **Keep it permanently** as a free alternative for privacy-conscious/technical users who
   don't want a subscription or to send routine data through Pulsar's backend.
2. **Hide it from new users** once Phase 4 ships, keep it as an internal/dev testing toggle
   only.
3. **Grandfather existing BYOK users**, steer all new users toward subscription.
Revisit once Phase 4 is actually close — premature to commit now.

## `CLAUDE.md` wording (apply now)

Current: *"AI is the only thing that should ever require login + an active subscription."*
Update to: *"AI requires either a personal API key (free, BYOK, Phase 1) or a login +
active subscription (hosted, budget-capped, Phase 4) — never required to use the app at
all."* Applying this now since the roadmap above resolves the ambiguity the old wording left.

## Sequencing summary

1. **Phase 1** (1a → 1b) — real AI, no infra, ships fastest, immediately testable.
2. **Phase 2 + 3** (auth, billing) — can build in parallel with each other and with Phase 1
   polish; no AI behavior change, pure plumbing.
3. **Phase 4** (hosted proxy) — the only phase that depends on all three prior phases
   existing; swaps in `hostedProvider` behind the same interface Phase 1 already built.
4. Decide BYOK's long-term visibility once Phase 4 is real, not before.
