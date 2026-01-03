/**
 * Audit Logger Middleware
 * Automatically logs all CRUD operations for audit trail
 */

import { db } from '../db/connection';
import { auditLogs } from '../db/schema';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'SUBMIT'
  | 'PROCESS'
  | 'COMPLETE'
  | 'LOGIN'
  | 'LOGOUT';

export interface AuditLogParams {
  userId: number | null;
  action: AuditAction;
  tableName: string;
  recordId: number;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit entry
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      action: params.action,
      tableName: params.tableName,
      recordId: params.recordId,
      oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
      newValues: params.newValues ? JSON.stringify(params.newValues) : null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the application
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Extract IP address from request
 */
export function getIpAddress(request: Request): string | undefined {
  // Check various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // For Astro in development, we might not have a proper IP
  return 'unknown';
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

/**
 * Helper: Log CREATE action
 */
export async function logCreate(
  tableName: string,
  recordId: number,
  newValues: Record<string, any>,
  userId: number,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    action: 'CREATE',
    tableName,
    recordId,
    newValues,
    ipAddress: request ? getIpAddress(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Helper: Log UPDATE action
 */
export async function logUpdate(
  tableName: string,
  recordId: number,
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  userId: number,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    action: 'UPDATE',
    tableName,
    recordId,
    oldValues,
    newValues,
    ipAddress: request ? getIpAddress(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Helper: Log DELETE action
 */
export async function logDelete(
  tableName: string,
  recordId: number,
  oldValues: Record<string, any>,
  userId: number,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    action: 'DELETE',
    tableName,
    recordId,
    oldValues,
    ipAddress: request ? getIpAddress(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Helper: Log APPROVE action
 */
export async function logApprove(
  tableName: string,
  recordId: number,
  userId: number,
  additionalData?: Record<string, any>,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    action: 'APPROVE',
    tableName,
    recordId,
    newValues: additionalData,
    ipAddress: request ? getIpAddress(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Helper: Log REJECT action
 */
export async function logReject(
  tableName: string,
  recordId: number,
  userId: number,
  reason?: string,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    action: 'REJECT',
    tableName,
    recordId,
    newValues: reason ? { reason } : undefined,
    ipAddress: request ? getIpAddress(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Helper: Log CANCEL action
 */
export async function logCancel(
  tableName: string,
  recordId: number,
  userId: number,
  reason?: string,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    action: 'CANCEL',
    tableName,
    recordId,
    newValues: reason ? { reason } : undefined,
    ipAddress: request ? getIpAddress(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Helper: Log SUBMIT action
 */
export async function logSubmit(
  tableName: string,
  recordId: number,
  userId: number,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    action: 'SUBMIT',
    tableName,
    recordId,
    ipAddress: request ? getIpAddress(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Helper: Log PROCESS action (e.g., payroll processing)
 */
export async function logProcess(
  tableName: string,
  recordId: number,
  userId: number,
  processData?: Record<string, any>,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    action: 'PROCESS',
    tableName,
    recordId,
    newValues: processData,
    ipAddress: request ? getIpAddress(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Helper: Log user login
 */
export async function logLogin(
  userId: number,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    action: 'LOGIN',
    tableName: 'users',
    recordId: userId,
    ipAddress: request ? getIpAddress(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Helper: Log user logout
 */
export async function logLogout(
  userId: number,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    action: 'LOGOUT',
    tableName: 'users',
    recordId: userId,
    ipAddress: request ? getIpAddress(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Sanitize sensitive data before logging
 * Remove passwords and other sensitive fields
 */
export function sanitizeData(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Compare objects and return only changed fields
 */
export function getChangedFields(
  oldValues: Record<string, any>,
  newValues: Record<string, any>
): { old: Record<string, any>; new: Record<string, any> } {
  const changed = {
    old: {} as Record<string, any>,
    new: {} as Record<string, any>,
  };

  // Check all keys in newValues
  for (const key in newValues) {
    if (oldValues[key] !== newValues[key]) {
      changed.old[key] = oldValues[key];
      changed.new[key] = newValues[key];
    }
  }

  return changed;
}
