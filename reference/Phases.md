# Philippine Government Financial Management System - Implementation Plan

## Project Overview

Building a comprehensive **Financial Management System** for Philippine government agencies using **Astro + Vue.js + MySQL/MariaDB**. The system covers the complete financial cycle including:

- **Budget Management** - Appropriations, allotments, and obligations
- **Disbursement Processing** - DV creation, multi-level approval, payment processing
- **Cash & Treasury** - Receipts, deposits, bank reconciliation
- **Revenue Management** - Revenue recording, AR tracking, collections
- **Asset Management** - Property registry, depreciation, inventory
- **Payroll System** - Salary processing, deductions, remittances
- **COA Compliance** - Complete reporting suite (FAR, BAR forms)
- **Audit Trail** - 10-year record retention per NAP R.A. 9470

This is a **standalone system** designed to comply with Philippine government accounting standards and Commission on Audit (COA) regulations.

## Technology Stack

- **Frontend**: Astro 4.x (SSR/SSG) + Vue 3.4+ (Composition API)
- **UI Framework**: Tailwind CSS + PrimeVue
- **Database**: MySQL/MariaDB 8.0+
- **ORM**: Drizzle ORM (TypeScript-first)
- **Authentication**: Lucia Auth
- **State Management**: Pinia
- **Forms**: VeeValidate + Yup
- **PDF Generation**: jsPDF + autoTable
- **Excel Export**: ExcelJS
- **File Upload**: Custom handler with validation

## User Roles & Access Levels

1. **Administrator** - Full system access
2. **Director** - Approval authority for DVs and payments
3. **Accountant** - Budget and accounting operations
4. **Budget Officer** - Budget tracking and obligation management
5. **Cashier** - Payment processing and check issuance
6. **Division Staff** - DV creation and travel requests

## Core Features

### 1. Disbursement Voucher (DV) Management
- DV creation with serial format: `0000-00-0000` (Serial-Month-Year)
- Multi-level approval workflow: Division → Budget → Accounting → Director
- 5 certification boxes (A-E) per Philippine government standards
- Fund cluster tracking (7 types)
- Object of expenditure classification
- Supporting document attachments
- PDF generation for printing

### 2. Budget & Obligation Tracking
- Registry of Appropriations
- Registry of Allotments
- Registry of Obligations
- Real-time budget availability checking
- Unobligated balance tracking
- Budget utilization reports

### 3. Payment Processing
- **Check Disbursement** (MDS/Commercial)
- **ADA** (Advice to Debit Account)
- Check Disbursement Record (CDR)
- Payment status tracking
- Bank reconciliation support

### 4. Travel Management
- **Itinerary of Travel (IoT)** - Travel planning and approval
- **Certificate of Travel Completed (CTC)** - Travel certification
- **Liquidation Report (LR)** - Expense liquidation
- Cash advance linking to DVs
- Expense item tracking

### 5. Cash Management & Treasury Operations
- **Cash Receipt Recording** - OR (Official Receipt) issuance
- **Cash Deposit Management** - Bank deposit tracking
- **Cash Position Monitoring** - Daily cash position reports
- **Bank Reconciliation** - Monthly bank reconciliation statements
- **Petty Cash Fund** - Petty cash replenishment and liquidation
- **Cash Advance Monitoring** - Track outstanding cash advances
- **Treasury Reports** - Daily collection reports, deposit slips

### 6. Revenue & Collection Management
- **Revenue Recording** - Revenue entry by source
- **Collection Monitoring** - Track receivables and collections
- **Official Receipt Management** - OR series tracking and issuance
- **Revenue Reports** - Revenue summary by category
- **Accounts Receivable** - Aging of receivables
- **Collection Efficiency Reports** - Collection vs target analysis

### 7. Asset & Property Management
- **Fixed Assets Registry** - Property cards for all assets
- **Asset Acquisition** - Recording of newly acquired assets
- **Depreciation Tracking** - Automatic depreciation calculation
- **Asset Disposal** - Disposal and write-off processes
- **Inventory Management** - Stock cards and inventory tracking
- **Physical Count** - Annual physical inventory
- **Asset Reports** - Property, Plant & Equipment schedules
- **Semi-expendable Property** - Equipment tracking below capitalization threshold

### 8. Payroll & Personnel Services
- **Payroll Processing** - Monthly payroll generation
- **Deductions Management** - GSIS, PhilHealth, Pag-IBIG, Tax withholding
- **Payroll Reports** - Payroll register, bank upload files
- **13th Month Pay** - Year-end bonus calculation
- **Remittance Tracking** - Track remittances to government agencies
- **Salary Adjustment** - Handle salary increases and adjustments
- **Integration with DV** - Auto-generate payroll DVs

### 9. COA Reporting
- **FAR No. 1** - Statement of Appropriations, Allotments, Obligations, Disbursements and Balances
- **FAR No. 3** - Aging of Due and Demandable Obligations
- **FAR No. 4** - Monthly Report of Disbursements
- **BAR No. 1** - Quarterly Physical Report of Operations
- Export to PDF and Excel

### 10. Document Management
- File upload support (PDF, JPEG, PNG, XLSX, DOCX)
- 10MB file size limit
- Document categorization (invoices, receipts, travel orders, etc.)
- Secure file storage with database metadata

### 11. Audit Trail
- Comprehensive audit logging for all transactions
- 10-year record retention per NAP R.A. 9470
- User activity tracking
- Change history for all records

## Database Schema

### Core Tables

**Authentication & Users**
- `users` - Employee accounts
- `roles` - System roles (6 types)
- `user_roles` - User-role assignments
- `sessions` - Authentication sessions

