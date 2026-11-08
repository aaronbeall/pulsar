import { useCallback, useEffect, useState } from 'react';

/**
 * useState that survives a reload within the tab (sessionStorage). For drafts the user
 * would hate to retype, e.g. the setup answers when sign-in leaves the app for Google and
 * comes back. `clear` forgets the draft once it's been used.
 */
export function useSessionDraft<T>(key: string, initial: () => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      // unavailable or unparseable: start fresh
    }
    return initial();
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable: the draft just won't survive a reload
    }
  }, [key, value]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  return [value, setValue, clear] as const;
}
