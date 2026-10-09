import { create } from 'zustand';

// Deliberately separate from pulsarStore.ts (which just had its own redundant persist()
// removed — see NOTES.md 2026-07-31). This is a real, small UI-only setting, so it gets its
// own tiny store that reads/writes localStorage directly rather than reintroducing a
// blanket persist() pattern.

const STORAGE_KEY = 'pulsar:openaiApiKey';

const readStoredKey = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null; // localStorage unavailable (e.g. private browsing)
  }
};

interface AiSettingsState {
  openaiApiKey: string | null;
  setOpenaiApiKey: (key: string | null) => void;
}

export const useAiSettingsStore = create<AiSettingsState>((set) => ({
  openaiApiKey: readStoredKey(),
  setOpenaiApiKey: (key) => {
    try {
      if (key) {
        localStorage.setItem(STORAGE_KEY, key);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable — key just won't survive a reload
    }
    set({ openaiApiKey: key });
  },
}));

export const useOpenAiApiKey = (): [string | null, (key: string | null) => void] => {
  const key = useAiSettingsStore(s => s.openaiApiKey);
  const setKey = useAiSettingsStore(s => s.setOpenaiApiKey);
  return [key, setKey];
};

// Non-reactive accessor for use outside React (services, non-component modules).
export const getOpenAiApiKey = (): string | null => useAiSettingsStore.getState().openaiApiKey;
