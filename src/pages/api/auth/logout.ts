import type { APIRoute } from 'astro';
import { invalidateSession } from '../../../lib/auth/session';

export const POST: APIRoute = async ({ locals, cookies }) => {
  try {
    if (!locals.session) {
      return new Response(
        JSON.stringify({ error: 'No active session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Invalidate session
    await invalidateSession(locals.session.id, cookies);

    return new Response(
      JSON.stringify({ success: true, message: 'Logged out successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async ({ locals, cookies, redirect }) => {
  if (locals.session) {
    await invalidateSession(locals.session.id, cookies);
  }
  return redirect('/login');
};
