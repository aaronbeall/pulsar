import { fallbackFor } from './fallback';

// The site's Worker. Cloudflare serves files from dist/ before this runs, so this only
// handles the API and paths with no matching file (see fallback.ts).
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true });
    }

    const fallback = fallbackFor(url.pathname);
    switch (fallback.kind) {
      case 'app-shell': {
        // Serve app/index.html at the requested URL, keeping its status and headers.
        const shell = await env.ASSETS.fetch(new URL('/app/', url));
        return new Response(shell.body, shell);
      }
      case 'redirect':
        return Response.redirect(new URL(fallback.location, url).toString(), 302);
      case 'not-found':
        return new Response('Not found', { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;
