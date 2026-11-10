import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { canDeleteAccount, getSubscription } from './billing/subscription';

/**
 * Better Auth, created per request: the Worker serves production, PR previews and local dev
 * from different origins, and the auth base URL has to be the one the browser is on so the
 * Google callback and cookies land on the same origin as the app.
 *
 * Google is the only sign-in method. Without its client id and secret the server still runs,
 * and /api/me reports that sign-in isn't available, so the app hides it.
 */
export function createAuth(env: Env, origin: string) {
  return betterAuth({
    appName: 'Pulsar',
    baseURL: origin,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins: [origin],
    socialProviders: signInAvailable(env, origin)
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            // Always show the account chooser, so switching Google accounts is possible.
            prompt: 'select_account',
          },
        }
      : {},
    user: {
      // Settings > Account > Delete account. Deleting cascades to sessions and accounts.
      deleteUser: {
        enabled: true,
        // Deleting the account wouldn't stop Stripe billing, so an active subscription has to
        // be cancelled first (Settings > Account > Manage subscription). Once cancelled it just
        // runs out at the period end, so deleting is fine.
        beforeDelete: async (user) => {
          if (!canDeleteAccount(await getSubscription(env.DB, user.id))) {
            throw new APIError('BAD_REQUEST', {
              message: 'Cancel your Pulsar AI subscription before deleting your account (Manage subscription).',
            });
          }
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 90, // 90 days: a phone app shouldn't keep asking to sign in
      updateAge: 60 * 60 * 24, // refreshed at most once a day
      // Deleting an account needs a session younger than this. Long, because sign-in is
      // Google-only and there's no password to re-enter.
      freshAge: 60 * 60 * 24 * 90,
    },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * Whether Google sign-in can work on this origin: the secrets are set, and the origin is one
 * whose callback URL is registered with Google. PR previews each get their own host, which
 * Google won't redirect back to, so they hide sign-in instead of failing at Google.
 * `AUTH_ORIGINS` (wrangler.jsonc vars) lists the allowed origins; localhost is always allowed.
 */
export function signInAvailable(env: Env, origin: string) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.BETTER_AUTH_SECRET) return false;
  return originAllowed(env.AUTH_ORIGINS, origin);
}

export function originAllowed(allowList: string | undefined, origin: string) {
  const { hostname } = new URL(origin);
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  return (allowList ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .includes(origin);
}
