# Philippine Government Financial Management System

A comprehensive Financial Management System for Philippine government agencies built with Astro, Vue.js, and MySQL/MariaDB.

## Features

- **Budget Management** - Appropriations, allotments, and obligations tracking
- **Disbursement Processing** - DV creation with multi-level approval workflow
- **Payment Processing** - Check and ADA payment management
- **Travel Management** - IoT, CTC, and liquidation reports
- **Cash Management** - OR issuance, deposits, and bank reconciliation
- **Revenue Management** - Revenue entries and accounts receivable
- **Asset Management** - Fixed assets, depreciation, and inventory
- **Payroll System** - Salary processing with government deductions
- **COA Reporting** - FAR and BAR reports for compliance
- **Document Management** - File upload/download with 10MB limit
- **Audit Trail** - Complete transaction logging with 10-year retention
- **User Activity Dashboard** - Real-time activity monitoring

## Technology Stack

- **Frontend**: Astro 5.0 (SSR) + Vue 3.5 (Composition API)
- **UI Framework**: Tailwind CSS + PrimeVue
- **Database**: MySQL 8.0+ / MariaDB 10.11+
- **ORM**: Drizzle ORM
- **Authentication**: Lucia Auth
- **State Management**: Pinia
- **Forms**: VeeValidate + Yup
- **PDF Generation**: jsPDF + autoTable
- **Excel Export**: ExcelJS

## Prerequisites

- Node.js 20+ LTS
- MySQL 8.0+ or MariaDB 10.11+
- npm or pnpm

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and update database credentials:

```bash
cp .env.example .env
```

### 3. Setup Database

Creates database and runs migrations:

```bash
npm run db:setup
```

### 4. Seed Initial Data

Populates fund clusters, roles, and default admin user:

```bash
npm run seed
```

**Upgrading an existing database?** Run the pending migration once (safe to re-run):

```bash
npm run db:migrate-collections   # adds check_no / check_date / check_bank to collections
```

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:4321 and login with:
- Username: `admin`
- Password: `admin123`

## Available Scripts

### Development
| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

### Database
| Script | Description |
|--------|-------------|
| `npm run db:setup` | Create database and run migrations |
| `npm run seed` | Seed initial data |
| `npm run db:generate` | Generate new migrations |
| `npm run db:studio` | Open database GUI |

### Testing
| Script | Description |
|--------|-------------|
| `npm test` | Run all tests in watch mode |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ui` | Run tests with interactive UI |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:e2e:ui` | Run E2E tests with UI mode |

## Default Login

After seeding:
- **Username**: `admin`
- **Password**: `admin123`

⚠️ Change this in production!

## Project Features

### Disbursement Voucher System
- Serial format: `0000-00-0000` (Serial-Month-Year)
- 4-stage approval: Division → Budget → Accounting → Director
- 5 certification boxes (A-E)
- PDF generation

### Budget Management
- Real-time budget availability
- ORS/BURS tracking
- 7 fund clusters
- UACS object of expenditure

### COA Compliance
- FAR No. 1, 3, 4 reports
- BAR No. 1 report
- Financial statements (PPSAS): financial position, financial performance, changes in net assets/equity, cash flows, and comparison of budget and actual amounts
- 10-year audit retention
- Philippine government standards

### Government Accounting (GAM for NGAs)
Run `npm run db:migrate-gov` once per environment (safe to re-run), then open
**Accounting → Journal entries** and choose **Post them now** to bring existing transactions into the books.

