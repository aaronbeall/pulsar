// Dev mode: unlocks testing-only features (see DEV-FEATURES.md) that regular users never see.
//
// It's always on under `npm run dev`. In any build (production, PR previews) it's turned on
// by opening the app with `?dev=1` and off again with `?dev=0`; the choice is remembered in
// localStorage, so it survives reloads and the installed PWA, and is per device.

export const DEV_MODE_STORAGE_KEY = 'pulsar:devMode';
export const DEV_MODE_PARAM = 'dev';

/**
 * Reads the `dev` query param from a URL search string: true for `?dev`, `?dev=1`,
 * `?dev=true` or `?dev=on`, false for `?dev=0`, `?dev=false` or `?dev=off`, and null when
 * the param is absent or unrecognised (leave the stored setting alone).
 */
export function parseDevParam(search: string): boolean | null {
  const params = new URLSearchParams(search);
  if (!params.has(DEV_MODE_PARAM)) return null;
  const value = (params.get(DEV_MODE_PARAM) || '').trim().toLowerCase();
  if (['', '1', 'true', 'on', 'yes'].includes(value)) return true;
  if (['0', 'false', 'off', 'no'].includes(value)) return false;
  return null;
}

/** Removes the `dev` param from a URL search string, keeping any others. */
export function stripDevParam(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(DEV_MODE_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

function readStored(): boolean {
  try {
    return localStorage.getItem(DEV_MODE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Turns dev mode on or off on this device. Takes effect on the next page load. */
export function setDevMode(on: boolean) {
  try {
    if (on) localStorage.setItem(DEV_MODE_STORAGE_KEY, '1');
    else localStorage.removeItem(DEV_MODE_STORAGE_KEY);
  } catch {
    // Storage blocked: dev mode just stays at its default.
  }
}

/**
 * Applies a `?dev=` param from the current URL, if there is one, and removes it from the
 * address bar. Call once at startup, before the app renders.
 */
export function initDevMode() {
  if (typeof window === 'undefined') return;
  const requested = parseDevParam(window.location.search);
  if (requested === null) return;
  setDevMode(requested);
  const { pathname, search, hash } = window.location;
  window.history.replaceState(window.history.state, '', `${pathname}${stripDevParam(search)}${hash}`);
}

/** True when testing-only features should be shown. */
export function isDevMode(): boolean {
  if (import.meta.env?.DEV) return true;
  return readStored();
}
