/**
 * Rate Limiting Utility
 *
 * Implements in-memory rate limiting for authentication endpoints
 * to prevent brute force attacks.
 *
 * Features:
 * - IP-based rate limiting
 * - Username-based rate limiting
 * - Sliding window algorithm
 * - Automatic cleanup of old entries
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

// In-memory store for rate limiting
// In production, use Redis or database for distributed systems
const ipStore: RateLimitStore = {};
const usernameStore: RateLimitStore = {};

// Configuration
const RATE_LIMIT_CONFIG = {
  // Login attempts
  maxAttemptsPerIP: 10, // Max attempts per IP in window
  maxAttemptsPerUsername: 5, // Max attempts per username in window
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 60 * 60 * 1000, // 1 hour block after exceeding limit

  // Cleanup interval
  cleanupIntervalMs: 5 * 60 * 1000, // Clean up old entries every 5 minutes
};

// Automatic cleanup of old entries
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const windowAge = now - RATE_LIMIT_CONFIG.windowMs;

    // Clean up IP store
    for (const key in ipStore) {
      if (ipStore[key].lastAttempt < windowAge) {
        delete ipStore[key];
      }
    }

    // Clean up username store
    for (const key in usernameStore) {
      if (usernameStore[key].lastAttempt < windowAge) {
        delete usernameStore[key];
      }
    }
  }, RATE_LIMIT_CONFIG.cleanupIntervalMs);
}

// Start cleanup on module load
startCleanup();

/**
 * Extract IP address from request
 *
 * @param request - Request object
 * @returns {string} IP address
 */
export function getClientIP(request: Request): string {
  // Check common headers for proxied requests
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to connection remote address
  // Note: In Astro, this may not be directly available
  return 'unknown';
}

/**
 * Check if IP is rate limited
 *
 * @param ip - IP address
 * @returns {{ limited: boolean, remainingAttempts: number, resetTime: number }}
 */
export function checkIPRateLimit(ip: string): {
  limited: boolean;
  remainingAttempts: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = ipStore[ip];

  // No entry yet
  if (!entry) {
    return {
      limited: false,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttemptsPerIP,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs
    };
  }

  // Check if currently blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      limited: true,
      remainingAttempts: 0,
      resetTime: entry.blockedUntil
    };
  }

  // Check if window has expired
  if (now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    // Reset window
    delete ipStore[ip];
    return {
      limited: false,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttemptsPerIP,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs
    };
  }

  // Within window, check attempts
  const remaining = RATE_LIMIT_CONFIG.maxAttemptsPerIP - entry.attempts;

  return {
    limited: remaining <= 0,
    remainingAttempts: Math.max(0, remaining),
    resetTime: entry.firstAttempt + RATE_LIMIT_CONFIG.windowMs
  };
}

/**
 * Check if username is rate limited
 *
 * @param username - Username
 * @returns {{ limited: boolean, remainingAttempts: number, resetTime: number }}
 */
export function checkUsernameRateLimit(username: string): {
  limited: boolean;
  remainingAttempts: number;
  resetTime: number;
} {
  const now = Date.now();
  const key = username.toLowerCase();
  const entry = usernameStore[key];

  // No entry yet
  if (!entry) {
    return {
      limited: false,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttemptsPerUsername,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs
    };
  }

  // Check if currently blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      limited: true,
      remainingAttempts: 0,
      resetTime: entry.blockedUntil
    };
  }

  // Check if window has expired
  if (now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    // Reset window
    delete usernameStore[key];
    return {
      limited: false,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttemptsPerUsername,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs
    };
  }

  // Within window, check attempts
  const remaining = RATE_LIMIT_CONFIG.maxAttemptsPerUsername - entry.attempts;

  return {
    limited: remaining <= 0,
    remainingAttempts: Math.max(0, remaining),
    resetTime: entry.firstAttempt + RATE_LIMIT_CONFIG.windowMs
  };
}

/**
 * Record a failed login attempt
 *
 * @param ip - IP address
 * @param username - Username
 */