**Budget Management**
- `fund_clusters` - 7 fund cluster types
- `mfo_pap` - Major Final Output / Programs and Projects
- `object_of_expenditure` - UACS chart of accounts
- `registry_appropriations` - Budget appropriations
- `registry_allotments` - Budget allotments
- `registry_obligations` - Obligation requests

**Disbursement Processing**
- `disbursement_vouchers` - Main DV records with 5 certification boxes
- `approval_workflows` - Multi-stage approval tracking
- `payments` - Check and ADA payments
- `check_disbursement_records` - CDR tracking

**Travel Management**
- `itinerary_of_travel` - Travel plans and approvals
- `certificate_travel_completed` - Travel completion certificates
- `liquidation_reports` - Travel expense liquidations
- `liquidation_expense_items` - Itemized expenses

**Cash Management**
- `cash_receipts` - OR issuance and cash collections
- `official_receipt_series` - OR series tracking
- `bank_deposits` - Deposit records
- `bank_accounts` - Bank account registry
- `bank_reconciliations` - Monthly reconciliation statements
- `petty_cash_fund` - Petty cash management
- `cash_advances` - Cash advance tracking

**Revenue Management**
- `revenue_sources` - Revenue classification
- `revenue_entries` - Revenue recording
- `accounts_receivable` - Receivables tracking
- `collections` - Collection tracking
- `revenue_targets` - Budget vs actual revenue

**Asset & Property Management**
- `fixed_assets` - Property, Plant & Equipment registry
- `asset_categories` - Asset classification
- `property_cards` - Individual asset records
- `depreciation_schedule` - Depreciation tracking
- `asset_disposals` - Disposal and write-off records
- `inventory_items` - Stock items
- `stock_cards` - Inventory movement
- `physical_count` - Annual inventory count
- `semi_expendable_property` - Equipment below capitalization

**Payroll Management**
- `employees` - Employee master data
- `payroll_periods` - Payroll period definitions
- `payroll_transactions` - Monthly payroll records
- `deductions` - GSIS, PhilHealth, Pag-IBIG, Tax
- `payroll_adjustments` - Salary adjustments
- `remittances` - Government remittance tracking
- `thirteenth_month_pay` - Year-end bonus

**Supporting Tables**
- `attachments` - File uploads with metadata
- `audit_logs` - Complete audit trail
- `report_cache` - Report generation cache
- `system_settings` - Configuration settings

### Key Database Views
- `vw_budget_availability` - Real-time budget balances
- `vw_pending_approvals` - Pending approval queue
- `vw_cash_position` - Daily cash position
- `vw_outstanding_cash_advances` - Unliquidated cash advances
- `vw_asset_depreciation` - Current asset values
- `vw_accounts_receivable_aging` - AR aging analysis
- `vw_payroll_summary` - Payroll summary by period

## Project Structure

```
src/
├── components/
│   ├── layout/          # Header, Sidebar, Footer
│   ├── forms/           # All form components
│   │   ├── disbursement/  # DV forms
│   │   ├── travel/        # Travel forms
│   │   ├── budget/        # Budget forms
│   │   ├── cash/          # Cash management forms
│   │   ├── revenue/       # Revenue forms
│   │   ├── assets/        # Asset management forms
│   │   └── payroll/       # Payroll forms
│   ├── approval/        # Approval workflow components
│   ├── tables/          # Data tables with sorting/filtering
│   ├── reports/         # Report generators
│   └── shared/          # Reusable components
├── pages/
│   ├── dashboard/       # Role-based dashboards
│   ├── disbursements/   # DV management pages
│   ├── travel/          # Travel management
│   ├── budget/          # Budget tracking
│   ├── payments/        # Payment processing
│   ├── cash/            # Cash & treasury operations
│   │   ├── receipts/
│   │   ├── deposits/
│   │   ├── reconciliation/
│   │   └── petty-cash/
│   ├── revenue/         # Revenue management
│   │   ├── entries/
│   │   ├── collections/
│   │   └── receivables/
│   ├── assets/          # Asset & property management
│   │   ├── fixed-assets/
│   │   ├── inventory/
│   │   ├── property-cards/
│   │   └── disposal/
│   ├── payroll/         # Payroll processing
│   │   ├── process/
│   │   ├── deductions/
│   │   ├── remittances/
│   │   └── reports/
│   ├── reports/         # All reports
│   │   ├── far/         # FAR reports
│   │   ├── bar/         # BAR reports
│   │   ├── cash/        # Cash reports
│   │   ├── revenue/     # Revenue reports
│   │   └── assets/      # Asset reports
│   ├── admin/           # User/role management
│   └── api/             # API routes
│       ├── disbursements/
│       ├── travel/
│       ├── budget/
│       ├── payments/
│       ├── cash/
│       ├── revenue/
│       ├── assets/
│       ├── payroll/
│       └── reports/
├── lib/
│   ├── db/              # Database connection & schema
│   ├── auth/            # Authentication logic
│   ├── services/        # Business logic services
│   │   ├── disbursement.service.ts
│   │   ├── travel.service.ts
│   │   ├── budget.service.ts
│   │   ├── payment.service.ts
│   │   ├── cash.service.ts
│   │   ├── revenue.service.ts
│   │   ├── asset.service.ts
│   │   ├── payroll.service.ts
│   │   └── report.service.ts
│   ├── utils/           # Helper functions
│   └── constants/       # System constants
├── stores/              # Pinia state management
├── middleware/          # Auth & RBAC middleware
└── types/               # TypeScript definitions
```

## Implementation Phases

### Phase 1: Foundation & Setup
**Duration**: 2 weeks

**Tasks**:
1. Initialize Astro project with Vue integration
2. Install dependencies (Drizzle, Lucia, Tailwind, PrimeVue)
3. Setup MySQL/MariaDB database
4. Create database schema with Drizzle
5. Run initial migrations
6. Seed reference data:
   - 7 fund clusters
   - 6 user roles
   - Object of expenditure categories
   - Default admin user
