import { create } from 'zustand';
import { isDevMode } from '../utils/devMode';

// Deliberately separate from pulsarStore.ts (which just had its own redundant persist()
// removed — see NOTES.md 2026-07-31). These are real, small UI-only settings, so they get
// their own tiny store that reads/writes localStorage directly rather than reintroducing a
// blanket persist() pattern.

const KEY_STORAGE_KEY = 'pulsar:openaiApiKey';
const MODEL_STORAGE_KEY = 'pulsar:openaiModel';

// A cheap model that supports JSON mode. Overridable in Settings, since OpenAI retires
// models on its own schedule and a user's key may not have access to every model.
export const DEFAULT_OPENAI_MODEL = 'gpt-5-mini';

const readStored = (key: string): string | null => {
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null; // localStorage unavailable (e.g. private browsing)
  }
};

const writeStored = (key: string, value: string | null) => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // localStorage unavailable — the value just won't survive a reload
  }
};

interface AiSettingsState {
  openaiApiKey: string | null;
  openaiModel: string | null; // null = DEFAULT_OPENAI_MODEL
  setOpenaiApiKey: (key: string | null) => void;
  setOpenaiModel: (model: string | null) => void;
}

export const useAiSettingsStore = create<AiSettingsState>((set) => ({
  openaiApiKey: readStored(KEY_STORAGE_KEY),
  openaiModel: readStored(MODEL_STORAGE_KEY),
  setOpenaiApiKey: (key) => {
    const value = key?.trim() || null;
    writeStored(KEY_STORAGE_KEY, value);
    set({ openaiApiKey: value });
  },
  setOpenaiModel: (model) => {
    const value = model?.trim() || null;
    writeStored(MODEL_STORAGE_KEY, value);
    set({ openaiModel: value });
  },
}));

export const useOpenAiApiKey = (): [string | null, (key: string | null) => void] => {
  const key = useAiSettingsStore(s => s.openaiApiKey);
  const setKey = useAiSettingsStore(s => s.setOpenaiApiKey);
  return [key, setKey];
};

export const useOpenAiModel = (): [string | null, (model: string | null) => void] => {
  const model = useAiSettingsStore(s => s.openaiModel);
  const setModel = useAiSettingsStore(s => s.setOpenaiModel);
  return [model, setModel];
};

/** True when a key is set — reactive, for components that show/hide AI features. */
export const useHasOpenAiKey = (): boolean => useAiSettingsStore(s => !!s.openaiApiKey);

// Non-reactive accessors for use outside React (services, non-component modules).
export const getOpenAiApiKey = (): string | null => useAiSettingsStore.getState().openaiApiKey;
// The model override is a dev-mode setting (see DEV-FEATURES.md): outside dev mode the default
// model is always used, even if an override was saved earlier.
export const getOpenAiModel = (): string =>
  (isDevMode() && useAiSettingsStore.getState().openaiModel) || DEFAULT_OPENAI_MODEL;
