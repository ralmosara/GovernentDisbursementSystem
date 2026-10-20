-- Government accounting backbone (GAM for NGAs, Revised Chart of Accounts / UACS)
--   * chart_of_accounts        RCA accounts, seeded below plus every object_of_expenditure code
--   * journal_entries / lines  Journal Entry Vouchers (JEV); one JEV per source event
--   * dv_tax_withholdings      Taxes withheld on a DV (EWT, final VAT, percentage tax)
--   * nca_registry             Notices of Cash Allocation received from DBM
-- Run with: npm run db:migrate-accounting   (idempotent; safe to run more than once)

CREATE TABLE IF NOT EXISTS `chart_of_accounts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `account_type` ENUM('asset','liability','equity','revenue','expense') NOT NULL,
  `normal_balance` ENUM('debit','credit') NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `journal_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `jev_no` VARCHAR(30) NOT NULL UNIQUE,
  `jev_date` DATETIME NOT NULL,
  `fiscal_year` INT NOT NULL,
  `fund_cluster_id` INT NOT NULL,
  `journal_type` ENUM('general','cash_receipts','cash_disbursements','check_disbursements') NOT NULL,
  `particulars` TEXT NOT NULL,
  -- What produced the entry: dv_approval, payment, payment_cancel, cash_receipt, ar_invoice,
  -- collection, deposit, nca, manual, reversal. One entry per (source_type, source_id).
  `source_type` VARCHAR(40) NOT NULL,
  `source_id` INT NULL,
  `status` ENUM('posted','reversed') NOT NULL DEFAULT 'posted',
  `reverses_id` INT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_journal_source` (`source_type`, `source_id`),
  KEY `idx_journal_period` (`fiscal_year`, `jev_date`),
  KEY `idx_journal_fund` (`fund_cluster_id`)
);

CREATE TABLE IF NOT EXISTS `journal_entry_lines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `journal_entry_id` INT NOT NULL,
  `line_no` INT NOT NULL,
  `account_code` VARCHAR(20) NOT NULL,
  `debit` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `credit` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `description` VARCHAR(255) NULL,
  `subsidiary` VARCHAR(255) NULL,
  `responsibility_center` VARCHAR(100) NULL,
  KEY `idx_lines_entry` (`journal_entry_id`),
  KEY `idx_lines_account` (`account_code`)
);

CREATE TABLE IF NOT EXISTS `dv_tax_withholdings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dv_id` INT NOT NULL,
  `tax_type` ENUM('ewt','final_vat','percentage_tax') NOT NULL,
  `atc` VARCHAR(10) NULL,
  `description` VARCHAR(255) NOT NULL,
  `tax_base` DECIMAL(15,2) NOT NULL,
  `rate` DECIMAL(6,4) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_dv_tax_dv` (`dv_id`)
);

CREATE TABLE IF NOT EXISTS `nca_registry` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nca_no` VARCHAR(50) NOT NULL UNIQUE,
  `nca_date` DATETIME NOT NULL,
  `fiscal_year` INT NOT NULL,
  `fund_cluster_id` INT NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `mds_account` VARCHAR(100) NULL,
  `purpose` TEXT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_nca_period` (`fiscal_year`, `fund_cluster_id`)
);

-- Disbursement vouchers: taxes withheld and the net amount actually paid
-- (added by the runner only when missing)
-- ALTER TABLE `disbursement_vouchers` ADD COLUMN `tax_treatment` VARCHAR(30) NULL;
-- ALTER TABLE `disbursement_vouchers` ADD COLUMN `payee_type` VARCHAR(20) NULL;
-- ALTER TABLE `disbursement_vouchers` ADD COLUMN `total_tax_withheld` DECIMAL(15,2) NOT NULL DEFAULT 0;
-- ALTER TABLE `disbursement_vouchers` ADD COLUMN `net_amount` DECIMAL(15,2) NULL;
-- Revenue sources: the RCA revenue account their collections post to
-- ALTER TABLE `revenue_sources` ADD COLUMN `account_code` VARCHAR(20) NULL;

-- Standard RCA accounts used by automatic posting (COA Circular 2013-002, as updated)
INSERT IGNORE INTO `chart_of_accounts` (`code`, `title`, `account_type`, `normal_balance`) VALUES
  ('1010101000', 'Cash - Collecting Officers', 'asset', 'debit'),
  ('1010102000', 'Petty Cash', 'asset', 'debit'),
  ('1010202000', 'Cash in Bank - Local Currency, Current Account', 'asset', 'debit'),
  ('1010404000', 'Cash - Modified Disbursement System (MDS), Regular', 'asset', 'debit'),
  ('1010407000', 'Cash - Tax Remittance Advice', 'asset', 'debit'),
  ('1030101000', 'Accounts Receivable', 'asset', 'debit'),
  ('1990101000', 'Advances for Operating Expenses', 'asset', 'debit'),
  ('1990104000', 'Advances to Officers and Employees', 'asset', 'debit'),
  ('2010101000', 'Accounts Payable', 'liability', 'credit'),
  ('2010102000', 'Due to Officers and Employees', 'liability', 'credit'),
  ('2020101000', 'Due to BIR', 'liability', 'credit'),
  ('2020102000', 'Due to GSIS', 'liability', 'credit'),
  ('2020103000', 'Due to Pag-IBIG', 'liability', 'credit'),
  ('2020104000', 'Due to PhilHealth', 'liability', 'credit'),
  ('3010101000', 'Accumulated Surplus/(Deficit)', 'equity', 'credit'),
  ('4030101000', 'Subsidy from National Government', 'revenue', 'credit'),
  ('4060101000', 'Miscellaneous Income', 'revenue', 'credit');

-- Every object of expenditure is an expense account
INSERT IGNORE INTO `chart_of_accounts` (`code`, `title`, `account_type`, `normal_balance`)
  SELECT `code`, `name`, 'expense', 'debit' FROM `object_of_expenditure`;
