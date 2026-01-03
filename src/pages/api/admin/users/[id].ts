import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db/connection';
import { users, userRoles } from '../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { hasRole } from '../../../../lib/utils/permissions';

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only administrators can update users
  const isAdmin = await hasRole(user.id, 'administrator');
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const userId = parseInt(params.id || '0');
    const data = await request.json();

    // Update user
    await db
      .update(users)
      .set({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        position: data.position || null,
        divisionOffice: data.divisionOffice || null,
      })
      .where(eq(users.id, userId));

    // Update roles if provided
    if (data.roleIds && Array.isArray(data.roleIds)) {
      // Delete existing roles
      await db.delete(userRoles).where(eq(userRoles.userId, userId));

      // Insert new roles
      if (data.roleIds.length > 0) {
        await Promise.all(
          data.roleIds.map((roleId: number) =>
            db.insert(userRoles).values({
              userId,
              roleId,
            })
          )
        );
      }
    }

    return new Response(
      JSON.stringify({ message: 'User updated successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error updating user:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to update user' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
