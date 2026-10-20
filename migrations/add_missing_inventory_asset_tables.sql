-- Tables defined in src/lib/db/schema.ts that the SQL dump never created, which left the
-- Asset Disposals, Inventory Transactions and Physical Count pages without storage.
-- Definitions match the Drizzle schema exactly.
-- Run with: npm run db:migrate-gov   (idempotent)

CREATE TABLE IF NOT EXISTS `asset_disposals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `disposal_no` VARCHAR(50) NOT NULL UNIQUE,
  `asset_id` INT NOT NULL,
  `disposal_date` DATE NOT NULL,
  `disposal_method` VARCHAR(50) NOT NULL,
  `disposal_value` DECIMAL(15,2) NULL,
  `buyer_recipient` VARCHAR(255) NULL,
  `approved_by` INT NULL,
  `remarks` TEXT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_disposal_asset` (`asset_id`)
);

CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `transaction_no` VARCHAR(50) NOT NULL UNIQUE,
  `item_id` INT NOT NULL,
  `transaction_date` DATE NOT NULL,
  `transaction_type` VARCHAR(50) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_cost` DECIMAL(15,2) NULL,
  `reference` VARCHAR(100) NULL,
  `requested_by` VARCHAR(255) NULL,
  `remarks` TEXT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_inventory_tx_item` (`item_id`),
  KEY `idx_inventory_tx_reference` (`reference`)
);

CREATE TABLE IF NOT EXISTS `physical_inventory_count` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `count_no` VARCHAR(50) NOT NULL UNIQUE,
  `count_date` DATE NOT NULL,
  `item_id` INT NOT NULL,
  `system_quantity` INT NOT NULL,
  `physical_quantity` INT NOT NULL,
  `variance` INT NOT NULL,
  `variance_value` DECIMAL(15,2) NULL,
  `remarks` TEXT NULL,
  `counted_by` VARCHAR(255) NULL,
  `verified_by` INT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_count_item` (`item_id`)
);
