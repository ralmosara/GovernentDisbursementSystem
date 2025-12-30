import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'government_fms';

async function checkMooeCategories() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    const [rows] = await connection.query(`
      SELECT code, name, category
      FROM object_of_expenditure
      WHERE code LIKE '502%'
      ORDER BY code
    `);
    console.log('All MOOE records:');
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await connection.end();
  }
}

checkMooeCategories();
