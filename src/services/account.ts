// The visitor's Pulsar account, from the site's own API (worker/index.ts). Accounts are
// optional: the app works fully without one, and where there's no API (GitHub Pages, the
// Vite dev server without PULSAR_API) sign-in simply isn't offered.

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface AccountState {
  /** False where the API is missing or Google sign-in isn't configured. */
  signInAvailable: boolean;
  user: AccountUser | null;
}

export const NO_ACCOUNT: AccountState = { signInAvailable: false, user: null };

export const apiUrl = (path: string) => `${import.meta.env.BASE_URL}api/${path}`;

/** Read a JSON API response, or null when it isn't one (a static host answering with HTML). */
async function readJson(res: Response): Promise<unknown> {
  if (!res.headers.get('content-type')?.includes('application/json')) return null;
  return res.json().catch(() => null);
}

export function parseAccountState(body: unknown): AccountState {
  if (!body || typeof body !== 'object') return NO_ACCOUNT;
  const { signInAvailable, user } = body as Partial<AccountState>;
  if (signInAvailable !== true) return NO_ACCOUNT;
  if (!user || typeof user.id !== 'string') return { signInAvailable: true, user: null };
  return {
    signInAvailable: true,
    user: {
      id: user.id,
      name: typeof user.name === 'string' ? user.name : '',
      email: typeof user.email === 'string' ? user.email : '',
      image: typeof user.image === 'string' ? user.image : null,
    },
  };
}

export async function fetchAccount(): Promise<AccountState> {
  try {
    const res = await fetch(apiUrl('me'), { credentials: 'same-origin' });
    if (!res.ok) return NO_ACCOUNT;
    return parseAccountState(await readJson(res));
  } catch {
    return NO_ACCOUNT; // offline: behave as signed out until the next check
  }
}

async function postAuth(path: string, body: unknown = {}) {
  const res = await fetch(apiUrl(`auth/${path}`), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await readJson(res);
  if (!res.ok) {
    const message = (data as { message?: string } | null)?.message;
    throw new Error(message || `Request failed (${res.status})`);
  }
  return data;
}

/**
 * Start Google sign-in. The browser leaves the app for Google and comes back to `returnTo`
 * (a path on this site, the current page by default), now with a session cookie.
 */
export async function signInWithGoogle(returnTo = window.location.pathname + window.location.search) {
  const data = (await postAuth('sign-in/social', {
    provider: 'google',
    callbackURL: returnTo,
    errorCallbackURL: returnTo,
  })) as { url?: string } | null;
  if (!data?.url) throw new Error('Sign-in is unavailable right now.');
  window.location.assign(data.url);
}

export async function signOut() {
  await postAuth('sign-out');
}

/** Delete the account and its sessions on the server. Workout data on the device is kept. */
export async function deleteAccount() {
  await postAuth('delete-user');
}
