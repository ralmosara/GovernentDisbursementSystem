import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db/connection';
import { users } from '../../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { hasRole } from '../../../../../lib/utils/permissions';

export const POST: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only administrators can toggle user status
  const isAdmin = await hasRole(user.id, 'administrator');
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const userId = parseInt(params.id || '0');

    // Get current user
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Toggle status
    await db
      .update(users)
      .set({ isActive: !targetUser.isActive })
      .where(eq(users.id, userId));

    return new Response(
      JSON.stringify({ message: 'User status updated successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error toggling user status:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to toggle user status' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
