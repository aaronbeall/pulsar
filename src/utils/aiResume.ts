// Remembers an AI action the user started when they leave the site to unlock AI (Google
// sign-in or Stripe Checkout), so it continues on their return instead of making them tap
// again. Lives in sessionStorage: same tab only, and dropped if they don't come back soon.

export const AI_RESUME_STORAGE_KEY = 'pulsar:aiResume';
/** Long enough for a sign-in or a checkout, short enough not to fire on some later visit. */
export const AI_RESUME_TTL_MS = 15 * 60 * 1000;

export type AIResumeVia = 'signin' | 'checkout';

export interface AIResume {
  /** Which action to continue, e.g. "setup-plan" or "chat:<routine id>". */
  key: string;
  /** The page it was started on (pathname). It only continues there. */
  path: string;
  via: AIResumeVia;
  at: number;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function saveAIResume(storage: Storage, resume: Omit<AIResume, 'at'>, now = Date.now()) {
  try {
    storage.setItem(AI_RESUME_STORAGE_KEY, JSON.stringify({ ...resume, at: now }));
  } catch {
    // storage unavailable: the user just taps again after coming back
  }
}

/** The remembered action for this key and page, if any and still fresh. Stale entries are dropped. */
export function peekAIResume(storage: Storage, key: string, path: string, now = Date.now()): AIResume | null {
  let resume: AIResume | null = null;
  try {
    const raw = storage.getItem(AI_RESUME_STORAGE_KEY);
    resume = raw ? (JSON.parse(raw) as AIResume) : null;
  } catch {
    return null;
  }
  if (!resume || typeof resume.at !== 'number') return null;
  if (now - resume.at > AI_RESUME_TTL_MS || now < resume.at) {
    clearAIResume(storage);
    return null;
  }
  return resume.key === key && resume.path === path ? resume : null;
}

export function clearAIResume(storage: Storage) {
  try {
    storage.removeItem(AI_RESUME_STORAGE_KEY);
  } catch {
    // ignore
  }
}
