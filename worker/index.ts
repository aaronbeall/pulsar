import { Hono } from 'hono';
import { createAuth, signInAvailable } from './auth';
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
  const auth = createAuth(c.env, origin);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const user = session
    ? { id: session.user.id, name: session.user.name, email: session.user.email, image: session.user.image ?? null }
    : null;
  return c.json({ signInAvailable: true, user });
});

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
