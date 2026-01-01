-- Add bankDepositId column to cash_receipts table
ALTER TABLE `cash_receipts`
ADD COLUMN `bank_deposit_id` INT NULL AFTER `revenue_source_id`;

-- Add index for faster filtering
CREATE INDEX `idx_cash_receipts_deposit` ON `cash_receipts` (`bank_deposit_id`);

-- Add foreign key constraint
ALTER TABLE `cash_receipts`
ADD CONSTRAINT `fk_cash_receipts_deposit`
FOREIGN KEY (`bank_deposit_id`)
REFERENCES `bank_deposits` (`id`)
ON DELETE SET NULL;
