import { Hono } from 'hono';
import { getTier } from '../ai/usage';
import { getSubscription, saveSubscription } from '../billing/subscription';
import { currentUser } from '../session';
import { isTester } from '../testers';
import { FAKE_SUBSCRIPTION_STATES, FakeSubscriptionState, fakeSubscription, isFakeSubscription, resetUsage, useUpAllowance } from './accountTools';

// /api/dev/*: the Account tools, for tester accounts only (TESTER_EMAILS). The app shows them
// in dev mode, but dev mode is only a client switch, so the server checks the account itself.

const error = (code: string, message: string, status: number) =>
  Response.json({ code, message }, { status, headers: { 'Cache-Control': 'no-store' } });

export const devRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

devRoutes.use('*', async (c, next) => {
  const user = await currentUser(c.env, c.req.raw);
  if (!user) return error('signin_required', 'Sign in first.', 401);
  if (!isTester(c.env, user.email)) return error('not_tester', 'Account tools are only for tester accounts.', 403);
  c.set('userId', user.id);
  await next();
});

devRoutes.post('/usage', async (c) => {
  const userId = c.get('userId');
  const { action } = (await c.req.json().catch(() => ({}))) as { action?: string };
  if (action === 'reset') await resetUsage(c.env.DB, userId);
  else if (action === 'use-up') await useUpAllowance(c.env.DB, userId, await getTier(c.env.DB, userId));
  else return error('bad_request', 'action must be "reset" or "use-up".', 400);
  return c.json({ ok: true });
});

devRoutes.post('/subscription', async (c) => {
  const userId = c.get('userId');
  const body = (await c.req.json().catch(() => ({}))) as { state?: string; interval?: string };
  const state = body.state as FakeSubscriptionState;
  if (!FAKE_SUBSCRIPTION_STATES.includes(state)) {
    return error('bad_request', `state must be one of ${FAKE_SUBSCRIPTION_STATES.join(', ')}.`, 400);
  }
  const existing = await getSubscription(c.env.DB, userId);
  // Never overwrite a real Stripe subscription with a pretend one.
  if (existing && !isFakeSubscription(existing)) {
    return error('real_subscription', 'This account has a real subscription. Manage it in Stripe instead.', 409);
  }
  const row = fakeSubscription(userId, state, body.interval === 'year' ? 'year' : 'month');
  if (row) await saveSubscription(c.env.DB, row);
  else await c.env.DB.prepare(`DELETE FROM subscription WHERE userId = ?`).bind(userId).run();
  return c.json({ ok: true });
});
