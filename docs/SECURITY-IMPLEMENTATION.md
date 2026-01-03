# Security Implementation Guide

This document provides step-by-step instructions for implementing the security features created in Phase 12.

## Overview

Three security utilities have been created:
1. **CSRF Protection** - Prevents Cross-Site Request Forgery attacks
2. **Rate Limiting** - Prevents brute force authentication attacks
3. **Security Headers** - Implements defense-in-depth HTTP security headers

---

## 1. CSRF Protection Implementation

### Files Created
- `src/lib/security/csrf.ts` - CSRF token generation and validation

### Step 1: Update Login Page to Include CSRF Token

Edit `src/pages/login.astro`:

```astro
---
import { ensureCSRFToken } from '../lib/security/csrf';

const csrfToken = ensureCSRFToken(Astro.cookies);
---

<form method="POST" action="/api/auth/login">
  <!-- Add hidden CSRF token field -->
  <input type="hidden" name="csrf_token" value={csrfToken} />

  <input type="text" name="username" required />
  <input type="password" name="password" required />
  <button type="submit">Login</button>
</form>
```

### Step 2: Update Login API Endpoint

Edit `src/pages/api/auth/login.ts`:

```typescript
import type { APIRoute } from 'astro';
import { requireCSRF, csrfErrorResponse } from '../../../lib/security/csrf';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Validate CSRF token
  const csrfValid = await requireCSRF(cookies, request);
  if (!csrfValid) {
    return csrfErrorResponse();
  }

  // Continue with login logic...
  // ...
};
```

### Step 3: Update All State-Changing Endpoints

Apply CSRF protection to all endpoints that modify data:

**Disbursement creation:**
```typescript
// src/pages/api/disbursements/index.ts
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await requireCSRF(cookies, request)) {
    return csrfErrorResponse();
  }
  // ... continue with creation logic
};
```

**Approval actions:**
```typescript
// src/pages/api/disbursements/[id]/approve.ts
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await requireCSRF(cookies, request)) {
    return csrfErrorResponse();
  }
  // ... continue with approval logic
};
```

### Step 4: Update Vue Components for AJAX Requests

For Vue components making AJAX requests, include CSRF token in headers:

```vue
<script setup lang="ts">
import { ref } from 'vue';

// Get CSRF token from meta tag or props
const csrfToken = ref(document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'));

async function submitForm() {
  const response = await fetch('/api/disbursements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken.value || ''
    },
    body: JSON.stringify(formData)
  });

  if (response.status === 403) {
    // CSRF validation failed - refresh page
    alert('Session expired. Please refresh the page.');
    window.location.reload();
  }
}
</script>
```

### Step 5: Add CSRF Token to Layout

Edit `src/layouts/Layout.astro`:

```astro
---
import { ensureCSRFToken } from '../lib/security/csrf';

const csrfToken = ensureCSRFToken(Astro.cookies);
---

<html>
<head>
  <meta name="csrf-token" content={csrfToken} />
  <!-- ... other head content ... -->
</head>
<body>
  <!-- ... body content ... -->
</body>
</html>
```

---

## 2. Rate Limiting Implementation

### Files Created
- `src/lib/security/rate-limit.ts` - Rate limiting for authentication

### Step 1: Update Login API Endpoint

Edit `src/pages/api/auth/login.ts`:

