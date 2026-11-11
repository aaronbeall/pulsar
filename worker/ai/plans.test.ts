import { describe, expect, it } from 'vitest';
import { BURST_LIMIT, burstRetryAfter, burstWindowStart, costMicros, dayStart, denyReason, periodEnd, periodStart } from './plans';

describe('costMicros', () => {
  it('prices gpt-5-mini per token, with cached input at a tenth', () => {
    // 2,500 input (500 cached), 4,000 output: 2000*0.25 + 500*0.025 + 4000*2 = 8512.5 -> 8513
    expect(costMicros('gpt-5-mini', { inputTokens: 2500, cachedTokens: 500, outputTokens: 4000 })).toBe(8513);
  });

  it('charges unknown models at the highest known rate', () => {
    expect(costMicros('some-new-model', { inputTokens: 1000, cachedTokens: 0, outputTokens: 1000 })).toBe(5250);
  });
});

describe('periods', () => {
  const now = Date.UTC(2026, 10, 18, 15, 30);
  it('counts the free tier over the account lifetime', () => {
    expect(periodStart('free', now)).toBe(0);
    expect(periodEnd('free', now)).toBeNull();
  });

  it('counts Pulsar AI per calendar month', () => {
    expect(periodStart('pulsar_ai', now)).toBe(Date.UTC(2026, 10, 1));
    expect(periodEnd('pulsar_ai', now)).toBe(Date.UTC(2026, 11, 1));
    expect(periodEnd('pulsar_ai', Date.UTC(2026, 11, 31))).toBe(Date.UTC(2027, 0, 1));
  });

  it('finds the start of the UTC day', () => {
    expect(dayStart(now)).toBe(Date.UTC(2026, 10, 18));
  });
});

describe('burst limit', () => {
  const now = Date.UTC(2026, 10, 11, 12, 0, 0);
  const counts = { kindUsed: 0, inWindow: 0, editsToday: 0, costMicros: 0 };

  it('looks back a rolling window from now', () => {
    expect(burstWindowStart(now)).toBe(now - BURST_LIMIT.windowMs);
  });

  it('stops a call once the window is full, on any tier and kind', () => {
    const full = { ...counts, inWindow: BURST_LIMIT.calls };
    expect(denyReason('free', 'plan', { ...counts, inWindow: BURST_LIMIT.calls - 1 })).toBeNull();
    expect(denyReason('free', 'plan', full)).toBe('burst_limit');
    expect(denyReason('pulsar_ai', 'edit', full)).toBe('burst_limit');
  });

  it('explains a used-up allowance before the burst limit', () => {
    expect(denyReason('free', 'edit', { ...counts, kindUsed: 2, inWindow: BURST_LIMIT.calls })).toBe('allowance_used');
  });

  it('reports the daily edit limit for subscribers', () => {
    expect(denyReason('pulsar_ai', 'edit', { ...counts, editsToday: 40 })).toBe('daily_limit');
    expect(denyReason('pulsar_ai', 'plan', { ...counts, editsToday: 40 })).toBeNull();
  });

  it('waits until the oldest blocking call leaves the window', () => {
    // Ten calls, one a second, the oldest 60s ago: it ages out in windowMs - 60s.
    const times = Array.from({ length: BURST_LIMIT.calls }, (_, i) => now - 60_000 + i * 1000);
    expect(burstRetryAfter(times, now)).toBe((BURST_LIMIT.windowMs - 60_000) / 1000);
    expect(burstRetryAfter(times.slice(1), now)).toBe(0);
  });
});
