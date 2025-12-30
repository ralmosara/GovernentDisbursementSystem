import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'government_fms';

async function finalVerification() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    // Count by category
    const [categoryCounts] = await connection.query(`
      SELECT category, COUNT(*) as count
      FROM object_of_expenditure
      GROUP BY category
      ORDER BY category
    `);
    console.log('✓ Records by category:');
    console.log(JSON.stringify(categoryCounts, null, 2));

    // Total count
    const [totalCount] = await connection.query('SELECT COUNT(*) as total FROM object_of_expenditure');
    console.log('\n✓ Total records:', (totalCount as any)[0].total);

    // Sample from each category
    console.log('\n✓ Sample from each category:');

    const categories = ['Personnel Services', 'MOOE', 'Capital Outlay', 'Financial Assistance'];
    for (const cat of categories) {
      const [sample] = await connection.query(
        'SELECT code, name FROM object_of_expenditure WHERE category = ? LIMIT 3',
        [cat]
      );
      console.log(`\n${cat}:`);
      console.log(JSON.stringify(sample, null, 2));
    }
  } finally {
    await connection.end();
  }
}

finalVerification();
