-- Store check details for AR collections paid by check
-- (the collection form captured these but the table had nowhere to keep them)
-- Run with: npx tsx scripts/run-collections-check-migration.ts  (idempotent)
ALTER TABLE `collections`
  ADD COLUMN `check_no` VARCHAR(50) NULL AFTER `payment_mode`,
  ADD COLUMN `check_date` DATETIME NULL AFTER `check_no`,
  ADD COLUMN `check_bank` VARCHAR(100) NULL AFTER `check_date`;