7. Implement authentication system (login/logout)
8. Create layout components (Header, Sidebar, Footer)
9. Setup protected route middleware
10. Create role-based access control system

**Deliverables**:
- Working authentication system
- User management module
- Base layout and routing structure
- Database with seed data

**Critical Files**:
- [src/lib/db/schema.ts](src/lib/db/schema.ts) - Database schema
- [src/lib/auth/session.ts](src/lib/auth/session.ts) - Lucia auth setup
- [src/middleware/auth.ts](src/middleware/auth.ts) - Auth middleware
- [src/components/layout/MainLayout.astro](src/components/layout/MainLayout.astro)
- [astro.config.mjs](astro.config.mjs) - Astro configuration
- [drizzle.config.ts](drizzle.config.ts) - Drizzle ORM config
- [package.json](package.json) - Dependencies

---

### Phase 2: Budget & Obligation Tracking
**Duration**: 2 weeks

**Tasks**:
1. Build appropriations management
   - Create appropriation form
   - List and search appropriations
2. Build allotments management
   - Allotment creation form with fund cluster selection
   - Link to appropriations
   - Object of expenditure selection
3. Build obligations management
   - Obligation request form
   - ORS/BURS number generation
   - Obligation approval workflow
4. Implement budget availability service
   - Real-time balance calculation
   - Unobligated balance tracking
   - Over-obligation prevention
5. Create budget dashboard
   - Visual budget utilization charts
   - Budget vs actual comparison
   - Fund cluster breakdown
6. Build budget availability view

**Deliverables**:
- Complete budget tracking system
- Real-time budget availability checking
- Budget utilization dashboard
- Obligation request workflow

**Critical Files**:
- [src/lib/services/budget.service.ts](src/lib/services/budget.service.ts) - Budget logic
- [src/components/forms/AllotmentForm.vue](src/components/forms/AllotmentForm.vue)
- [src/components/forms/ObligationRequestForm.vue](src/components/forms/ObligationRequestForm.vue)
- [src/pages/budget/allotments/index.astro](src/pages/budget/allotments/index.astro)
- [src/pages/api/budget/availability.ts](src/pages/api/budget/availability.ts)
- [src/components/dashboard/BudgetSummary.vue](src/components/dashboard/BudgetSummary.vue)

---

### Phase 3: Disbursement Voucher System
**Duration**: 3 weeks

**Tasks**:
1. Build DV creation form
   - Payee information section
   - Transaction details (particulars, amount)
   - Fund cluster and object of expenditure selection
   - ORS/BURS number linking
   - Responsibility center and MFO/PAP codes
   - 5 certification boxes (A-E)
   - Supporting document upload
2. Implement DV serial generator
   - Format: `0000-00-0000` (Serial-Month-Year)
   - Auto-increment with year reset
   - Database persistence
3. Create approval workflow system
   - 4-stage workflow: Division → Budget → Accounting → Director
   - Workflow initialization on DV creation
   - Stage-by-stage progression
   - Rejection handling
   - Comments and approval history
4. Build approval interfaces
   - Pending approvals queue for each role
   - DV review and approval screen
   - Approval action buttons
   - Comment submission
5. Implement DV PDF generation
   - Official DV template layout
   - All certification boxes
   - Accounting entry table
   - QR code for verification (optional)
6. Build DV listing and search
   - Filterable by status, date, payee, amount
   - Sortable columns
   - Pagination
7. Create DV detail view
   - All DV information
   - Approval history timeline
   - Attached documents
   - Action buttons (based on role)

**Deliverables**:
- Complete DV creation and approval system
- Serial number generation
- Multi-stage approval workflow
- PDF generation
- Document attachment support

**Critical Files**:
- [src/components/forms/DisbursementVoucherForm.vue](src/components/forms/DisbursementVoucherForm.vue) - Main DV form
- [src/lib/utils/serial-generator.ts](src/lib/utils/serial-generator.ts) - Serial generation
- [src/lib/services/approval.service.ts](src/lib/services/approval.service.ts) - Approval workflow
- [src/lib/services/disbursement.service.ts](src/lib/services/disbursement.service.ts) - DV business logic
- [src/lib/utils/pdf-generator.ts](src/lib/utils/pdf-generator.ts) - PDF generation
- [src/components/approval/ApprovalWorkflow.vue](src/components/approval/ApprovalWorkflow.vue)
- [src/pages/disbursements/create.astro](src/pages/disbursements/create.astro)
- [src/pages/disbursements/[id].astro](src/pages/disbursements/[id].astro)
- [src/pages/api/disbursements/index.ts](src/pages/api/disbursements/index.ts)
- [src/pages/api/disbursements/approve.ts](src/pages/api/disbursements/approve.ts)

---

### Phase 4: Payment Processing
**Duration**: 2 weeks

**Tasks**:
1. Build payment creation form
   - Payment type selection (Check MDS, Check Commercial, ADA)
   - Check number generation
   - Bank account selection
   - ADA reference number
   - Payment date
2. Implement check issuance
   - Check number sequential generation
   - Check Disbursement Record (CDR) creation
   - Check status tracking (Pending, Issued, Cleared, Cancelled, Stale)
3. Implement ADA processing
   - ADA reference generation
   - ADA issuance tracking
   - Bank integration placeholder
4. Create payment listing
   - Filter by payment type, status, date
   - Search by check number, payee
5. Build payment detail view
   - Payment information
   - Linked DV details
   - Receipt information (OR number, date)
   - Cancellation option
6. Implement payment cancellation workflow
   - Cancellation reason
   - Audit trail
   - Status update
