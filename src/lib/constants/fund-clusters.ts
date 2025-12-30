/**
 * Fund Cluster Constants
 * Philippine Government Accounting Standards
 * Based on COA Chart of Accounts and GAM Volume II
 */

export const FUND_CLUSTER_CODES = {
  REGULAR: '01',
  FOREIGN_ASSISTED_PROJECTS: '02',
  SPECIAL_ACCOUNT_LOCAL: '03',
  SPECIAL_ACCOUNT_FOREIGN: '04',
  TRUST_RECEIPTS: '05',
  TRUST_LIABILITIES: '06',
  INTRA_AGENCY: '07',
} as const;

export const FUND_CLUSTER_NAMES = {
  [FUND_CLUSTER_CODES.REGULAR]: 'Regular Agency Fund',
  [FUND_CLUSTER_CODES.FOREIGN_ASSISTED_PROJECTS]: 'Foreign Assisted Projects',
  [FUND_CLUSTER_CODES.SPECIAL_ACCOUNT_LOCAL]: 'Special Account - Locally Funded/Domestic Grants',
  [FUND_CLUSTER_CODES.SPECIAL_ACCOUNT_FOREIGN]: 'Special Account - Foreign Assisted/Foreign Grants',
  [FUND_CLUSTER_CODES.TRUST_RECEIPTS]: 'Trust Receipts',
  [FUND_CLUSTER_CODES.TRUST_LIABILITIES]: 'Trust Liabilities',
  [FUND_CLUSTER_CODES.INTRA_AGENCY]: 'Intra-Agency Fund Transfers',
} as const;

export const FUND_CLUSTER_DESCRIPTIONS = {
  [FUND_CLUSTER_CODES.REGULAR]: 'For regular operating expenses',
  [FUND_CLUSTER_CODES.FOREIGN_ASSISTED_PROJECTS]: 'For foreign-assisted project funds',
  [FUND_CLUSTER_CODES.SPECIAL_ACCOUNT_LOCAL]: 'For locally funded special accounts',
  [FUND_CLUSTER_CODES.SPECIAL_ACCOUNT_FOREIGN]: 'For foreign-assisted special accounts',
  [FUND_CLUSTER_CODES.TRUST_RECEIPTS]: 'For trust receipt funds',
  [FUND_CLUSTER_CODES.TRUST_LIABILITIES]: 'For trust liability funds',
  [FUND_CLUSTER_CODES.INTRA_AGENCY]: 'For intra-agency fund transfers',
} as const;

export type FundClusterCode = typeof FUND_CLUSTER_CODES[keyof typeof FUND_CLUSTER_CODES];
