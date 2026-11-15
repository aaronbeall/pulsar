import { describe, expect, it } from 'vitest';
import { isActive } from '../billing/subscription';
import { fakeSubscription, isFakeSubscription } from './accountTools';

const NOW = Date.UTC(2026, 10, 11);

describe('fakeSubscription', () => {
  it('keeps Pulsar AI on while active, cancelling or past due', () => {
    for (const state of ['active', 'cancelling', 'past_due'] as const) {
      expect(isActive(fakeSubscription('u1', state, 'month', NOW), NOW), state).toBe(true);
    }
  });

  it('turns it off once cancelled', () => {
    const row = fakeSubscription('u1', 'canceled', 'year', NOW)!;
    expect(row.status).toBe('canceled');
    expect(isActive(row, NOW)).toBe(false);
  });

  it('marks a cancelling subscription as ending at the period end', () => {
    const row = fakeSubscription('u1', 'cancelling', 'year', NOW)!;
    expect(row).toMatchObject({ status: 'active', cancelAtPeriodEnd: true, interval: 'year' });
    expect(row.currentPeriodEnd! - NOW).toBe(365 * 24 * 60 * 60 * 1000);
  });

  it('is nothing for "none"', () => {
    expect(fakeSubscription('u1', 'none', 'month', NOW)).toBeNull();
  });
});

describe('isFakeSubscription', () => {
  it('tells made-up subscriptions from real Stripe ones', () => {
    expect(isFakeSubscription(fakeSubscription('u1', 'active', 'month', NOW))).toBe(true);
    expect(isFakeSubscription({ stripeSubscriptionId: 'sub_1Qabc' })).toBe(false);
    expect(isFakeSubscription(null)).toBe(false);
  });
});
