# Plan: Optional Login + Subscription-Gated AI (stub)

> This is Phases 2-4 of the bigger roadmap in `PLAN-ai-features.md` (2026-07-31), which
> ships a BYOK version of the same AI features first, with zero infra, behind an
> `AIProvider` interface this plan's hosted path slots into later without UI changes. Read
> that doc first for the full sequencing; this one covers the auth/billing/proxy details.

Goal: add optional login and a paid tier that unlocks real AI routine generation/chat,
without requiring an account for the core app, without any upfront cost, and with a
cost ceiling that can't blow up if abused. Local IndexedDB stays the source of truth for
workout data — no sync yet, just the identity/billing/AI plumbing needed to gate a paid
feature. Data sync is an explicitly deferred phase (see bottom).

## Stack (all free at indie-app scale)

- **Static hosting:** Cloudflare Pages (see prior discussion — no reason to keep GH Pages
  once a backend exists; Pages + Workers/Functions share one project/domain/deploy).
- **Auth + DB + backend functions: Supabase** (one provider for all three, free tier —
  email/magic-link + OAuth auth, Postgres, Edge Functions). Avoids stitching together
  three separate free tiers with three separate outage/quirk surfaces.
- **Billing: Stripe Checkout + Customer Portal**, both hosted by Stripe. No monthly fee,
  only the standard per-transaction cut — so it only costs anything once there's revenue.
  No custom payment UI to build or secure.
- **LLM:** whatever provider (Anthropic/OpenAI), called *only* from a Supabase Edge
  Function — never from the client. This is the one real variable cost, bounded by the
  usage cap in Phase 3.

## Phase 0 — accounts & scaffolding

- Create Supabase project (free tier), add `@supabase/supabase-js` to the frontend.
- Create Stripe account in test mode, define one subscription product/price ("Pulsar AI").
- No app behavior changes yet.

## Phase 1 — optional auth

- Add a login/signup entry point (email+password or magic link to start; OAuth later)
  reachable from Settings or an "Unlock AI" CTA — never forced at app launch.
- Logged-out stays the default and fully functional: local data, template-based routines,
  no AI. Login only matters once AI is involved.
- On first login, create a `profiles` row keyed by the Supabase auth `user_id`. This id is
  the anchor for everything that follows (billing, usage, future sync) — nothing else
  about the current local-storage model changes.

## Phase 2 — subscription & billing

- Edge Function `create-checkout-session`: authenticated user → Stripe Checkout session
  (Stripe hosts the payment form, so no PCI surface in our app).
- Edge Function `stripe-webhook`: verifies Stripe signature, updates a `subscriptions`
  table (`user_id`, `status`, `plan`, `current_period_end`) on
  `checkout.session.completed` / `customer.subscription.updated|deleted`.
- Link to Stripe's hosted Customer Portal for cancel/manage — no billing UI to build.

## Phase 3 — AI proxy, gating, and the cost ceiling

- Edge Function(s) (`ai-generate-routine`, `ai-chat`) are the **only** place holding the
  LLM API key — mirrors the CSE-key exposure issue already flagged in `NOTES.md`, so this
  phase specifically avoids repeating it.
- Each call: verify the Supabase JWT → check `subscriptions.status == 'active'` → reject
  otherwise (this is the actual gate — everything upstream is just plumbing to reach it).
- **Cost control, two layers:**
  1. Per-user cap: increment a counter per billing period, hard-reject past a configurable
     N calls/day even for active subscribers — bounds worst case from one compromised or
     careless account.
  2. Global circuit breaker: a daily spend/call budget across all users; trip it and fail
     closed (serve a "try again later" instead of the LLM) rather than let a spike or bug
     turn into an open-ended bill.
- Wire the real call in behind `RoutineChat.tsx` and `routineBuilderService.ts:
  generateRoutine` in place of the current mocked echo/random-picker (see `NOTES.md` for
  where those live today).

## Cost summary

| Piece | Cost at indie scale |
|---|---|
| Cloudflare Pages | Free |
| Supabase (auth+db+functions) | Free tier (watch: free projects pause after ~1 week idle — fine pre-launch, revisit if that becomes annoying) |
| Stripe | Free until there's revenue, then standard % per transaction |
| LLM calls | Only real variable cost — bounded by Phase 3 caps, funded by subscription revenue |

## Explicitly deferred: data sync (future premium phase)

Not in scope now. When it happens: mirror `routines`/`workouts`/`exercises` into Postgres
tables keyed by the `user_id` already established in Phase 1, push local IndexedDB state
on login/interval, last-write-wins conflict resolution (fine for single-user personal
data). The only thing this plan needs to do *now* to keep that door open is make sure
Phase 1's `user_id` is stable and nothing else assumes a device-local-only identity.

## Open questions before building

- Email+password vs. magic-link vs. OAuth-only for Phase 1 — affects how much auth UI
  needs to be built vs. delegated to Supabase's hosted widgets.
- Single subscription tier, or a free "N AI generations/month" allowance before paywall?
- Which LLM/model — cost-per-call directly sets the per-user cap in Phase 3.
