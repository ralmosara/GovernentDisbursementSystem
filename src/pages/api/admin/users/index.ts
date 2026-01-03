import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db/connection';
import { users, userRoles, roles } from '../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../../../lib/auth/password';
import { hasRole } from '../../../../lib/utils/permissions';

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only administrators can view users
  const isAdmin = await hasRole(user.id, 'administrator');
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get all users
    const allUsers = await db.select().from(users);

    // Get roles for each user
    const usersWithRoles = await Promise.all(
      allUsers.map(async (u) => {
        const userRoleRecords = await db
          .select({ role: roles })
          .from(userRoles)
          .leftJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, u.id));

        return {
          ...u,
          passwordHash: undefined, // Don't send password hash
          roles: userRoleRecords.map(r => r.role?.name || ''),
        };
      })
    );

    return new Response(JSON.stringify(usersWithRoles), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch users' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only administrators can create users
  const isAdmin = await hasRole(user.id, 'administrator');
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json();

    // Validate required fields
    if (!data.employeeNo || !data.username || !data.email || !data.password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if username or email already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, data.username.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Username already exists' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const [result] = await db.insert(users).values({
      employeeNo: data.employeeNo,
      username: data.username.toLowerCase(),
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      position: data.position || null,
      divisionOffice: data.divisionOffice || null,
      isActive: true,
    });

    const newUserId = result.insertId;

    // Assign roles
    if (data.roleIds && Array.isArray(data.roleIds) && data.roleIds.length > 0) {
      await Promise.all(
        data.roleIds.map((roleId: number) =>
          db.insert(userRoles).values({
            userId: newUserId,
            roleId,
          })
        )
      );
    }

    return new Response(
      JSON.stringify({ id: newUserId, message: 'User created successfully' }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create user' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
