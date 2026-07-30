import React from 'react';
import { create } from 'zustand';

// Chrome/Edge/Android-only event, not part of the standard DOM lib types.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_STORAGE_KEY = 'pulsar:installPromptDismissedAt';
const DISMISS_DAYS = 14;

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    return !Number.isNaN(dismissedAt) && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function detectStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

function detectIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

interface InstallPromptState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  isIOS: boolean;
  dismissed: boolean;
  dismiss: () => void;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export const useInstallPromptStore = create<InstallPromptState>()((set, get) => ({
  deferredPrompt: null,
  isInstalled: false,
  isIOS: false,
  dismissed: isDismissedRecently(),
  dismiss: () => {
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // localStorage might be unavailable (private mode); dismissal just won't persist
    }
    set({ dismissed: true });
  },
  promptInstall: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    set({ deferredPrompt: null });
    return outcome;
  },
}));

// Call once at the app root so the beforeinstallprompt listener is registered as early
// as possible — the browser only fires it once, and only if we've called
// preventDefault() before it would otherwise show its own mini-infobar.
export const useInstallPromptInit = () => {
  React.useEffect(() => {
    useInstallPromptStore.setState({
      isInstalled: detectStandalone(),
      isIOS: detectIOS(),
    });

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      useInstallPromptStore.setState({ deferredPrompt: e as BeforeInstallPromptEvent });
    };
    const handleAppInstalled = () => {
      useInstallPromptStore.setState({ isInstalled: true, deferredPrompt: null });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
};
