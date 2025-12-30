/**
 * Central export for all constants
 */

export * from './roles';
export * from './fund-clusters';
export * from './object-expenditure';

/**
 * DV Status Constants
 */
export const DV_STATUS = {
  DRAFT: 'draft',
  PENDING_BUDGET: 'pending_budget',
  PENDING_ACCOUNTING: 'pending_accounting',
  PENDING_DIRECTOR: 'pending_director',
  APPROVED: 'approved',
  PAID: 'paid',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const DV_STATUS_NAMES = {
  [DV_STATUS.DRAFT]: 'Draft',
  [DV_STATUS.PENDING_BUDGET]: 'Pending Budget Approval',
  [DV_STATUS.PENDING_ACCOUNTING]: 'Pending Accounting Approval',
  [DV_STATUS.PENDING_DIRECTOR]: 'Pending Director Approval',
  [DV_STATUS.APPROVED]: 'Approved',
  [DV_STATUS.PAID]: 'Paid',
  [DV_STATUS.REJECTED]: 'Rejected',
  [DV_STATUS.CANCELLED]: 'Cancelled',
} as const;

/**
 * Payment Mode Constants
 */
export const PAYMENT_MODES = {
  MDS_CHECK: 'mds_check',
  COMMERCIAL_CHECK: 'commercial_check',
  ADA: 'ada',
  OTHER: 'other',
} as const;

export const PAYMENT_MODE_NAMES = {
  [PAYMENT_MODES.MDS_CHECK]: 'MDS Check',
  [PAYMENT_MODES.COMMERCIAL_CHECK]: 'Commercial Check',
  [PAYMENT_MODES.ADA]: 'Advice to Debit Account (ADA)',
  [PAYMENT_MODES.OTHER]: 'Other',
} as const;

/**
 * Payment Status Constants
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  ISSUED: 'issued',
  CLEARED: 'cleared',
  CANCELLED: 'cancelled',
  STALE: 'stale',
} as const;

/**
 * Approval Stage Constants
 */
export const APPROVAL_STAGES = {
  DIVISION: 'division',
  BUDGET: 'budget',
  ACCOUNTING: 'accounting',
  DIRECTOR: 'director',
} as const;

export const APPROVAL_STAGE_NAMES = {
  [APPROVAL_STAGES.DIVISION]: 'Division Review',
  [APPROVAL_STAGES.BUDGET]: 'Budget Officer Review',
  [APPROVAL_STAGES.ACCOUNTING]: 'Accounting Review',
  [APPROVAL_STAGES.DIRECTOR]: 'Director Approval',
} as const;

/**
 * Approval Action Constants
 */
export const APPROVAL_ACTIONS = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RETURNED: 'returned',
} as const;

/**
 * Travel Status Constants
 */
export const TRAVEL_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

/**
 * File Upload Constants
 */
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['pdf', 'jpeg', 'jpg', 'png', 'xlsx', 'docx'],
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
} as const;

/**
 * Date Format Constants
 */
export const DATE_FORMATS = {
  DISPLAY: 'MMMM DD, YYYY',
  SHORT: 'MM/DD/YYYY',
  ISO: 'YYYY-MM-DD',
  TIMESTAMP: 'YYYY-MM-DD HH:mm:ss',
} as const;

/**
 * Pagination Constants
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;
