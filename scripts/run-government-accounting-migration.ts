import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Applies migrations/add_government_accounting.sql and the column additions it lists.
 * Safe to run more than once: tables use IF NOT EXISTS, seeds use INSERT IGNORE and
 * columns are added only when missing.
 */

const COLUMNS: { table: string; name: string; definition: string }[] = [
  { table: 'disbursement_vouchers', name: 'tax_treatment', definition: 'VARCHAR(30) NULL' },
  { table: 'disbursement_vouchers', name: 'payee_type', definition: 'VARCHAR(20) NULL' },
  { table: 'disbursement_vouchers', name: 'total_tax_withheld', definition: 'DECIMAL(15,2) NOT NULL DEFAULT 0' },
  { table: 'disbursement_vouchers', name: 'net_amount', definition: 'DECIMAL(15,2) NULL' },
  { table: 'revenue_sources', name: 'account_code', definition: 'VARCHAR(20) NULL' },
];

async function runMigration() {
  const database = process.env.DATABASE_NAME || 'government_fms';
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database,
    multipleStatements: true,
  });

  try {
    console.log('Running migration: add_government_accounting...');

    const sqlPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations', 'add_government_accounting.sql');
    // Strip comment lines, then run each statement on its own for clearer errors
    const statements = (await readFile(sqlPath, 'utf8'))
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(statement => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await connection.query(statement);
      console.log(`  ✓ ${statement.split('\n')[0].slice(0, 70)}`);
    }

    for (const column of COLUMNS) {
      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [database, column.table, column.name]
      );
      if (rows.length > 0) {
        console.log(`  - ${column.table}.${column.name} already exists, skipping`);
        continue;
      }
      await connection.query(`ALTER TABLE \`${column.table}\` ADD COLUMN \`${column.name}\` ${column.definition}`);
      console.log(`  ✓ added ${column.table}.${column.name}`);
    }

    const [[{ accounts }]] = await connection.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS accounts FROM chart_of_accounts');
    console.log(`✓ Migration completed (${accounts} accounts in the chart of accounts)`);
    console.log('  Next: post existing transactions from Accounting → Journal entries → "Post unposted transactions".');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

runMigration();
