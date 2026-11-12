import { useState } from 'react';

const read = (key: string, fallback: boolean): boolean => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
};

/** An open/closed flag remembered on this device (localStorage), e.g. a collapsible section. */
export function useStoredToggle(key: string, fallback: boolean): [boolean, () => void] {
  const [open, setOpen] = useState(() => read(key, fallback));
  const toggle = () => {
    setOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // lasts until reload
      }
      return next;
    });
  };
  return [open, toggle];
}
