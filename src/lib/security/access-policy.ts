/**
 * Role-based access policy for state-changing API requests.
 *
 * Enforced centrally in middleware so a new endpoint cannot forget its check. Each rule
 * names the roles allowed to call matching POST/PUT/PATCH/DELETE requests; administrators
 * are always allowed. Requests that match no rule are open to any signed-in user (for
 * actions every staff member performs, such as preparing a DV or requesting travel).
 *
 * Rules are evaluated in order and the first match wins, so put specific paths before
 * general ones. Reads (GET) are not restricted here.
 */

export type RoleName =
  | 'administrator'
  | 'director'
  | 'accountant'
  | 'budget_officer'
  | 'cashier'
  | 'division_staff';

export interface AccessRule {
  /** Path pattern; `*` matches one path segment, a trailing `**` matches the rest */
  pattern: string;
  /** Methods the rule applies to; defaults to all state-changing methods */
  methods?: string[];
  roles: RoleName[];
  /** Plain-language description used in the access-control documentation */
  description: string;
}

export const ACCESS_RULES: AccessRule[] = [
  // Administration (endpoints also check this themselves)
  { pattern: '/api/admin/**', roles: ['administrator'], description: 'User, role and system settings management' },

  // Accounting (General Ledger)
  { pattern: '/api/accounting/nca', roles: ['budget_officer', 'accountant'], description: 'Record Notices of Cash Allocation (NCA) received from DBM' },
  { pattern: '/api/accounting/**', roles: ['accountant'], description: 'Journal entry vouchers, posting and reversals, chart of accounts' },

  // Budget
  { pattern: '/api/budget/appropriations', roles: ['budget_officer'], description: 'Record appropriations' },
  { pattern: '/api/budget/allotments', roles: ['budget_officer'], description: 'Record allotments' },
  { pattern: '/api/budget/obligations/*/approve', roles: ['budget_officer'], description: 'Certify obligation requests (ORS/BURS)' },
  { pattern: '/api/budget/obligations/*/reject', roles: ['budget_officer'], description: 'Reject obligation requests' },
  { pattern: '/api/budget/obligations', roles: ['budget_officer', 'division_staff', 'accountant'], description: 'Prepare obligation requests' },

  // Payments and treasury
  { pattern: '/api/payments/**', roles: ['cashier', 'accountant'], description: 'Prepare, issue, clear and cancel checks and ADAs' },
  { pattern: '/api/cash/advances/*/status', roles: ['accountant', 'director', 'cashier'], description: 'Approve, release or return cash advances' },
  { pattern: '/api/cash/advances/*/liquidate', roles: ['accountant', 'cashier'], description: 'Liquidate cash advances' },
  { pattern: '/api/cash/advances', roles: ['administrator', 'accountant', 'cashier', 'budget_officer', 'division_staff', 'director'], description: 'Request a cash advance (any staff role)' },
  { pattern: '/api/cash/reconciliations/**', roles: ['accountant'], description: 'Prepare and complete bank reconciliations' },
  { pattern: '/api/cash/**', roles: ['cashier', 'accountant'], description: 'Official receipts, deposits, petty cash and cash position' },

  // Revenue
  { pattern: '/api/revenue/receivables/*/write-off', roles: ['director'], description: 'Write off receivables (head of agency)' },
  { pattern: '/api/revenue/**', roles: ['cashier', 'accountant'], description: 'Revenue sources, entries, receivables and collections' },

  // Payroll
  { pattern: '/api/payroll/**', roles: ['accountant'], description: 'Employees, payroll periods, deductions, remittances and 13th month pay' },

  // Assets
  { pattern: '/api/assets/disposals/**', roles: ['accountant', 'director'], description: 'Asset disposals' },
  { pattern: '/api/assets/**', roles: ['accountant'], description: 'Asset categories, fixed assets and depreciation' },

  // Travel
  { pattern: '/api/travel/*/approve', roles: ['director'], description: 'Approve itineraries of travel' },
  { pattern: '/api/travel/*/link-dv', roles: ['accountant', 'cashier'], description: 'Link a cash advance DV to a travel' },
];

const STATE_CHANGING = ['POST', 'PUT', 'PATCH', 'DELETE'];

function toRegExp(pattern: string): RegExp {
  // A trailing `**` covers the base path itself and everything below it
  const deep = pattern.endsWith('/**');
  const base = deep ? pattern.slice(0, -3) : pattern;
  const escaped = base
    .split('/')
    .map(segment => (segment === '*' ? '[^/]+' : segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${escaped}${deep ? '(?:/.+)?' : ''}/?$`);
}

const COMPILED = ACCESS_RULES.map(rule => ({ ...rule, regex: toRegExp(rule.pattern) }));

/**
 * Find the rule governing a request, or null when the request is unrestricted
 */
export function findAccessRule(method: string, pathname: string): AccessRule | null {
  const upper = method.toUpperCase();
  if (!STATE_CHANGING.includes(upper)) return null;

  const match = COMPILED.find(rule => (rule.methods ?? STATE_CHANGING).includes(upper) && rule.regex.test(pathname));
  return match ?? null;
}

/**
 * Decide whether a user with the given roles may make the request
 */
export function isRequestAllowed(method: string, pathname: string, userRoles: string[]): { allowed: boolean; rule: AccessRule | null } {
  const rule = findAccessRule(method, pathname);
  if (!rule) return { allowed: true, rule: null };
  if (userRoles.includes('administrator')) return { allowed: true, rule };
  return { allowed: rule.roles.some(role => userRoles.includes(role)), rule };
}

const ROLE_LABELS: Record<RoleName, string> = {
  administrator: 'Administrator',
  director: 'Director',
  accountant: 'Accountant',
  budget_officer: 'Budget Officer',
  cashier: 'Cashier',
  division_staff: 'Division Staff',
};

export function describeRoles(roles: RoleName[]): string {
  return roles.map(role => ROLE_LABELS[role] ?? role).join(', ');
}
