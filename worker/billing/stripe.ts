// The few Stripe REST calls Pulsar makes, with plain fetch (form-encoded, as Stripe expects).
// STRIPE_API_BASE is only for local testing against a fake Stripe.

export class StripeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Pinned so Stripe's responses don't change shape under us. Managed Payments needs
// 2025-03-31.basil or later; subscription.ts reads the period end the basil way.
export const STRIPE_API_VERSION = '2025-03-31.basil';

const apiBase = (env: Env) => (env as { STRIPE_API_BASE?: string }).STRIPE_API_BASE || 'https://api.stripe.com';

/** Flattens nested params into Stripe's form style: a[b][0][c]=v. */
export function toForm(params: Record<string, unknown>, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object') toForm(value as Record<string, unknown>, name, out);
    else out.append(name, String(value));
  }
  return out;
}

async function stripe<T>(env: Env, method: 'GET' | 'POST', path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${apiBase(env)}/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Stripe-Version': STRIPE_API_VERSION,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' && params ? toForm(params).toString() : undefined,
  });
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) throw new StripeError(res.status, body.error?.message || `Stripe request failed (${res.status})`);
  return body as T;
}

export function createCheckoutSession(env: Env, params: Record<string, unknown>) {
  return stripe<{ id: string; url: string }>(env, 'POST', 'checkout/sessions', params);
}

export function createPortalSession(env: Env, customer: string, returnUrl: string) {
  return stripe<{ url: string }>(env, 'POST', 'billing_portal/sessions', { customer, return_url: returnUrl });
}

export function retrieveSubscription(env: Env, id: string) {
  return stripe<Parameters<typeof import('./subscription').rowFromStripe>[0]>(env, 'GET', `subscriptions/${encodeURIComponent(id)}`);
}