7. Create Check Disbursement Record (CDR) report
   - Daily CDR generation
   - NCA and bank balance tracking

**Deliverables**:
- Complete payment processing system
- Check and ADA issuance
- Payment status tracking
- Check Disbursement Record

**Critical Files**:
- [src/lib/services/payment.service.ts](src/lib/services/payment.service.ts) - Payment logic
- [src/components/forms/PaymentForm.vue](src/components/forms/PaymentForm.vue)
- [src/pages/payments/checks/index.astro](src/pages/payments/checks/index.astro)
- [src/pages/payments/ada/index.astro](src/pages/payments/ada/index.astro)
- [src/pages/api/payments/index.ts](src/pages/api/payments/index.ts)
- [src/lib/utils/check-generator.ts](src/lib/utils/check-generator.ts)

---

### Phase 5: Travel Management
**Duration**: 2 weeks

**Tasks**:
1. Build Itinerary of Travel (IoT) form
   - Employee selection
   - Travel purpose and destination
   - Departure and return dates
   - Itinerary builder (multiple destinations)
   - Estimated cost calculation
   - Cash advance request
   - Supervisor approval
2. Create travel approval workflow
   - Budget officer review
   - Director approval
3. Build Certificate of Travel Completed (CTC) form
   - Actual travel dates
   - Completion certification
   - Employee and supervisor signatures
4. Build Liquidation Report (LR) form
   - Cash advance amount display
   - Expense item entry
   - Expense categories (Transportation, Lodging, Meals, etc.)
   - OR/Invoice attachment
   - Balance calculation (refund or additional claim)
5. Link travel to DVs
   - Cash advance DV creation
   - Refund/additional claim DV creation
6. Create travel listing and search
   - Filter by status, employee, date
7. Build travel dashboard
   - Pending approvals
   - Outstanding cash advances
   - Unliquidated travel

**Deliverables**:
- Complete travel management system
- IoT, CTC, LR forms
- Travel approval workflow
- Cash advance tracking
- Expense liquidation

**Critical Files**:
- [src/lib/services/travel.service.ts](src/lib/services/travel.service.ts) - Travel logic
- [src/components/forms/TravelItineraryForm.vue](src/components/forms/TravelItineraryForm.vue)
- [src/components/forms/CertificateTravelForm.vue](src/components/forms/CertificateTravelForm.vue)
- [src/components/forms/LiquidationReportForm.vue](src/components/forms/LiquidationReportForm.vue)
- [src/pages/travel/itinerary/create.astro](src/pages/travel/itinerary/create.astro)
- [src/pages/travel/liquidation/create.astro](src/pages/travel/liquidation/create.astro)
- [src/pages/api/travel/index.ts](src/pages/api/travel/index.ts)

---

### Phase 6: COA Reporting
**Duration**: 2 weeks

**Tasks**:
1. Build FAR No. 1 report
   - Statement of Appropriations, Allotments, Obligations, Disbursements and Balances
   - By fund cluster
   - Annual report
   - Export to Excel and PDF
2. Build FAR No. 3 report
   - Aging of Due and Demandable Obligations
   - Categorization by age (0-30, 31-60, 61-90, 90+ days)
   - By fund cluster
3. Build FAR No. 4 report
   - Monthly Report of Disbursements
   - By object of expenditure
   - By fund cluster
   - Automated monthly generation
4. Build BAR No. 1 report
   - Quarterly Physical Report of Operations
   - Budget vs actual
   - By MFO/PAP
5. Implement report parameter selection
   - Fiscal year selection
   - Period selection (month, quarter)
   - Fund cluster filter
6. Create report caching mechanism
   - Cache frequently run reports
   - Invalidate cache on data changes
   - Expiration settings
7. Build report export functionality
   - PDF export with official formatting
   - Excel export with formulas
8. Create report dashboard
   - Quick access to common reports
   - Report generation history

**Deliverables**:
- Complete COA reporting system
- FAR No. 1, 3, 4 reports
- BAR No. 1 report
- Export to PDF and Excel
- Report caching

**Critical Files**:
- [src/lib/services/report.service.ts](src/lib/services/report.service.ts) - Report logic
- [src/components/reports/FARReportGenerator.vue](src/components/reports/FARReportGenerator.vue)
- [src/components/reports/BARReportGenerator.vue](src/components/reports/BARReportGenerator.vue)
- [src/lib/utils/excel-generator.ts](src/lib/utils/excel-generator.ts)
- [src/pages/reports/far/1.astro](src/pages/reports/far/1.astro)
- [src/pages/reports/far/4.astro](src/pages/reports/far/4.astro)
- [src/pages/api/reports/far-1.ts](src/pages/api/reports/far-1.ts)
- [src/pages/api/reports/export.ts](src/pages/api/reports/export.ts)

---

### Phase 7: Cash Management & Treasury Operations
**Duration**: 2 weeks

**Tasks**:
1. Build Official Receipt (OR) management
   - OR series setup and tracking
   - OR number generation (sequential)
   - OR issuance form
   - OR printing template
2. Create cash receipt recording
   - Revenue source selection
   - Amount and payor information
   - OR linkage
   - Receipt categorization
3. Build bank deposit management
   - Deposit slip generation
   - Link receipts to deposits
   - Bank account selection
   - Deposit tracking and confirmation
4. Implement bank reconciliation
   - Monthly reconciliation form
   - Book balance vs bank balance
   - Outstanding checks listing
   - Deposits in transit
   - Bank charges and interest
   - Reconciliation report
5. Create petty cash fund management
   - Petty cash custodian setup
   - Replenishment requests
   - Expense recording
   - Liquidation forms
6. Build cash position monitoring
   - Daily cash position report
   - Cash flow projections
   - Fund cluster cash breakdown
