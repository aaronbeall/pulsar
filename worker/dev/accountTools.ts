import { TIER_LIMITS, periodStart, type Tier } from '../ai/plans';
import { usageSummary } from '../ai/usage';
import type { SubscriptionRow } from '../billing/subscription';

// Account tools for tester accounts (Settings > Developer > Account tools in dev mode): reset
// or use up the AI allowance, and pretend to be subscribed, past due or cancelled. Pretend
// subscriptions are ordinary rows in the subscription table with made-up Stripe ids, so the
// rest of the server treats them exactly like real ones.

export const FAKE_CUSTOMER_ID = 'cus_tester';
const FAKE_SUBSCRIPTION_PREFIX = 'sub_tester_';

export type FakeSubscriptionState = 'none' | 'active' | 'cancelling' | 'past_due' | 'canceled';
export const FAKE_SUBSCRIPTION_STATES: FakeSubscriptionState[] = ['none', 'active', 'cancelling', 'past_due', 'canceled'];

/** Whether a stored subscription is one the Account tools made up (never a real Stripe one). */
export const isFakeSubscription = (row: Pick<SubscriptionRow, 'stripeSubscriptionId'> | null) =>
  Boolean(row?.stripeSubscriptionId.startsWith(FAKE_SUBSCRIPTION_PREFIX));

const DAY = 24 * 60 * 60 * 1000;

/** The subscription row for a pretend state, or null for "none". */
export function fakeSubscription(userId: string, state: FakeSubscriptionState, interval: 'month' | 'year', now = Date.now()): SubscriptionRow | null {
  if (state === 'none') return null;
  const periodEnd = now + (interval === 'year' ? 365 : 30) * DAY;
  return {
    userId,
    stripeCustomerId: FAKE_CUSTOMER_ID,
    stripeSubscriptionId: `${FAKE_SUBSCRIPTION_PREFIX}${userId}`,
    status: state === 'cancelling' ? 'active' : state,
    interval,
    // A cancelled subscription has run out: its period ended yesterday.
    currentPeriodEnd: state === 'canceled' ? now - DAY : periodEnd,
    cancelAtPeriodEnd: state === 'cancelling' || state === 'canceled',
  };
}

/** Forget every AI call the account has made, so the full allowance is back. */
export async function resetUsage(db: D1Database, userId: string) {
  await db.prepare(`DELETE FROM ai_usage WHERE userId = ?`).bind(userId).run();
}

/** Record free calls until the tier's plan and edit allowances for this period are used up. */
export async function useUpAllowance(db: D1Database, userId: string, tier: Tier, now = Date.now()) {
  const summary = await usageSummary(db, userId, tier, now);
  // Inside the counting period, even for a month that just started.
  const at = Math.max(now, periodStart(tier, now));
  const inserts: D1PreparedStatement[] = [];
  for (const kind of ['plan', 'edit'] as const) {
    const missing = Math.max(0, TIER_LIMITS[tier][kind] - summary[kind].used);
    for (let i = 0; i < missing; i++) {
      inserts.push(
        db
          .prepare(`INSERT INTO ai_usage (id, userId, kind, status, model, costMicros, createdAt) VALUES (?, ?, ?, 'done', 'tester', 0, ?)`)
          .bind(crypto.randomUUID(), userId, kind, at)
      );
    }
  }
  if (inserts.length) await db.batch(inserts);
}
