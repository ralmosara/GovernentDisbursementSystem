-- Budget modifications and revenue targets, for the Statement of Comparison of Budget and
-- Actual Amounts (original vs final budget, and receipts).
-- Safe to re-run. registry_allotments.original_amount is added by
-- scripts/run-government-accounting-migration.ts.

-- Each change to an allotment after release: augmentation, reduction, or one side of a
-- realignment between allotments of the same appropriation
CREATE TABLE IF NOT EXISTS `allotment_modifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `allotment_id` INT NOT NULL,
  `modification_type` ENUM('augmentation', 'reduction', 'realignment_in', 'realignment_out') NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `related_allotment_id` INT NULL,
  `reference` VARCHAR(100) NOT NULL,
  `reason` TEXT NULL,
  `modification_date` DATE NOT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_allotment_modifications_allotment` (`allotment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Budgeted receipts per revenue source, fund cluster and fiscal year
CREATE TABLE IF NOT EXISTS `revenue_targets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `fiscal_year` INT NOT NULL,
  `fund_cluster_id` INT NOT NULL,
  `revenue_source_id` INT NOT NULL,
  `original_amount` DECIMAL(15,2) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `remarks` TEXT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_revenue_targets` (`fiscal_year`, `fund_cluster_id`, `revenue_source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
