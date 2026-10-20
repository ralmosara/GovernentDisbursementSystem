-- Property accountability: Property Acknowledgment Receipt (PAR) for PPE costing ₱50,000
-- or more, Inventory Custodian Slip (ICS) for semi-expendable property below that
-- (COA Circular No. 2022-004). Transfers close one issuance and open the next.
-- Run with: npm run db:migrate-gov   (idempotent)

CREATE TABLE IF NOT EXISTS `property_issuances` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `document_no` VARCHAR(30) NOT NULL UNIQUE,
  `document_type` ENUM('PAR','ICS') NOT NULL,
  `asset_id` INT NOT NULL,
  `issued_to` VARCHAR(150) NOT NULL,
  `employee_id` INT NULL,
  `position` VARCHAR(150) NULL,
  `office` VARCHAR(150) NULL,
  `issue_date` DATETIME NOT NULL,
  `remarks` TEXT NULL,
  `status` ENUM('active','returned','transferred') NOT NULL DEFAULT 'active',
  `ended_date` DATETIME NULL,
  `end_reason` TEXT NULL,
  `transferred_to_id` INT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_issuance_asset` (`asset_id`, `status`),
  KEY `idx_issuance_holder` (`issued_to`)
);
