import { describe, expect, it } from 'vitest';
import { e2eEmailSignIn, originAllowed } from './auth';

describe('originAllowed', () => {
  it('always allows local development', () => {
    expect(originAllowed(undefined, 'http://localhost:8787')).toBe(true);
    expect(originAllowed('', 'http://127.0.0.1:9092')).toBe(true);
  });

  it('allows only listed origins elsewhere', () => {
    const list = 'https://pulsarworkouts.app, https://pulsar.example.workers.dev/';
    expect(originAllowed(list, 'https://pulsarworkouts.app')).toBe(true);
    expect(originAllowed(list, 'https://pulsar.example.workers.dev')).toBe(true);
    expect(originAllowed(list, 'https://pr-12-pulsar.example.workers.dev')).toBe(false);
    expect(originAllowed(undefined, 'https://pulsarworkouts.app')).toBe(false);
  });
});

describe('e2eEmailSignIn', () => {
  const on = { E2E_EMAIL_SIGNIN: '1' } as unknown as Env;
  it('is on only with the flag, on localhost', () => {
    expect(e2eEmailSignIn(on, 'http://localhost:8788')).toBe(true);
    expect(e2eEmailSignIn(on, 'http://127.0.0.1:8788')).toBe(true);
    expect(e2eEmailSignIn(on, 'https://pulsarworkouts.app')).toBe(false);
    expect(e2eEmailSignIn({} as Env, 'http://localhost:8788')).toBe(false);
  });
});
