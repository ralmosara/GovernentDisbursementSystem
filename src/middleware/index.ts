import { defineMiddleware } from 'astro:middleware';
import { validateSession } from '../lib/auth/session';

export const onRequest = defineMiddleware(async (context, next) => {
  // Validate session
  const { user, session } = await validateSession(context.cookies);

  // Attach to context locals
  context.locals.user = user;
  context.locals.session = session;

  // Protected routes
  const protectedPaths = [
    '/dashboard',
    '/disbursements',
    '/budget',
    '/payments',
    '/travel',
    '/cash',
    '/revenue',
    '/assets',
    '/payroll',
    '/reports',
    '/admin',
  ];

  const isProtectedPath = protectedPaths.some(path =>
    context.url.pathname.startsWith(path)
  );

  // Redirect to login if accessing protected route without session
  if (isProtectedPath && !user) {
    return context.redirect('/login');
  }

  // Redirect to dashboard if accessing login page while logged in
  if (context.url.pathname === '/login' && user) {
    return context.redirect('/dashboard');
  }

  return next();
});
