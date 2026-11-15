import { useEffect } from 'react';
import { useColorMode } from '@chakra-ui/react';
import { create } from 'zustand';

// Chakra only remembers the resolved mode ('light' or 'dark'), so picking "System" in
// Settings used to save whatever the phone was set to at that moment and never follow it
// again. The user's actual choice lives here; Chakra's own key just mirrors the result.

export type ColorModePreference = 'system' | 'light' | 'dark';

const PREF_KEY = 'pulsar:colorModePreference';
const CHAKRA_KEY = 'chakra-ui-color-mode';

const readPreference = (): ColorModePreference => {
  try {
    const v = localStorage.getItem(PREF_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};

interface ThemeState {
  preference: ColorModePreference;
  setPreference: (p: ColorModePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: readPreference(),
  setPreference: (preference) => {
    try {
      if (preference === 'system') localStorage.removeItem(PREF_KEY);
      else localStorage.setItem(PREF_KEY, preference);
    } catch {
      // localStorage unavailable: the choice lasts until reload
    }
    set({ preference });
  },
}));

/**
 * Call before React renders. When following the system, drop Chakra's saved mode so its
 * provider resolves the phone's current setting on boot instead of last session's.
 */
export const initColorModePreference = () => {
  if (readPreference() !== 'system') return;
  try {
    localStorage.removeItem(CHAKRA_KEY);
  } catch {
    // nothing saved to drop
  }
};

/** The user's light/dark/system choice, and a setter that applies it right away. */
export const useColorModePreference = () => {
  const { colorMode, setColorMode } = useColorMode();
  const preference = useThemeStore((s) => s.preference);
  const setStored = useThemeStore((s) => s.setPreference);
  const setPreference = (p: ColorModePreference) => {
    setStored(p);
    setColorMode(p); // Chakra resolves 'system' to the phone's current mode
  };
  return { preference, colorMode, setPreference };
};

/** Mount once: while following the system, switch when the phone's setting changes. */
export const useSystemColorModeSync = () => {
  const { setColorMode } = useColorMode();
  const preference = useThemeStore((s) => s.preference);
  useEffect(() => {
    if (preference !== 'system' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setColorMode(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference, setColorMode]);
};
