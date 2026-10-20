import type { APIRoute } from 'astro';
import { db } from '../../../lib/db/connection';
import { users } from '../../../lib/db/schema';
import { and, asc, eq, isNull } from 'drizzle-orm';

/**
 * Staff directory for pickers (travelers, approvers, custodians).
 *
 * Available to any signed-in user, so it returns only the fields needed to pick a
 * person; contact details and account data stay in the admin users API.
 *
 * Query: ?active=true limits the list to active accounts.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const activeOnly = url.searchParams.get('active') === 'true';

    const rows = await db
      .select({
        id: users.id,
        employeeNo: users.employeeNo,
        firstName: users.firstName,
        middleName: users.middleName,
        lastName: users.lastName,
        position: users.position,
        divisionOffice: users.divisionOffice,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(isNull(users.deletedAt), activeOnly ? eq(users.isActive, true) : undefined))
      .orderBy(asc(users.lastName), asc(users.firstName));

    const directory = rows.map(u => ({
      ...u,
      name: [u.firstName, u.middleName ? `${u.middleName.charAt(0)}.` : null, u.lastName].filter(Boolean).join(' '),
    }));

    return new Response(JSON.stringify(directory), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching user directory:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
