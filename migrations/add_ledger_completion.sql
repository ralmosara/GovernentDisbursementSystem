-- Completes the general ledger: property, plant and equipment (PPE) with accumulated
-- depreciation, semi-expendable property, disposals, advances to officers, and supplies inventory.
-- Safe to re-run: seeds use INSERT IGNORE. New columns are added by
-- scripts/run-government-accounting-migration.ts (asset_categories.account_code,
-- cash_advances.total_expenses, cash_advances.refund_amount,
-- inventory_items.account_code).

INSERT IGNORE INTO `chart_of_accounts` (`code`, `title`, `account_type`, `normal_balance`) VALUES
('1030599000', 'Other Receivables', 'asset', 'debit'),
('1040501000', 'Semi-Expendable Machinery and Equipment', 'asset', 'debit'),
('1060101000', 'Land', 'asset', 'debit'),
('1060401000', 'Buildings', 'asset', 'debit'),
('1060401100', 'Accumulated Depreciation - Buildings', 'asset', 'credit'),
('1060501000', 'Machinery', 'asset', 'debit'),
('1060501100', 'Accumulated Depreciation - Machinery', 'asset', 'credit'),
('1060502000', 'Office Equipment', 'asset', 'debit'),
('1060502100', 'Accumulated Depreciation - Office Equipment', 'asset', 'credit'),
('1060503000', 'Information and Communications Technology Equipment', 'asset', 'debit'),
('1060503100', 'Accumulated Depreciation - ICT Equipment', 'asset', 'credit'),
('1060601000', 'Motor Vehicles', 'asset', 'debit'),
('1060601100', 'Accumulated Depreciation - Motor Vehicles', 'asset', 'credit'),
('1060701000', 'Furniture and Fixtures', 'asset', 'debit'),
('1060701100', 'Accumulated Depreciation - Furniture and Fixtures', 'asset', 'credit'),
('1060702000', 'Books', 'asset', 'debit'),
('1060702100', 'Accumulated Depreciation - Books', 'asset', 'credit'),
('4050104000', 'Gain on Sale of Property, Plant and Equipment', 'revenue', 'credit'),
('5020321000', 'Semi-Expendable Machinery and Equipment Expenses', 'expense', 'debit'),
('5050104000', 'Depreciation - Buildings and Other Structures', 'expense', 'debit'),
('5050105000', 'Depreciation - Machinery and Equipment', 'expense', 'debit'),
('5050106000', 'Depreciation - Transportation Equipment', 'expense', 'debit'),
('5050107000', 'Depreciation - Furniture, Fixtures and Books', 'expense', 'debit'),
('5050404000', 'Loss on Sale of Property, Plant and Equipment', 'expense', 'debit');

-- Supplies carried in inventory until issued (perpetual inventory)
INSERT IGNORE INTO `chart_of_accounts` (`code`, `title`, `account_type`, `normal_balance`) VALUES
('1040401000', 'Office Supplies Inventory', 'asset', 'debit'),
('1040402000', 'Accountable Forms, Plates and Stickers Inventory', 'asset', 'debit'),
('1040403000', 'Non-Accountable Forms Inventory', 'asset', 'debit'),
('1040406000', 'Drugs and Medicines Inventory', 'asset', 'debit'),
('1040407000', 'Medical, Dental and Laboratory Supplies Inventory', 'asset', 'debit'),
('1040408000', 'Fuel, Oil and Lubricants Inventory', 'asset', 'debit'),
('1040499000', 'Other Supplies and Materials Inventory', 'asset', 'debit'),
('5020301000', 'Office Supplies Expenses', 'expense', 'debit'),
('5020302000', 'Accountable Forms Expenses', 'expense', 'debit'),
('5020303000', 'Non-Accountable Forms Expenses', 'expense', 'debit'),
('5020307000', 'Drugs and Medicines Expenses', 'expense', 'debit'),
('5020308000', 'Medical, Dental and Laboratory Supplies Expenses', 'expense', 'debit'),
('5020309000', 'Fuel, Oil and Lubricants Expenses', 'expense', 'debit'),
('5020399000', 'Other Supplies and Materials Expenses', 'expense', 'debit');
