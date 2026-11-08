/**
 * What to serve for a request that matched no static file. Static files (the homepage,
 * app/index.html, assets, icons) are answered by Cloudflare before the Worker runs, so this
 * only sees missing paths:
 * - an app route (/app/workout/123) gets the app's page, so deep links and refreshes work;
 * - a missing file inside the app (/app/foo.js) is a real 404;
 * - anything else goes to the homepage.
 */
export type Fallback =
  | { kind: 'app-shell' }
  | { kind: 'not-found' }
  | { kind: 'redirect'; location: string };

const APP_PREFIX = '/app/';

export function fallbackFor(pathname: string): Fallback {
  if (pathname === '/app') return { kind: 'redirect', location: APP_PREFIX };
  if (pathname.startsWith(APP_PREFIX)) {
    const last = pathname.slice(pathname.lastIndexOf('/') + 1);
    return /\.[a-z0-9]+$/i.test(last) ? { kind: 'not-found' } : { kind: 'app-shell' };
  }
  if (pathname.startsWith('/api/')) return { kind: 'not-found' };
  return { kind: 'redirect', location: '/' };
}
