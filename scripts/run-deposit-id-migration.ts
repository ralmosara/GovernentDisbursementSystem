import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'government_fms',
  });

  try {
    console.log('Running migration: add_bank_deposit_id_to_cash_receipts...');

    // Step 1: Add column
    console.log('  1. Adding bank_deposit_id column...');
    await connection.query(`
      ALTER TABLE cash_receipts
      ADD COLUMN bank_deposit_id INT NULL AFTER revenue_source_id
    `);

    // Step 2: Add index
    console.log('  2. Creating index...');
    await connection.query(`
      CREATE INDEX idx_cash_receipts_deposit ON cash_receipts (bank_deposit_id)
    `);

    // Step 3: Add foreign key
    console.log('  3. Adding foreign key constraint...');
    await connection.query(`
      ALTER TABLE cash_receipts
      ADD CONSTRAINT fk_cash_receipts_deposit
      FOREIGN KEY (bank_deposit_id)
      REFERENCES bank_deposits (id)
      ON DELETE SET NULL
    `);

    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration();
