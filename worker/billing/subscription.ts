// Pulsar AI subscriptions as Pulsar stores them, mapped from Stripe's objects. Stripe is the
// source of truth; the webhook keeps the `subscription` table in step.

export interface SubscriptionRow {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  interval: string | null;
  currentPeriodEnd: number | null; // ms
  cancelAtPeriodEnd: boolean;
}

/** Statuses that keep Pulsar AI on. past_due is a grace period while Stripe retries the card. */
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

export function isActive(row: Pick<SubscriptionRow, 'status' | 'currentPeriodEnd'> | null, now = Date.now()): boolean {
  if (!row || !ACTIVE_STATUSES.has(row.status)) return false;
  // A day of slack past the period end, so a renewal webhook arriving late doesn't cut anyone off.
  return row.currentPeriodEnd === null || row.currentPeriodEnd + 24 * 60 * 60 * 1000 > now;
}

/**
 * Whether a subscription from Stripe should replace the account's stored one. Events for an
 * older subscription can still arrive after a newer one started (a late retry, or two
 * checkouts finished in two tabs), and an ended old one must not switch off the live one.
 */
export function shouldReplace(existing: SubscriptionRow | null, incoming: SubscriptionRow, now = Date.now()): boolean {
  if (!existing || existing.stripeSubscriptionId === incoming.stripeSubscriptionId) return true;
  return isActive(incoming, now) || !isActive(existing, now);
}

/**
 * Whether the account can be deleted without leaving a subscription billing. Allowed once
 * it's cancelled: it then ends at the period end, and nothing more is charged.
 */
export function canDeleteAccount(row: SubscriptionRow | null, now = Date.now()): boolean {
  return !isActive(row, now) || row!.cancelAtPeriodEnd;
}

type StripeSubscription = {
  id: string;
  customer: string | { id: string };
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ current_period_end?: number; price?: { recurring?: { interval?: string } } }> };
};

/**
 * Map a Stripe subscription to a row. The period end moved from the subscription to its items
 * in API version 2025-03-31.basil, so read either. `userId` comes from the subscription's
 * metadata (set at checkout) unless the caller already knows it.
 */
export function rowFromStripe(sub: StripeSubscription, knownUserId?: string | null): SubscriptionRow | null {
  const userId = knownUserId || sub.metadata?.userId;
  if (!userId || !sub.id) return null;
  const item = sub.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  return {
    userId,
    stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    interval: item?.price?.recurring?.interval ?? null,
    currentPeriodEnd: typeof periodEnd === 'number' ? periodEnd * 1000 : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  };
}

export async function getSubscription(db: D1Database, userId: string): Promise<SubscriptionRow | null> {
  const row = await db.prepare(`SELECT * FROM subscription WHERE userId = ?`).bind(userId).first<Record<string, unknown>>();
  if (!row) return null;
  return {
    userId: row.userId as string,
    stripeCustomerId: row.stripeCustomerId as string,
    stripeSubscriptionId: row.stripeSubscriptionId as string,
    status: row.status as string,
    interval: (row.interval as string | null) ?? null,
    currentPeriodEnd: (row.currentPeriodEnd as number | null) ?? null,
    cancelAtPeriodEnd: Boolean(row.cancelAtPeriodEnd),
  };
}

export async function userIdForSubscription(db: D1Database, stripeSubscriptionId: string): Promise<string | null> {
  const row = await db.prepare(`SELECT userId FROM subscription WHERE stripeSubscriptionId = ?`).bind(stripeSubscriptionId).first<{ userId: string }>();
  return row?.userId ?? null;
}

export async function saveSubscription(db: D1Database, row: SubscriptionRow, now = Date.now()) {
  // One subscription per account: a new one (say after cancelling and resubscribing) replaces it.
  await db
    .prepare(
      `INSERT INTO subscription (userId, stripeCustomerId, stripeSubscriptionId, status, interval, currentPeriodEnd, cancelAtPeriodEnd, updatedAt)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       ON CONFLICT (userId) DO UPDATE SET
         stripeCustomerId = ?2, stripeSubscriptionId = ?3, status = ?4, interval = ?5,
         currentPeriodEnd = ?6, cancelAtPeriodEnd = ?7, updatedAt = ?8`
    )
    .bind(row.userId, row.stripeCustomerId, row.stripeSubscriptionId, row.status, row.interval, row.currentPeriodEnd, row.cancelAtPeriodEnd ? 1 : 0, now)
    .run();
}

/** Record an event id; false if it was already handled. */
export async function claimEvent(db: D1Database, eventId: string, now = Date.now()): Promise<boolean> {
  const result = await db.prepare(`INSERT OR IGNORE INTO stripe_event (id, createdAt) VALUES (?, ?)`).bind(eventId, now).run();
  return result.meta.changes === 1;
}

export async function forgetEvent(db: D1Database, eventId: string) {
  await db.prepare(`DELETE FROM stripe_event WHERE id = ?`).bind(eventId).run();
}