7. Create cash advance monitoring
   - Outstanding cash advance report
   - Aging of cash advances
   - Liquidation tracking

**Deliverables**:
- OR management system
- Cash receipt recording
- Bank deposit tracking
- Monthly bank reconciliation
- Petty cash management
- Cash position monitoring

**Critical Files**:
- [src/lib/services/cash.service.ts](src/lib/services/cash.service.ts) - Cash management logic
- [src/components/forms/cash/ORIssuanceForm.vue](src/components/forms/cash/ORIssuanceForm.vue)
- [src/components/forms/cash/BankDepositForm.vue](src/components/forms/cash/BankDepositForm.vue)
- [src/components/forms/cash/BankReconciliationForm.vue](src/components/forms/cash/BankReconciliationForm.vue)
- [src/pages/cash/receipts/index.astro](src/pages/cash/receipts/index.astro)
- [src/pages/cash/reconciliation/index.astro](src/pages/cash/reconciliation/index.astro)
- [src/pages/api/cash/index.ts](src/pages/api/cash/index.ts)
- [src/lib/utils/or-generator.ts](src/lib/utils/or-generator.ts)

---

### Phase 8: Revenue & Collection Management
**Duration**: 2 weeks

**Tasks**:
1. Setup revenue sources
   - Revenue category configuration
   - Revenue codes and classifications
   - Target revenue setup
2. Build revenue entry form
   - Revenue source selection
   - Amount and billing period
   - Payor information
   - Revenue recognition
3. Create accounts receivable management
   - AR creation and tracking
   - Invoice generation
   - Due date monitoring
   - AR aging report (0-30, 31-60, 61-90, 90+ days)
4. Build collection recording
   - Link collections to AR
   - Payment allocation
   - Partial payment handling
   - Write-off management
5. Implement collection monitoring
   - Collection vs target analysis
   - Collection efficiency metrics
   - Overdue receivables report
6. Create revenue dashboard
   - Revenue summary by category
   - Collection rate visualization
   - Monthly revenue trends
   - Top revenue sources

**Deliverables**:
- Revenue source management
- Revenue entry system
- Accounts receivable tracking
- Collection management
- Revenue reporting and analytics

**Critical Files**:
- [src/lib/services/revenue.service.ts](src/lib/services/revenue.service.ts) - Revenue logic
- [src/components/forms/revenue/RevenueEntryForm.vue](src/components/forms/revenue/RevenueEntryForm.vue)
- [src/components/forms/revenue/ARForm.vue](src/components/forms/revenue/ARForm.vue)
- [src/components/forms/revenue/CollectionForm.vue](src/components/forms/revenue/CollectionForm.vue)
- [src/pages/revenue/entries/index.astro](src/pages/revenue/entries/index.astro)
- [src/pages/revenue/receivables/index.astro](src/pages/revenue/receivables/index.astro)
- [src/pages/api/revenue/index.ts](src/pages/api/revenue/index.ts)

---

### Phase 9: Asset & Property Management
**Duration**: 3 weeks

**Tasks**:
1. Setup asset categories and classifications
   - Asset category configuration
   - Useful life and depreciation method
   - Capitalization threshold settings
2. Build asset acquisition module
   - Asset registration form
   - Property card generation
   - Asset tagging/numbering
   - Purchase information recording
3. Implement depreciation tracking
   - Automatic monthly depreciation calculation
   - Depreciation schedule generation
   - Straight-line and declining balance methods
   - Accumulated depreciation tracking
4. Create asset disposal module
   - Disposal request form
   - Disposal approval workflow
   - Gain/loss calculation
   - Disposal documentation
5. Build inventory management
   - Stock item registration
   - Stock card creation
   - Inventory receipt recording
   - Inventory issuance tracking
   - Minimum stock level alerts
6. Implement physical inventory count
   - Count sheet generation
   - Variance recording
   - Adjustment processing
7. Create semi-expendable property tracking
   - Equipment below capitalization threshold
   - Custodian assignment
   - Transfer and disposal
8. Build asset reports
   - Property, Plant & Equipment schedule
   - Depreciation summary
   - Asset listing by location/custodian
   - Disposal register

**Deliverables**:
- Complete asset registry
- Depreciation automation
- Disposal management
- Inventory tracking system
- Physical count module
- Asset reports

**Critical Files**:
- [src/lib/services/asset.service.ts](src/lib/services/asset.service.ts) - Asset management logic
- [src/components/forms/assets/AssetRegistrationForm.vue](src/components/forms/assets/AssetRegistrationForm.vue)
- [src/components/forms/assets/InventoryForm.vue](src/components/forms/assets/InventoryForm.vue)
- [src/components/forms/assets/DisposalForm.vue](src/components/forms/assets/DisposalForm.vue)
- [src/pages/assets/fixed-assets/index.astro](src/pages/assets/fixed-assets/index.astro)
- [src/pages/assets/inventory/index.astro](src/pages/assets/inventory/index.astro)
- [src/pages/api/assets/index.ts](src/pages/api/assets/index.ts)
- [src/lib/utils/depreciation-calculator.ts](src/lib/utils/depreciation-calculator.ts)

---

### Phase 10: Payroll & Personnel Services
**Duration**: 3 weeks

**Tasks**:
1. Setup employee master data
   - Employee registration
   - Position and salary grade
   - Deduction configuration (GSIS, PhilHealth, Pag-IBIG, Tax)
   - Bank account information
2. Build payroll processing module
   - Payroll period setup
   - Salary computation
   - Automatic deduction calculation
   - Net pay computation
   - Payroll register generation
3. Implement deduction management
   - GSIS contribution rates
   - PhilHealth contribution
   - Pag-IBIG contribution
   - Withholding tax (BIR tax table)
   - Loan deductions
   - Other deductions
