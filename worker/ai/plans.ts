// Hosted AI allowances and costs. The numbers come from the pricing plan (Pulsar AI is
// $3.99/month or $29.99/year); change them here and nowhere else.

export type AIKind = 'plan' | 'edit';
export type Tier = 'free' | 'pulsar_ai';

export interface TierLimits {
  /** 'lifetime': counted once per account. 'month': counted per calendar month (UTC). */
  period: 'lifetime' | 'month';
  plan: number;
  edit: number;
  /** Extra cap on edits per UTC day, so a script can't drain a month in an hour. */
  editsPerDay: number | null;
  /** Backstop on what one account may cost per period, in millionths of a dollar. */
  costCapMicros: number;
}

/**
 * Short-window cap on calls of either kind, for every tier, so a script or a stuck client
 * can't fire off a day's worth of requests in a minute. A person chatting or planning
 * stays well under it.
 */
export const BURST_LIMIT = { calls: 10, windowMs: 5 * 60_000 };

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: { period: 'lifetime', plan: 1, edit: 2, editsPerDay: null, costCapMicros: 100_000 },
  pulsar_ai: { period: 'month', plan: 20, edit: 200, editsPerDay: 40, costCapMicros: 2_000_000 },
};

/** OpenAI list prices in dollars per 1M tokens (input, cached input, output). */
const MODEL_PRICES: Record<string, { input: number; cached: number; output: number }> = {
  'gpt-5-mini': { input: 0.25, cached: 0.025, output: 2.0 },
  'gpt-5-nano': { input: 0.05, cached: 0.005, output: 0.4 },
};
// Unknown models are charged at the priciest known rate, so a model change can't silently
// slip past the cost caps.
const FALLBACK_PRICE = { input: 0.75, cached: 0.075, output: 4.5 };

export interface TokenUsage {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

/** Cost of one call in millionths of a dollar ($1 per 1M tokens = 1 micro per token). */
export function costMicros(model: string, usage: TokenUsage): number {
  const price = MODEL_PRICES[model] ?? FALLBACK_PRICE;
  const uncached = Math.max(0, usage.inputTokens - usage.cachedTokens);
  return Math.ceil(uncached * price.input + usage.cachedTokens * price.cached + usage.outputTokens * price.output);
}

/** What a call is assumed to cost when its real usage never arrived (e.g. the client hung up). */
export const ESTIMATED_COST_MICROS: Record<AIKind, number> = { plan: 9_000, edit: 6_000 };

/** Start of the counting period containing `now` (ms), for a tier. */
export function periodStart(tier: Tier, now: number): number {
  if (TIER_LIMITS[tier].period === 'lifetime') return 0;
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

/** When the current period ends, or null for a lifetime allowance. */
export function periodEnd(tier: Tier, now: number): number | null {
  if (TIER_LIMITS[tier].period === 'lifetime') return null;
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

export function dayStart(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Start of the rolling burst window ending at `now`. */
export function burstWindowStart(now: number): number {
  return now - BURST_LIMIT.windowMs;
}

/**
 * Seconds until a call can go through again after the burst limit trips: when the oldest
 * call in the window ages out. `callTimes` are the window's calls (ms), in any order.
 */
export function burstRetryAfter(callTimes: number[], now: number): number {
  if (callTimes.length < BURST_LIMIT.calls) return 0;
  const sorted = [...callTimes].sort((a, b) => b - a);
  // The call that has to age out is the limit-th newest one.
  const blocking = sorted[BURST_LIMIT.calls - 1];
  return Math.max(1, Math.ceil((blocking + BURST_LIMIT.windowMs - now) / 1000));
}

export interface UsageCounts {
  kindUsed: number;
  inWindow: number;
  editsToday: number;
  costMicros: number;
}

export type DenyReason = 'allowance_used' | 'burst_limit' | 'daily_limit' | 'cost_cap';

/** Which limit stops a call, checked in the order the app should explain them, or null. */
export function denyReason(tier: Tier, kind: AIKind, counts: UsageCounts): DenyReason | null {
  const limits = TIER_LIMITS[tier];
  if (counts.kindUsed >= limits[kind]) return 'allowance_used';
  if (counts.costMicros >= limits.costCapMicros) return 'cost_cap';
  if (counts.inWindow >= BURST_LIMIT.calls) return 'burst_limit';
  if (kind === 'edit' && limits.editsPerDay !== null && counts.editsToday >= limits.editsPerDay) return 'daily_limit';
  return null;
}