export function recordFailedAttempt(ip: string, username: string): void {
  const now = Date.now();

  // Record IP attempt
  if (!ipStore[ip]) {
    ipStore[ip] = {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now
    };
  } else {
    // Check if window expired
    if (now - ipStore[ip].firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
      ipStore[ip] = {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now
      };
    } else {
      ipStore[ip].attempts++;
      ipStore[ip].lastAttempt = now;

      // Block if exceeded limit
      if (ipStore[ip].attempts >= RATE_LIMIT_CONFIG.maxAttemptsPerIP) {
        ipStore[ip].blockedUntil = now + RATE_LIMIT_CONFIG.blockDurationMs;
      }
    }
  }

  // Record username attempt
  const key = username.toLowerCase();
  if (!usernameStore[key]) {
    usernameStore[key] = {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now
    };
  } else {
    // Check if window expired
    if (now - usernameStore[key].firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
      usernameStore[key] = {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now
      };
    } else {
      usernameStore[key].attempts++;
      usernameStore[key].lastAttempt = now;

      // Block if exceeded limit
      if (usernameStore[key].attempts >= RATE_LIMIT_CONFIG.maxAttemptsPerUsername) {
        usernameStore[key].blockedUntil = now + RATE_LIMIT_CONFIG.blockDurationMs;
      }
    }
  }
}

/**
 * Record a successful login (reset counters)
 *
 * @param ip - IP address
 * @param username - Username
 */
export function recordSuccessfulLogin(ip: string, username: string): void {
  delete ipStore[ip];
  delete usernameStore[username.toLowerCase()];
}

/**
 * Check if login attempt is allowed
 *
 * @param ip - IP address
 * @param username - Username
 * @returns {{ allowed: boolean, reason?: string, resetTime?: number }}
 */
export function checkLoginAllowed(ip: string, username: string): {
  allowed: boolean;
  reason?: string;
  resetTime?: number;
  remainingAttempts?: number;
} {
  const ipLimit = checkIPRateLimit(ip);
  const usernameLimit = checkUsernameRateLimit(username);

  if (ipLimit.limited) {
    const minutesRemaining = Math.ceil((ipLimit.resetTime - Date.now()) / 60000);
    return {
      allowed: false,
      reason: `Too many login attempts from this IP address. Please try again in ${minutesRemaining} minute(s).`,
      resetTime: ipLimit.resetTime
    };
  }

  if (usernameLimit.limited) {
    const minutesRemaining = Math.ceil((usernameLimit.resetTime - Date.now()) / 60000);
    return {
      allowed: false,
      reason: `Too many failed login attempts for this username. Please try again in ${minutesRemaining} minute(s).`,
      resetTime: usernameLimit.resetTime
    };
  }

  return {
    allowed: true,
    remainingAttempts: Math.min(ipLimit.remainingAttempts, usernameLimit.remainingAttempts)
  };
}

/**
 * Create a rate limit error response
 *
 * @param reason - Reason for rate limiting
 * @param resetTime - Unix timestamp when limit resets
 * @returns {Response} 429 Too Many Requests response
 */
export function rateLimitErrorResponse(reason: string, resetTime: number): Response {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: reason,
      retryAfter: retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString()
      }
    }
  );
}

/**
 * Manually clear rate limit for IP or username (admin function)
 *
 * @param identifier - IP address or username to clear
 */
export function clearRateLimit(identifier: string): void {
  delete ipStore[identifier];
  delete usernameStore[identifier.toLowerCase()];
}

/**
 * Get rate limit statistics (for monitoring/debugging)
 *
 * @returns {{ ipCount: number, usernameCount: number }}
 */
export function getRateLimitStats(): {
  ipCount: number;
  usernameCount: number;
  blockedIPs: number;
  blockedUsernames: number;
} {
  const now = Date.now();

  const blockedIPs = Object.values(ipStore).filter(
    entry => entry.blockedUntil && entry.blockedUntil > now
  ).length;

  const blockedUsernames = Object.values(usernameStore).filter(
    entry => entry.blockedUntil && entry.blockedUntil > now
  ).length;

  return {
    ipCount: Object.keys(ipStore).length,
    usernameCount: Object.keys(usernameStore).length,
    blockedIPs,
    blockedUsernames
  };
}
