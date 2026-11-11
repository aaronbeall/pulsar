import { describe, expect, it } from 'vitest';
import { isTester, testerEmails } from './testers';

describe('testerEmails', () => {
  it('splits on commas and whitespace and ignores case', () => {
    expect([...testerEmails(' A@x.com, b@y.com\nc@z.com,, ')]).toEqual(['a@x.com', 'b@y.com', 'c@z.com']);
  });

  it('is empty when unset', () => {
    expect(testerEmails(undefined).size).toBe(0);
  });
});

describe('isTester', () => {
  const env = { TESTER_EMAILS: 'tester@example.com' };
  it('matches listed emails in any case', () => {
    expect(isTester(env, 'Tester@Example.com')).toBe(true);
  });
  it('rejects everyone else', () => {
    expect(isTester(env, 'someone@example.com')).toBe(false);
    expect(isTester(env, null)).toBe(false);
    expect(isTester({ TESTER_EMAILS: '' }, '')).toBe(false);
  });
});
