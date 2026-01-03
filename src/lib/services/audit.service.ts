/**
 * Audit Service
 * Handles retrieval and management of audit logs
 */

import { db } from '../db/connection';
import { auditLogs, users } from '../db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  tableName: string;
  recordId: number;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditLogWithUser extends AuditLog {
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(filters?: {
  userId?: number;
  action?: string;
  tableName?: string;
  recordId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<AuditLogWithUser[]> {
  // Build query with joins
  let query = db
    .select({
      auditLog: auditLogs,
      user: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt));

  // Apply limit and offset
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as any;
  }

  const results = await query;

  // Filter in-memory (for simplicity - in production use SQL WHERE clauses)
  let filtered = results;

  if (filters) {
    if (filters.userId) {
      filtered = filtered.filter(r => r.auditLog.userId === filters.userId);
    }
    if (filters.action) {
      filtered = filtered.filter(r => r.auditLog.action === filters.action);
    }
    if (filters.tableName) {
      filtered = filtered.filter(r => r.auditLog.tableName === filters.tableName);
    }
    if (filters.recordId) {
      filtered = filtered.filter(r => r.auditLog.recordId === filters.recordId);
    }
    if (filters.startDate) {
      filtered = filtered.filter(
        r => new Date(r.auditLog.createdAt) >= filters.startDate!
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(
        r => new Date(r.auditLog.createdAt) <= filters.endDate!
      );
    }
  }

  // Transform results
  return filtered.map(r => ({
    ...r.auditLog,
    oldValues: r.auditLog.oldValues ? JSON.parse(r.auditLog.oldValues as any) : null,
    newValues: r.auditLog.newValues ? JSON.parse(r.auditLog.newValues as any) : null,
    user: r.user,
  }));
}

/**
 * Get a single audit log by ID
 */
export async function getAuditLogById(id: number): Promise<AuditLogWithUser | null> {
  const results = await db
    .select({
      auditLog: auditLogs,
      user: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.id, id))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const result = results[0];
  return {
    ...result.auditLog,
    oldValues: result.auditLog.oldValues
      ? JSON.parse(result.auditLog.oldValues as any)
      : null,
    newValues: result.auditLog.newValues
      ? JSON.parse(result.auditLog.newValues as any)
      : null,
    user: result.user,
  };
}

/**
 * Get complete change history for a specific record
 */
export async function getRecordHistory(
  tableName: string,
  recordId: number
): Promise<AuditLogWithUser[]> {
  return await getAuditLogs({ tableName, recordId });
}

/**
 * Get user activity logs
 */
export async function getUserActivity(
  userId: number,
  limit?: number
): Promise<AuditLogWithUser[]> {
  return await getAuditLogs({ userId, limit: limit || 50 });
}

/**
 * Get recent activity (last N logs)
 */
export async function getRecentActivity(limit: number = 10): Promise<AuditLogWithUser[]> {
  return await getAuditLogs({ limit });
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(): Promise<{
  totalLogs: number;
  byAction: Record<string, number>;
  byTable: Record<string, number>;
  byUser: Record<string, number>;
}> {
  const allLogs = await db.select().from(auditLogs);

  const stats = {
    totalLogs: allLogs.length,
    byAction: {} as Record<string, number>,
    byTable: {} as Record<string, number>,
    byUser: {} as Record<string, number>,
  };

  allLogs.forEach(log => {
    // Count by action
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

    // Count by table
    stats.byTable[log.tableName] = (stats.byTable[log.tableName] || 0) + 1;

    // Count by user
    if (log.userId) {
      const userKey = log.userId.toString();
      stats.byUser[userKey] = (stats.byUser[userKey] || 0) + 1;
    }
  });

  return stats;
}

/**
 * Get unique table names from audit logs
 */
export async function getAuditedTables(): Promise<string[]> {
  const results = await db
    .selectDistinct({ tableName: auditLogs.tableName })
    .from(auditLogs);

  return results.map(r => r.tableName).sort();
}

/**
 * Get unique actions from audit logs
 */
export async function getAuditActions(): Promise<string[]> {
  const results = await db
    .selectDistinct({ action: auditLogs.action })
    .from(auditLogs);

  return results.map(r => r.action).sort();
}

/**
 * Count total audit logs
 */
export async function countAuditLogs(filters?: {
  userId?: number;
  action?: string;
  tableName?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<number> {
  const logs = await getAuditLogs(filters);
  return logs.length;
}

/**
 * Export audit logs to CSV format
 */
export function exportAuditLogsToCSV(logs: AuditLogWithUser[]): string {
  const headers = [
    'ID',
    'Date/Time',
    'User',
    'Action',
    'Table',
    'Record ID',
    'IP Address',
    'Changes',
  ];

  const rows = logs.map(log => {
    const user = log.user
      ? `${log.user.firstName} ${log.user.lastName} (${log.user.username})`
      : 'System';

    const changes = [];
    if (log.oldValues) {
      changes.push(`Old: ${JSON.stringify(log.oldValues)}`);
    }
    if (log.newValues) {
      changes.push(`New: ${JSON.stringify(log.newValues)}`);
    }

    return [
      log.id,
      new Date(log.createdAt).toLocaleString('en-PH'),
      user,
      log.action,
      log.tableName,
      log.recordId,
      log.ipAddress || '',
      changes.join(' | '),
    ];
  });

  // Build CSV
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  return csv;
}

export const auditService = {
  getAuditLogs,
  getAuditLogById,
  getRecordHistory,
  getUserActivity,
  getRecentActivity,
  getAuditStats,
  getAuditedTables,
  getAuditActions,
  countAuditLogs,
  exportAuditLogsToCSV,
};
