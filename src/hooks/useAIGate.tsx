import React from 'react';
import AIAccessDialog, { AIAccessAlternative } from '../components/AIAccessDialog';
import { hasActiveAIProvider } from '../services/ai';

interface GateRequest {
  reason?: string;
  alternative?: AIAccessAlternative;
}

/**
 * Gate an AI action behind AI access, paywall-style. `requireAI(action)` runs the action
 * right away when AI is available; otherwise it shows AIAccessDialog and runs the same
 * action as soon as access is in place, so the user never has to repeat what they started.
 * Render `gate` once in the component. Later, a subscription check slots in here alongside
 * the key check without any caller changing.
 */
export function useAIGate() {
  const [request, setRequest] = React.useState<GateRequest | null>(null);
  const pendingAction = React.useRef<(() => void) | null>(null);

  const requireAI = React.useCallback((action: () => void, options: GateRequest = {}) => {
    if (hasActiveAIProvider()) {
      action();
      return;
    }
    pendingAction.current = action;
    setRequest(options);
  }, []);

  /** Open the dialog with nothing to continue afterwards (e.g. adding or changing a key from Settings). */
  const openKeySetup = React.useCallback((options: GateRequest = {}) => {
    pendingAction.current = null;
    setRequest(options);
  }, []);

  const close = React.useCallback(() => {
    pendingAction.current = null;
    setRequest(null);
  }, []);

  const handleUnlocked = React.useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    setRequest(null);
    action?.();
  }, []);

  const alternative = request?.alternative && {
    label: request.alternative.label,
    onClick: () => {
      const run = request.alternative!.onClick;
      close();
      run();
    },
  };

  const gate = (
    <AIAccessDialog
      isOpen={!!request}
      reason={request?.reason}
      alternative={alternative}
      onUnlocked={handleUnlocked}
      onClose={close}
    />
  );

  return { requireAI, openKeySetup, gate };
}
