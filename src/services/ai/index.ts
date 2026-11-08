import { getOpenAiApiKey, useHasOpenAiKey } from '../../store/aiSettingsStore';
import { byokProvider } from './byokProvider';
import { AIProvider } from './types';

export * from './types';
export { testApiKey } from './byokProvider';

/**
 * Bring-your-own-key only for now. A later hosted provider (see PLAN-ai-features.md) would
 * be chosen here too — everything upstream keeps calling this same function.
 */
export function getActiveAIProvider(): AIProvider | null {
  if (getOpenAiApiKey()) return byokProvider;
  return null;
}

export function hasActiveAIProvider(): boolean {
  return getActiveAIProvider() !== null;
}

/** Reactive version of hasActiveAIProvider, for components that should update when a key is added or removed. */
export const useHasActiveAIProvider = (): boolean => useHasOpenAiKey();
