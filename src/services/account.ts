// The visitor's Pulsar account, from the site's own API (worker/index.ts). Accounts are
// optional: the app works fully without one, and where there's no API (the Vite dev
// server without PULSAR_API) sign-in simply isn't offered.

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/** Hosted AI allowance for the signed-in account (worker/ai/usage.ts). */
export interface AIAllowance {
  tier: 'free' | 'pulsar_ai';
  plan: { used: number; limit: number };
  edit: { used: number; limit: number };
  /** When the counts reset (ms since epoch), or null for the one-time free allowance. */
  resetsAt: number | null;
}

export type AIKind = 'plan' | 'edit';

/** The account's Pulsar AI subscription as Stripe last reported it. */
export interface SubscriptionInfo {
  status: string;
  interval: 'month' | 'year' | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
}

export interface AccountState {
  /** False where the API is missing or Google sign-in isn't configured. */
  signInAvailable: boolean;
  /** Whether this site offers hosted Pulsar AI to signed-in accounts. */
  hostedAI: boolean;
  /** Whether Pulsar AI subscriptions can be bought here. */
  billing: boolean;
  user: AccountUser | null;
  /** The signed-in account's hosted AI allowance, or null. */
  ai: AIAllowance | null;
  subscription: SubscriptionInfo | null;
}

export const NO_ACCOUNT: AccountState = { signInAvailable: false, hostedAI: false, billing: false, user: null, ai: null, subscription: null };

/** Hosted AI calls of this kind the account has left (0 when signed out). */
export function allowanceLeft(state: AccountState, kind: AIKind): number {
  if (!state.hostedAI || !state.user || !state.ai) return 0;
  return Math.max(0, state.ai[kind].limit - state.ai[kind].used);
}

export const ACCOUNT_QUERY_KEY = ['account'] as const;

export const apiUrl = (path: string) => `${import.meta.env.BASE_URL}api/${path}`;

/** Read a JSON API response, or null when it isn't one (a static host answering with HTML). */
async function readJson(res: Response): Promise<unknown> {
  if (!res.headers.get('content-type')?.includes('application/json')) return null;
  return res.json().catch(() => null);
}

const parseCount = (value: unknown) => (typeof value === 'number' && value >= 0 ? value : 0);

function parseAllowance(value: unknown): AIAllowance | null {
  if (!value || typeof value !== 'object') return null;
  const a = value as Record<string, any>;
  if (a.tier !== 'free' && a.tier !== 'pulsar_ai') return null;
  return {
    tier: a.tier,
    plan: { used: parseCount(a.plan?.used), limit: parseCount(a.plan?.limit) },
    edit: { used: parseCount(a.edit?.used), limit: parseCount(a.edit?.limit) },
    resetsAt: typeof a.resetsAt === 'number' ? a.resetsAt : null,
  };
}

function parseSubscription(value: unknown): SubscriptionInfo | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as Record<string, any>;
  if (typeof s.status !== 'string') return null;
  return {
    status: s.status,
    interval: s.interval === 'month' || s.interval === 'year' ? s.interval : null,
    currentPeriodEnd: typeof s.currentPeriodEnd === 'number' ? s.currentPeriodEnd : null,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd === true,
  };
}

export function parseAccountState(body: unknown): AccountState {
  if (!body || typeof body !== 'object') return NO_ACCOUNT;
  const { signInAvailable, hostedAI, billing, user, ai, subscription } = body as Record<string, any>;
  if (signInAvailable !== true) return NO_ACCOUNT;
  const base = { signInAvailable: true, hostedAI: hostedAI === true, billing: billing === true };
  if (!user || typeof user.id !== 'string') return { ...base, user: null, ai: null, subscription: null };
  return {
    ...base,
    user: {
      id: user.id,
      name: typeof user.name === 'string' ? user.name : '',
      email: typeof user.email === 'string' ? user.email : '',
      image: typeof user.image === 'string' ? user.image : null,
    },
    ai: parseAllowance(ai),
    subscription: parseSubscription(subscription),
  };
}

// The latest account state, for code outside React (AI provider selection). useAccount keeps
// it current.
let snapshot: AccountState = NO_ACCOUNT;
export const getAccountSnapshot = () => snapshot;
export const setAccountSnapshot = (state: AccountState) => { snapshot = state; };

export async function fetchAccount(): Promise<AccountState> {
  try {
    const res = await fetch(apiUrl('me'), { credentials: 'same-origin' });
    snapshot = res.ok ? parseAccountState(await readJson(res)) : NO_ACCOUNT;
  } catch {
    // Offline: keep what we knew, so a signed-in user's AI still looks available and the
    // request itself reports the network error.
  }
  return snapshot;
}

async function postApi(path: string, body: unknown = {}) {
  const res = await fetch(apiUrl(path), {
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
  const data = (await postApi('auth/sign-in/social', {
    provider: 'google',
    callbackURL: returnTo,
    errorCallbackURL: returnTo,
  })) as { url?: string } | null;
  if (!data?.url) throw new Error('Sign-in is unavailable right now.');
  window.location.assign(data.url);
}

export async function signOut() {
  await postApi('auth/sign-out');
}

/** Delete the account and its sessions on the server. Workout data on the device is kept. */
export async function deleteAccount() {
  await postApi('auth/delete-user');
}

/** Pulsar AI prices, as shown in the app. The charged prices are the Stripe price ids. */
export const PULSAR_AI_PRICES = { month: '$3.99/month', year: '$29.99/year' } as const;

/** Leave for Stripe Checkout to subscribe; Stripe brings the browser back to `returnTo`. */
export async function startCheckout(interval: 'month' | 'year', returnTo = window.location.pathname + window.location.search) {
  const data = (await postApi('billing/checkout', { interval, returnTo })) as { url?: string } | null;
  if (!data?.url) throw new Error('Checkout is unavailable right now.');
  window.location.assign(data.url);
}

/** Open Stripe's billing portal to change payment details or cancel. */
export async function openBillingPortal() {
  const data = (await postApi('billing/portal')) as { url?: string } | null;
  if (!data?.url) throw new Error('The billing portal is unavailable right now.');
  window.location.assign(data.url);
}
