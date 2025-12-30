import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'government_fms';

async function fixCategoryColumn() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    console.log('Altering category column from ENUM to VARCHAR(100)...');

    // Change category column from ENUM to VARCHAR(100)
    await connection.query(`
      ALTER TABLE object_of_expenditure
      MODIFY COLUMN category VARCHAR(100) NOT NULL
    `);

    console.log('✓ Category column altered successfully');

    // Now update all existing records to set proper categories
    console.log('\nUpdating existing records with proper categories...');

    const updates = [
      // Personnel Services
      { code: '5010000000', category: 'Personnel Services' },
      { code: '5010100000', category: 'Personnel Services' },
      { code: '5010200000', category: 'Personnel Services' },
      { code: '5010300000', category: 'Personnel Services' },
      { code: '5010400000', category: 'Personnel Services' },
      { code: '5010500000', category: 'Personnel Services' },
      { code: '5010600000', category: 'Personnel Services' },
      { code: '5010700000', category: 'Personnel Services' },
      { code: '5010800000', category: 'Personnel Services' },
      { code: '5010900000', category: 'Personnel Services' },

      // MOOE
      { code: '5020000000', category: 'MOOE' },
      { code: '5020100000', category: 'MOOE' },
      { code: '5020200000', category: 'MOOE' },
      { code: '5020300000', category: 'MOOE' },
      { code: '5020400000', category: 'MOOE' },
      { code: '5020500000', category: 'MOOE' },
      { code: '5020600000', category: 'MOOE' },
      { code: '5020700000', category: 'MOOE' },
      { code: '5020800000', category: 'MOOE' },
      { code: '5020900000', category: 'MOOE' },
      { code: '5021000000', category: 'MOOE' },
      { code: '5021100000', category: 'MOOE' },
      { code: '5021200000', category: 'MOOE' },
      { code: '5021300000', category: 'MOOE' },
      { code: '5021400000', category: 'MOOE' },
      { code: '5021500000', category: 'MOOE' },
      { code: '5021600000', category: 'MOOE' },
      { code: '5021700000', category: 'MOOE' },
      { code: '5021800000', category: 'MOOE' },
      { code: '5021900000', category: 'MOOE' },
      { code: '5029900000', category: 'MOOE' },

      // Financial Assistance
      { code: '5030000000', category: 'Financial Assistance' },
      { code: '5030100000', category: 'Financial Assistance' },
      { code: '5030200000', category: 'Financial Assistance' },

      // Capital Outlay
      { code: '5060000000', category: 'Capital Outlay' },
      { code: '5060100000', category: 'Capital Outlay' },
      { code: '5060200000', category: 'Capital Outlay' },
      { code: '5060300000', category: 'Capital Outlay' },
      { code: '5060400000', category: 'Capital Outlay' },
      { code: '5060500000', category: 'Capital Outlay' },
      { code: '5060600000', category: 'Capital Outlay' },
      { code: '5060700000', category: 'Capital Outlay' },
      { code: '5060800000', category: 'Capital Outlay' },
    ];

    for (const update of updates) {
      await connection.query(
        'UPDATE object_of_expenditure SET category = ? WHERE code = ?',
        [update.category, update.code]
      );
    }

    console.log(`✓ Updated ${updates.length} records with proper categories`);

    // Verify the updates
    console.log('\nVerifying updates...');
    const [rows] = await connection.query(
      'SELECT code, name, category FROM object_of_expenditure ORDER BY code LIMIT 10'
    );
    console.log('Sample records:', JSON.stringify(rows, null, 2));

    // Count by category
    const [categoryCounts] = await connection.query(`
      SELECT category, COUNT(*) as count
      FROM object_of_expenditure
      GROUP BY category
    `);
    console.log('\nRecords by category:', JSON.stringify(categoryCounts, null, 2));

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

fixCategoryColumn();
