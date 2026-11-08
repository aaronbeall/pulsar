import { getOpenAiApiKey } from '../../store/aiSettingsStore';
import { AIKind, allowanceLeft, getAccountSnapshot } from '../account';
import { byokProvider } from './byokProvider';
import { hostedProvider } from './hostedProvider';
import { AIProvider } from './types';

export * from './types';
export { testApiKey } from './byokProvider';
export type { AIKind } from '../account';

/**
 * Which AI to use for an action. The user's own key always wins: it's their explicit choice
 * and costs Pulsar nothing. Otherwise a signed-in account with hosted allowance left for this
 * kind of action uses hosted Pulsar AI. Otherwise there's no AI, and callers go through the
 * AI gate (hooks/useAIGate.tsx), which offers sign-in, an upgrade or a key.
 */
export function getActiveAIProvider(kind: AIKind): AIProvider | null {
  if (getOpenAiApiKey()) return byokProvider;
  if (allowanceLeft(getAccountSnapshot(), kind) > 0) return hostedProvider;
  return null;
}

export function hasActiveAIProvider(kind: AIKind): boolean {
  return getActiveAIProvider(kind) !== null;
}
