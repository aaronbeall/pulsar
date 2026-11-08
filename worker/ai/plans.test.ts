import { describe, expect, it } from 'vitest';
import { costMicros, dayStart, periodEnd, periodStart } from './plans';

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
