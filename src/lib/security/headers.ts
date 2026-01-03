/**
 * Security Headers Utility
 *
 * Implements security headers to protect against common web vulnerabilities
 * following OWASP security best practices.
 *
 * Headers included:
 * - Content-Security-Policy (CSP)
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - X-XSS-Protection
 * - Strict-Transport-Security (HSTS)
 * - Referrer-Policy
 * - Permissions-Policy
 */

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  /**
   * Content Security Policy (CSP)
   * Prevents XSS attacks by controlling which resources can be loaded
   *
   * Adjust directives based on your application's needs
   */
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: 'unsafe-inline' and 'unsafe-eval' should be removed in production
    "style-src 'self' 'unsafe-inline'", // Note: 'unsafe-inline' should be removed and use nonces instead
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),

  /**
   * X-Content-Type-Options
   * Prevents MIME type sniffing
   */
  'X-Content-Type-Options': 'nosniff',

  /**
   * X-Frame-Options
   * Prevents clickjacking attacks by controlling iframe embedding
   */
  'X-Frame-Options': 'DENY',

  /**
   * X-XSS-Protection
   * Legacy XSS protection (modern browsers use CSP instead)
   * Kept for compatibility with older browsers
   */
  'X-XSS-Protection': '1; mode=block',

  /**
   * Strict-Transport-Security (HSTS)
   * Forces HTTPS connections
   * Note: Only enable in production with valid SSL certificate
   */
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  /**
   * Referrer-Policy
   * Controls how much referrer information is sent
   */
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  /**
   * Permissions-Policy
   * Controls which browser features can be used
   */
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', ')
};

/**
 * Development-safe security headers (less strict for development)
 */
export const DEV_SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss:", // Allow WebSocket for HMR
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Skip HSTS in development (no HTTPS)
};

/**
 * Apply security headers to a Response
 *
 * @param response - Original response
 * @param isDevelopment - Whether running in development mode
 * @returns {Response} Response with security headers
 */
export function applySecurityHeaders(
  response: Response,
  isDevelopment = process.env.NODE_ENV !== 'production'
): Response {
  const headers = new Headers(response.headers);
  const securityHeaders = isDevelopment ? DEV_SECURITY_HEADERS : SECURITY_HEADERS;

  // Apply security headers
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }

  // Create new response with security headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Get security headers as object
 *
 * Useful for Astro middleware or custom response creation
 *
 * @param isDevelopment - Whether running in development mode
 * @returns {Record<string, string>} Security headers object
 */
export function getSecurityHeaders(
  isDevelopment = process.env.NODE_ENV !== 'production'
): Record<string, string> {
  return isDevelopment ? { ...DEV_SECURITY_HEADERS } : { ...SECURITY_HEADERS };
}

/**
 * Create a CSP nonce for inline scripts/styles
 *
 * This is a more secure alternative to 'unsafe-inline'
 * Usage:
 * 1. Generate nonce per request
 * 2. Add to CSP header
 * 3. Use in inline script/style tags: <script nonce="...">
 *
 * @returns {string} Random nonce value
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build CSP with nonce support
 *
 * @param nonce - Nonce value
 * @param isDevelopment - Whether running in development mode
 * @returns {string} CSP header value with nonce
 */
export function buildCSPWithNonce(nonce: string, isDevelopment = false): string {
  if (isDevelopment) {
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`, // Keep unsafe-eval for dev
      `style-src 'self' 'nonce-${nonce}'`,
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
}

/**
 * CORS headers configuration (if needed for API)
 *
 * @param allowedOrigins - Array of allowed origins
 * @returns {Record<string, string>} CORS headers
 */
export function getCORSHeaders(allowedOrigins: string[] = []): Record<string, string> {
  // For same-origin applications, CORS is not needed
  // Only add if you have cross-origin API requests

  if (allowedOrigins.length === 0) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigins.join(','),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true'
  };
}

/**
 * Example Astro middleware implementation
 *
 * Add this to src/middleware.ts or src/middleware/index.ts
 *
 * ```typescript
 * import { defineMiddleware } from 'astro:middleware';
 * import { applySecurityHeaders } from './lib/security/headers';
 *
 * export const onRequest = defineMiddleware(async (context, next) => {
 *   const response = await next();
 *   return applySecurityHeaders(response);
 * });
 * ```
 */

/**
 * Security headers validation
 *
 * Check if response has required security headers
 *
 * @param response - Response to check
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateSecurityHeaders(response: Response): {
  valid: boolean;
  missing: string[];
} {
  const requiredHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Content-Security-Policy'
  ];

  const missing: string[] = [];

  for (const header of requiredHeaders) {
    if (!response.headers.has(header)) {
      missing.push(header);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Remove sensitive headers from response
 *
 * Useful for hiding implementation details
 *
 * @param response - Response to clean
 * @returns {Response} Response without sensitive headers
 */
export function removeSensitiveHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  const sensitiveHeaders = [
    'Server',
    'X-Powered-By',
    'X-AspNet-Version',
    'X-AspNetMvc-Version'
  ];

  for (const header of sensitiveHeaders) {
    headers.delete(header);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
