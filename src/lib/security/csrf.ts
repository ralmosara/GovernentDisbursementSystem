import { randomBytes } from 'crypto';
import type { AstroCookies } from 'astro';

/**
 * CSRF Protection Utility
 *
 * Implements Cross-Site Request Forgery protection using the Synchronizer Token Pattern.
 *
 * Usage:
 * - Call generateCSRFToken() to create a new token (typically on form load)
 * - Store token in cookie and include in form as hidden field
 * - Call validateCSRFToken() on form submission to verify
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a new CSRF token
 *
 * @returns {string} Random CSRF token (hex string)
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Set CSRF token in cookie
 *
 * @param cookies - Astro cookies object
 * @param token - CSRF token to set
 */
export function setCSRFToken(cookies: AstroCookies, token: string): void {
  cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 2, // 2 hours
    path: '/',
  });
}

/**
 * Get CSRF token from cookies
 *
 * @param cookies - Astro cookies object
 * @returns {string | undefined} CSRF token or undefined if not found
 */
export function getCSRFToken(cookies: AstroCookies): string | undefined {
  return cookies.get(CSRF_COOKIE_NAME)?.value;
}

/**
 * Validate CSRF token from request
 *
 * Checks both request body and headers for CSRF token and validates against cookie
 *
 * @param cookies - Astro cookies object
 * @param request - Request object
 * @returns {Promise<boolean>} True if token is valid, false otherwise
 */
export async function validateCSRFToken(
  cookies: AstroCookies,
  request: Request
): Promise<boolean> {
  const storedToken = getCSRFToken(cookies);

  if (!storedToken) {
    return false;
  }

  // Check header first (for AJAX requests)
  let submittedToken = request.headers.get(CSRF_HEADER_NAME);

  // If not in header, check request body (for form submissions)
  if (!submittedToken) {
    try {
      const contentType = request.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        const body = await request.clone().json();
        submittedToken = body.csrf_token || body.csrfToken;
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.clone().formData();
        submittedToken = formData.get('csrf_token')?.toString();
      } else if (contentType?.includes('multipart/form-data')) {
        const formData = await request.clone().formData();
        submittedToken = formData.get('csrf_token')?.toString();
      }
    } catch (error) {
      console.error('Error parsing request for CSRF token:', error);
      return false;
    }
  }

  if (!submittedToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(storedToken, submittedToken);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 *
 * @param a - First string
 * @param b - Second string
 * @returns {boolean} True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Middleware to generate and set CSRF token for GET requests
 *
 * Call this in page routes that render forms
 *
 * @param cookies - Astro cookies object
 * @returns {string} Generated CSRF token
 */
export function ensureCSRFToken(cookies: AstroCookies): string {
  let token = getCSRFToken(cookies);

  if (!token) {
    token = generateCSRFToken();
    setCSRFToken(cookies, token);
  }

  return token;
}

/**
 * CSRF validation middleware for API routes
 *
 * Usage in API route:
 * ```typescript
 * export const POST: APIRoute = async ({ cookies, request }) => {
 *   const isValid = await requireCSRF(cookies, request);
 *   if (!isValid) {
 *     return new Response(
 *       JSON.stringify({ error: 'Invalid CSRF token' }),
 *       { status: 403 }
 *     );
 *   }
 *   // ... continue with route logic
 * };
 * ```
 *
 * @param cookies - Astro cookies object
 * @param request - Request object
 * @returns {Promise<boolean>} True if valid, false if invalid
 */
export async function requireCSRF(
  cookies: AstroCookies,
  request: Request
): Promise<boolean> {
  return await validateCSRFToken(cookies, request);
}

/**
 * Create a CSRF error response
 *
 * @returns {Response} 403 Forbidden response with CSRF error message
 */
export function csrfErrorResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'CSRF token validation failed',
      message: 'Invalid or missing CSRF token. Please refresh the page and try again.'
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Helper to get CSRF token for client-side usage
 *
 * Include this in page props to make token available to Vue components
 *
 * @param cookies - Astro cookies object
 * @returns {{ csrfToken: string }} Object with CSRF token
 */
export function getCSRFTokenForClient(cookies: AstroCookies): { csrfToken: string } {
  const token = ensureCSRFToken(cookies);
  return { csrfToken: token };
}
