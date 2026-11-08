import { describe, expect, it } from 'vitest';
import { signStripePayload, verifyStripeSignature } from './signature';

const secret = 'whsec_test';
const body = '{"id":"evt_1","type":"invoice.paid"}';
const now = 1_800_000_000;

describe('verifyStripeSignature', () => {
  it('accepts a correctly signed, recent payload', async () => {
    const header = await signStripePayload(body, secret, now);
    expect(await verifyStripeSignature(body, header, secret, now + 10)).toBe(true);
  });

  it('accepts any matching v1 while a secret is rolled', async () => {
    const good = (await signStripePayload(body, secret, now)).split(',')[1];
    expect(await verifyStripeSignature(body, `t=${now},v1=${'0'.repeat(64)},${good}`, secret, now)).toBe(true);
  });

  it('rejects a changed body, a wrong secret, an old timestamp or a missing header', async () => {
    const header = await signStripePayload(body, secret, now);
    expect(await verifyStripeSignature(body + ' ', header, secret, now)).toBe(false);
    expect(await verifyStripeSignature(body, header, 'whsec_other', now)).toBe(false);
    expect(await verifyStripeSignature(body, header, secret, now + 6 * 60)).toBe(false);
    expect(await verifyStripeSignature(body, null, secret, now)).toBe(false);
    expect(await verifyStripeSignature(body, `t=${now}`, secret, now)).toBe(false);
  });
});