- **Chart of accounts:** standard Revised Chart of Accounts (UACS) accounts, including PPE with accumulated depreciation, plus every object of expenditure as an expense account.
- **Journal Entry Vouchers (JEV)** post automatically. Each source posts once, and mistakes are corrected with reversing entries rather than edits.

  | Event | Debit | Credit |
  |---|---|---|
  | DV fully approved | Expense, or PPE / semi-expendable inventory for capital outlay (506xx) | Due to BIR, Accounts Payable |
  | Check/ADA issued | Accounts Payable | Cash-MDS / Cash in Bank |
  | Check cancelled or stale | reversal of the issue entry | |
  | Official receipt | Cash-Collecting Officers | Revenue |
  | Receivable | Accounts Receivable | Revenue |
  | Collection | Cash-Collecting Officers | Accounts Receivable |
  | Deposit confirmed | Cash in Bank | Cash-Collecting Officers |
  | NCA received | Cash-MDS | Subsidy from National Government |
  | Cash or travel advance released | Advances to Officers and Employees | the account the DV was charged to |
  | Advance liquidated | Expense (up to the advance), Cash-Collecting Officers (refund) | Advances to Officers and Employees |
  | Monthly depreciation | Depreciation expense | Accumulated Depreciation (one line per asset) |
  | Semi-expendable item first issued on an ICS | Semi-Expendable Machinery and Equipment Expenses | Semi-Expendable Machinery and Equipment |
  | Asset disposed | Accumulated Depreciation, Other Receivables (proceeds), Loss | PPE at cost, Gain |
  | Supplies from an IAR received into stock (DV approved) | Supplies Inventory | the expense the DV was charged to |
  | Supplies issued | Supplies expense | Supplies Inventory (up to the item's stock in the books) |
  | Count shortage / overage | Loss of Assets / Supplies Inventory | Supplies Inventory / Miscellaneous Income |
  | Opening balances (once per fund cluster) | assets | liabilities, Accumulated Surplus/(Deficit) for the difference |

- **Pages:** General ledger, trial balance, and manual JEVs (accountants only; they must balance).
- **Financial statements** (Reports → Financial statements) are built from the posted entries: Statement of Financial
  Position (with the prior year-end), Statement of Financial Performance (with the same period last year), Statement of
  Changes in Net Assets/Equity, and Statement of Cash Flows (direct method). Year-end closing entries are left out of
  period figures, and payments of capital outlay DVs are shown as investing activities. The Statement of Comparison of
  Budget and Actual Amounts compares revenue targets with collections (official receipts and receivable collections),
  and allotments by class (PS, MOOE, FA, CO) with approved obligations for the year; its original budget is each
  allotment as first released and its final budget is after modifications.
- **Allotment modifications** (Modify Allotment on an allotment's page, budget officers): augment within the unallotted
  appropriation, reduce down to what is obligated or pending, or realign to another allotment of the same appropriation.
  Each change is recorded with its reference, and availability checks use the modified amount.
- **Revenue targets** (Budget → Revenue targets): budgeted receipts per revenue source, fund cluster and year. The first
  amount set is the original budget; later changes update the final budget.
- **Depreciation** (Accounting → Depreciation) is straight-line, starting the month after acquisition and stopping at
  cost less residual value. Post each month once it ends; a skipped month is caught up the next time. Only items costing
  ₱50,000 or more are depreciated. Each asset category names the PPE account its assets are carried in (Machinery if none).
- **Cash advances** are released against the approved DV that paid them, which must be in the same fund cluster and for
  the same amount. Spending beyond an advance is reimbursed on its own DV, so liquidation recognises expenses only up to
  the advance. Travel advances post when the itinerary is linked to an approved DV, and liquidate when the liquidation
  report is approved.
- **Disposals** can't change date or value once in the books; delete the disposal (which reverses its entry) and record it
  again. Sale proceeds are recorded as Other Receivables until collected.
- **Supplies inventory:** each stock item names the inventory account it is carried in (Office Supplies if none).
  Stock received from an IAR moves from expense to inventory once the DV is approved, and issues are expensed out of
  inventory. Issues never expense more than the item's stock in the books, so stock that was expensed on its DV (manual
  receipts, initial quantities) is not charged twice. Deleting a transaction reverses its entry. Physical-count and
  manual adjustments write a shortage off to Loss of Assets (up to the stock in the books) and take an overage up as
  Miscellaneous Income, for items with stock in the books.
- **Opening balances** (Accounting → Opening balances, accountants): one entry per fund cluster for balances that existed
  before the ledger. Lines are suggested from the records as of the opening date (PPE at cost with depreciation to the
  previous month-end, semi-expendable property not yet issued, supplies on hand, unliquidated cash advances); add cash,
  payables and anything else, and the difference goes to Accumulated Surplus/(Deficit). Each asset, item and employee is
  its own subsidiary line, so depreciation, issues and liquidations continue from it. Records dated before the opening
  date are then left out of automatic posting, so pick the day the books start. Correct a posted opening entry with a
  manual JEV.
- **Account codes:** the PPE, depreciation, gain/loss, semi-expendable, supplies inventory and Loss of Assets codes follow
  the Revised Chart of Accounts structure. Confirm them against the agency's chart before submitting statements to COA.
- **NCA registry:** MDS checks and ADAs may not exceed the Notice of Cash Allocation remaining for the fund cluster and year. The limit applies once an NCA is recorded for that fund and year.
- **Taxes withheld on DVs:**
  - VAT-registered suppliers: 5% final VAT plus 1% EWT on goods or 2% on services.
  - Non-VAT suppliers: 3% percentage tax plus EWT.
  - Payments are made at the net amount.
- **Reports:** BIR taxes withheld by ATC and Form 2307 figures by payee; Report of Checks Issued (RCI), Report of ADA Issued (RADAI), and Report of Collections and Deposits (RCD).
- **Payroll withholding** follows the TRAIN Law table (no personal exemptions), and Pag-IBIG is capped at the ₱10,000 fund salary.
- **Payroll in the books:**
  - Processing a payroll posts the salary expense, the government's share of contributions, and what is owed to BIR, GSIS, Pag-IBIG, PhilHealth and the employees.
  - **Record payout** releases net pay.
  - **Record payment** on a remittance clears what is owed to that agency. BIR is paid through a Tax Remittance Advice,
    which is recognised as a subsidy from National Government and applied to the tax due in the same entry.
- **Receivable write-offs** post Dr Impairment Loss – Loans and Receivables, Cr Accounts Receivable.
- **Year-end closing:**
  - Closes revenue and expense accounts to Accumulated Surplus/(Deficit), with one entry per fund cluster dated 31 December.
  - Locks the year against further posting.
  - Requires that nothing is left unposted and the trial balance balances.
  - Only administrators can reopen a closed year; reopening reverses the closing entries.

### Procurement (RA 12009)
The chain runs purchase request → purchase order → obligation (ORS) → inspection and acceptance report (IAR) → disbursement voucher.

- **Approval:** the head of office approves purchase requests, and segregation of duties stops requesters approving their own.
- **Ordering limits:** purchase orders can't exceed the approved budget for the contract or the requested quantities.
- **Obligation:** the ORS is raised from the purchase order, and its number is recorded on it.
- **Deliveries:** each IAR accepts at most what is still undelivered, and marks the purchase order partly or fully delivered.
- **Payment:** each IAR opens a voucher already filled in with the supplier, amount, ORS number and object of expenditure. An IAR can be paid by one voucher only.
- **Stock:** supplies kept in stock are received from the IAR into inventory at the contract price. Each line can be received once.

### Property accountability (PAR/ICS)
- **Document type:** items costing ₱50,000 or more are issued on a Property Acknowledgment Receipt (PAR). Semi-expendable items below that go on an Inventory Custodian Slip (ICS), per COA Circular 2022-004.
- **One accountable officer at a time:** each asset has a single holder. Transfers close one document and open the next, and returns send the item back to the supply office.
- **Accountability page:** lists each officer's property for the physical count, and shows active assets that haven't been issued.

## Testing

### Test Coverage

The system has comprehensive test coverage across multiple testing levels:

**Unit Tests** (306 test cases, no database needed)
- General ledger postings: DVs, payments, payroll, remittances, advances, depreciation, disposals, supplies inventory, count adjustments, opening balances, year-end closing
- Financial statements: classification, comparative columns, reconciliation of equity and cash, budget and actual
- Serial number generation (DV, OR, CA, deposit slip, travel documents, JEV)
- Budget service (availability, pending-obligation reservations, disbursement tracking, allotment modifications, centavo precision)
- Access policy (who may call each state-changing API, plus a guard that every rule matches a real route)
- File handler (validation, security, MIME types)
- Security utilities (CSRF, rate limiting, headers)

**Integration Tests** (44 test cases, no database needed)
- DV approval workflow: full 4-stage flow, rejection closes later stages, segregation of duties,
  concurrent approvals, permissions
- Security integration

**E2E Tests** (Playwright; need a running app, a seeded database and installed browsers)
- User authentication and session management
- DV creation and complete lifecycle
- Multi-user approval workflows
- Multi-browser support (Chrome, Firefox, Safari, Mobile)

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run with coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Interactive test UI
npm run test:ui
```

### Test Documentation

- [TESTING.md](docs/TESTING.md) - Complete testing documentation
- [SECURITY-TESTING.md](docs/SECURITY-TESTING.md) - Security testing checklist (OWASP Top 10)
- [PERFORMANCE-TESTING.md](docs/PERFORMANCE-TESTING.md) - Performance testing guide
- [PHASE-12-SUMMARY.md](docs/PHASE-12-SUMMARY.md) - Testing phase summary

**Test Statistics:**
- 350 unit and integration test cases (run with `npm run test:unit` and `npm run test:integration`)
- 6 Playwright browser profiles configured for E2E

## Documentation

### User Guides
- See `docs/` folder for detailed documentation
- Phase summaries available for each development phase

### API Documentation
- RESTful API endpoints for all modules
- Authentication via Lucia Auth
- Role-based access control

## Security

- ✅ SQL injection prevention (Drizzle ORM parameterized queries)
- ✅ Authentication with 8-hour sliding sessions (Lucia); deactivating a user ends their sessions immediately
- ✅ Role-based access control for every state-changing API call, defined in one policy table:
  [src/lib/security/access-policy.ts](src/lib/security/access-policy.ts) (administrators have full access)
- ✅ Segregation of duties on disbursement vouchers: the preparer cannot approve their own DV and one person
  cannot approve two stages. On by default; can be turned off for single-user test setups in
  **Admin → Settings → Security**
- ✅ CSRF protection: same-origin enforcement on all API writes, plus a token on the login form
- ✅ Login rate limiting (5 attempts per username / 10 per IP per 15 minutes)
- ✅ Configurable password policy (Admin → Settings → Security)
- ✅ File uploads stored outside the web root (`UPLOAD_DIR`, default `storage/uploads`) and served only
  through the authenticated `/api/attachments/{id}/download` endpoint
- ✅ Audit logging, including role changes, password resets, settings changes and AR write-offs

### Who can do what

| Action | Roles |
|--------|-------|
| Record appropriations and allotments; certify or reject obligations | Budget Officer |
| Prepare obligation requests | Budget Officer, Division Staff, Accountant |
| Approve a DV stage | The role assigned to that stage (Division → Budget → Accounting → Director) |
| Payments (checks / ADA), receipts, deposits, petty cash | Cashier, Accountant |
| Bank reconciliations, payroll, fixed assets | Accountant |
| Approve travel, write off receivables | Director |
| Users, roles and system settings | Administrator |
| Prepare DVs, request travel or cash advances, upload attachments | Any signed-in user |

See [SECURITY-TESTING.md](docs/SECURITY-TESTING.md) for complete security documentation.

## Performance

**Target Metrics:**
- Dashboard: < 1.5s load time
- DV List: < 2.0s load time
- Reports: < 10s generation time

See [PERFORMANCE-TESTING.md](docs/PERFORMANCE-TESTING.md) for optimization guidelines.

## License

Copyright © 2025 Philippine Government

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

