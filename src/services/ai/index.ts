import { getOpenAiApiKey } from '../../store/aiSettingsStore';
import { byokProvider } from './byokProvider';
import { AIProvider } from './types';

export * from './types';
export { testApiKey } from './byokProvider';

/**
 * Phase 1: BYOK only. Phase 4 (see PLAN-ai-features.md) adds a hostedProvider for
 * logged-in subscribers and prefers it here when active — everything upstream keeps
 * calling this same function and never has to change.
 */
export function getActiveAIProvider(): AIProvider | null {
  if (getOpenAiApiKey()) return byokProvider;
  return null;
}

export function hasActiveAIProvider(): boolean {
  return getActiveAIProvider() !== null;
}
