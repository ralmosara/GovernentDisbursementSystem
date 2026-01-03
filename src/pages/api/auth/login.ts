import type { APIRoute } from 'astro';
import { db } from '../../../lib/db/connection';
import { users } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '../../../lib/auth/password';
import { createSession } from '../../../lib/auth/session';
import { requireCSRF, csrfErrorResponse } from '../../../lib/security/csrf';
import {
  getClientIP,
  checkLoginAllowed,
  recordFailedAttempt,
  recordSuccessfulLogin,
  rateLimitErrorResponse
} from '../../../lib/security/rate-limit';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Step 1: Validate CSRF token
    const csrfValid = await requireCSRF(cookies, request);
    if (!csrfValid) {
      return csrfErrorResponse();
    }

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

    // Step 2: Check rate limiting
    const clientIP = getClientIP(request);
    const rateLimitCheck = checkLoginAllowed(clientIP, username.toLowerCase());

    if (!rateLimitCheck.allowed) {
      return rateLimitErrorResponse(
        rateLimitCheck.reason!,
        rateLimitCheck.resetTime!
      );
    }

    // Step 3: Find user by username
    const user = await db.query.users.findFirst({
      where: eq(users.username, username.toLowerCase()),
    });

    if (!user) {
      // Record failed attempt for invalid username
      recordFailedAttempt(clientIP, username.toLowerCase());
      return new Response(
        JSON.stringify({
          error: 'Invalid username or password',
          remainingAttempts: rateLimitCheck.remainingAttempts
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Check if user is active
    if (!user.isActive) {
      // Don't record as failed attempt - account is legitimately disabled
      return new Response(
        JSON.stringify({ error: 'Your account has been deactivated. Please contact an administrator.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Verify password
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      // Record failed attempt for invalid password
      recordFailedAttempt(clientIP, username.toLowerCase());
      return new Response(
        JSON.stringify({
          error: 'Invalid username or password',
          remainingAttempts: rateLimitCheck.remainingAttempts! - 1
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 6: Success - Reset rate limits
    recordSuccessfulLogin(clientIP, username.toLowerCase());

    // Step 7: Create session
    await createSession(user.id, cookies);

    // Step 8: Update last login
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
