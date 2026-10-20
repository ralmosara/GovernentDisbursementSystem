-- Procurement (RA 12009, New Government Procurement Act):
--   Purchase Request (PR) → Purchase Order (PO) → Inspection and Acceptance Report (IAR) → DV
-- Run with: npm run db:migrate-gov   (idempotent)

CREATE TABLE IF NOT EXISTS `purchase_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pr_no` VARCHAR(30) NOT NULL UNIQUE,
  `pr_date` DATETIME NOT NULL,
  `fund_cluster_id` INT NOT NULL,
  `office` VARCHAR(150) NULL,
  `purpose` TEXT NOT NULL,
  -- Approved Budget for the Contract: the ceiling every award must stay within
  `total_amount` DECIMAL(15,2) NOT NULL,
  `status` ENUM('submitted','approved','rejected','cancelled','ordered') NOT NULL DEFAULT 'submitted',
  `requested_by` INT NOT NULL,
  `approved_by` INT NULL,
  `approved_at` DATETIME NULL,
  `remarks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_pr_status` (`status`)
);

CREATE TABLE IF NOT EXISTS `purchase_request_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pr_id` INT NOT NULL,
  `item_no` INT NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `description` TEXT NOT NULL,
  `quantity` DECIMAL(12,2) NOT NULL,
  `unit_cost` DECIMAL(15,2) NOT NULL,
  `total_cost` DECIMAL(15,2) NOT NULL,
  `object_expenditure_id` INT NULL,
  KEY `idx_pr_items_pr` (`pr_id`)
);

CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `po_no` VARCHAR(30) NOT NULL UNIQUE,
  `po_date` DATETIME NOT NULL,
  `pr_id` INT NOT NULL,
  `fund_cluster_id` INT NOT NULL,
  `supplier_name` VARCHAR(255) NOT NULL,
  `supplier_address` TEXT NULL,
  `supplier_tin` VARCHAR(50) NULL,
  `mode_of_procurement` VARCHAR(60) NOT NULL,
  `place_of_delivery` VARCHAR(255) NULL,
  `delivery_date` DATETIME NULL,
  `payment_term` VARCHAR(100) NULL,
  `total_amount` DECIMAL(15,2) NOT NULL,
  `obligation_id` INT NULL,
  `ors_burs_no` VARCHAR(50) NULL,
  `status` ENUM('issued','partially_delivered','delivered','cancelled') NOT NULL DEFAULT 'issued',
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_po_pr` (`pr_id`),
  KEY `idx_po_status` (`status`)
);

CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `po_id` INT NOT NULL,
  `pr_item_id` INT NULL,
  `item_no` INT NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `description` TEXT NOT NULL,
  `quantity` DECIMAL(12,2) NOT NULL,
  `unit_cost` DECIMAL(15,2) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `object_expenditure_id` INT NULL,
  KEY `idx_po_items_po` (`po_id`)
);

CREATE TABLE IF NOT EXISTS `inspection_acceptance_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `iar_no` VARCHAR(30) NOT NULL UNIQUE,
  `iar_date` DATETIME NOT NULL,
  `po_id` INT NOT NULL,
  `invoice_no` VARCHAR(50) NULL,
  `invoice_date` DATETIME NULL,
  `inspected_by` VARCHAR(150) NOT NULL,
  `date_inspected` DATETIME NOT NULL,
  `received_by` VARCHAR(150) NOT NULL,
  `date_received` DATETIME NOT NULL,
  `acceptance` ENUM('complete','partial') NOT NULL,
  `total_amount` DECIMAL(15,2) NOT NULL,
  `dv_id` INT NULL,
  `remarks` TEXT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_iar_po` (`po_id`),
  KEY `idx_iar_dv` (`dv_id`)
);

CREATE TABLE IF NOT EXISTS `inspection_acceptance_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `iar_id` INT NOT NULL,
  `po_item_id` INT NOT NULL,
  `quantity` DECIMAL(12,2) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  KEY `idx_iar_items_iar` (`iar_id`),
  KEY `idx_iar_items_po_item` (`po_item_id`)
);
