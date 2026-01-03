import { defineMiddleware } from 'astro:middleware';
import { applySecurityHeaders } from './lib/security/headers';
import { validateSession } from './lib/auth/session';
import { db } from './lib/db/connection';
import { users, userRoles, roles } from './lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Global Middleware
 *
 * This middleware runs on every request and applies:
 * - Authentication (session validation)
 * - Security headers (OWASP best practices)
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Validate session and get user
  const { user: luciaUser, session } = await validateSession(context.cookies);

  if (luciaUser && session) {
    // Fetch full user details
    const fullUser = await db.query.users.findFirst({
      where: eq(users.id, luciaUser.id)
    });

    if (fullUser) {
      // Get user's primary role using a separate query
      const userRole = await db
        .select({
          roleName: roles.name
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, fullUser.id))
        .limit(1);

      const primaryRole = userRole[0]?.roleName || null;

      // Set user in locals for access in pages
      context.locals.user = {
        id: fullUser.id,
        username: fullUser.username,
        email: fullUser.email,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        role: primaryRole,
        isActive: fullUser.isActive
      };
      context.locals.session = session;
    }
  }

  // Process the request
  const response = await next();

  // Apply security headers to the response
  return applySecurityHeaders(response);
});