4. Create payroll reports
   - Payroll register
   - Bank upload file (CSV/Excel)
   - Deduction summary
   - Net pay summary by employee
5. Build remittance tracking
   - Monthly remittance schedule
   - GSIS remittance report
   - PhilHealth remittance report
   - Pag-IBIG remittance report
   - BIR remittance (1601C)
6. Implement 13th month pay
   - Automatic calculation (basic salary / 12)
   - Pro-rated for new employees
   - 13th month register
7. Create salary adjustment module
   - Salary increase processing
   - Step increment
   - Retroactive adjustments
8. Integrate with DV system
   - Auto-generate payroll DV
   - Link payroll to disbursement
   - Payroll payment tracking

**Deliverables**:
- Complete payroll system
- Automatic deduction calculation
- Payroll reports and registers
- Remittance tracking
- 13th month pay processing
- DV integration

**Critical Files**:
- [src/lib/services/payroll.service.ts](src/lib/services/payroll.service.ts) - Payroll logic
- [src/components/forms/payroll/PayrollProcessForm.vue](src/components/forms/payroll/PayrollProcessForm.vue)
- [src/components/forms/payroll/EmployeeForm.vue](src/components/forms/payroll/EmployeeForm.vue)
- [src/pages/payroll/process/index.astro](src/pages/payroll/process/index.astro)
- [src/pages/payroll/deductions/index.astro](src/pages/payroll/deductions/index.astro)
- [src/pages/api/payroll/index.ts](src/pages/api/payroll/index.ts)
- [src/lib/utils/payroll-calculator.ts](src/lib/utils/payroll-calculator.ts)
- [src/lib/utils/tax-calculator.ts](src/lib/utils/tax-calculator.ts)

---

### Phase 11: Document Management & Audit Trail
**Duration**: 1 week

**Tasks**:
1. Implement file upload handler
   - File size validation (10MB max)
   - File type validation (PDF, JPEG, PNG, XLSX, DOCX)
   - Secure file storage
   - Unique filename generation
   - Database metadata storage
2. Build file attachment component
   - Drag and drop upload
   - Multiple file support
   - Upload progress indicator
   - File preview
   - Delete attachment
3. Create attachment listing
   - Group by document type
   - Download functionality
4. Implement comprehensive audit logging
   - Automatic logging on all CRUD operations
   - Old/new value comparison (JSON)
   - User and IP tracking
   - Timestamp recording
5. Build audit log viewer
   - Filter by user, action, table, date
   - Search functionality
   - Export audit trail
6. Create user activity dashboard
   - Recent activities
   - Activity summary by user
   - Activity timeline

**Deliverables**:
- File upload and management system
- Comprehensive audit logging
- Audit log viewer
- User activity tracking

**Critical Files**:
- [src/lib/utils/file-handler.ts](src/lib/utils/file-handler.ts) - File upload logic
- [src/components/shared/FileUpload.vue](src/components/shared/FileUpload.vue)
- [src/lib/middleware/audit-logger.ts](src/lib/middleware/audit-logger.ts)
- [src/pages/admin/audit-logs/index.astro](src/pages/admin/audit-logs/index.astro)
- [src/pages/api/uploads/index.ts](src/pages/api/uploads/index.ts)

---

### Phase 12: Testing & Quality Assurance
**Duration**: 3 weeks

**Tasks**:
1. Write unit tests
   - Serial number generation (DV, OR)
   - Budget availability calculation
   - Approval workflow logic
   - Payment calculations
   - Travel expense calculations
   - Depreciation calculations
   - Payroll calculations (salary, deductions, taxes)
   - Revenue recognition
2. Write integration tests
   - DV creation to approval flow
   - Budget obligation to disbursement
   - Travel cash advance to liquidation
   - Payment processing workflow
   - Cash receipt to bank deposit
   - AR to collection workflow
   - Asset acquisition to depreciation
   - Payroll to DV integration
3. Perform end-to-end testing
   - Complete DV lifecycle
   - Travel management workflow
   - Cash management workflow
   - Revenue and collection cycle
   - Asset lifecycle (acquisition to disposal)
   - Payroll processing end-to-end
   - Report generation
   - User management
4. Security testing
   - SQL injection prevention
   - XSS prevention
   - CSRF protection
   - Authentication bypass attempts
   - Authorization checks
5. Performance testing
   - Load testing for concurrent users
   - Report generation performance
   - Database query optimization
   - Page load times
6. Browser compatibility testing
   - Chrome, Firefox, Edge
   - Responsive design testing
7. Create test documentation
   - Test cases
   - Test results
   - Known issues

**Deliverables**:
- Comprehensive test suite
- Test coverage report
- Security audit report
- Performance benchmark results

**Critical Files**:
- [tests/unit/serial-generator.test.ts](tests/unit/serial-generator.test.ts)
- [tests/unit/budget.service.test.ts](tests/unit/budget.service.test.ts)
- [tests/integration/dv-approval.test.ts](tests/integration/dv-approval.test.ts)
- [tests/e2e/dv-creation.spec.ts](tests/e2e/dv-creation.spec.ts)

---

### Phase 13: Documentation & Deployment
**Duration**: 2 weeks

**Tasks**:
1. Setup production environment
   - Ubuntu/Windows Server setup
   - MariaDB installation and configuration
   - Nginx reverse proxy setup
   - SSL certificate installation
   - PM2 process manager setup
2. Configure production database
   - Database creation
   - User permissions
   - Backup configuration
3. Build application for production
   - Environment variables configuration
   - Production build
   - Asset optimization
4. Deploy application
   - File transfer to server
   - PM2 ecosystem configuration
   - Nginx virtual host setup
   - Firewall rules
5. Setup automated backups
   - Daily database backup script
   - File storage backup
   - Remote backup location
