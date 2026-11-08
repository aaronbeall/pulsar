import { describe, expect, it } from 'vitest';
import { fallbackFor } from './fallback';

describe('fallbackFor', () => {
  it('serves the app page for app routes', () => {
    expect(fallbackFor('/app/workout/abc')).toEqual({ kind: 'app-shell' });
    expect(fallbackFor('/app/routines/')).toEqual({ kind: 'app-shell' });
  });

  it('adds the trailing slash to /app', () => {
    expect(fallbackFor('/app')).toEqual({ kind: 'redirect', location: '/app/' });
  });

  it('404s missing files inside the app instead of returning HTML for them', () => {
    expect(fallbackFor('/app/assets/missing-123.js')).toEqual({ kind: 'not-found' });
  });

  it('404s unknown API paths', () => {
    expect(fallbackFor('/api/nope')).toEqual({ kind: 'not-found' });
  });

  it('sends other missing paths to the homepage', () => {
    expect(fallbackFor('/pulsar/')).toEqual({ kind: 'redirect', location: '/' });
    expect(fallbackFor('/old-page')).toEqual({ kind: 'redirect', location: '/' });
  });
});