```typescript
import type { APIRoute } from 'astro';
import { requireCSRF, csrfErrorResponse } from '../../../lib/security/csrf';
import {
  getClientIP,
  checkLoginAllowed,
  recordFailedAttempt,
  recordSuccessfulLogin,
  rateLimitErrorResponse
} from '../../../lib/security/rate-limit';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Validate CSRF token
  if (!await requireCSRF(cookies, request)) {
    return csrfErrorResponse();
  }

  // Get request data
  const formData = await request.formData();
  const username = formData.get('username')?.toString() || '';
  const password = formData.get('password')?.toString() || '';

  // Get client IP
  const clientIP = getClientIP(request);

  // Check rate limiting
  const rateLimitCheck = checkLoginAllowed(clientIP, username);
  if (!rateLimitCheck.allowed) {
    return rateLimitErrorResponse(
      rateLimitCheck.reason || 'Too many requests',
      rateLimitCheck.resetTime || Date.now() + 60000
    );
  }

  // Attempt authentication
  const user = await authenticateUser(username, password);

  if (!user) {
    // Record failed attempt
    recordFailedAttempt(clientIP, username);

    return new Response(
      JSON.stringify({
        error: 'Invalid credentials',
        remainingAttempts: rateLimitCheck.remainingAttempts
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Record successful login (resets counters)
  recordSuccessfulLogin(clientIP, username);

  // Create session and return success
  // ... session creation logic ...

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

### Step 2: Add Rate Limit Information to Login Page

Update the login form to show remaining attempts:

```vue
<template>
  <div v-if="rateLimitError" class="error-message">
    {{ rateLimitMessage }}
  </div>
  <div v-if="remainingAttempts && remainingAttempts < 3" class="warning-message">
    Warning: {{ remainingAttempts }} login attempt(s) remaining before temporary lockout.
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const rateLimitError = ref(false);
const rateLimitMessage = ref('');
const remainingAttempts = ref<number | null>(null);

async function handleLogin() {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, csrf_token })
  });

  if (response.status === 429) {
    const data = await response.json();
    rateLimitError.value = true;
    rateLimitMessage.value = data.message;
  } else if (response.status === 401) {
    const data = await response.json();
    remainingAttempts.value = data.remainingAttempts;
  }
}
</script>
```

### Step 3: Optional - Admin Rate Limit Dashboard

Create an admin endpoint to monitor rate limiting:

```typescript
// src/pages/api/admin/rate-limit-stats.ts
import type { APIRoute } from 'astro';
import { getRateLimitStats } from '../../../lib/security/rate-limit';
import { hasPermission } from '../../../lib/utils/permissions';

