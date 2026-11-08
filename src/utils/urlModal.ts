// Pure helpers behind hooks/useUrlModal.ts: how opening and closing a modal changes the
// URL's query string and the history entry's state. Kept free of React and the router so
// they can be unit-tested.

/**
 * Every query param that opens a modal, dialog, drawer or sheet. One list so two modals
 * can't claim the same param, and so a param's meaning is easy to look up. The value of the
 * param is the modal's context (which routine, day, exercise...), or '1' when there is none.
 */
export type UrlModalKey =
  | 'menu'            // App: the side menu drawer
  | 'ai'              // useAIGate: the AI access dialog ('action' continues an action, 'key' is plain key setup)
  | 'activity'        // WorkoutRoutine: the Activity drawer
  | 'switchRoutine'   // Switch active routine dialog (value: routine id)
  | 'deactivate'      // WorkoutRoutine: deactivate the only active routine
  | 'deleteRoutine'   // Delete routine confirmation (value: routine id)
  | 'export'          // Export routine dialog (value: routine id)
  | 'exercise'        // Exercise details dialog (value: exercise id)
  | 'review'          // RoutineChat: AI change review (value: change id)
  | 'saveAs'          // RoutineEditor: Save As dialog
  | 'removeAll'       // RoutineEditor: remove all exercises from a day (value: day)
  | 'paste'           // RoutineEditor: overwrite a day with the copied day (value: day)
  | 'dayTemplates'    // RoutineEditor: pick a day template (value: day)
  | 'applyTemplate'   // RoutineEditor: overwrite a day with the picked template (value: day)
  | 'finish'          // WorkoutSession: finish workout early confirmation
  | 'celebrate'       // WorkoutSession: the workout complete celebration
  | 'templates'       // WorkoutSetup: create a routine from a template
  | 'restore';        // Settings: restore backup confirmation

/** Key in the history entry's state listing the modals this app pushed, oldest first. */
export const URL_MODAL_STATE_KEY = 'urlModals';

/** The modals that were opened by pushing a history entry, oldest first. */
export function getPushedModals(state: unknown): string[] {
  if (!state || typeof state !== 'object') return [];
  const list = (state as Record<string, unknown>)[URL_MODAL_STATE_KEY];
  return Array.isArray(list) ? list.filter((k): k is string => typeof k === 'string') : [];
}

function withPushedModals(state: unknown, pushed: string[]): Record<string, unknown> {
  const base = state && typeof state === 'object' ? { ...(state as Record<string, unknown>) } : {};
  if (pushed.length) base[URL_MODAL_STATE_KEY] = pushed;
  else delete base[URL_MODAL_STATE_KEY];
  return base;
}

function toSearch(params: URLSearchParams): string {
  const s = params.toString();
  return s ? `?${s}` : '';
}

export type UrlModalStep =
  | { kind: 'none' }
  | { kind: 'navigate'; search: string; state: Record<string, unknown>; replace: boolean }
  | { kind: 'back'; steps: number };

/**
 * Open `key` with `value`. Normally pushes a history entry, so Back closes it. With
 * `replaces`, the modal takes the place of that one (same history entry), e.g. a chooser
 * handing off to its confirmation. Opening a modal that's already open with another value
 * swaps the value in place.
 */
export function planOpen(search: string, state: unknown, key: string, value: string, replaces?: string): UrlModalStep {
  const params = new URLSearchParams(search);
  const current = params.get(key);
  if (current === value && (!replaces || !params.has(replaces))) return { kind: 'none' };
  const pushed = getPushedModals(state);
  params.set(key, value);

  if (replaces && params.has(replaces)) {
    params.delete(replaces);
    const nextPushed = pushed.includes(replaces) ? pushed.map(k => (k === replaces ? key : k)) : pushed.filter(k => k !== key);
    return { kind: 'navigate', search: toSearch(params), state: withPushedModals(state, nextPushed), replace: true };
  }
  if (current !== null) {
    return { kind: 'navigate', search: toSearch(params), state: withPushedModals(state, pushed), replace: true };
  }
  return { kind: 'navigate', search: toSearch(params), state: withPushedModals(state, [...pushed, key]), replace: false };
}

/**
 * Close `key`. If the app pushed it, go back to the entry before it (closing anything
 * opened on top of it too), so the forward history stays clean and Back doesn't reopen
 * it. If it arrived with the URL (a deep link like ?activity=1), drop the param in place.
 */
export function planClose(search: string, state: unknown, key: string): UrlModalStep {
  const params = new URLSearchParams(search);
  if (!params.has(key)) return { kind: 'none' };
  const pushed = getPushedModals(state);
  const idx = pushed.lastIndexOf(key);
  if (idx >= 0) return { kind: 'back', steps: pushed.length - idx };
  params.delete(key);
  return { kind: 'navigate', search: toSearch(params), state: withPushedModals(state, pushed), replace: true };
}

/** How many history entries to go back to undo every modal the app pushed on this page. */
export function stepsToLeaveModals(state: unknown): number {
  return getPushedModals(state).length;
}
