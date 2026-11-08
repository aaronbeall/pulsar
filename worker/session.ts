import { createAuth, signInAvailable } from './auth';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/** The signed-in user for this request, or null (also null where sign-in isn't offered). */
export async function currentUser(env: Env, request: Request): Promise<SessionUser | null> {
  const origin = new URL(request.url).origin;
  if (!signInAvailable(env, origin)) return null;
  const session = await createAuth(env, origin).api.getSession({ headers: request.headers });
  if (!session) return null;
  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
}