6. Create user documentation
   - User manual with screenshots
   - Role-specific guides
   - Common workflows
   - Troubleshooting guide
7. Create administrator documentation
   - System architecture
   - Deployment guide
   - Backup and recovery procedures
   - Database maintenance
   - Security guidelines
8. Conduct user training
   - Role-based training sessions
   - Hands-on practice
   - Q&A sessions
9. Create video tutorials
   - DV creation walkthrough
   - Approval process
   - Travel management
   - Report generation
10. Setup monitoring
    - Application health checks
    - Error logging
    - Performance monitoring

**Deliverables**:
- Production deployment
- User manual
- Administrator guide
- Training materials
- Video tutorials
- Monitoring setup

**Critical Files**:
- [.env.production](.env.production) - Production environment variables
- [ecosystem.config.js](ecosystem.config.js) - PM2 configuration
- [nginx.conf](nginx.conf) - Nginx configuration
- [docs/user-manual.md](docs/user-manual.md)
- [docs/admin-guide.md](docs/admin-guide.md)

---

## Key Business Rules

### Disbursement Voucher
- DV serial format: `0000-00-0000` (Serial-Month-Year)
- Serial resets to 0001 every new year
- 4-stage approval required: Division → Budget → Accounting → Director
- Budget availability must be checked before accounting approval
- Only draft DVs can be edited
- Only admin can delete DVs (soft delete)
- 4-copy distribution: COA Auditor, Cash Treasury, Accounting Unit, Payee

### Budget Management
- Obligations cannot exceed allotments
- Disbursements cannot exceed obligations
- Budget tracking by fund cluster (7 types)
- Budget tracking by object of expenditure (4 categories)
- Real-time balance calculation

### Payment Processing
- Payments only for approved DVs
- Two payment methods: Check (MDS/Commercial) and ADA
- Check numbers sequential and non-repeating
- Payment cancellation requires reason and approval
- 3-day clearing period for some checks

### Travel Management
- Cash advance requires IoT approval
- Travel must be completed before liquidation
- CTC required for liquidation
- Refund if expenses < advance
- Additional claim if expenses > advance
- Supporting documents (OR/invoices) required for all expenses

### Cash Management
- OR numbers sequential and non-repeating
- All receipts must be deposited within prescribed period
- Bank reconciliation required monthly
- Petty cash fund has maximum limit
- Cash advances must be liquidated within 60 days

### Revenue Management
- Revenue recognized when earned or collected
- AR aging monitored regularly
- Collection targets set annually
- Write-offs require approval

### Asset Management
- Capitalization threshold determines asset classification
- Depreciation calculated monthly using consistent method
- Physical inventory count conducted annually
- Asset disposal requires approval and documentation
- Property cards maintained for all capitalized assets

### Payroll
- Payroll processed monthly
- Statutory deductions computed automatically (GSIS, PhilHealth, Pag-IBIG, Tax)
- 13th month pay released by December 15
- Payroll DVs auto-generated
- Remittances due by prescribed deadlines

### COA Compliance
- 10-year record retention per NAP R.A. 9470
- Monthly FAR No. 4 due by 30th of following month
- Quarterly reports due within 30 days after quarter end
- Annual reports include FAR No. 1 and FAR No. 3

### File Attachments
- Maximum file size: 10MB
- Allowed types: PDF, JPEG, PNG, XLSX, DOCX
- All files virus scanned (if antivirus available)
- Secure storage with database metadata

## Security Measures

1. **Authentication**
   - Session-based authentication with Lucia Auth
   - Secure password hashing (bcrypt)
   - Session expiration after inactivity
   - Login attempt limiting

2. **Authorization**
   - Role-based access control (RBAC)
   - Permission checking on all routes
   - API endpoint protection
   - Database-level role enforcement

3. **Input Validation**
   - VeeValidate + Yup schema validation
   - Server-side validation on all inputs
   - SQL injection prevention via ORM
   - XSS prevention via input sanitization

4. **Data Protection**
   - HTTPS enforcement
   - CSRF token protection
   - Secure cookie attributes
   - File upload validation

5. **Audit Trail**
   - All actions logged
   - User and IP tracking
   - Change history preserved
   - 10-year retention

## Performance Optimizations

1. **Frontend**
   - Astro Island Architecture (minimal JavaScript)
   - Static generation for public pages
   - Lazy loading for Vue components
   - Image optimization
   - Asset bundling and minification

2. **Backend**
   - Database query optimization with indexes
   - Report caching
   - Connection pooling
   - API response compression

3. **Database**
   - Proper indexing on foreign keys and search fields
   - Views for complex queries
   - Query result caching
   - Regular maintenance (OPTIMIZE TABLE)

## Deployment Configuration

### Environment Variables
```
DATABASE_URL=mysql://user:password@localhost:3306/disbursement_system
SESSION_SECRET=your-super-secret-key
NODE_ENV=production
PORT=4321
UPLOAD_MAX_SIZE=10485760
```

### Server Requirements
- **OS**: Ubuntu 22.04 LTS or Windows Server 2022
- **Node.js**: 20+ LTS
- **Database**: MariaDB 10.11+ or MySQL 8.0+
- **Web Server**: Nginx (reverse proxy)
- **Process Manager**: PM2
- **RAM**: 8GB recommended
- **Storage**: 100GB SSD

### Backup Strategy
- **Database**: Daily automated backups, 30-day retention
- **Files**: Weekly backup of uploads directory
- **Application**: Version control (Git)
- **Recovery**: Tested monthly

## Success Criteria

