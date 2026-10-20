import { defineMiddleware } from 'astro:middleware';
import { applySecurityHeaders } from './lib/security/headers';
import { validateSession, invalidateSession } from './lib/auth/session';
import { db } from './lib/db/connection';
import { users, userRoles, roles } from './lib/db/schema';
import { eq } from 'drizzle-orm';
import { isRequestAllowed, describeRoles } from './lib/security/access-policy';

/**
 * Global Middleware
 *
 * Runs on every request and applies, in order:
 * - Authentication (session validation; deactivated or deleted accounts lose their session)
 * - Route protection (pages redirect to /login, API routes answer 401)
 * - Role-based access policy for state-changing API calls (see lib/security/access-policy.ts)
 * - Same-origin enforcement for state-changing API requests (CSRF defence)
 * - Security headers (OWASP best practices)
 */

/** Paths reachable without signing in */
const PUBLIC_PATHS = new Set(['/login', '/logout', '/forgot-password', '/api/auth/login']);

/** Static assets served without a session */
const PUBLIC_PREFIXES = ['/_astro/', '/favicon'];

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

/**
 * A state-changing request is accepted only when the browser says it came from this
 * site. Browsers always send Origin on cross-site POST/PUT/PATCH/DELETE, so a forged
 * form or fetch from another site is rejected here without every endpoint needing a token.
 */
function isSameOrigin(request: Request, url: URL): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return false;
  }

  const origin = request.headers.get('origin') ?? request.headers.get('referer');
  if (!origin) {
    // Non-browser clients (scripts, health checks) send neither header
    return true;
  }

  try {
    const originHost = new URL(origin).host;
    const allowedHosts = new Set([url.host]);
    if (process.env.PUBLIC_URL) {
      allowedHosts.add(new URL(process.env.PUBLIC_URL).host);
    }
    return allowedHosts.has(originHost);
  } catch {
    return false;
  }
}

const jsonError = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isApi = pathname.startsWith('/api/');

  // Reject cross-site writes before doing any work
  if (isApi && STATE_CHANGING_METHODS.has(context.request.method) && !isSameOrigin(context.request, context.url)) {
    return applySecurityHeaders(jsonError(403, 'Cross-site request blocked'));
  }

  context.locals.user = null;
  context.locals.session = null;

  if (!PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    const { user: luciaUser, session } = await validateSession(context.cookies);

    if (luciaUser && session) {
      const fullUser = await db.query.users.findFirst({
        where: eq(users.id, luciaUser.id),
      });

      if (fullUser && fullUser.isActive && !fullUser.deletedAt) {
        // Get all of the user's roles; the first is treated as the primary role
        const userRoleRows = await db
          .select({ roleName: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, fullUser.id))
          .orderBy(userRoles.id);

        const roleNames = userRoleRows.map(r => r.roleName);
        context.locals.user = {
          id: fullUser.id,
          username: fullUser.username,
          email: fullUser.email,
          firstName: fullUser.firstName,
          lastName: fullUser.lastName,
          role: roleNames.includes('administrator') ? 'administrator' : roleNames[0] || null,
          roles: roleNames,
          isActive: Boolean(fullUser.isActive),
        };
        context.locals.session = session;
      } else {
        // Account was deactivated or deleted after sign-in: end the session now
        await invalidateSession(session.id, context.cookies);
      }
    }
  }

  if (!context.locals.user && !isPublicPath(pathname) && pathname !== '/') {
    if (isApi) {
      return applySecurityHeaders(jsonError(401, 'Unauthorized'));
    }
    const nextPath = encodeURIComponent(pathname + context.url.search);
    return applySecurityHeaders(context.redirect(`/login?next=${nextPath}`));
  }

  // Role-based access policy for state-changing API calls
  if (isApi && context.locals.user) {
    const { allowed, rule } = isRequestAllowed(context.request.method, pathname, context.locals.user.roles);
    if (!allowed && rule) {
      return applySecurityHeaders(
        jsonError(403, `You do not have permission to do this. Required role: ${describeRoles(rule.roles)}.`)
      );
    }
  }

  // Signed-in users have no reason to see the login page
  if (pathname === '/login' && context.locals.user) {
    return applySecurityHeaders(context.redirect('/dashboard'));
  }

  const response = await next();

  // Apply security headers to the response
  return applySecurityHeaders(response);
});
