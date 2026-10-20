import type { APIRoute } from 'astro';
import { db } from '../../../lib/db/connection';
import { users } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../../../lib/auth/password';
import { lucia } from '../../../lib/auth/lucia';
import { createSession } from '../../../lib/auth/session';
import { validatePasswordPolicy } from '../../../lib/services/settings.service';
import { logUpdate } from '../../../lib/middleware/audit-logger';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Change the signed-in user's own password.
 * Requires the current password; signs out all other sessions on success.
 */
export const POST: APIRoute = async ({ locals, request, cookies }) => {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let data: { currentPassword?: unknown; newPassword?: unknown; confirmPassword?: unknown };
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Request body must be JSON' }, 400);
  }

  const currentPassword = typeof data.currentPassword === 'string' ? data.currentPassword : '';
  const newPassword = typeof data.newPassword === 'string' ? data.newPassword : '';
  const confirmPassword = typeof data.confirmPassword === 'string' ? data.confirmPassword : '';

  const errors: Record<string, string> = {};
  if (!currentPassword) errors.currentPassword = 'Enter your current password';
  if (!newPassword) errors.newPassword = 'Enter a new password';
  if (newPassword && newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
  if (newPassword && newPassword === currentPassword) errors.newPassword = 'New password must be different from the current one';

  if (newPassword && !errors.newPassword) {
    const problems = await validatePasswordPolicy(newPassword);
    if (problems.length > 0) errors.newPassword = `Must contain ${problems.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return json({ error: 'Please correct the highlighted fields', errors }, 422);
  }

  try {
    const account = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
      return json({ error: 'Please correct the highlighted fields', errors: { currentPassword: 'Current password is incorrect' } }, 422);
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword) })
      .where(eq(users.id, user.id));

    // End every session (including stolen ones), then keep this browser signed in
    await lucia.invalidateUserSessions(user.id);
    await createSession(user.id, cookies);

    await logUpdate('users', user.id, {}, { passwordChanged: true }, user.id, request);

    return json({ message: 'Password changed. Other devices have been signed out.' });
  } catch (error) {
    console.error('Error changing password:', error);
    return json({ error: 'Failed to change password' }, 500);
  }
};
