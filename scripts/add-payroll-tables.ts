/**
 * Add Payroll Tables to Database
 * Creates all payroll-related tables
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DATABASE_PORT || '3306');
const DB_USER = process.env.DATABASE_USER || 'root';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || '';
const DB_NAME = process.env.DATABASE_NAME || 'government_fms';

async function addPayrollTables() {
  console.log('Adding Payroll Tables to Database\n');

  let connection;

  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });

    console.log('[OK] Connected to database\n');

    // Create employees table
    console.log('[1/7] Creating employees table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        employee_no VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        suffix VARCHAR(20),
        date_of_birth DATE,
        civil_status ENUM('Single', 'Married', 'Widowed', 'Separated'),
        gender ENUM('Male', 'Female'),
        position VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        division VARCHAR(100),
        section VARCHAR(100),
        salary_grade VARCHAR(20),
        step_increment INT DEFAULT 1,
        appointment_status ENUM('Permanent', 'Temporary', 'Casual', 'Contractual', 'Co-terminus'),
        employment_status ENUM('Active', 'Resigned', 'Retired', 'Terminated', 'On Leave') DEFAULT 'Active',
        date_hired DATE NOT NULL,
        date_regularized DATE,
        date_resigned DATE,
        basic_salary DECIMAL(15,2) NOT NULL,
        pera DECIMAL(10,2) DEFAULT 0,
        additional_allowance DECIMAL(10,2) DEFAULT 0,
        tin_no VARCHAR(20),
        gsis_no VARCHAR(20),
        philhealth_no VARCHAR(20),
        pagibig_no VARCHAR(20),
        sss_no VARCHAR(20),
        bank_name VARCHAR(100),
        bank_account_no VARCHAR(50),
        bank_account_name VARCHAR(100),
        contact_no VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        tax_exemption_code VARCHAR(10) DEFAULT 'S',
        number_of_dependents INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[OK] employees table created\n');

    // Create payroll_periods table
    console.log('[2/7] Creating payroll_periods table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payroll_periods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        period_no VARCHAR(50) UNIQUE NOT NULL,
        period_name VARCHAR(100),
        period_type ENUM('Regular', 'Special', '13th Month', 'Mid-Year Bonus') DEFAULT 'Regular',
        month INT NOT NULL,
        year INT NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        pay_date DATE NOT NULL,
        status ENUM('Draft', 'Processing', 'Completed', 'Posted', 'Cancelled') DEFAULT 'Draft',
        total_employees INT DEFAULT 0,
        total_gross_pay DECIMAL(15,2),
        total_deductions DECIMAL(15,2),
        total_net_pay DECIMAL(15,2),
        processed_by INT,
        processed_at TIMESTAMP,
        remarks TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[OK] payroll_periods table created\n');

    // Create payroll_transactions table
    console.log('[3/7] Creating payroll_transactions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payroll_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payroll_period_id INT NOT NULL,
        employee_id INT NOT NULL,
        basic_salary DECIMAL(15,2) NOT NULL,
        pera DECIMAL(10,2) DEFAULT 0,
        additional_allowance DECIMAL(10,2) DEFAULT 0,
        overtime DECIMAL(10,2) DEFAULT 0,
        other_earnings DECIMAL(10,2) DEFAULT 0,
        gross_pay DECIMAL(15,2) NOT NULL,
        gsis_contribution DECIMAL(10,2) DEFAULT 0,
        philhealth_contribution DECIMAL(10,2) DEFAULT 0,
        pagibig_contribution DECIMAL(10,2) DEFAULT 0,
        withholding_tax DECIMAL(10,2) DEFAULT 0,
        gsis_loan DECIMAL(10,2) DEFAULT 0,
        pagibig_loan DECIMAL(10,2) DEFAULT 0,
        salary_loan DECIMAL(10,2) DEFAULT 0,
        other_deductions DECIMAL(10,2) DEFAULT 0,
        total_deductions DECIMAL(15,2) NOT NULL,
        net_pay DECIMAL(15,2) NOT NULL,
        payment_status ENUM('Pending', 'Paid') DEFAULT 'Pending',
        payment_date DATE,
        payment_reference VARCHAR(100),
        remarks TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[OK] payroll_transactions table created\n');

    // Create employee_deductions table
    console.log('[4/7] Creating employee_deductions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employee_deductions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        deduction_type ENUM('GSIS Loan', 'Pag-IBIG Loan', 'Salary Loan', 'Other') NOT NULL,
        deduction_name VARCHAR(100) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        installments INT NOT NULL,
        installments_paid INT DEFAULT 0,
        balance DECIMAL(15,2) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        remarks TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[OK] employee_deductions table created\n');

    // Create payroll_adjustments table
    console.log('[5/7] Creating payroll_adjustments table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payroll_adjustments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        adjustment_type ENUM('Salary Increase', 'Step Increment', 'Retroactive Pay', 'Correction', 'Other') NOT NULL,
        adjustment_name VARCHAR(100) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        is_addition BOOLEAN DEFAULT TRUE,
        effective_date DATE NOT NULL,
        applied_in_period VARCHAR(50),
        status ENUM('Pending', 'Applied', 'Cancelled') DEFAULT 'Pending',
        remarks TEXT,
        approved_by INT,
        approved_at TIMESTAMP,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[OK] payroll_adjustments table created\n');

    // Create remittances table
    console.log('[6/7] Creating remittances table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS remittances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        remittance_no VARCHAR(50) UNIQUE NOT NULL,
        payroll_period_id INT NOT NULL,
        remittance_type ENUM('GSIS', 'PhilHealth', 'Pag-IBIG', 'BIR') NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        employee_share DECIMAL(15,2) NOT NULL,
        employer_share DECIMAL(15,2) NOT NULL,
        total_amount DECIMAL(15,2) NOT NULL,
        due_date DATE NOT NULL,
        payment_date DATE,
        reference_no VARCHAR(100),
        payment_status ENUM('Pending', 'Paid') DEFAULT 'Pending',
        remarks TEXT,
        processed_by INT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[OK] remittances table created\n');

    // Create thirteenth_month_pay table
    console.log('[7/7] Creating thirteenth_month_pay table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS thirteenth_month_pay (
        id INT AUTO_INCREMENT PRIMARY KEY,
        year INT NOT NULL,
        employee_id INT NOT NULL,
        total_basic_salary DECIMAL(15,2) NOT NULL,
        months_worked INT NOT NULL,
        thirteenth_month_amount DECIMAL(15,2) NOT NULL,
        withholding_tax DECIMAL(10,2) DEFAULT 0,
        net_amount DECIMAL(15,2) NOT NULL,
        payment_date DATE,
        payment_status ENUM('Pending', 'Paid') DEFAULT 'Pending',
        remarks TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        UNIQUE KEY unique_employee_year (employee_id, year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[OK] thirteenth_month_pay table created\n');

    await connection.end();

    console.log('[SUCCESS] All payroll tables created successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Failed to create payroll tables:', error);
    if (connection) await connection.end();
    process.exit(1);
  }
}

addPayrollTables();
