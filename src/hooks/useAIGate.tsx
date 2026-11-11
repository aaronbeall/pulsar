import { useCallback, useEffect, useRef, useState } from 'react';
import AIAccessDialog, { AIAccessAlternative } from '../components/AIAccessDialog';
import { AIKind, hasActiveAIProvider } from '../services/ai';
import { useAccount } from './useAccount';
import { useUrlModal } from './useUrlModal';
import { clearAIResume, peekAIResume, saveAIResume } from '../utils/aiResume';
import { CHECKOUT_POLL_MS, CHECKOUT_POLL_TRIES } from './useCheckoutReturn';

interface GateRequest {
  /** Which allowance the action spends: a new routine plan, or a chat edit. */
  kind?: AIKind;
  reason?: string;
  alternative?: AIAccessAlternative;
}

/** An action that continues by itself when the user comes back from unlocking AI. */
export interface AIResumeOptions {
  /** Names the action, unique on its page, e.g. "setup-plan" or "chat:<routine id>". */
  key: string;
  kind: AIKind;
  /** Runs the user's original tap again (usually the same `requireAI` call). Its inputs must
   *  survive the trip, e.g. kept with useSessionDraft. */
  onResume: () => void;
}

// After checkout, how long to wait for Stripe's webhook to show up in the account before
// leaving the user to tap again.
const CHECKOUT_WAIT_MS = CHECKOUT_POLL_MS * CHECKOUT_POLL_TRIES + 5_000;

/**
 * Gate an AI action behind AI access, paywall-style. `requireAI(action)` runs the action
 * right away when AI is available; otherwise it shows AIAccessDialog and runs the same
 * action as soon as access is in place, so the user never has to repeat what they started.
 * Access is the user's own key or a signed-in account with hosted allowance left for that
 * kind of action (services/ai/index.ts). Render `gate` once in the component.
 *
 * Signing in with Google or subscribing leaves the site, which loses the waiting action. Pass
 * `resume` and it continues anyway: the gate remembers it before leaving (utils/aiResume.ts),
 * and when the page loads again with the account able to run it, calls `onResume`. If the
 * account still can't (say its free allowance is already used), the gate simply opens again.
 */
export function useAIGate(resume?: AIResumeOptions) {
  // Loads the account (and its AI allowance) as soon as a gated screen mounts, so the check
  // below is current by the time the user taps.
  const account = useAccount();
  const [request, setRequest] = useState<GateRequest | null>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  // Open state lives in the URL (?ai=...) so Back closes the dialog. 'action' means an AI
  // action is waiting to continue; that can't survive a reload, so the param is dropped then.
  const modal = useUrlModal('ai', { isStale: (value) => value === 'action' && !pendingAction.current });

  const requireAI = useCallback((action: () => void, options: GateRequest & { kind: AIKind }) => {
    if (hasActiveAIProvider(options.kind)) {
      action();
      return;
    }
    pendingAction.current = action;
    setRequest(options);
    modal.open('action');
  }, [modal.open]);

  /** Open the dialog with nothing to continue afterwards (e.g. adding or changing a key from Settings). */
  const openKeySetup = useCallback((options: GateRequest = {}) => {
    pendingAction.current = null;
    setRequest(options);
    modal.open('key');
  }, [modal.open]);

  const close = useCallback(async () => {
    await modal.close();
    pendingAction.current = null;
    setRequest(null);
  }, [modal.close]);

  // Close first and wait for the URL to settle, so whatever the action does next (open
  // another modal, navigate) happens on top of the page rather than the dialog's entry.
  const handleUnlocked = useCallback(async () => {
    const action = pendingAction.current;
    await close();
    action?.();
  }, [close]);

  const resumeRef = useRef(resume);
  resumeRef.current = resume;
  const resumeKey = resume?.key;
  const mountedAt = useRef(Date.now());

  const handleLeave = useCallback((via: 'signin' | 'checkout') => {
    if (!resumeKey || !pendingAction.current) return;
    saveAIResume(sessionStorage, { key: resumeKey, path: window.location.pathname, via });
  }, [resumeKey]);

  // Back from sign-in or checkout: continue the remembered action once the account allows it.
  const { isLoading, user } = account;
  const tier = account.ai?.tier;
  useEffect(() => {
    if (!resumeKey || isLoading) return;
    const pending = peekAIResume(sessionStorage, resumeKey, window.location.pathname);
    if (!pending) return;
    if (!user) {
      // Sign-in didn't finish (cancelled at Google): nothing to continue.
      clearAIResume(sessionStorage);
      return;
    }
    const current = resumeRef.current!;
    if (pending.via === 'checkout' && !hasActiveAIProvider(current.kind)) {
      // The webhook may not have landed yet; useCheckoutReturn keeps refreshing the account,
      // and this runs again when the tier changes. Give up after a while.
      if (Date.now() - mountedAt.current > CHECKOUT_WAIT_MS) clearAIResume(sessionStorage);
      return;
    }
    clearAIResume(sessionStorage);
    current.onResume();
  }, [resumeKey, isLoading, user, tier]);

  const alternative = request?.alternative && {
    ...request.alternative,
    onClick: async () => {
      const run = request.alternative!.onClick;
      await close();
      run();
    },
  };

  const gate = (
    <AIAccessDialog
      isOpen={modal.isOpen}
      reason={request?.reason}
      kind={request?.kind}
      alternative={alternative}
      onUnlocked={handleUnlocked}
      onClose={close}
      onLeave={handleLeave}
    />
  );

  return { requireAI, openKeySetup, gate };
}
