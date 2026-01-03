import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db/connection';
import { userRoles, roles } from '../../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { hasRole } from '../../../../../lib/utils/permissions';

export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only administrators can view user roles
  const isAdmin = await hasRole(user.id, 'administrator');
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const userId = parseInt(params.id || '0');

    const userRoleRecords = await db
      .select({ role: roles })
      .from(userRoles)
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    const roleList = userRoleRecords
      .map(r => r.role)
      .filter(Boolean);

    return new Response(JSON.stringify(roleList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching user roles:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch user roles' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
