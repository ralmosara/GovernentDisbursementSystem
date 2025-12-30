import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'government_fms';

async function reseedObjectOfExpenditure() {
  console.log('Reseeding Object of Expenditure table...\n');

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    console.log('[1] Clearing existing object of expenditure data...');
    await connection.query('DELETE FROM object_of_expenditure');
    console.log('[OK] Table cleared\n');

    console.log('[2] Inserting fresh data...');

    const objectOfExpenditureData = [
      // Personnel Services
      { code: '5010000000', name: 'Salaries and Wages', category: 'Personnel Services', description: 'Basic salary of permanent and casual employees' },
      { code: '5010100000', name: 'Salaries and Wages - Regular', category: 'Personnel Services', description: 'Regular salaries' },
      { code: '5010200000', name: 'Salaries and Wages - Casual', category: 'Personnel Services', description: 'Casual employee wages' },
      { code: '5010300000', name: 'Other Compensation', category: 'Personnel Services', description: 'PERA, Additional Compensation, etc.' },
      { code: '5010400000', name: 'Personnel Benefits', category: 'Personnel Services', description: 'Retirement and life insurance, etc.' },
      { code: '5010500000', name: 'Other Personnel Benefits', category: 'Personnel Services', description: 'Terminal leave benefits, etc.' },

      // MOOE (Maintenance and Other Operating Expenses)
      { code: '5020000000', name: 'Traveling Expenses', category: 'MOOE', description: 'Traveling expenses - local and foreign' },
      { code: '5020100000', name: 'Training and Scholarship Expenses', category: 'MOOE', description: 'Training expenses, scholarship grants, etc.' },
      { code: '5020200000', name: 'Supplies and Materials Expenses', category: 'MOOE', description: 'Office supplies, accountable forms, etc.' },
      { code: '5020300000', name: 'Utility Expenses', category: 'MOOE', description: 'Water, electricity, gas, etc.' },
      { code: '5020400000', name: 'Communication Expenses', category: 'MOOE', description: 'Telephone, internet, postage, etc.' },
      { code: '5020500000', name: 'Awards/Rewards and Prizes', category: 'MOOE', description: 'Awards and incentives' },
      { code: '5020600000', name: 'Survey, Research, Exploration', category: 'MOOE', description: 'Survey and research activities' },
      { code: '5020700000', name: 'Demolition and Relocation', category: 'MOOE', description: 'Demolition and relocation expenses' },
      { code: '5020800000', name: 'Generation, Transmission and Distribution', category: 'MOOE', description: 'Utilities generation and distribution' },
      { code: '5020900000', name: 'Confidential, Intelligence and Extraordinary Expenses', category: 'MOOE', description: 'Confidential and extraordinary expenses' },
      { code: '5021000000', name: 'Professional Services', category: 'MOOE', description: 'Consultancy, legal, auditing services, etc.' },
      { code: '5021100000', name: 'General Services', category: 'MOOE', description: 'Janitorial, security, etc.' },
      { code: '5021200000', name: 'Repairs and Maintenance', category: 'MOOE', description: 'Repairs and maintenance expenses' },
      { code: '5021300000', name: 'Financial Assistance/Subsidy to GOCCs', category: 'MOOE', description: 'Subsidy to government corporations' },
      { code: '5021400000', name: 'Taxes, Duties and Licenses', category: 'MOOE', description: 'Taxes, insurance premiums, fidelity bonds' },
      { code: '5021500000', name: 'Fidelity Bond Premiums', category: 'MOOE', description: 'Fidelity bond insurance' },
      { code: '5021600000', name: 'Insurance Expenses', category: 'MOOE', description: 'Insurance premiums' },
      { code: '5021700000', name: 'Advertising, Promotional and Marketing Expense', category: 'MOOE', description: 'Advertising and promotions' },
      { code: '5021800000', name: 'Printing and Publication Expenses', category: 'MOOE', description: 'Printing of reports, IEC materials, etc.' },
      { code: '5021900000', name: 'Representation Expenses', category: 'MOOE', description: 'Representation and entertainment' },
      { code: '5022000000', name: 'Transportation and Delivery Expenses', category: 'MOOE', description: 'Freight, handling, etc.' },
      { code: '5022100000', name: 'Rent/Lease Expenses', category: 'MOOE', description: 'Rent of buildings, equipment, etc.' },
      { code: '5022200000', name: 'Membership Dues and Contributions', category: 'MOOE', description: 'Membership fees and contributions' },
      { code: '5022300000', name: 'Subscription Expenses', category: 'MOOE', description: 'Newspapers, magazines, journals' },
      { code: '5022400000', name: 'Donations', category: 'MOOE', description: 'Charitable donations' },

      // Capital Outlay
      { code: '5060000000', name: 'Property, Plant and Equipment Outlay', category: 'Capital Outlay', description: 'Purchase of PPE' },
      { code: '5060100000', name: 'Land', category: 'Capital Outlay', description: 'Land acquisition' },
      { code: '5060200000', name: 'Buildings and Other Structures', category: 'Capital Outlay', description: 'Building construction and improvement' },
      { code: '5060300000', name: 'Machinery and Equipment', category: 'Capital Outlay', description: 'Machinery and equipment' },
      { code: '5060400000', name: 'Transportation Equipment', category: 'Capital Outlay', description: 'Vehicles and transportation equipment' },
      { code: '5060500000', name: 'Furniture, Fixtures and Books', category: 'Capital Outlay', description: 'Furniture, fixtures and library books' },
      { code: '5060600000', name: 'Semi-Expendable Machinery and Equipment', category: 'Capital Outlay', description: 'Semi-expendable property' },

      // Financial Assistance
      { code: '5030000000', name: 'Subsidies', category: 'Financial Assistance', description: 'Subsidies to individuals and organizations' },
      { code: '5030100000', name: 'Subsidies - Others', category: 'Financial Assistance', description: 'Other subsidies' },
      { code: '5030200000', name: 'Assistance to Individuals', category: 'Financial Assistance', description: 'Financial assistance to individuals' },
      { code: '5030300000', name: 'Assistance to LGUs', category: 'Financial Assistance', description: 'Assistance to local government units' },
      { code: '5030400000', name: 'Assistance to NGOs/POs', category: 'Financial Assistance', description: 'Assistance to civil society organizations' },
    ];

    for (const obj of objectOfExpenditureData) {
      await connection.query(
        'INSERT INTO object_of_expenditure (code, name, category, description, is_active) VALUES (?, ?, ?, ?, 1)',
        [obj.code, obj.name, obj.category, obj.description]
      );
    }

    console.log(`[OK] Inserted ${objectOfExpenditureData.length} records\n`);
    console.log('[SUCCESS] Object of Expenditure reseeded successfully!');

  } catch (error) {
    console.error('[ERROR] Reseed failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

reseedObjectOfExpenditure()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
