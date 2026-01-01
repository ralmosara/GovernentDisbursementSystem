-- Phase 7: Cash Management Tables Migration
-- Created: 2026-01-01

-- Petty Cash Funds Table
CREATE TABLE IF NOT EXISTS `petty_cash_funds` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `fund_code` VARCHAR(50) UNIQUE NOT NULL,
  `fund_name` VARCHAR(255) NOT NULL,
  `custodian` VARCHAR(255) NOT NULL,
  `custodian_employee_id` INT,
  `fund_amount` DECIMAL(15, 2) NOT NULL,
  `current_balance` DECIMAL(15, 2) NOT NULL,
  `replenishment_threshold` DECIMAL(15, 2),
  `fund_cluster_id` INT NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_fund_cluster` (`fund_cluster_id`),
  KEY `idx_custodian_employee` (`custodian_employee_id`)
);

-- Petty Cash Transactions Table
CREATE TABLE IF NOT EXISTS `petty_cash_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `petty_cash_fund_id` INT NOT NULL,
  `transaction_type` ENUM('disbursement', 'replenishment') NOT NULL,
  `transaction_date` DATETIME NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `purpose` TEXT,
  `or_no` VARCHAR(50),
  `payee` VARCHAR(255),
  `dv_id` INT,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_petty_cash_fund` (`petty_cash_fund_id`),
  KEY `idx_dv` (`dv_id`),
  KEY `idx_transaction_date` (`transaction_date`)
);

-- Cash Advances Table
CREATE TABLE IF NOT EXISTS `cash_advances` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ca_no` VARCHAR(50) UNIQUE NOT NULL,
  `employee_id` INT NOT NULL,
  `fund_cluster_id` INT NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `purpose` TEXT NOT NULL,
  `date_issued` DATETIME NOT NULL,
  `due_date_return` DATETIME,
  `date_liquidated` DATETIME,
  `status` ENUM('draft', 'approved', 'released', 'liquidated', 'returned') DEFAULT 'draft',
  `dv_id` INT,
  `liquidation_dv_id` INT,
  `remarks` TEXT,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_employee` (`employee_id`),
  KEY `idx_fund_cluster` (`fund_cluster_id`),
  KEY `idx_status` (`status`),
  KEY `idx_dv` (`dv_id`)
);

-- Daily Cash Position Table
CREATE TABLE IF NOT EXISTS `daily_cash_position` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `report_date` DATE NOT NULL,
  `fund_cluster_id` INT NOT NULL,
  `opening_balance` DECIMAL(15, 2) NOT NULL,
  `receipts` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `disbursements` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `closing_balance` DECIMAL(15, 2) NOT NULL,
  `prepared_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_date_fund_cluster` (`report_date`, `fund_cluster_id`),
  KEY `idx_report_date` (`report_date`)
);
