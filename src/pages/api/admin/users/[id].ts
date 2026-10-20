import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db/connection';
import { users, userRoles, roles } from '../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { hasRole } from '../../../../lib/utils/permissions';
import { hashPassword } from '../../../../lib/auth/password';
import { lucia } from '../../../../lib/auth/lucia';
import { validatePasswordPolicy } from '../../../../lib/services/settings.service';
import { logUpdate } from '../../../../lib/middleware/audit-logger';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // Only administrators can update users
  const isAdmin = await hasRole(user.id, 'administrator');
  if (!isAdmin) {
    return json({ error: 'Permission denied' }, 403);
  }

  try {
    const userId = parseInt(params.id || '0');
    const data = await request.json();

    const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!existing) {
      return json({ error: 'User not found' }, 404);
    }

    const currentRoles = await db
      .select({ roleId: userRoles.roleId, name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    const newRoleIds: number[] | null = Array.isArray(data.roleIds) ? data.roleIds.map(Number) : null;

    // Administrators may not remove their own administrator role (prevents locking everyone out)
    if (newRoleIds && userId === user.id) {
      const adminRoleId = currentRoles.find(r => r.name === 'administrator')?.roleId;
      if (adminRoleId && !newRoleIds.includes(adminRoleId)) {
        return json({ error: 'You cannot remove the administrator role from your own account' }, 400);
      }
    }

    // Optional password reset by an administrator
    const newPassword = typeof data.password === 'string' && data.password !== '' ? data.password : null;
    if (newPassword) {
      const problems = await validatePasswordPolicy(newPassword);
      if (problems.length > 0) {
        return json({ error: `Password must contain ${problems.join(', ')}` }, 400);
      }
    }

    const passwordHash = newPassword ? await hashPassword(newPassword) : null;

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName || null,
          position: data.position || null,
          divisionOffice: data.divisionOffice || null,
          ...(passwordHash ? { passwordHash } : {}),
        })
        .where(eq(users.id, userId));

      // Replace roles if provided
      if (newRoleIds) {
        await tx.delete(userRoles).where(eq(userRoles.userId, userId));
        if (newRoleIds.length > 0) {
          await tx.insert(userRoles).values(newRoleIds.map(roleId => ({ userId, roleId, assignedBy: user.id })));
        }
      }
    });

    // A reset password ends every existing session for that account
    if (passwordHash) {
      await lucia.invalidateUserSessions(userId);
    }

    await logUpdate(
      'users',
      userId,
      {
        email: existing.email,
        firstName: existing.firstName,
        lastName: existing.lastName,
        position: existing.position,
        divisionOffice: existing.divisionOffice,
        roleIds: currentRoles.map(r => r.roleId),
      },
      {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        position: data.position || null,
        divisionOffice: data.divisionOffice || null,
        ...(newRoleIds ? { roleIds: newRoleIds } : {}),
        ...(passwordHash ? { passwordReset: true } : {}),
      },
      user.id,
      request
    );

    return json({ message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return json({ error: error.message || 'Failed to update user' }, 500);
  }
};
