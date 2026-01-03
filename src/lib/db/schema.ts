import { mysqlTable, varchar, text, int, decimal, datetime, boolean, json, mysqlEnum, timestamp, primaryKey, date } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// ============================================
// 1. AUTHENTICATION & USER MANAGEMENT
// ============================================

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  employeeNo: varchar('employee_no', { length: 50 }).unique().notNull(),
  username: varchar('username', { length: 100 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),
  position: varchar('position', { length: 100 }),
  divisionOffice: varchar('division_office', { length: 100 }),
  isActive: boolean('is_active').default(true),
  lastLoginAt: datetime('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: datetime('deleted_at'),
});

export const roles = mysqlTable('roles', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 50 }).unique().notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  description: text('description'),
  permissions: json('permissions'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const userRoles = mysqlTable('user_roles', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  roleId: int('role_id').notNull(),
  assignedAt: timestamp('assigned_at').defaultNow(),
  assignedBy: int('assigned_by'),
}, (table) => ({
  unique: [table.userId, table.roleId]
}));

export const sessions = mysqlTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: int('user_id').notNull(),
  expiresAt: datetime('expires_at').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 2. FUND CLUSTERS & BUDGET STRUCTURE
// ============================================

export const fundClusters = mysqlTable('fund_clusters', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 10 }).unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const mfoPap = mysqlTable('mfo_pap', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  mfoCategory: mysqlEnum('mfo_category', [
    'regulation_lgu_finance',
    'policy_formulation',
    'revenue_evaluation',
    'special_projects',
    'training'
  ]).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const objectOfExpenditure = mysqlTable('object_of_expenditure', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description'),
  parentId: int('parent_id'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 3. BUDGET MANAGEMENT
// ============================================

export const registryAppropriations = mysqlTable('registry_appropriations', {
  id: int('id').primaryKey().autoincrement(),
  fundClusterId: int('fund_cluster_id').notNull(),
  year: int('year').notNull(),
  reference: varchar('reference', { length: 100 }).notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const registryAllotments = mysqlTable('registry_allotments', {
  id: int('id').primaryKey().autoincrement(),
  appropriationId: int('appropriation_id').notNull(),
  objectOfExpenditureId: int('object_of_expenditure_id').notNull(),
  mfoPapId: int('mfo_pap_id'),
  allotmentClass: varchar('allotment_class', { length: 100 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  purpose: text('purpose').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const registryObligations = mysqlTable('registry_obligations', {
  id: int('id').primaryKey().autoincrement(),
  allotmentId: int('allotment_id').notNull(),
  payee: varchar('payee', { length: 255 }).notNull(),
  particulars: text('particulars').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  orsNumber: varchar('ors_number', { length: 50 }),
  bursNumber: varchar('burs_number', { length: 50 }),
  obligationDate: datetime('obligation_date').notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  remarks: text('remarks'),
  createdBy: int('created_by').notNull(),
  approvedBy: int('approved_by'),
  approvedAt: datetime('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ============================================
// 4. DISBURSEMENT VOUCHERS
// ============================================

export const disbursementVouchers = mysqlTable('disbursement_vouchers', {
  id: int('id').primaryKey().autoincrement(),
  dvNo: varchar('dv_no', { length: 50 }).unique().notNull(),
  fundClusterId: int('fund_cluster_id').notNull(),
  orsBursNo: varchar('ors_burs_no', { length: 50 }).notNull(),
  dvDate: datetime('dv_date').notNull(),
  fiscalYear: int('fiscal_year').notNull(),

  // Payee Information
  payeeName: varchar('payee_name', { length: 255 }).notNull(),
  payeeTin: varchar('payee_tin', { length: 50 }),
  payeeAddress: text('payee_address'),

  // Transaction Details
  particulars: text('particulars').notNull(),
  responsibilityCenter: varchar('responsibility_center', { length: 100 }),
  mfoPapId: int('mfo_pap_id'),
  objectExpenditureId: int('object_expenditure_id').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),

  // Payment Mode
  paymentMode: mysqlEnum('payment_mode', ['mds_check', 'commercial_check', 'ada', 'other']).notNull(),

  // Approval Workflow Status
  status: mysqlEnum('status', [
    'draft',
    'pending_budget',
    'pending_accounting',
    'pending_director',
    'approved',
    'paid',
    'rejected',
    'cancelled'
  ]).default('draft'),

  // Certification Boxes
  certBoxAUserId: int('cert_box_a_user_id'),
  certBoxADate: datetime('cert_box_a_date'),
  certBoxASignature: text('cert_box_a_signature'),

  certBoxBAccountingEntry: json('cert_box_b_accounting_entry'),

  certBoxCUserId: int('cert_box_c_user_id'),
  certBoxCDate: datetime('cert_box_c_date'),
  certBoxCCashAvailable: boolean('cert_box_c_cash_available'),
  certBoxCSubjectToAda: boolean('cert_box_c_subject_to_ada'),

  certBoxDUserId: int('cert_box_d_user_id'),
  certBoxDDate: datetime('cert_box_d_date'),
  certBoxDApproved: boolean('cert_box_d_approved'),

  certBoxEPayeeSignature: text('cert_box_e_payee_signature'),
  certBoxEReceiptDate: datetime('cert_box_e_receipt_date'),
  certBoxECheckNo: varchar('cert_box_e_check_no', { length: 50 }),
  certBoxEBankName: varchar('cert_box_e_bank_name', { length: 100 }),
  certBoxEAccountNo: varchar('cert_box_e_account_no', { length: 50 }),
  certBoxEOrNo: varchar('cert_box_e_or_no', { length: 50 }),
  certBoxEOrDate: datetime('cert_box_e_or_date'),

  // Journal Entry
  jevNo: varchar('jev_no', { length: 50 }),
  jevDate: datetime('jev_date'),

  // Metadata
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: datetime('deleted_at'),
});

// ============================================
// 5. APPROVAL WORKFLOW
// ============================================

export const approvalWorkflows = mysqlTable('approval_workflows', {
  id: int('id').primaryKey().autoincrement(),
  dvId: int('dv_id').notNull(),
  stage: mysqlEnum('stage', ['division', 'budget', 'accounting', 'director']).notNull(),
  stageOrder: int('stage_order').notNull(),
  approverRoleId: int('approver_role_id').notNull(),
  approverUserId: int('approver_user_id'),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected', 'skipped']).default('pending'),
  comments: text('comments'),
  actionDate: datetime('action_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 6. PAYMENTS (CHECKS & ADA)
// ============================================

export const payments = mysqlTable('payments', {
  id: int('id').primaryKey().autoincrement(),
  dvId: int('dv_id').notNull(),
  paymentType: mysqlEnum('payment_type', ['check_mds', 'check_commercial', 'ada', 'cash']).notNull(),
  paymentDate: datetime('payment_date').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),

  // Check Details
  checkNo: varchar('check_no', { length: 50 }),
  bankName: varchar('bank_name', { length: 100 }),
  bankAccountNo: varchar('bank_account_no', { length: 50 }),

  // ADA Details
  adaReference: varchar('ada_reference', { length: 100 }),
  adaIssuedDate: datetime('ada_issued_date'),

  // Payment Status
  status: mysqlEnum('status', ['pending', 'issued', 'cleared', 'cancelled', 'stale']).default('pending'),
  clearedDate: datetime('cleared_date'),

  // Payee Receipt
  receivedBy: varchar('received_by', { length: 255 }),
  receivedDate: datetime('received_date'),
  orNo: varchar('or_no', { length: 50 }),
  orDate: datetime('or_date'),

  remarks: text('remarks'),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const checkDisbursementRecords = mysqlTable('check_disbursement_records', {
  id: int('id').primaryKey().autoincrement(),
  paymentId: int('payment_id').notNull(),
  fundClusterId: int('fund_cluster_id').notNull(),
  recordDate: datetime('record_date').notNull(),
  ncaBalance: decimal('nca_balance', { precision: 15, scale: 2 }),
  bankBalance: decimal('bank_balance', { precision: 15, scale: 2 }),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 7. TRAVEL MANAGEMENT
// ============================================

export const itineraryOfTravel = mysqlTable('itinerary_of_travel', {
  id: int('id').primaryKey().autoincrement(),
  iotNo: varchar('iot_no', { length: 50 }).unique().notNull(),
  fundClusterId: int('fund_cluster_id').notNull(),
  employeeId: int('employee_id').notNull(),

  // Travel Details
  purpose: text('purpose').notNull(),
  departureDate: datetime('departure_date').notNull(),
  returnDate: datetime('return_date').notNull(),
  destination: varchar('destination', { length: 255 }).notNull(),

  // Itinerary
  itineraryBefore: json('itinerary_before'),
  itineraryActual: json('itinerary_actual'),

  // Financial
  estimatedCost: decimal('estimated_cost', { precision: 15, scale: 2 }).notNull(),
  cashAdvanceAmount: decimal('cash_advance_amount', { precision: 15, scale: 2 }),
  dvId: int('dv_id'),

  status: mysqlEnum('status', ['draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled']).default('draft'),

  approvedBy: int('approved_by'),
  approvedDate: datetime('approved_date'),

  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const certificateTravelCompleted = mysqlTable('certificate_travel_completed', {
  id: int('id').primaryKey().autoincrement(),
  iotId: int('iot_id').notNull(),
  ctcNo: varchar('ctc_no', { length: 50 }).unique().notNull(),

  // Certification
  travelCompleted: boolean('travel_completed').notNull(),
  actualDepartureDate: datetime('actual_departure_date').notNull(),
  actualReturnDate: datetime('actual_return_date').notNull(),
  completionRemarks: text('completion_remarks'),

  // Signatures
  certifiedBy: int('certified_by').notNull(),
  certifiedDate: datetime('certified_date').notNull(),
  verifiedBy: int('verified_by'),
  verifiedDate: datetime('verified_date'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const liquidationReports = mysqlTable('liquidation_reports', {
  id: int('id').primaryKey().autoincrement(),
  lrNo: varchar('lr_no', { length: 50 }).unique().notNull(),
  iotId: int('iot_id').notNull(),
  ctcId: int('ctc_id'),
  fundClusterId: int('fund_cluster_id').notNull(),

  // Cash Advance
  cashAdvanceAmount: decimal('cash_advance_amount', { precision: 15, scale: 2 }).notNull(),
  cashAdvanceDvId: int('cash_advance_dv_id'),

  // Actual Expenses
  totalExpenses: decimal('total_expenses', { precision: 15, scale: 2 }).notNull(),

  // Balance
  refundAmount: decimal('refund_amount', { precision: 15, scale: 2 }),
  additionalClaim: decimal('additional_claim', { precision: 15, scale: 2 }),

  status: mysqlEnum('status', ['draft', 'pending_review', 'approved', 'settled']).default('draft'),

  submittedBy: int('submitted_by').notNull(),
  submittedDate: datetime('submitted_date'),
  reviewedBy: int('reviewed_by'),
  reviewedDate: datetime('reviewed_date'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const liquidationExpenseItems = mysqlTable('liquidation_expense_items', {
  id: int('id').primaryKey().autoincrement(),
  lrId: int('lr_id').notNull(),
  expenseDate: datetime('expense_date').notNull(),
  expenseCategory: varchar('expense_category', { length: 100 }).notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  orInvoiceNo: varchar('or_invoice_no', { length: 100 }),
  orInvoiceDate: datetime('or_invoice_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 8. CASH MANAGEMENT
// ============================================

export const officialReceiptSeries = mysqlTable('official_receipt_series', {
  id: int('id').primaryKey().autoincrement(),
  seriesCode: varchar('series_code', { length: 20 }).unique().notNull(),
  startNumber: int('start_number').notNull(),
  endNumber: int('end_number').notNull(),
  currentNumber: int('current_number').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cashReceipts = mysqlTable('cash_receipts', {
  id: int('id').primaryKey().autoincrement(),
  orNo: varchar('or_no', { length: 50 }).unique().notNull(),
  orSeriesId: int('or_series_id').notNull(),
  receiptDate: datetime('receipt_date').notNull(),
  payorName: varchar('payor_name', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  paymentMode: mysqlEnum('payment_mode', ['cash', 'check', 'online']).notNull(),
  checkNo: varchar('check_no', { length: 50 }),
  checkDate: datetime('check_date'),
  checkBank: varchar('check_bank', { length: 100 }),
  particulars: text('particulars').notNull(),
  fundClusterId: int('fund_cluster_id').notNull(),
  revenueSourceId: int('revenue_source_id'),
  bankDepositId: int('bank_deposit_id'),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bankAccounts = mysqlTable('bank_accounts', {
  id: int('id').primaryKey().autoincrement(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  accountNumber: varchar('account_number', { length: 50 }).unique().notNull(),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  bankBranch: varchar('bank_branch', { length: 100 }),
  accountType: mysqlEnum('account_type', ['checking', 'savings', 'current']).notNull(),
  fundClusterId: int('fund_cluster_id'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bankDeposits = mysqlTable('bank_deposits', {
  id: int('id').primaryKey().autoincrement(),
  depositSlipNo: varchar('deposit_slip_no', { length: 50 }).unique().notNull(),
  bankAccountId: int('bank_account_id').notNull(),
  depositDate: datetime('deposit_date').notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  depositedBy: varchar('deposited_by', { length: 255 }),
  status: mysqlEnum('status', ['pending', 'confirmed', 'cancelled']).default('pending'),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bankReconciliations = mysqlTable('bank_reconciliations', {
  id: int('id').primaryKey().autoincrement(),
  bankAccountId: int('bank_account_id').notNull(),
  reconciliationDate: datetime('reconciliation_date').notNull(),
  periodMonth: int('period_month').notNull(),
  periodYear: int('period_year').notNull(),
  bookBalance: decimal('book_balance', { precision: 15, scale: 2 }).notNull(),
  bankBalance: decimal('bank_balance', { precision: 15, scale: 2 }).notNull(),
  outstandingChecks: json('outstanding_checks'),
  depositsInTransit: json('deposits_in_transit'),
  bankCharges: decimal('bank_charges', { precision: 15, scale: 2 }),
  bankInterest: decimal('bank_interest', { precision: 15, scale: 2 }),
  adjustedBookBalance: decimal('adjusted_book_balance', { precision: 15, scale: 2 }),
  adjustedBankBalance: decimal('adjusted_bank_balance', { precision: 15, scale: 2 }),
  status: mysqlEnum('status', ['draft', 'completed']).default('draft'),
  preparedBy: int('prepared_by').notNull(),
  preparedDate: datetime('prepared_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pettyCashFunds = mysqlTable('petty_cash_funds', {
  id: int('id').primaryKey().autoincrement(),
  fundCode: varchar('fund_code', { length: 50 }).unique().notNull(),
  fundName: varchar('fund_name', { length: 255 }).notNull(),
  custodian: varchar('custodian', { length: 255 }).notNull(),
  custodianEmployeeId: int('custodian_employee_id'),
  fundAmount: decimal('fund_amount', { precision: 15, scale: 2 }).notNull(),
  currentBalance: decimal('current_balance', { precision: 15, scale: 2 }).notNull(),
  replenishmentThreshold: decimal('replenishment_threshold', { precision: 15, scale: 2 }),
  fundClusterId: int('fund_cluster_id').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const pettyCashTransactions = mysqlTable('petty_cash_transactions', {
  id: int('id').primaryKey().autoincrement(),
  pettyCashFundId: int('petty_cash_fund_id').notNull(),
  transactionType: mysqlEnum('transaction_type', ['disbursement', 'replenishment']).notNull(),
  transactionDate: datetime('transaction_date').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  purpose: text('purpose'),
  orNo: varchar('or_no', { length: 50 }),
  payee: varchar('payee', { length: 255 }),
  dvId: int('dv_id'),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cashAdvances = mysqlTable('cash_advances', {
  id: int('id').primaryKey().autoincrement(),
  caNo: varchar('ca_no', { length: 50 }).unique().notNull(),
  employeeId: int('employee_id').notNull(),
  fundClusterId: int('fund_cluster_id').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  purpose: text('purpose').notNull(),
  dateIssued: datetime('date_issued').notNull(),
  dueDateReturn: datetime('due_date_return'),
  dateLiquidated: datetime('date_liquidated'),
  status: mysqlEnum('status', ['draft', 'approved', 'released', 'liquidated', 'returned']).default('draft'),
  dvId: int('dv_id'),
  liquidationDvId: int('liquidation_dv_id'),
  remarks: text('remarks'),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const dailyCashPosition = mysqlTable('daily_cash_position', {
  id: int('id').primaryKey().autoincrement(),
  reportDate: date('report_date').notNull(),
  fundClusterId: int('fund_cluster_id').notNull(),
  openingBalance: decimal('opening_balance', { precision: 15, scale: 2 }).notNull(),
  receipts: decimal('receipts', { precision: 15, scale: 2 }).notNull().default('0'),
  disbursements: decimal('disbursements', { precision: 15, scale: 2 }).notNull().default('0'),
  closingBalance: decimal('closing_balance', { precision: 15, scale: 2 }).notNull(),
  preparedBy: int('prepared_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 9. REVENUE MANAGEMENT
// ============================================

export const revenueSources = mysqlTable('revenue_sources', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const revenueEntries = mysqlTable('revenue_entries', {
  id: int('id').primaryKey().autoincrement(),
  entryNo: varchar('entry_no', { length: 50 }).unique().notNull(),
  revenueSourceId: int('revenue_source_id').notNull(),
  fundClusterId: int('fund_cluster_id').notNull(),
  entryDate: datetime('entry_date').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  payorName: varchar('payor_name', { length: 255 }),
  particulars: text('particulars'),
  fiscalYear: int('fiscal_year').notNull(),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const accountsReceivable = mysqlTable('accounts_receivable', {
  id: int('id').primaryKey().autoincrement(),
  arNo: varchar('ar_no', { length: 50 }).unique().notNull(),
  revenueSourceId: int('revenue_source_id').notNull(),
  debtorName: varchar('debtor_name', { length: 255 }).notNull(),
  invoiceNo: varchar('invoice_no', { length: 50 }),
  invoiceDate: datetime('invoice_date').notNull(),
  dueDate: datetime('due_date').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  amountCollected: decimal('amount_collected', { precision: 15, scale: 2 }).default('0'),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['outstanding', 'partial', 'paid', 'written_off']).default('outstanding'),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const collections = mysqlTable('collections', {
  id: int('id').primaryKey().autoincrement(),
  collectionNo: varchar('collection_no', { length: 50 }).unique().notNull(),
  arId: int('ar_id').notNull(),
  orNo: varchar('or_no', { length: 50 }),
  collectionDate: datetime('collection_date').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  paymentMode: mysqlEnum('payment_mode', ['cash', 'check', 'online']).notNull(),
  remarks: text('remarks'),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 10. ASSET & PROPERTY MANAGEMENT
// ============================================

export const assetCategories = mysqlTable('asset_categories', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  usefulLife: int('useful_life'),
  depreciationMethod: mysqlEnum('depreciation_method', ['straight_line', 'declining_balance']),
  capitalizationThreshold: decimal('capitalization_threshold', { precision: 15, scale: 2 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const fixedAssets = mysqlTable('fixed_assets', {
  id: int('id').primaryKey().autoincrement(),
  assetNo: varchar('asset_no', { length: 50 }).unique().notNull(),
  assetCategoryId: int('asset_category_id').notNull(),
  description: text('description').notNull(),
  acquisitionDate: datetime('acquisition_date').notNull(),
  acquisitionCost: decimal('acquisition_cost', { precision: 15, scale: 2 }).notNull(),
  salvageValue: decimal('salvage_value', { precision: 15, scale: 2 }).default('0'),
  usefulLife: int('useful_life').notNull(),
  location: varchar('location', { length: 255 }),
  custodian: varchar('custodian', { length: 255 }),
  serialNo: varchar('serial_no', { length: 100 }),
  status: mysqlEnum('status', ['active', 'disposed', 'written_off']).default('active'),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const depreciationSchedule = mysqlTable('depreciation_schedule', {
  id: int('id').primaryKey().autoincrement(),
  assetId: int('asset_id').notNull(),
  periodMonth: int('period_month').notNull(),
  periodYear: int('period_year').notNull(),
  depreciationAmount: decimal('depreciation_amount', { precision: 15, scale: 2 }).notNull(),
  accumulatedDepreciation: decimal('accumulated_depreciation', { precision: 15, scale: 2 }).notNull(),
  bookValue: decimal('book_value', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inventoryItems = mysqlTable('inventory_items', {
  id: int('id').primaryKey().autoincrement(),
  itemCode: varchar('item_code', { length: 50 }).unique().notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  description: text('description'),
  unit: varchar('unit', { length: 50 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 15, scale: 2 }).notNull(),
  quantityOnHand: int('quantity_on_hand').default(0),
  minimumLevel: int('minimum_level').default(0),
  maximumLevel: int('maximum_level'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const assetDisposals = mysqlTable('asset_disposals', {
  id: int('id').primaryKey().autoincrement(),
  disposalNo: varchar('disposal_no', { length: 50 }).notNull().unique(),
  assetId: int('asset_id').notNull(),
  disposalDate: date('disposal_date').notNull(),
  disposalMethod: varchar('disposal_method', { length: 50 }).notNull(), // 'sale', 'donation', 'scrap', 'transfer'
  disposalValue: decimal('disposal_value', { precision: 15, scale: 2 }),
  buyerRecipient: varchar('buyer_recipient', { length: 255 }),
  approvedBy: int('approved_by'),
  remarks: text('remarks'),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inventoryTransactions = mysqlTable('inventory_transactions', {
  id: int('id').primaryKey().autoincrement(),
  transactionNo: varchar('transaction_no', { length: 50 }).notNull().unique(),
  itemId: int('item_id').notNull(),
  transactionDate: date('transaction_date').notNull(),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // 'receipt', 'issue', 'adjustment', 'transfer'
  quantity: int('quantity').notNull(),
  unitCost: decimal('unit_cost', { precision: 15, scale: 2 }),
  reference: varchar('reference', { length: 100 }), // PO, RIS, etc.
  requestedBy: varchar('requested_by', { length: 255 }),
  remarks: text('remarks'),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const physicalInventoryCount = mysqlTable('physical_inventory_count', {
  id: int('id').primaryKey().autoincrement(),
  countNo: varchar('count_no', { length: 50 }).notNull().unique(),
  countDate: date('count_date').notNull(),
  itemId: int('item_id').notNull(),
  systemQuantity: int('system_quantity').notNull(),
  physicalQuantity: int('physical_quantity').notNull(),
  variance: int('variance').notNull(),
  varianceValue: decimal('variance_value', { precision: 15, scale: 2 }),
  remarks: text('remarks'),
  countedBy: varchar('counted_by', { length: 255 }),
  verifiedBy: int('verified_by'),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 11. SUPPORTING TABLES
// ============================================

export const attachments = mysqlTable('attachments', {
  id: int('id').primaryKey().autoincrement(),
  attachableType: varchar('attachable_type', { length: 50 }).notNull(),
  attachableId: int('attachable_id').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileOriginalName: varchar('file_original_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: int('file_size').notNull(),
  fileType: varchar('file_type', { length: 100 }).notNull(),
  fileExtension: varchar('file_extension', { length: 10 }),
  documentType: varchar('document_type', { length: 100 }),
  description: text('description'),
  uploadedBy: int('uploaded_by').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

export const auditLogs = mysqlTable('audit_logs', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id'),
  action: varchar('action', { length: 100 }).notNull(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: int('record_id').notNull(),
  oldValues: json('old_values'),
  newValues: json('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const systemSettings = mysqlTable('system_settings', {
  id: int('id').primaryKey().autoincrement(),
  settingKey: varchar('setting_key', { length: 100 }).unique().notNull(),
  settingValue: text('setting_value'),
  settingType: varchar('setting_type', { length: 50 }),
  description: text('description'),
  isEditable: boolean('is_editable').default(true),
  updatedBy: int('updated_by'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ============================================
// RELATIONS
// ============================================

// User Relations
export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
}));

// Role Relations
export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

// User Roles Relations
export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const registryAppropriationsRelations = relations(registryAppropriations, ({ one, many }) => ({
  fundCluster: one(fundClusters, {
    fields: [registryAppropriations.fundClusterId],
    references: [fundClusters.id],
  }),
  allotments: many(registryAllotments),
}));

export const registryAllotmentsRelations = relations(registryAllotments, ({ one, many }) => ({
  appropriation: one(registryAppropriations, {
    fields: [registryAllotments.appropriationId],
    references: [registryAppropriations.id],
  }),
  objectOfExpenditure: one(objectOfExpenditure, {
    fields: [registryAllotments.objectOfExpenditureId],
    references: [objectOfExpenditure.id],
  }),
  mfoPap: one(mfoPap, {
    fields: [registryAllotments.mfoPapId],
    references: [mfoPap.id],
  }),
  obligations: many(registryObligations),
}));

export const registryObligationsRelations = relations(registryObligations, ({ one }) => ({
  allotment: one(registryAllotments, {
    fields: [registryObligations.allotmentId],
    references: [registryAllotments.id],
  }),
}));

// ============================================================================
// REVENUE MANAGEMENT RELATIONS
// ============================================================================

export const revenueSourcesRelations = relations(revenueSources, ({ many }) => ({
  revenueEntries: many(revenueEntries),
  accountsReceivable: many(accountsReceivable),
  cashReceipts: many(cashReceipts),
}));

export const revenueEntriesRelations = relations(revenueEntries, ({ one }) => ({
  revenueSource: one(revenueSources, {
    fields: [revenueEntries.revenueSourceId],
    references: [revenueSources.id],
  }),
  fundCluster: one(fundClusters, {
    fields: [revenueEntries.fundClusterId],
    references: [fundClusters.id],
  }),
  createdByUser: one(users, {
    fields: [revenueEntries.createdBy],
    references: [users.id],
  }),
}));

export const accountsReceivableRelations = relations(accountsReceivable, ({ one, many }) => ({
  revenueSource: one(revenueSources, {
    fields: [accountsReceivable.revenueSourceId],
    references: [revenueSources.id],
  }),
  collections: many(collections),
  createdByUser: one(users, {
    fields: [accountsReceivable.createdBy],
    references: [users.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ one }) => ({
  accountsReceivable: one(accountsReceivable, {
    fields: [collections.arId],
    references: [accountsReceivable.id],
  }),
  createdByUser: one(users, {
    fields: [collections.createdBy],
    references: [users.id],
  }),
}));

// Asset Categories Relations
export const assetCategoriesRelations = relations(assetCategories, ({ many }) => ({
  fixedAssets: many(fixedAssets),
}));

// Fixed Assets Relations
export const fixedAssetsRelations = relations(fixedAssets, ({ one, many }) => ({
  category: one(assetCategories, {
    fields: [fixedAssets.assetCategoryId],
    references: [assetCategories.id],
  }),
  depreciationSchedules: many(depreciationSchedule),
  disposals: many(assetDisposals),
  createdByUser: one(users, {
    fields: [fixedAssets.createdBy],
    references: [users.id],
  }),
}));

// Depreciation Schedule Relations
export const depreciationScheduleRelations = relations(depreciationSchedule, ({ one }) => ({
  asset: one(fixedAssets, {
    fields: [depreciationSchedule.assetId],
    references: [fixedAssets.id],
  }),
}));

// Asset Disposals Relations
export const assetDisposalsRelations = relations(assetDisposals, ({ one }) => ({
  asset: one(fixedAssets, {
    fields: [assetDisposals.assetId],
    references: [fixedAssets.id],
  }),
  approvedByUser: one(users, {
    fields: [assetDisposals.approvedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [assetDisposals.createdBy],
    references: [users.id],
  }),
}));

// Inventory Items Relations
export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  transactions: many(inventoryTransactions),
  counts: many(physicalInventoryCount),
}));

// Inventory Transactions Relations
export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [inventoryTransactions.itemId],
    references: [inventoryItems.id],
  }),
  createdByUser: one(users, {
    fields: [inventoryTransactions.createdBy],
    references: [users.id],
  }),
}));

// Physical Inventory Count Relations
export const physicalInventoryCountRelations = relations(physicalInventoryCount, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [physicalInventoryCount.itemId],
    references: [inventoryItems.id],
  }),
  verifiedByUser: one(users, {
    fields: [physicalInventoryCount.verifiedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [physicalInventoryCount.createdBy],
    references: [users.id],
  }),
}));

// ============================================
// 7. PAYROLL & PERSONNEL MANAGEMENT
// ============================================

// Employees Table (extends users table with payroll-specific fields)
export const employees = mysqlTable('employees', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').unique().notNull(), // Links to users table
  employeeNo: varchar('employee_no', { length: 50 }).unique().notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),
  suffix: varchar('suffix', { length: 20 }),
  dateOfBirth: date('date_of_birth'),
  civilStatus: mysqlEnum('civil_status', ['Single', 'Married', 'Widowed', 'Separated']),
  gender: mysqlEnum('gender', ['Male', 'Female']),

  // Employment Details
  position: varchar('position', { length: 100 }).notNull(),
  salaryGrade: varchar('salary_grade', { length: 20 }),
  stepIncrement: int('step_increment').default(1),
  appointmentStatus: mysqlEnum('appointment_status', ['Permanent', 'Temporary', 'Casual', 'Contractual', 'Co-terminus']).default('Permanent'),
  employmentStatus: mysqlEnum('employment_status', ['Active', 'Resigned', 'Retired', 'Terminated', 'On Leave']).default('Active'),
  dateHired: date('date_hired').notNull(),
  dateRegularized: date('date_regularized'),
  dateResigned: date('date_resigned'),

  // Salary Information
  basicSalary: decimal('basic_salary', { precision: 15, scale: 2 }).notNull(),
  pera: decimal('pera', { precision: 10, scale: 2 }).default('0'), // Personnel Economic Relief Allowance
  additionalAllowance: decimal('additional_allowance', { precision: 10, scale: 2 }).default('0'),

  // Government IDs and Numbers
  tinNo: varchar('tin_no', { length: 20 }), // Tax Identification Number
  gsisNo: varchar('gsis_no', { length: 20 }), // GSIS ID
  philhealthNo: varchar('philhealth_no', { length: 20 }), // PhilHealth Number
  pagibigNo: varchar('pagibig_no', { length: 20 }), // Pag-IBIG Number

  // Bank Details
  bankName: varchar('bank_name', { length: 100 }),
  bankAccountNo: varchar('bank_account_no', { length: 50 }),
  bankAccountName: varchar('bank_account_name', { length: 200 }),

  // Contact Information
  mobileNo: varchar('mobile_no', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),

  // Tax Exemptions
  taxExemptionCode: varchar('tax_exemption_code', { length: 10 }).default('S'), // S, S1, S2, S3, S4, ME, ME1, ME2, ME3, ME4, Z
  numberOfDependents: int('number_of_dependents').default(0),

  isActive: boolean('is_active').default(true),
  createdBy: int('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// Payroll Periods
export const payrollPeriods = mysqlTable('payroll_periods', {
  id: int('id').primaryKey().autoincrement(),
  periodNo: varchar('period_no', { length: 50 }).unique().notNull(), // Format: PAY-YYYY-MM
  periodName: varchar('period_name', { length: 100 }).notNull(), // "January 2024", "February 2024"
  periodType: mysqlEnum('period_type', ['Regular', 'Special', '13th Month', 'Mid-Year Bonus']).default('Regular'),
  month: int('month').notNull(), // 1-12
  year: int('year').notNull(), // 2024, 2025, etc.
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  payDate: date('pay_date').notNull(),
  status: mysqlEnum('status', ['Draft', 'Processing', 'Completed', 'Posted', 'Cancelled']).default('Draft'),
  totalEmployees: int('total_employees').default(0),
  totalGrossPay: decimal('total_gross_pay', { precision: 15, scale: 2 }).default('0'),
  totalDeductions: decimal('total_deductions', { precision: 15, scale: 2 }).default('0'),
  totalNetPay: decimal('total_net_pay', { precision: 15, scale: 2 }).default('0'),
  processedBy: int('processed_by'),
  processedAt: datetime('processed_at'),
  remarks: text('remarks'),
  createdBy: int('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// Payroll Transactions
export const payrollTransactions = mysqlTable('payroll_transactions', {
  id: int('id').primaryKey().autoincrement(),
  payrollPeriodId: int('payroll_period_id').notNull(),
  employeeId: int('employee_id').notNull(),

  // Earnings
  basicSalary: decimal('basic_salary', { precision: 15, scale: 2 }).notNull(),
  pera: decimal('pera', { precision: 10, scale: 2 }).default('0'),
  additionalAllowance: decimal('additional_allowance', { precision: 10, scale: 2 }).default('0'),
  overtime: decimal('overtime', { precision: 10, scale: 2 }).default('0'),
  otherEarnings: decimal('other_earnings', { precision: 10, scale: 2 }).default('0'),
  grossPay: decimal('gross_pay', { precision: 15, scale: 2 }).notNull(),

  // Statutory Deductions
  gsisContribution: decimal('gsis_contribution', { precision: 10, scale: 2 }).default('0'),
  philhealthContribution: decimal('philhealth_contribution', { precision: 10, scale: 2 }).default('0'),
  pagibigContribution: decimal('pagibig_contribution', { precision: 10, scale: 2 }).default('0'),
  withholdingTax: decimal('withholding_tax', { precision: 10, scale: 2 }).default('0'),

  // Other Deductions
  gsisLoan: decimal('gsis_loan', { precision: 10, scale: 2 }).default('0'),
  pagibigLoan: decimal('pagibig_loan', { precision: 10, scale: 2 }).default('0'),
  salaryLoan: decimal('salary_loan', { precision: 10, scale: 2 }).default('0'),
  otherDeductions: decimal('other_deductions', { precision: 10, scale: 2 }).default('0'),

  totalDeductions: decimal('total_deductions', { precision: 15, scale: 2 }).notNull(),
  netPay: decimal('net_pay', { precision: 15, scale: 2 }).notNull(),

  // Payment Details
  paymentStatus: mysqlEnum('payment_status', ['Pending', 'Paid', 'Cancelled']).default('Pending'),
  paymentDate: date('payment_date'),
  paymentReference: varchar('payment_reference', { length: 100 }),

  remarks: text('remarks'),
  createdBy: int('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// Employee Deductions (recurring monthly deductions)
export const employeeDeductions = mysqlTable('employee_deductions', {
  id: int('id').primaryKey().autoincrement(),
  employeeId: int('employee_id').notNull(),
  deductionType: mysqlEnum('deduction_type', ['GSIS Loan', 'Pag-IBIG Loan', 'Salary Loan', 'Other']).notNull(),
  deductionName: varchar('deduction_name', { length: 100 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  installments: int('installments'), // Total number of months to deduct
  installmentsPaid: int('installments_paid').default(0),
  balance: decimal('balance', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').default(true),
  remarks: text('remarks'),
  createdBy: int('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// Payroll Adjustments (one-time adjustments)
export const payrollAdjustments = mysqlTable('payroll_adjustments', {
  id: int('id').primaryKey().autoincrement(),
  employeeId: int('employee_id').notNull(),
  adjustmentType: mysqlEnum('adjustment_type', ['Salary Increase', 'Step Increment', 'Retroactive Pay', 'Correction', 'Other']).notNull(),
  adjustmentName: varchar('adjustment_name', { length: 100 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  isAddition: boolean('is_addition').default(true), // true = addition, false = deduction
  effectiveDate: date('effective_date').notNull(),
  appliedInPeriod: int('applied_in_period'), // payroll_period_id where this was applied
  status: mysqlEnum('status', ['Pending', 'Applied', 'Cancelled']).default('Pending'),
  remarks: text('remarks'),
  approvedBy: int('approved_by'),
  approvedAt: datetime('approved_at'),
  createdBy: int('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// Government Remittances Tracking
export const remittances = mysqlTable('remittances', {
  id: int('id').primaryKey().autoincrement(),
  remittanceNo: varchar('remittance_no', { length: 50 }).unique().notNull(), // REM-YYYY-NNNN
  payrollPeriodId: int('payroll_period_id').notNull(),
  remittanceType: mysqlEnum('remittance_type', ['GSIS', 'PhilHealth', 'Pag-IBIG', 'BIR']).notNull(),
  month: int('month').notNull(),
  year: int('year').notNull(),

  // Amounts
  employeeShare: decimal('employee_share', { precision: 15, scale: 2 }).notNull(),
  employerShare: decimal('employer_share', { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),

  // Payment Details
  dueDate: date('due_date').notNull(),
  paymentDate: date('payment_date'),
  referenceNo: varchar('reference_no', { length: 100 }),
  paymentStatus: mysqlEnum('payment_status', ['Pending', 'Paid', 'Overdue']).default('Pending'),

  remarks: text('remarks'),
  processedBy: int('processed_by'),
  createdBy: int('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// 13th Month Pay
export const thirteenthMonthPay = mysqlTable('thirteenth_month_pay', {
  id: int('id').primaryKey().autoincrement(),
  year: int('year').notNull(),
  employeeId: int('employee_id').notNull(),

  // Computation
  totalBasicSalary: decimal('total_basic_salary', { precision: 15, scale: 2 }).notNull(), // Sum of basic salary for the year
  monthsWorked: decimal('months_worked', { precision: 5, scale: 2 }).notNull(), // Pro-rated for new employees
  thirteenthMonthAmount: decimal('thirteenth_month_amount', { precision: 15, scale: 2 }).notNull(), // total_basic_salary / 12
  withholdingTax: decimal('withholding_tax', { precision: 10, scale: 2 }).default('0'),
  netAmount: decimal('net_amount', { precision: 15, scale: 2 }).notNull(),

  // Payment Details
  paymentDate: date('payment_date'),
  paymentStatus: mysqlEnum('payment_status', ['Pending', 'Paid', 'Cancelled']).default('Pending'),
  paymentReference: varchar('payment_reference', { length: 100 }),

  remarks: text('remarks'),
  processedBy: int('processed_by'),
  processedAt: datetime('processed_at'),
  createdBy: int('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ============================================
// PAYROLL RELATIONS
// ============================================

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  payrollTransactions: many(payrollTransactions),
  deductions: many(employeeDeductions),
  adjustments: many(payrollAdjustments),
  thirteenthMonthPayments: many(thirteenthMonthPay),
  createdByUser: one(users, {
    fields: [employees.createdBy],
    references: [users.id],
  }),
}));

export const payrollPeriodsRelations = relations(payrollPeriods, ({ many, one }) => ({
  transactions: many(payrollTransactions),
  remittances: many(remittances),
  processedByUser: one(users, {
    fields: [payrollPeriods.processedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [payrollPeriods.createdBy],
    references: [users.id],
  }),
}));

export const payrollTransactionsRelations = relations(payrollTransactions, ({ one }) => ({
  period: one(payrollPeriods, {
    fields: [payrollTransactions.payrollPeriodId],
    references: [payrollPeriods.id],
  }),
  employee: one(employees, {
    fields: [payrollTransactions.employeeId],
    references: [employees.id],
  }),
  createdByUser: one(users, {
    fields: [payrollTransactions.createdBy],
    references: [users.id],
  }),
}));

export const employeeDeductionsRelations = relations(employeeDeductions, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeDeductions.employeeId],
    references: [employees.id],
  }),
  createdByUser: one(users, {
    fields: [employeeDeductions.createdBy],
    references: [users.id],
  }),
}));

export const payrollAdjustmentsRelations = relations(payrollAdjustments, ({ one }) => ({
  employee: one(employees, {
    fields: [payrollAdjustments.employeeId],
    references: [employees.id],
  }),
  approvedByUser: one(users, {
    fields: [payrollAdjustments.approvedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [payrollAdjustments.createdBy],
    references: [users.id],
  }),
}));

export const remittancesRelations = relations(remittances, ({ one }) => ({
  period: one(payrollPeriods, {
    fields: [remittances.payrollPeriodId],
    references: [payrollPeriods.id],
  }),
  processedByUser: one(users, {
    fields: [remittances.processedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [remittances.createdBy],
    references: [users.id],
  }),
}));

export const thirteenthMonthPayRelations = relations(thirteenthMonthPay, ({ one }) => ({
  employee: one(employees, {
    fields: [thirteenthMonthPay.employeeId],
    references: [employees.id],
  }),
  processedByUser: one(users, {
    fields: [thirteenthMonthPay.processedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [thirteenthMonthPay.createdBy],
    references: [users.id],
  }),
}));
