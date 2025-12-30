/**
 * Database Setup Script
 * Creates the database for the Philippine Government FMS
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DATABASE_PORT || '3306');
const DB_USER = process.env.DATABASE_USER || 'root';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || '';
const DB_NAME = process.env.DATABASE_NAME || 'government_fms';

async function setupDatabase() {
  console.log('Database Setup Script\n');
  console.log('Configuration:');
  console.log(`  Host: ${DB_HOST}`);
  console.log(`  Port: ${DB_PORT}`);
  console.log(`  User: ${DB_USER}`);
  console.log(`  Database: ${DB_NAME}\n`);

  let connection;

  try {
    console.log('[1] Connecting to MySQL server...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });
    console.log('[OK] Connected to MySQL server\n');

    console.log('[2] Creating database...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`[OK] Database '${DB_NAME}' created\n`);

    await connection.end();

    console.log('[SUCCESS] Database setup complete!\n');
    console.log('Next steps:');
    console.log('  1. npm run db:push');
    console.log('  2. npm run seed');
    console.log('  3. npm run dev\n');

    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Setup failed:', error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

setupDatabase();
