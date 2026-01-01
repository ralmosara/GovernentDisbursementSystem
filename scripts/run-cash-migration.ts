import { readFileSync } from 'fs';
import { join } from 'path';
import mysql from 'mysql2/promise';

async function runMigration() {
  console.log('Starting Phase 7 cash management tables migration...');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'government_fms',
    multipleStatements: true
  });

  try {
    const sqlPath = join(process.cwd(), 'migrations', 'add_cash_management_tables.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('Executing migration SQL...');
    await connection.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('Tables created:');
    console.log('  - petty_cash_funds');
    console.log('  - petty_cash_transactions');
    console.log('  - cash_advances');
    console.log('  - daily_cash_position');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
