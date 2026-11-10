import { Hono } from 'hono';
import { createAuth, signInAvailable } from './auth';
import { aiRoutes, aiStatus } from './ai/routes';
import { billingAvailable, billingRoutes } from './billing/routes';
import { getSubscription } from './billing/subscription';
import { currentUser } from './session';
import { fallbackFor } from './fallback';

// The site's Worker. Cloudflare serves files from dist/ before this runs, so it only sees
// the API (/api/...) and paths with no matching file (see fallback.ts).
const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', (c) => c.json({ ok: true }));

// Better Auth's endpoints: Google sign-in and its callback, session, sign-out, delete-user.
app.on(['GET', 'POST'], '/api/auth/*', (c) => {
  return createAuth(c.env, new URL(c.req.url).origin).handler(c.req.raw);
});

// What the app needs to know about the visitor: whether sign-in is offered here, and who
// they are if signed in. Never cached, since it changes on sign-in and sign-out.
app.get('/api/me', async (c) => {
  c.header('Cache-Control', 'no-store');
  const origin = new URL(c.req.url).origin;
  if (!signInAvailable(c.env, origin)) return c.json({ signInAvailable: false, user: null });
  const user = await currentUser(c.env, c.req.raw);
  const ai = user ? await aiStatus(c.env, user.id) : null;
  const sub = user ? await getSubscription(c.env.DB, user.id) : null;
  const subscription = sub
    ? { status: sub.status, interval: sub.interval, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd }
    : null;
  return c.json({
    signInAvailable: true,
    hostedAI: Boolean(c.env.OPENAI_API_KEY),
    billing: billingAvailable(c.env),
    user,
    ai,
    subscription,
  });
});

app.route('/api/ai', aiRoutes);
app.route('/api/billing', billingRoutes);

app.notFound(async (c) => {
  const url = new URL(c.req.url);
  const fallback = fallbackFor(url.pathname);
  switch (fallback.kind) {
    case 'app-shell': {
      // Serve app/index.html at the requested URL, keeping its status and headers.
      const shell = await c.env.ASSETS.fetch(new URL('/app/', url));
      return new Response(shell.body, shell);
    }
    case 'redirect':
      return c.redirect(new URL(fallback.location, url).toString(), 302);
    case 'not-found':
      return c.text('Not found', 404);
  }
});

export default app satisfies ExportedHandler<Env>;
