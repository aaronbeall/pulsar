import { getSubscription, isActive } from '../billing/subscription';
import { AIKind, ESTIMATED_COST_MICROS, TIER_LIMITS, Tier, TokenUsage, costMicros, dayStart, periodEnd, periodStart } from './plans';

// Allowance bookkeeping in D1 (table ai_usage, migration 0002). A call is reserved before
// OpenAI is called and settled after, so concurrent requests can't overspend: the reserve
// is a single INSERT ... SELECT whose WHERE re-checks every limit, and D1 runs statements
// one at a time.

export interface UsageSummary {
  tier: Tier;
  plan: { used: number; limit: number };
  edit: { used: number; limit: number };
  /** When the counts reset (ms), or null for the free tier's one-time allowance. */
  resetsAt: number | null;
}

export type DenyReason = 'allowance_used' | 'daily_limit' | 'cost_cap';

/** The account's tier: Pulsar AI while its subscription is active, otherwise free. */
export async function getTier(db: D1Database, userId: string): Promise<Tier> {
  return isActive(await getSubscription(db, userId)) ? 'pulsar_ai' : 'free';
}

export async function usageSummary(db: D1Database, userId: string, tier: Tier, now = Date.now()): Promise<UsageSummary> {
  const limits = TIER_LIMITS[tier];
  const row = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN kind = 'plan' THEN 1 ELSE 0 END) AS plans,
         SUM(CASE WHEN kind = 'edit' THEN 1 ELSE 0 END) AS edits
       FROM ai_usage WHERE userId = ? AND status != 'failed' AND createdAt >= ?`
    )
    .bind(userId, periodStart(tier, now))
    .first<{ plans: number | null; edits: number | null }>();
  return {
    tier,
    plan: { used: row?.plans ?? 0, limit: limits.plan },
    edit: { used: row?.edits ?? 0, limit: limits.edit },
    resetsAt: periodEnd(tier, now),
  };
}

/** Reserve one call. Returns the usage row id, or why the account can't make the call. */
export async function reserve(
  db: D1Database,
  userId: string,
  tier: Tier,
  kind: AIKind,
  model: string,
  now = Date.now()
): Promise<{ id: string } | { denied: DenyReason }> {
  const limits = TIER_LIMITS[tier];
  const since = periodStart(tier, now);
  const today = dayStart(now);
  const id = crypto.randomUUID();
  const result = await db
    .prepare(
      `INSERT INTO ai_usage (id, userId, kind, status, model, costMicros, createdAt)
       SELECT ?1, ?2, ?3, 'reserved', ?4, ?5, ?6
       WHERE (SELECT COUNT(*) FROM ai_usage WHERE userId = ?2 AND kind = ?3 AND status != 'failed' AND createdAt >= ?7) < ?8
         AND (?9 IS NULL OR (SELECT COUNT(*) FROM ai_usage WHERE userId = ?2 AND kind = 'edit' AND ?3 = 'edit' AND status != 'failed' AND createdAt >= ?10) < ?9)
         AND (SELECT COALESCE(SUM(costMicros), 0) FROM ai_usage WHERE userId = ?2 AND status != 'failed' AND createdAt >= ?7) < ?11`
    )
    .bind(
      id, userId, kind, model, ESTIMATED_COST_MICROS[kind], now,
      since, limits[kind],
      kind === 'edit' ? limits.editsPerDay : null, today,
      limits.costCapMicros
    )
    .run();
  if (result.meta.changes === 1) return { id };

  // Refused: work out which limit did it, for the message the app shows.
  const summary = await usageSummary(db, userId, tier, now);
  if (summary[kind].used >= summary[kind].limit) return { denied: 'allowance_used' };
  if (kind === 'edit' && limits.editsPerDay !== null) return { denied: 'daily_limit' };
  return { denied: 'cost_cap' };
}

/** Record what the call really used. Without usage (the reply was cut off) the estimate stays. */
export async function settle(db: D1Database, id: string, model: string, usage: TokenUsage | null) {
  if (!usage) {
    await db.prepare(`UPDATE ai_usage SET status = 'done' WHERE id = ?`).bind(id).run();
    return;
  }
  await db
    .prepare(`UPDATE ai_usage SET status = 'done', inputTokens = ?, cachedTokens = ?, outputTokens = ?, costMicros = ? WHERE id = ?`)
    .bind(usage.inputTokens, usage.cachedTokens, usage.outputTokens, costMicros(model, usage), id)
    .run();
}

/** The call never produced a reply: give the allowance back. */
export async function release(db: D1Database, id: string) {
  await db.prepare(`UPDATE ai_usage SET status = 'failed', costMicros = 0 WHERE id = ?`).bind(id).run();
}

/** Total hosted AI spend so far today (UTC), across all accounts, in micros. */
export async function spentToday(db: D1Database, now = Date.now()): Promise<number> {
  const row = await db
    .prepare(`SELECT COALESCE(SUM(costMicros), 0) AS spent FROM ai_usage WHERE status != 'failed' AND createdAt >= ?`)
    .bind(dayStart(now))
    .first<{ spent: number }>();
  return row?.spent ?? 0;
}
