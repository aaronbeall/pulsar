import { useCallback, useRef, useState } from 'react';
import AIAccessDialog, { AIAccessAlternative } from '../components/AIAccessDialog';
import { AIKind, hasActiveAIProvider } from '../services/ai';
import { useAccount } from './useAccount';
import { useUrlModal } from './useUrlModal';

interface GateRequest {
  /** Which allowance the action spends: a new routine plan, or a chat edit. */
  kind?: AIKind;
  reason?: string;
  alternative?: AIAccessAlternative;
}

/**
 * Gate an AI action behind AI access, paywall-style. `requireAI(action)` runs the action
 * right away when AI is available; otherwise it shows AIAccessDialog and runs the same
 * action as soon as access is in place, so the user never has to repeat what they started.
 * Access is the user's own key or a signed-in account with hosted allowance left for that
 * kind of action (services/ai/index.ts). Render `gate` once in the component.
 */
export function useAIGate() {
  // Loads the account (and its AI allowance) as soon as a gated screen mounts, so the check
  // below is current by the time the user taps.
  useAccount();
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

  const alternative = request?.alternative && {
    label: request.alternative.label,
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
    />
  );

  return { requireAI, openKeySetup, gate };
}
