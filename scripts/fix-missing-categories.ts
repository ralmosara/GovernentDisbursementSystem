import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'government_fms';

async function fixMissingCategories() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    console.log('Updating missing categories...');

    await connection.query(
      "UPDATE object_of_expenditure SET category = 'Financial Assistance' WHERE code IN ('5030300000', '5030400000')"
    );

    console.log('✓ Updated 2 records');

    // Verify
    const [rows] = await connection.query(`
      SELECT category, COUNT(*) as count
      FROM object_of_expenditure
      GROUP BY category
      ORDER BY category
    `);
    console.log('\nFinal category counts:');
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await connection.end();
  }
}

fixMissingCategories();
