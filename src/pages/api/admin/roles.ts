import type { APIRoute } from 'astro';
import { db } from '../../../lib/db/connection';
import { roles } from '../../../lib/db/schema';
import { hasRole } from '../../../lib/utils/permissions';

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only administrators can view roles
  const isAdmin = await hasRole(user.id, 'administrator');
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const allRoles = await db.select().from(roles);

    return new Response(JSON.stringify(allRoles), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch roles' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
