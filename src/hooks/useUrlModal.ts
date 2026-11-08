import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, type NavigateOptions, type To } from 'react-router-dom';
import { getPushedModals, planClose, planOpen, type UrlModalKey, type UrlModalStep } from '../utils/urlModal';

export type { UrlModalKey } from '../utils/urlModal';

// A Back step (history.go) finishes asynchronously, on popstate. Anything that changes the
// URL right after closing a modal has to wait for it, or the push lands first and then gets
// popped. One app-wide slot, since there's one history.
let pendingBack: { promise: Promise<void>; keys: Set<string> } | null = null;

function goBack(navigate: ReturnType<typeof useNavigate>, steps: number, keys: string[]): Promise<void> {
  const promise = new Promise<void>(resolve => {
    const done = () => {
      window.removeEventListener('popstate', done);
      clearTimeout(timer);
      pendingBack = null;
      resolve();
    };
    // Fallback in case no popstate arrives (shouldn't happen: we only go back over entries we pushed).
    const timer = setTimeout(done, 1000);
    window.addEventListener('popstate', done);
  });
  pendingBack = { promise, keys: new Set(keys) };
  navigate(-steps);
  return promise;
}

async function settle() {
  while (pendingBack) await pendingBack.promise;
}

// Read the live URL and history state rather than the last render's: two modal calls in one
// handler, or one right after a Back step, would otherwise work from a stale copy.
const liveSearch = () => window.location.search;
const liveState = (): unknown => (window.history.state as { usr?: unknown } | null)?.usr;

export interface UrlModal {
  /** Whether the modal is open (with any value). */
  isOpen: boolean;
  /** The modal's context from the URL (e.g. a routine id), or null when closed. */
  value: string | null;
  /** Whether it's open for this particular value, for modals rendered once per item. */
  isOpenFor: (value: string) => boolean;
  /**
   * Open it, adding a history entry so Back closes it. Pass `replaces` to take the place of
   * another open modal instead (e.g. a chooser handing off to its confirmation).
   */
  open: (value?: string, options?: { replaces?: UrlModalKey }) => Promise<void>;
  /** Close it (and anything opened on top of it). Resolves once the URL has updated. */
  close: () => Promise<void>;
  /**
   * Navigate somewhere else from inside the modal: first unwinds the modal entries this page
   * pushed, so Back from the destination returns to the page, not to the modal.
   */
  leaveTo: (to: To, options?: NavigateOptions) => Promise<void>;
}

/**
 * Keep a modal's open state, and its context, in the URL query string (`?key=value`), so the
 * browser or Android Back button closes the modal instead of leaving the page, and a modal
 * can be deep-linked (e.g. `/workout/routine/:id?activity=1`).
 *
 * `isStale(value)` says the URL asks for the modal but the page can't show it, e.g. its
 * in-memory context is gone after a reload. The param is then dropped.
 */
export function useUrlModal(key: UrlModalKey, options: { isStale?: (value: string) => boolean } = {}): UrlModal {
  const location = useLocation();
  const navigate = useNavigate();
  const value = new URLSearchParams(location.search).get(key);
  const isOpen = value !== null;
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  const run = useCallback((step: UrlModalStep, keys: string[]): Promise<void> => {
    if (step.kind === 'back') return goBack(navigate, step.steps, keys);
    if (step.kind === 'navigate') {
      navigate(
        { pathname: pathnameRef.current, search: step.search, hash: window.location.hash },
        { replace: step.replace, state: step.state },
      );
    }
    return Promise.resolve();
  }, [navigate]);

  const open = useCallback(async (openValue = '1', openOptions: { replaces?: UrlModalKey } = {}) => {
    await settle();
    await run(planOpen(liveSearch(), liveState(), key, openValue, openOptions.replaces), []);
  }, [key, run]);

  const close = useCallback(async () => {
    if (pendingBack?.keys.has(key)) return pendingBack.promise;
    await settle();
    const pushed = getPushedModals(liveState());
    const step = planClose(liveSearch(), liveState(), key);
    await run(step, pushed.slice(pushed.lastIndexOf(key)));
  }, [key, run]);

  const leaveTo = useCallback(async (to: To, navOptions?: NavigateOptions) => {
    await settle();
    const pushed = getPushedModals(liveState());
    if (pushed.length) await goBack(navigate, pushed.length, pushed);
    navigate(to, navOptions);
  }, [navigate]);

  const isStale = isOpen && !!options.isStale?.(value);
  useEffect(() => {
    if (isStale) close();
  }, [isStale, close]);

  const isOpenFor = useCallback((v: string) => value === v, [value]);

  return { isOpen, value, isOpenFor, open, close, leaveTo };
}
