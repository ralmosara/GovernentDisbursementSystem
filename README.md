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

## Testing

### Test Coverage

The system has comprehensive test coverage across multiple testing levels:

**Unit Tests** (125+ test cases)
- Serial number generation (DV, OR, CA, Deposit Slip)
- Budget service (availability, obligations, utilization)
- File handler (validation, security, MIME types)

**Integration Tests** (15+ test cases)
- DV approval workflow (4-stage approval process)
- Budget validation and tracking
- Rejection handling

**E2E Tests** (30+ test cases)
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
- 170+ total test cases
- 70%+ code coverage
- 6 browser profiles configured
- Multi-device testing support

## Documentation

### User Guides
- See `docs/` folder for detailed documentation
- Phase summaries available for each development phase

### API Documentation
- RESTful API endpoints for all modules
- Authentication via Lucia Auth
- Role-based access control

## Security

- ✅ SQL Injection Prevention (Drizzle ORM parameterized queries)
- ✅ Authentication & Session Management (Lucia Auth)
- ✅ Role-Based Access Control (Permission system)
- ✅ File Upload Security (Type/size validation, 10MB limit)
- ✅ Audit Logging (Sensitive data sanitization)
- ⚠️ CSRF Protection (Pending implementation)
- ⚠️ Rate Limiting (Pending implementation)

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

