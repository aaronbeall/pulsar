import { describe, expect, it } from 'vitest';
import { isActive, rowFromStripe } from './subscription';

const now = Date.UTC(2026, 10, 18);

describe('rowFromStripe', () => {
  it('reads the period end from the subscription item (API 2025-03-31.basil and later)', () => {
    const row = rowFromStripe({
      id: 'sub_1', customer: 'cus_1', status: 'active', cancel_at_period_end: true,
      metadata: { userId: 'u1' },
      items: { data: [{ current_period_end: 1_800_000_000, price: { recurring: { interval: 'year' } } }] },
    });
    expect(row).toEqual({
      userId: 'u1', stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1', status: 'active',
      interval: 'year', currentPeriodEnd: 1_800_000_000_000, cancelAtPeriodEnd: true,
    });
  });

  it('falls back to the older top-level period end and a known user id', () => {
    const row = rowFromStripe({ id: 'sub_2', customer: { id: 'cus_2' }, status: 'past_due', current_period_end: 1_700_000_000 }, 'u2');
    expect(row?.userId).toBe('u2');
    expect(row?.stripeCustomerId).toBe('cus_2');
    expect(row?.currentPeriodEnd).toBe(1_700_000_000_000);
  });

  it('gives up without a user to attach it to', () => {
    expect(rowFromStripe({ id: 'sub_3', customer: 'cus_3', status: 'active' })).toBeNull();
  });
});

describe('isActive', () => {
  const day = 24 * 60 * 60 * 1000;
  it('keeps Pulsar AI on for active, trialing and past-due subscriptions in their period', () => {
    for (const status of ['active', 'trialing', 'past_due']) {
      expect(isActive({ status, currentPeriodEnd: now + day }, now)).toBe(true);
    }
  });

  it('turns it off when cancelled, unpaid, or a day past the period end', () => {
    expect(isActive({ status: 'canceled', currentPeriodEnd: now + day }, now)).toBe(false);
    expect(isActive({ status: 'unpaid', currentPeriodEnd: now + day }, now)).toBe(false);
    expect(isActive({ status: 'active', currentPeriodEnd: now - 2 * day }, now)).toBe(false);
    expect(isActive({ status: 'active', currentPeriodEnd: now - day / 2 }, now)).toBe(true);
    expect(isActive(null, now)).toBe(false);
  });
});
