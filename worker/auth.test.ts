import { describe, expect, it } from 'vitest';
import { originAllowed } from './auth';

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

  it('matches wildcard entries one host label at a time', () => {
    const list = 'https://staging.pulsarworkouts.app, https://*.example.workers.dev';
    expect(originAllowed(list, 'https://staging.pulsarworkouts.app')).toBe(true);
    expect(originAllowed(list, 'https://pr-12-pulsar.example.workers.dev')).toBe(true);
    expect(originAllowed(list, 'https://pulsarworkouts.app')).toBe(false);
    // `*` never spans a dot, so another domain can't sneak in ahead of the suffix.
    expect(originAllowed(list, 'https://evil.com.example.workers.dev')).toBe(false);
    expect(originAllowed(list, 'https://x.example.workers.dev.evil.com')).toBe(false);
    expect(originAllowed(list, 'http://pr-12-pulsar.example.workers.dev')).toBe(false);
  });
});