1. ✅ All 6 user roles can login and access appropriate features
2. ✅ DVs can be created, approved through 4 stages, and paid
3. ✅ Budget availability prevents over-obligation
4. ✅ Travel management handles IoT, CTC, and LR workflow
5. ✅ Cash receipts issued with sequential OR numbers
6. ✅ Bank reconciliation completed monthly with accuracy
7. ✅ Revenue and AR tracking with collection monitoring
8. ✅ Asset depreciation calculated automatically
9. ✅ Payroll processed with accurate deductions (GSIS, PhilHealth, Pag-IBIG, Tax)
10. ✅ COA reports (FAR 1, 3, 4, BAR 1) generate correctly
11. ✅ File attachments upload and download successfully
12. ✅ Audit logs capture all transactions
13. ✅ System handles 50+ concurrent users
14. ✅ Report generation completes within 30 seconds
15. ✅ 99.9% uptime achieved

## Maintenance Plan

### Daily
- Monitor application logs
- Check system health endpoint
- Verify automated backups completed

### Weekly
- Review audit logs for anomalies
- Database performance review
- Security patch check

### Monthly
- Database optimization (ANALYZE/OPTIMIZE)
- Backup recovery test
- User access review
- Generate usage statistics

### Quarterly
- Security audit
- Performance testing
- User feedback review
- Feature requests prioritization

### Annually
- Full system audit
- Compliance review (NAP R.A. 9470)
- Technology stack updates
- Disaster recovery drill

---

## Critical Files Summary

### Most Critical (Must Implement First)
1. [src/lib/db/schema.ts](src/lib/db/schema.ts) - Database schema definitions
2. [src/lib/auth/session.ts](src/lib/auth/session.ts) - Authentication setup
3. [src/lib/services/disbursement.service.ts](src/lib/services/disbursement.service.ts) - DV business logic
4. [src/lib/services/approval.service.ts](src/lib/services/approval.service.ts) - Approval workflow
5. [src/lib/services/budget.service.ts](src/lib/services/budget.service.ts) - Budget availability checking
6. [src/components/forms/DisbursementVoucherForm.vue](src/components/forms/DisbursementVoucherForm.vue) - Main DV form
7. [src/lib/utils/serial-generator.ts](src/lib/utils/serial-generator.ts) - DV serial generation
8. [src/pages/api/disbursements/index.ts](src/pages/api/disbursements/index.ts) - DV API endpoints

### Configuration Files
- [package.json](package.json) - Dependencies
- [astro.config.mjs](astro.config.mjs) - Astro configuration
- [drizzle.config.ts](drizzle.config.ts) - Database ORM configuration
- [tailwind.config.mjs](tailwind.config.mjs) - Tailwind CSS configuration
- [tsconfig.json](tsconfig.json) - TypeScript configuration

---

## Timeline Summary

| Phase | Duration | Focus Area |
|-------|----------|------------|
| 1 | 2 weeks | Foundation & Authentication |
| 2 | 2 weeks | Budget & Obligation Tracking |
| 3 | 3 weeks | Disbursement Voucher System |
| 4 | 2 weeks | Payment Processing |
| 5 | 2 weeks | Travel Management |
| 6 | 2 weeks | COA Reporting |
| 7 | 2 weeks | Cash Management & Treasury |
| 8 | 2 weeks | Revenue & Collection Management |
| 9 | 3 weeks | Asset & Property Management |
| 10 | 3 weeks | Payroll & Personnel Services |
| 11 | 1 week | Document Management & Audit |
| 12 | 3 weeks | Testing & QA |
| 13 | 2 weeks | Documentation & Deployment |
| **Total** | **29 weeks** | **Complete Financial Management System** |

---

## Next Steps After Plan Approval

1. **Initialize Project**
   - Run `npm create astro@latest` with Vue template
   - Install all required dependencies
   - Configure Astro for SSR mode

2. **Setup Development Database**
   - Install MariaDB locally
   - Create development database
   - Setup Drizzle ORM connection

3. **Create Database Schema**
   - Define all tables in Drizzle schema
   - Create migration files
   - Run initial migration
   - Seed reference data

4. **Build Authentication**
   - Setup Lucia Auth
   - Create login page
   - Implement session management
   - Build user CRUD operations

5. **Start Phase 1 Implementation**
   - Follow phase 1 tasks sequentially
   - Test each component before moving forward
   - Commit code frequently to Git

---

## Summary

This comprehensive plan delivers a **complete Financial Management System** for Philippine government agencies in **29 weeks** (approximately 7 months). The system includes:

### Core Modules (13 Phases)
1. ✅ Foundation & Authentication
2. ✅ Budget & Obligation Tracking
3. ✅ Disbursement Voucher System
4. ✅ Payment Processing
5. ✅ Travel Management
6. ✅ COA Reporting
7. ✅ Cash Management & Treasury
8. ✅ Revenue & Collection
9. ✅ Asset & Property Management
10. ✅ Payroll & Personnel Services
11. ✅ Document Management
12. ✅ Testing & QA
13. ✅ Deployment

### Key Differentiators
- **Full-featured** financial management covering budget-to-payment cycle
- **COA compliant** with automated FAR and BAR reporting
- **Modern tech stack** (Astro + Vue + MySQL) for performance and maintainability
- **Complete audit trail** with 10-year retention
- **Role-based access** for 6+ user types
- **Standalone deployment** with no external dependencies

### Technology Benefits
- **Astro** for optimal performance with island architecture
- **Vue 3** for reactive, component-based UI
- **MySQL/MariaDB** for robust, proven database layer
- **TypeScript** for type safety and better developer experience

The system will serve as a complete replacement for manual financial management processes, ensuring accuracy, compliance, and efficiency in government financial operations.

---

*This plan provides a comprehensive roadmap for building a Philippine Government Financial Management System that fully complies with COA regulations and Philippine government accounting standards, based on the Government Accounting Manual and Financial Management System Manual.*
