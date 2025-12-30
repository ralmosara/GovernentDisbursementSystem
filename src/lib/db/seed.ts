import { db } from './connection';
import { pool } from './connection';
import {
  fundClusters,
  roles,
  users,
  userRoles,
  objectOfExpenditure,
  systemSettings
} from './schema';
import bcrypt from 'bcrypt';

export async function seed() {
  console.log('Starting database seed...\n');

  try {
    // 1. Seed Fund Clusters
    console.log('[1] Seeding Fund Clusters...');
    const fundClusterData = [
      { code: '01', name: 'Regular Agency Fund', description: 'For regular operating expenses' },
      { code: '02', name: 'Foreign Assisted Projects', description: 'For foreign-assisted project funds' },
      { code: '03', name: 'Special Account - Locally Funded/Domestic Grants', description: 'For locally funded special accounts' },
      { code: '04', name: 'Special Account - Foreign Assisted/Foreign Grants', description: 'For foreign-assisted special accounts' },
      { code: '05', name: 'Trust Receipts', description: 'For trust receipt funds' },
      { code: '06', name: 'Trust Liabilities', description: 'For trust liability funds' },
      { code: '07', name: 'Intra-Agency Fund Transfers', description: 'For intra-agency fund transfers' },
    ];

    for (const fc of fundClusterData) {
      await db.insert(fundClusters).values(fc).onDuplicateKeyUpdate({
        set: { name: fc.name, description: fc.description }
      });
    }
    console.log('[OK] Fund Clusters seeded\n');

    // 2. Seed Roles
    console.log('[2] Seeding User Roles...');
    const roleData = [
      {
        name: 'administrator',
        displayName: 'Administrator',
        description: 'Full system access',
        permissions: JSON.stringify({ all: true })
      },
      {
        name: 'director',
        displayName: 'Director',
        description: 'Final approval authority',
        permissions: JSON.stringify({ disbursements: ['read', 'approve'] })
      },
      {
        name: 'accountant',
        displayName: 'Accountant',
        description: 'Budget and accounting operations',
        permissions: JSON.stringify({ disbursements: ['create', 'read', 'update', 'approve'] })
      },
      {
        name: 'budget_officer',
        displayName: 'Budget Officer',
        description: 'Budget tracking',
        permissions: JSON.stringify({ budget: ['create', 'read', 'update'] })
      },
      {
        name: 'cashier',
        displayName: 'Cashier',
        description: 'Payment processing',
        permissions: JSON.stringify({ payments: ['create', 'read', 'update'] })
      },
      {
        name: 'division_staff',
        displayName: 'Division Staff',
        description: 'DV creation',
        permissions: JSON.stringify({ disbursements: ['create', 'read'] })
      },
    ];

    for (const role of roleData) {
      await db.insert(roles).values(role).onDuplicateKeyUpdate({
        set: { displayName: role.displayName }
      });
    }
    console.log('[OK] User Roles seeded\n');

    // 3. Seed System Settings
    console.log('[3] Seeding System Settings...');
    const settingsData = [
      { settingKey: 'dv_serial_current', settingValue: '0', description: 'Current DV serial number' },
      { settingKey: 'agency_name', settingValue: 'Government Agency', description: 'Agency name' },
    ];

    for (const setting of settingsData) {
      await db.insert(systemSettings).values(setting).onDuplicateKeyUpdate({
        set: { settingValue: setting.settingValue, description: setting.description }
      });
    }
    console.log('[OK] System Settings seeded\n');

    // 4. Seed Object of Expenditure (UACS)
    console.log('[4] Seeding Object of Expenditure...');
    const objectOfExpenditureData = [
      // Personnel Services
      { code: '5010000000', name: 'Salaries and Wages', category: 'Personnel Services', description: 'Basic salary of permanent and casual employees' },
      { code: '5010100000', name: 'Salaries and Wages - Regular', category: 'Personnel Services', description: 'Regular salaries' },
      { code: '5010200000', name: 'Salaries and Wages - Casual', category: 'Personnel Services', description: 'Casual employee wages' },
      { code: '5010300000', name: 'Other Compensation', category: 'Personnel Services', description: 'PERA, Additional Compensation, etc.' },
      { code: '5010400000', name: 'Personnel Benefits', category: 'Personnel Services', description: 'Retirement, insurance, etc.' },
      { code: '5010500000', name: 'Contributions', category: 'Personnel Services', description: 'GSIS, PhilHealth, Pag-IBIG, ECC' },

      // Maintenance and Other Operating Expenses (MOOE)
      { code: '5020000000', name: 'Traveling Expenses', category: 'MOOE', description: 'Domestic and foreign travel' },
      { code: '5020100000', name: 'Traveling Expenses - Local', category: 'MOOE', description: 'Local travel expenses' },
      { code: '5020200000', name: 'Traveling Expenses - Foreign', category: 'MOOE', description: 'Foreign travel expenses' },
      { code: '5020300000', name: 'Training Expenses', category: 'MOOE', description: 'Training and scholarship expenses' },
      { code: '5020400000', name: 'Supplies and Materials', category: 'MOOE', description: 'Office supplies, materials, etc.' },
      { code: '5020500000', name: 'Utility Expenses', category: 'MOOE', description: 'Water, electricity, telephone' },
      { code: '5020600000', name: 'Communication Expenses', category: 'MOOE', description: 'Postage, courier, internet' },
      { code: '5020700000', name: 'Awards/Rewards and Prizes', category: 'MOOE', description: 'Awards and prizes' },
      { code: '5020800000', name: 'Survey and Research Expenses', category: 'MOOE', description: 'Surveys and research' },
      { code: '5020900000', name: 'Demolition and Relocation Expenses', category: 'MOOE', description: 'Demolition and relocation' },
      { code: '5021000000', name: 'Printing and Publication Expenses', category: 'MOOE', description: 'Printing and publications' },
      { code: '5021100000', name: 'Representation Expenses', category: 'MOOE', description: 'Representation' },
      { code: '5021200000', name: 'Transportation and Delivery Expenses', category: 'MOOE', description: 'Freight, delivery charges' },
      { code: '5021300000', name: 'Rent/Lease Expenses', category: 'MOOE', description: 'Rent of buildings, equipment' },
      { code: '5021400000', name: 'Membership Dues and Contributions', category: 'MOOE', description: 'Membership fees' },
      { code: '5021500000', name: 'Subscription Expenses', category: 'MOOE', description: 'Subscriptions to periodicals' },
      { code: '5021600000', name: 'Donations', category: 'MOOE', description: 'Donations and contributions' },
      { code: '5021700000', name: 'Advertising Expenses', category: 'MOOE', description: 'Advertising and promotions' },
      { code: '5021800000', name: 'Printing and Binding Expenses', category: 'MOOE', description: 'Printing and binding' },
      { code: '5021900000', name: 'General Services', category: 'MOOE', description: 'Janitorial, security services' },
      { code: '5022000000', name: 'Professional Services', category: 'MOOE', description: 'Consultancy, legal, audit' },
      { code: '5022100000', name: 'Repairs and Maintenance', category: 'MOOE', description: 'Repairs and maintenance' },
      { code: '5022200000', name: 'Taxes, Insurance Premiums and Other Fees', category: 'MOOE', description: 'Taxes and insurance' },
      { code: '5022300000', name: 'Labor and Wages', category: 'MOOE', description: 'Job orders and contracts' },
      { code: '5022400000', name: 'Other Maintenance and Operating Expenses', category: 'MOOE', description: 'Other MOOE' },

      // Capital Outlays
      { code: '5060000000', name: 'Property, Plant and Equipment Outlay', category: 'Capital Outlay', description: 'Infrastructure and equipment' },
      { code: '5060100000', name: 'Infrastructure Outlay', category: 'Capital Outlay', description: 'Buildings, roads, bridges' },
      { code: '5060200000', name: 'Building and Structures', category: 'Capital Outlay', description: 'Construction of buildings' },
      { code: '5060300000', name: 'Machinery and Equipment', category: 'Capital Outlay', description: 'Purchase of machinery and equipment' },
      { code: '5060400000', name: 'Transportation Equipment', category: 'Capital Outlay', description: 'Vehicles and transport equipment' },
      { code: '5060500000', name: 'Furniture, Fixtures and Books', category: 'Capital Outlay', description: 'Furniture and fixtures' },
      { code: '5060600000', name: 'Other Property, Plant and Equipment', category: 'Capital Outlay', description: 'Other capital items' },

      // Financial Assistance/Subsidy
      { code: '5030000000', name: 'Subsidies', category: 'Financial Assistance', description: 'Subsidies to individuals and organizations' },
      { code: '5030100000', name: 'Subsidies to Operating Units', category: 'Financial Assistance', description: 'Subsidies to LGUs and GOCCs' },
      { code: '5030200000', name: 'Assistance to Individuals', category: 'Financial Assistance', description: 'Financial assistance to individuals' },
      { code: '5030300000', name: 'Assistance to LGUs', category: 'Financial Assistance', description: 'Assistance to local government units' },
      { code: '5030400000', name: 'Assistance to NGOs/POs', category: 'Financial Assistance', description: 'Assistance to civil society organizations' },
    ];

    for (const obj of objectOfExpenditureData) {
      await db.insert(objectOfExpenditure).values(obj).onDuplicateKeyUpdate({
        set: { name: obj.name, category: obj.category, description: obj.description }
      });
    }
    console.log('[OK] Object of Expenditure seeded\n');

    // 5. Create admin user
    console.log('[5] Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Try to insert or update admin user
    await db.insert(users).values({
      username: 'admin',
      email: 'admin@agency.gov.ph',
      passwordHash: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true,
    }).onDuplicateKeyUpdate({
      set: {
        email: 'admin@agency.gov.ph',
        passwordHash: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true
      }
    });

    // Get the admin user
    const adminUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'admin')
    });

    // Get the administrator role
    const adminRole = await db.query.roles.findFirst({
      where: (roles, { eq }) => eq(roles.name, 'administrator')
    });

    if (adminUser && adminRole) {
      // Assign admin role to user
      await db.insert(userRoles).values({
        userId: adminUser.id,
        roleId: adminRole.id,
      }).onDuplicateKeyUpdate({
        set: { roleId: adminRole.id }
      });
      console.log('[OK] Admin user created');
      console.log('   Username: admin');
      console.log('   Password: admin123\n');
    } else {
      console.log('[WARNING] Could not assign admin role\n');
    }

    console.log('[SUCCESS] Database seed completed!\n');
    
    // Close connection pool
    await pool.end();

  } catch (error) {
    console.error('[ERROR] Seed failed:', error);
    await pool.end();
    throw error;
  }
}

// Run seed
seed()
  .then(() => {
    console.log('Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });
