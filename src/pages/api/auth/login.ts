import type { APIRoute } from 'astro';
import { db } from '../../../lib/db/connection';
import { users } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '../../../lib/auth/password';
import { createSession } from '../../../lib/auth/session';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const username = formData.get('username');
    const password = formData.get('password');

    // Validate input
    if (!username || typeof username !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find user by username
    const user = await db.query.users.findFirst({
      where: eq(users.username, username.toLowerCase()),
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid username or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return new Response(
        JSON.stringify({ error: 'Your account has been deactivated. Please contact an administrator.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return new Response(
        JSON.stringify({ error: 'Invalid username or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create session
    await createSession(user.id, cookies);

    // Update last login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return new Response(
      JSON.stringify({ success: true, message: 'Login successful' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
