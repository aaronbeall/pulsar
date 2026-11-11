import { Hono } from 'hono';
import { currentUser } from '../session';
import { verifyStripeSignature } from './signature';
import { StripeError, createCheckoutSession, createPortalSession, retrieveSubscription } from './stripe';
import { isFakeSubscription } from '../dev/accountTools';
import { claimEvent, forgetEvent, getSubscription, isActive, rowFromStripe, saveSubscription, shouldReplace, userIdForSubscription } from './subscription';

// Pulsar AI subscriptions through Stripe Checkout with Managed Payments (Stripe is the
// merchant of record and handles sales tax and VAT), the Stripe Customer Portal for managing
// or cancelling, and a webhook that keeps the subscription table in step.

export const billingAvailable = (env: Env) =>
  Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_MONTHLY && env.STRIPE_PRICE_YEARLY);

const error = (code: string, message: string, status: number) => Response.json({ code, message }, { status });

/** A path on this site to come back to, never another site. */
const safePath = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : fallback;

export const billingRoutes = new Hono<{ Bindings: Env }>();

billingRoutes.post('/checkout', async (c) => {
  if (!billingAvailable(c.env)) return error('unavailable', 'Subscriptions are not available here.', 503);
  const user = await currentUser(c.env, c.req.raw);
  if (!user) return error('signin_required', 'Sign in to subscribe.', 401);
  const existing = await getSubscription(c.env.DB, user.id);
  if (isActive(existing)) return error('already_subscribed', 'You already have Pulsar AI.', 409);

  const body = (await c.req.json().catch(() => ({}))) as { interval?: string; returnTo?: string };
  const price = body.interval === 'year' ? c.env.STRIPE_PRICE_YEARLY : c.env.STRIPE_PRICE_MONTHLY;
  const origin = new URL(c.req.url).origin;
  const back = safePath(body.returnTo, '/app/settings');
  try {
    const session = await createCheckoutSession(c.env, {
      mode: 'subscription',
      line_items: { 0: { price, quantity: 1 } },
      managed_payments: { enabled: true },
      client_reference_id: user.id,
      // Reuse the Stripe customer from an earlier subscription, so their history stays together.
      ...(existing && !isFakeSubscription(existing) ? { customer: existing.stripeCustomerId } : { customer_email: user.email }),
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
      success_url: `${origin}${back}${back.includes('?') ? '&' : '?'}subscribed=1`,
      cancel_url: `${origin}${back}`,
    });
    return c.json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout failed', e);
    return error('stripe', e instanceof StripeError ? e.message : 'Could not start checkout.', 502);
  }
});

billingRoutes.post('/portal', async (c) => {
  if (!billingAvailable(c.env)) return error('unavailable', 'Subscriptions are not available here.', 503);
  const user = await currentUser(c.env, c.req.raw);
  if (!user) return error('signin_required', 'Sign in to manage your subscription.', 401);
  const sub = await getSubscription(c.env.DB, user.id);
  if (!sub) return error('no_subscription', "You don't have a subscription.", 404);
  if (isFakeSubscription(sub)) {
    return error('pretend_subscription', 'This is a pretend subscription from Account tools. Change it there.', 409);
  }
  try {
    const portal = await createPortalSession(c.env, sub.stripeCustomerId, `${new URL(c.req.url).origin}/app/settings`);
    return c.json({ url: portal.url });
  } catch (e) {
    console.error('Stripe portal failed', e);
    return error('stripe', e instanceof StripeError ? e.message : 'Could not open the billing portal.', 502);
  }
});

type StripeEvent = { id: string; type: string; data: { object: Record<string, any> } };

/** Fetch the subscription fresh from Stripe (events can arrive out of order) and store it. */
async function syncSubscription(env: Env, subscriptionId: string, knownUserId?: string | null) {
  const sub = await retrieveSubscription(env, subscriptionId);
  const userId = knownUserId || sub.metadata?.userId || (await userIdForSubscription(env.DB, subscriptionId));
  const row = rowFromStripe(sub, userId);
  if (!row) {
    console.warn('Stripe subscription with no Pulsar account', subscriptionId);
    return;
  }
  const existing = await getSubscription(env.DB, row.userId);
  if (!shouldReplace(existing, row)) {
    console.warn('Ignoring an inactive older subscription; the account has a live one', subscriptionId);
    return;
  }
  await saveSubscription(env.DB, row);
}

billingRoutes.post('/webhook', async (c) => {
  const raw = await c.req.text();
  if (!(await verifyStripeSignature(raw, c.req.header('Stripe-Signature'), c.env.STRIPE_WEBHOOK_SECRET))) {
    return error('bad_signature', 'Invalid signature.', 400);
  }
  const event = JSON.parse(raw) as StripeEvent;
  if (!(await claimEvent(c.env.DB, event.id))) return c.json({ received: true, duplicate: true });

  try {
    const obj = event.data.object;
    switch (event.type) {
      case 'checkout.session.completed':
        if (obj.mode === 'subscription' && obj.subscription) {
          await syncSubscription(c.env, String(obj.subscription), obj.client_reference_id);
        }
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
        await syncSubscription(c.env, String(obj.id));
        break;
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const subId = obj.subscription ?? obj.parent?.subscription_details?.subscription;
        if (subId) await syncSubscription(c.env, String(typeof subId === 'string' ? subId : subId.id));
        break;
      }
      default:
        break; // not one we act on
    }
  } catch (e) {
    // Let Stripe retry: forget the event so the retry isn't skipped as a duplicate.
    await forgetEvent(c.env.DB, event.id);
    console.error('Stripe webhook failed', event.type, e);
    return error('retry', 'Could not process the event.', 500);
  }
  return c.json({ received: true });
});
