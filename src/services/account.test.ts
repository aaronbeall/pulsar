import { describe, expect, it } from 'vitest';
import { NO_ACCOUNT, allowanceLeft, parseAccountState } from './account';

describe('parseAccountState', () => {
  it('treats anything that is not the API answer as no sign-in', () => {
    expect(parseAccountState(null)).toEqual(NO_ACCOUNT);
    expect(parseAccountState('<html>')).toEqual(NO_ACCOUNT);
    expect(parseAccountState({ signInAvailable: false, user: null })).toEqual(NO_ACCOUNT);
  });

  it('reads a signed-out visitor', () => {
    expect(parseAccountState({ signInAvailable: true, user: null })).toEqual({ signInAvailable: true, hostedAI: false, billing: false, user: null, ai: null, subscription: null });
  });

  it('reads a signed-in user and fills missing fields', () => {
    expect(parseAccountState({ signInAvailable: true, user: { id: 'u1', name: 'Ada', email: 'a@b.c' } })).toEqual({
      signInAvailable: true,
      hostedAI: false,
      billing: false,
      user: { id: 'u1', name: 'Ada', email: 'a@b.c', image: null },
      ai: null,
      subscription: null,
    });
  });

  it('reads the hosted AI allowance and counts what is left', () => {
    const state = parseAccountState({
      signInAvailable: true,
      hostedAI: true,
      user: { id: 'u1', name: 'Ada', email: 'a@b.c' },
      ai: { tier: 'free', plan: { used: 1, limit: 1 }, edit: { used: 0, limit: 2 }, resetsAt: null },
    });
    expect(allowanceLeft(state, 'plan')).toBe(0);
    expect(allowanceLeft(state, 'edit')).toBe(2);
    expect(allowanceLeft({ ...state, hostedAI: false }, 'edit')).toBe(0);
    expect(allowanceLeft({ ...state, user: null }, 'edit')).toBe(0);
  });

  it('reads the subscription', () => {
    const state = parseAccountState({
      signInAvailable: true, billing: true, user: { id: 'u1' },
      subscription: { status: 'active', interval: 'year', currentPeriodEnd: 123, cancelAtPeriodEnd: true },
    });
    expect(state.billing).toBe(true);
    expect(state.subscription).toEqual({ status: 'active', interval: 'year', currentPeriodEnd: 123, cancelAtPeriodEnd: true });
  });
});
