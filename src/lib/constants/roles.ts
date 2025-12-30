/**
 * User Role Constants
 * Philippine Government Financial Management System
 */

export const ROLE_NAMES = {
  ADMINISTRATOR: 'administrator',
  DIRECTOR: 'director',
  ACCOUNTANT: 'accountant',
  BUDGET_OFFICER: 'budget_officer',
  CASHIER: 'cashier',
  DIVISION_STAFF: 'division_staff',
} as const;

export const ROLE_DISPLAY_NAMES = {
  [ROLE_NAMES.ADMINISTRATOR]: 'Administrator',
  [ROLE_NAMES.DIRECTOR]: 'Director',
  [ROLE_NAMES.ACCOUNTANT]: 'Accountant',
  [ROLE_NAMES.BUDGET_OFFICER]: 'Budget Officer',
  [ROLE_NAMES.CASHIER]: 'Cashier',
  [ROLE_NAMES.DIVISION_STAFF]: 'Division Staff',
} as const;

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES];

/**
 * Permission Categories
 */
export const PERMISSIONS = {
  USERS: {
    CREATE: 'users:create',
    READ: 'users:read',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
  },
  DISBURSEMENTS: {
    CREATE: 'disbursements:create',
    READ: 'disbursements:read',
    UPDATE: 'disbursements:update',
    DELETE: 'disbursements:delete',
    APPROVE: 'disbursements:approve',
  },
  BUDGET: {
    CREATE: 'budget:create',
    READ: 'budget:read',
    UPDATE: 'budget:update',
    DELETE: 'budget:delete',
  },
  PAYMENTS: {
    CREATE: 'payments:create',
    READ: 'payments:read',
    UPDATE: 'payments:update',
    DELETE: 'payments:delete',
    APPROVE: 'payments:approve',
  },
  TRAVEL: {
    CREATE: 'travel:create',
    READ: 'travel:read',
    UPDATE: 'travel:update',
    DELETE: 'travel:delete',
    APPROVE: 'travel:approve',
  },
  CASH: {
    CREATE: 'cash:create',
    READ: 'cash:read',
    UPDATE: 'cash:update',
    DELETE: 'cash:delete',
  },
  REVENUE: {
    CREATE: 'revenue:create',
    READ: 'revenue:read',
    UPDATE: 'revenue:update',
    DELETE: 'revenue:delete',
  },
  ASSETS: {
    CREATE: 'assets:create',
    READ: 'assets:read',
    UPDATE: 'assets:update',
    DELETE: 'assets:delete',
  },
  PAYROLL: {
    CREATE: 'payroll:create',
    READ: 'payroll:read',
    UPDATE: 'payroll:update',
    DELETE: 'payroll:delete',
  },
  REPORTS: {
    GENERATE: 'reports:generate',
    EXPORT: 'reports:export',
  },
  SETTINGS: {
    MANAGE: 'settings:manage',
  },
} as const;
