import { describe, expect, it } from 'vitest';
import { NO_ACCOUNT, parseAccountState } from './account';

describe('parseAccountState', () => {
  it('treats anything that is not the API answer as no sign-in', () => {
    expect(parseAccountState(null)).toEqual(NO_ACCOUNT);
    expect(parseAccountState('<html>')).toEqual(NO_ACCOUNT);
    expect(parseAccountState({ signInAvailable: false, user: null })).toEqual(NO_ACCOUNT);
  });

  it('reads a signed-out visitor', () => {
    expect(parseAccountState({ signInAvailable: true, user: null })).toEqual({ signInAvailable: true, user: null });
  });

  it('reads a signed-in user and fills missing fields', () => {
    expect(parseAccountState({ signInAvailable: true, user: { id: 'u1', name: 'Ada', email: 'a@b.c' } })).toEqual({
      signInAvailable: true,
      user: { id: 'u1', name: 'Ada', email: 'a@b.c', image: null },
    });
  });
});
