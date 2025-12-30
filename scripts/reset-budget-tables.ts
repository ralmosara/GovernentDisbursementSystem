import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'government_fms';

async function resetBudgetTables() {
  console.log('Resetting Budget Tables\n');

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    console.log('[1] Disabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    console.log('[2] Dropping existing budget tables...');

    // Drop in reverse order of dependencies
    await connection.query('DROP TABLE IF EXISTS `registry_obligations`');
    await connection.query('DROP TABLE IF EXISTS `registry_allotments`');
    await connection.query('DROP TABLE IF EXISTS `registry_appropriations`');

    console.log('[3] Re-enabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('[OK] Budget tables dropped\n');

    console.log('[4] Creating new budget tables...');

    // Create registry_appropriations
    await connection.query(`
      CREATE TABLE registry_appropriations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fund_cluster_id INT NOT NULL,
        year INT NOT NULL,
        reference VARCHAR(100) NOT NULL,
        description TEXT,
        amount DECIMAL(15, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (fund_cluster_id) REFERENCES fund_clusters(id)
      )
    `);

    // Create registry_allotments
    await connection.query(`
      CREATE TABLE registry_allotments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appropriation_id INT NOT NULL,
        object_of_expenditure_id INT NOT NULL,
        mfo_pap_id INT,
        allotment_class VARCHAR(100) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        purpose TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (appropriation_id) REFERENCES registry_appropriations(id),
        FOREIGN KEY (object_of_expenditure_id) REFERENCES object_of_expenditure(id),
        FOREIGN KEY (mfo_pap_id) REFERENCES mfo_pap(id)
      )
    `);

    // Create registry_obligations
    await connection.query(`
      CREATE TABLE registry_obligations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        allotment_id INT NOT NULL,
        payee VARCHAR(255) NOT NULL,
        particulars TEXT NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        ors_number VARCHAR(50),
        burs_number VARCHAR(50),
        obligation_date DATETIME NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        remarks TEXT,
        created_by INT NOT NULL,
        approved_by INT,
        approved_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (allotment_id) REFERENCES registry_allotments(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);

    console.log('[OK] Budget tables created\n');

    console.log('[SUCCESS] Budget tables reset complete!\n');
    console.log('Next step:');
    console.log('  npm run seed');

  } catch (error) {
    console.error('[ERROR] Reset failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

resetBudgetTables()
  .then(() => {
    console.log('Reset script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Reset script failed:', error);
    process.exit(1);
  });
