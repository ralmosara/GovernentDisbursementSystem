import 'dotenv/config';
import mysql from 'mysql2/promise';

/**
 * Adds check_no, check_date and check_bank to `collections`.
 * Safe to run more than once: existing columns are skipped.
 */

const COLUMNS: { name: string; definition: string }[] = [
  { name: 'check_no', definition: 'VARCHAR(50) NULL AFTER `payment_mode`' },
  { name: 'check_date', definition: 'DATETIME NULL AFTER `check_no`' },
  { name: 'check_bank', definition: 'VARCHAR(100) NULL AFTER `check_date`' },
];

async function runMigration() {
  const database = process.env.DATABASE_NAME || 'government_fms';
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database,
  });

  try {
    console.log('Running migration: add_check_details_to_collections...');

    for (const column of COLUMNS) {
      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'collections' AND COLUMN_NAME = ?`,
        [database, column.name]
      );

      if (rows.length > 0) {
        console.log(`  - ${column.name} already exists, skipping`);
        continue;
      }

      await connection.query(`ALTER TABLE collections ADD COLUMN \`${column.name}\` ${column.definition}`);
      console.log(`  ✓ added ${column.name}`);
    }

    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

runMigration();
