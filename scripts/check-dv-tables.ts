import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'government_fms';

async function checkDVTables() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    const [tables] = await connection.query('SHOW TABLES');
    console.log('All tables in database:');
    console.log(tables);

    const tablesToCheck = [
      'disbursement_vouchers',
      'approval_workflows',
      'payments',
      'dv_supporting_documents'
    ];

    console.log('\nChecking DV-related tables:');
    for (const tableName of tablesToCheck) {
      const [result]: any = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
        [DB_NAME, tableName]
      );
      if (result[0].count > 0) {
        console.log(`✓ ${tableName} exists`);
      } else {
        console.log(`✗ ${tableName} MISSING`);
      }
    }
  } finally {
    await connection.end();
  }
}

checkDVTables();
