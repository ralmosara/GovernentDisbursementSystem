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
- 10-year audit retention
- Philippine government standards

### Government Accounting (GAM for NGAs)
Run `npm run db:migrate-accounting` once per environment (safe to re-run), then open
**Accounting → Journal entries** and choose **Post them now** to bring existing transactions into the books.

- **Chart of accounts:** standard Revised Chart of Accounts (UACS) accounts, plus every object of expenditure as an expense account.
- **Journal Entry Vouchers (JEV)** post automatically. Each source posts once, and mistakes are corrected with reversing entries rather than edits.

  | Event | Debit | Credit |
  |---|---|---|
  | DV fully approved | Expense | Due to BIR, Accounts Payable |
  | Check/ADA issued | Accounts Payable | Cash-MDS / Cash in Bank |
  | Check cancelled or stale | reversal of the issue entry | |
  | Official receipt | Cash-Collecting Officers | Revenue |
  | Receivable | Accounts Receivable | Revenue |
  | Collection | Cash-Collecting Officers | Accounts Receivable |
  | Deposit confirmed | Cash in Bank | Cash-Collecting Officers |
  | NCA received | Cash-MDS | Subsidy from National Government |

- **Pages:** General ledger, trial balance, and manual JEVs (accountants only; they must balance).
- **NCA registry:** MDS checks and ADAs may not exceed the Notice of Cash Allocation remaining for the fund cluster and year. The limit applies once an NCA is recorded for that fund and year.
- **Taxes withheld on DVs:**
  - VAT-registered suppliers: 5% final VAT plus 1% EWT on goods or 2% on services.
  - Non-VAT suppliers: 3% percentage tax plus EWT.
  - Payments are made at the net amount.
- **Reports:** BIR taxes withheld by ATC and Form 2307 figures by payee; Report of Checks Issued (RCI), Report of ADA Issued (RADAI), and Report of Collections and Deposits (RCD).
- **Payroll withholding** follows the TRAIN Law table (no personal exemptions), and Pag-IBIG is capped at the ₱10,000 fund salary.
- **Manual JEVs still needed:** receivable write-offs and payroll accounting entries.

## Testing

### Test Coverage

The system has comprehensive test coverage across multiple testing levels:

**Unit Tests** (137 test cases, no database needed)
- Serial number generation (DV, OR, CA, deposit slip, travel documents, JEV)
- Budget service (availability, pending-obligation reservations, disbursement tracking, centavo precision)
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
- 181 unit and integration test cases (run with `npm run test:unit` and `npm run test:integration`)
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

