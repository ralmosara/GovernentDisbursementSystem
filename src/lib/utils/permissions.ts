/**
 * Permission checking utilities
 */

import { db } from '../db/connection';
import { userRoles, roles } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Check if a user has permission to view audit logs
 * Allowed roles: administrator, accountant, budget_officer
 */
export async function canViewAuditLogs(userId: number): Promise<boolean> {
  const userRoleRecords = await db
    .select({
      role: roles,
    })
    .from(userRoles)
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const userRoleNames = userRoleRecords.map(r => r.role?.name || '');

  return userRoleNames.some(role =>
    role === 'administrator' || role === 'accountant' || role === 'budget_officer'
  );
}

/**
 * Check if a user has a specific role
 */
export async function hasRole(userId: number, roleName: string): Promise<boolean> {
  const userRoleRecords = await db
    .select({
      role: roles,
    })
    .from(userRoles)
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const userRoleNames = userRoleRecords.map(r => r.role?.name || '');

  return userRoleNames.includes(roleName);
}

/**
 * Check if a user has any of the specified roles
 */
export async function hasAnyRole(userId: number, roleNames: string[]): Promise<boolean> {
  const userRoleRecords = await db
    .select({
      role: roles,
    })
    .from(userRoles)
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const userRoleNames = userRoleRecords.map(r => r.role?.name || '');

  return userRoleNames.some(role => roleNames.includes(role));
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: number): Promise<string[]> {
  const userRoleRecords = await db
    .select({
      role: roles,
    })
    .from(userRoles)
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return userRoleRecords.map(r => r.role?.name || '').filter(Boolean);
}
