import type { AstroCookies } from 'astro';
import { lucia } from './lucia';

/**
 * Validate session from cookies
 */
export async function validateSession(cookies: AstroCookies) {
  const sessionId = cookies.get(lucia.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    return {
      user: null,
      session: null
    };
  }

  const result = await lucia.validateSession(sessionId);

  // Handle session refresh
  if (result.session && result.session.fresh) {
    const sessionCookie = lucia.createSessionCookie(result.session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  }

  // Handle invalid session
  if (!result.session) {
    const sessionCookie = lucia.createBlankSessionCookie();
    cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  }

  return result;
}

/**
 * Create new session for user
 */
export async function createSession(userId: number, cookies: AstroCookies) {
  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  return session;
}

/**
 * Invalidate session (logout)
 */
export async function invalidateSession(sessionId: string, cookies: AstroCookies) {
  await lucia.invalidateSession(sessionId);
  const sessionCookie = lucia.createBlankSessionCookie();
  cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
}
