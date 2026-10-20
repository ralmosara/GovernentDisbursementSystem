import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Applies the government accounting and procurement migrations, in order, and the column
 * additions listed below. Safe to run more than once: tables use IF NOT EXISTS, seeds use
 * INSERT IGNORE and columns are added only when missing.
 */

const MIGRATION_FILES = ['add_government_accounting.sql', 'add_procurement.sql', 'add_property_accountability.sql', 'add_missing_inventory_asset_tables.sql'];

const COLUMNS: { table: string; name: string; definition: string }[] = [
  { table: 'disbursement_vouchers', name: 'tax_treatment', definition: 'VARCHAR(30) NULL' },
  { table: 'disbursement_vouchers', name: 'payee_type', definition: 'VARCHAR(20) NULL' },
  { table: 'disbursement_vouchers', name: 'total_tax_withheld', definition: 'DECIMAL(15,2) NOT NULL DEFAULT 0' },
  { table: 'disbursement_vouchers', name: 'net_amount', definition: 'DECIMAL(15,2) NULL' },
  { table: 'revenue_sources', name: 'account_code', definition: 'VARCHAR(20) NULL' },
  // The inventory service records and joins on the creator, but the column was never created
  { table: 'inventory_items', name: 'created_by', definition: 'INT NULL' },
];

/** Split a migration file into statements, ignoring comment lines */
function statementsOf(sql: string): string[] {
  return sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
}

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
    const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

    for (const file of MIGRATION_FILES) {
      console.log(`Running migration: ${file}...`);
      for (const statement of statementsOf(await readFile(join(migrationsDir, file), 'utf8'))) {
        await connection.query(statement);
        console.log(`  ✓ ${statement.split('\n')[0].slice(0, 70)}`);
      }
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
    console.log('  Next: post existing transactions from Accounting → Journal entries → "Post them now".');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

runMigration();