export const GET: APIRoute = async ({ locals }) => {
  // Check admin permission
  if (!locals.user || !hasPermission(locals.user.role, 'view_admin_dashboard')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const stats = getRateLimitStats();

  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

---

## 3. Security Headers Implementation

### Files Created
- `src/lib/security/headers.ts` - HTTP security headers

### Method 1: Astro Middleware (Recommended)

Create or update `src/middleware.ts`:

```typescript
import { defineMiddleware } from 'astro:middleware';
import { applySecurityHeaders } from './lib/security/headers';

export const onRequest = defineMiddleware(async (context, next) => {
  // Process request
  const response = await next();

  // Apply security headers to response
  return applySecurityHeaders(response);
});
```

### Method 2: Apply to Individual Endpoints

For individual API routes:

```typescript
import type { APIRoute } from 'astro';
import { applySecurityHeaders } from '../../../lib/security/headers';

export const GET: APIRoute = async ({ request }) => {
  const response = new Response(
    JSON.stringify({ data: 'example' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  return applySecurityHeaders(response);
};
```

### Method 3: Server Configuration (Production - Nginx/Apache)

For production deployments, configure security headers in your web server.

**Nginx Configuration:**

```nginx
# Add to your server block in nginx.conf

server {
    # ... other configuration ...

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Content Security Policy
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;

    # HSTS (only with valid SSL certificate)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
}
```

**Apache Configuration (.htaccess):**

```apache
# Security Headers

# X-Content-Type-Options
Header always set X-Content-Type-Options "nosniff"

# X-Frame-Options
Header always set X-Frame-Options "DENY"

# X-XSS-Protection
Header always set X-XSS-Protection "1; mode=block"

# Referrer Policy
Header always set Referrer-Policy "strict-origin-when-cross-origin"

# Permissions Policy
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"

# Content Security Policy
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"

# HSTS (only with valid SSL certificate)
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
```

### Step 2: Adjust CSP for Your Application

The default CSP is strict. You may need to adjust it for:

1. **Inline scripts/styles** - Use nonces instead of 'unsafe-inline'
2. **External resources** - Add trusted domains
3. **Development** - More relaxed policy (already configured in DEV_SECURITY_HEADERS)

Example with nonces:

```typescript
// In your Astro page
import { generateCSPNonce, buildCSPWithNonce } from '../lib/security/headers';

const nonce = generateCSPNonce();
const csp = buildCSPWithNonce(nonce);

// Set CSP header with nonce
Astro.response.headers.set('Content-Security-Policy', csp);

// Use nonce in inline scripts
<script nonce={nonce}>
  console.log('This inline script is allowed');
</script>
```

---

## 4. Testing Security Implementation

### Test CSRF Protection

```bash
# This should fail (no CSRF token)
curl -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Expected: 403 Forbidden with CSRF error
```

### Test Rate Limiting

```bash
# Send multiple failed login attempts
for i in {1..11}; do
  curl -X POST http://localhost:4321/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}'
  sleep 1
done

# Expected: 429 Too Many Requests after 10 attempts
```

### Test Security Headers

```bash
# Check security headers
curl -I http://localhost:4321/

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: ...
```

### Test with Browser DevTools

1. Open browser DevTools (F12)
2. Go to Network tab
3. Load any page
4. Check Response Headers for security headers
5. Check Console for CSP violations

---

## 5. Monitoring and Maintenance

### Monitor Rate Limiting

Create a dashboard to monitor:
- Number of rate-limited IPs
- Number of rate-limited usernames
- Failed login attempts

### Monitor CSP Violations

Set up CSP reporting:

```typescript
// Add report-uri to CSP
const csp = "default-src 'self'; ... report-uri /api/csp-report";
```

Create CSP report endpoint:

```typescript
// src/pages/api/csp-report.ts
export const POST: APIRoute = async ({ request }) => {
  const report = await request.json();
  console.error('CSP Violation:', report);

  // Log to monitoring service
  // await logToMonitoring('csp-violation', report);

  return new Response(null, { status: 204 });
};
```

### Security Headers Checklist

Use this checklist to verify security headers are properly configured:

- [ ] X-Content-Type-Options is set to "nosniff"
- [ ] X-Frame-Options is set to "DENY" or "SAMEORIGIN"
- [ ] Content-Security-Policy is configured and tested
- [ ] Strict-Transport-Security is set (production with HTTPS only)
- [ ] Referrer-Policy is configured
- [ ] Permissions-Policy is configured
- [ ] No sensitive headers (Server, X-Powered-By) are exposed

---

## 6. Production Deployment Checklist

Before deploying to production:

### CSRF Protection
- [ ] All forms include CSRF token
- [ ] All state-changing API endpoints validate CSRF
- [ ] Vue components include CSRF token in AJAX requests
- [ ] CSRF token is in layout meta tag

### Rate Limiting
- [ ] Login endpoint uses rate limiting
- [ ] Client IP extraction works behind proxy
- [ ] Failed attempts are logged
- [ ] Consider Redis for distributed deployments

### Security Headers
- [ ] Security headers middleware is enabled
- [ ] CSP policy is tested and doesn't break functionality
- [ ] HSTS is enabled (with valid SSL certificate)
- [ ] Headers are verified with online tools (securityheaders.com)

### Testing
- [ ] All security features are tested
- [ ] No CSP violations in browser console
- [ ] Rate limiting works as expected
- [ ] CSRF protection doesn't block legitimate requests

### Documentation
- [ ] Security implementation is documented
- [ ] Team is trained on security features
- [ ] Incident response plan is in place

---

## 7. Additional Resources

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Content Security Policy (CSP) Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Security Headers Tester](https://securityheaders.com/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

---

**Last Updated:** January 3, 2026
**Version:** 1.0
**Status:** Ready for Implementation
