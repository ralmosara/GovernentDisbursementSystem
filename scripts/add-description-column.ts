import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'government_fms';

async function addDescriptionColumn() {
  console.log('Adding description column to object_of_expenditure table...\n');

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    // Check if column already exists
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM object_of_expenditure LIKE 'description'"
    );

    if ((columns as any[]).length > 0) {
      console.log('[INFO] Description column already exists');
    } else {
      console.log('[1] Adding description column...');
      await connection.query(`
        ALTER TABLE object_of_expenditure
        ADD COLUMN description TEXT AFTER category
      `);
      console.log('[OK] Description column added successfully!');
    }

  } catch (error) {
    console.error('[ERROR] Failed to add description column:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

addDescriptionColumn()
  .then(() => {
    console.log('\nNext step: npm run seed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
