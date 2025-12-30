CREATE TABLE `accounts_receivable` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ar_no` varchar(50) NOT NULL,
	`revenue_source_id` int NOT NULL,
	`debtor_name` varchar(255) NOT NULL,
	`invoice_no` varchar(50),
	`invoice_date` datetime NOT NULL,
	`due_date` datetime NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`amount_collected` decimal(15,2) DEFAULT '0',
	`balance` decimal(15,2) NOT NULL,
	`status` enum('outstanding','partial','paid','written_off') DEFAULT 'outstanding',
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_receivable_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_receivable_ar_no_unique` UNIQUE(`ar_no`)
);

CREATE TABLE `approval_workflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dv_id` int NOT NULL,
	`stage` enum('division','budget','accounting','director') NOT NULL,
	`stage_order` int NOT NULL,
	`approver_role_id` int NOT NULL,
	`approver_user_id` int,
	`status` enum('pending','approved','rejected','skipped') DEFAULT 'pending',
	`comments` text,
	`action_date` datetime,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `approval_workflows_id` PRIMARY KEY(`id`)
);

CREATE TABLE `asset_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`useful_life` int,
	`depreciation_method` enum('straight_line','declining_balance'),
	`capitalization_threshold` decimal(15,2),
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `asset_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `asset_categories_code_unique` UNIQUE(`code`)
);

CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attachable_type` varchar(50) NOT NULL,
	`attachable_id` int NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_original_name` varchar(255) NOT NULL,
	`file_path` varchar(500) NOT NULL,
	`file_size` int NOT NULL,
	`file_type` varchar(100) NOT NULL,
	`file_extension` varchar(10),
	`document_type` varchar(100),
	`description` text,
	`uploaded_by` int NOT NULL,
	`uploaded_at` timestamp DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);

CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`action` varchar(100) NOT NULL,
	`table_name` varchar(100) NOT NULL,
	`record_id` int NOT NULL,
	`old_values` json,
	`new_values` json,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_name` varchar(255) NOT NULL,
	`account_number` varchar(50) NOT NULL,
	`bank_name` varchar(100) NOT NULL,
	`bank_branch` varchar(100),
	`account_type` enum('checking','savings','current') NOT NULL,
	`fund_cluster_id` int,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `bank_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `bank_accounts_account_number_unique` UNIQUE(`account_number`)
);

CREATE TABLE `bank_deposits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deposit_slip_no` varchar(50) NOT NULL,
	`bank_account_id` int NOT NULL,
	`deposit_date` datetime NOT NULL,
	`total_amount` decimal(15,2) NOT NULL,
	`deposited_by` varchar(255),
	`status` enum('pending','confirmed','cancelled') DEFAULT 'pending',
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `bank_deposits_id` PRIMARY KEY(`id`),
	CONSTRAINT `bank_deposits_deposit_slip_no_unique` UNIQUE(`deposit_slip_no`)
);

CREATE TABLE `bank_reconciliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bank_account_id` int NOT NULL,
	`reconciliation_date` datetime NOT NULL,
	`period_month` int NOT NULL,
	`period_year` int NOT NULL,
	`book_balance` decimal(15,2) NOT NULL,
	`bank_balance` decimal(15,2) NOT NULL,
	`outstanding_checks` json,
	`deposits_in_transit` json,
	`bank_charges` decimal(15,2),
	`bank_interest` decimal(15,2),
	`adjusted_book_balance` decimal(15,2),
	`adjusted_bank_balance` decimal(15,2),
	`status` enum('draft','completed') DEFAULT 'draft',
	`prepared_by` int NOT NULL,
	`prepared_date` datetime NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `bank_reconciliations_id` PRIMARY KEY(`id`)
);

CREATE TABLE `cash_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`or_no` varchar(50) NOT NULL,
	`or_series_id` int NOT NULL,
	`receipt_date` datetime NOT NULL,
	`payor_name` varchar(255) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`payment_mode` enum('cash','check','online') NOT NULL,
	`check_no` varchar(50),
	`check_date` datetime,
	`check_bank` varchar(100),
	`particulars` text NOT NULL,
	`fund_cluster_id` int NOT NULL,
	`revenue_source_id` int,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `cash_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `cash_receipts_or_no_unique` UNIQUE(`or_no`)
);

CREATE TABLE `certificate_travel_completed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`iot_id` int NOT NULL,
	`ctc_no` varchar(50) NOT NULL,
	`travel_completed` boolean NOT NULL,
	`actual_departure_date` datetime NOT NULL,
	`actual_return_date` datetime NOT NULL,
	`completion_remarks` text,
	`certified_by` int NOT NULL,
	`certified_date` datetime NOT NULL,
	`verified_by` int,
	`verified_date` datetime,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certificate_travel_completed_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificate_travel_completed_ctc_no_unique` UNIQUE(`ctc_no`)
);

CREATE TABLE `check_disbursement_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payment_id` int NOT NULL,
	`fund_cluster_id` int NOT NULL,
	`record_date` datetime NOT NULL,
	`nca_balance` decimal(15,2),
	`bank_balance` decimal(15,2),
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `check_disbursement_records_id` PRIMARY KEY(`id`)
);

CREATE TABLE `collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collection_no` varchar(50) NOT NULL,
	`ar_id` int NOT NULL,
	`or_no` varchar(50),
	`collection_date` datetime NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`payment_mode` enum('cash','check','online') NOT NULL,
	`remarks` text,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `collections_collection_no_unique` UNIQUE(`collection_no`)
);

CREATE TABLE `depreciation_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`asset_id` int NOT NULL,
	`period_month` int NOT NULL,
	`period_year` int NOT NULL,
	`depreciation_amount` decimal(15,2) NOT NULL,
	`accumulated_depreciation` decimal(15,2) NOT NULL,
	`book_value` decimal(15,2) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `depreciation_schedule_id` PRIMARY KEY(`id`)
);

CREATE TABLE `disbursement_vouchers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dv_no` varchar(50) NOT NULL,
	`fund_cluster_id` int NOT NULL,
	`ors_burs_no` varchar(50) NOT NULL,
	`dv_date` datetime NOT NULL,
	`fiscal_year` int NOT NULL,
	`payee_name` varchar(255) NOT NULL,
	`payee_tin` varchar(50),
	`payee_address` text,
	`particulars` text NOT NULL,
	`responsibility_center` varchar(100),
	`mfo_pap_id` int,
	`object_expenditure_id` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`payment_mode` enum('mds_check','commercial_check','ada','other') NOT NULL,
	`status` enum('draft','pending_budget','pending_accounting','pending_director','approved','paid','rejected','cancelled') DEFAULT 'draft',
	`cert_box_a_user_id` int,
	`cert_box_a_date` datetime,
	`cert_box_a_signature` text,
	`cert_box_b_accounting_entry` json,
	`cert_box_c_user_id` int,
	`cert_box_c_date` datetime,
	`cert_box_c_cash_available` boolean,
	`cert_box_c_subject_to_ada` boolean,
	`cert_box_d_user_id` int,
	`cert_box_d_date` datetime,
	`cert_box_d_approved` boolean,
	`cert_box_e_payee_signature` text,
	`cert_box_e_receipt_date` datetime,
	`cert_box_e_check_no` varchar(50),
	`cert_box_e_bank_name` varchar(100),
	`cert_box_e_account_no` varchar(50),
	`cert_box_e_or_no` varchar(50),
	`cert_box_e_or_date` datetime,
	`jev_no` varchar(50),
	`jev_date` datetime,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	CONSTRAINT `disbursement_vouchers_id` PRIMARY KEY(`id`),
	CONSTRAINT `disbursement_vouchers_dv_no_unique` UNIQUE(`dv_no`)
);

CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_no` varchar(50) NOT NULL,
	`user_id` int,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`middle_name` varchar(100),
	`position` varchar(100),
	`salary_grade` varchar(20),
	`monthly_salary` decimal(15,2) NOT NULL,
	`gsis_no` varchar(50),
	`philhealth_no` varchar(50),
	`pagibig_no` varchar(50),
	`tin` varchar(50),
	`bank_account_no` varchar(50),
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_employee_no_unique` UNIQUE(`employee_no`)
);

CREATE TABLE `fixed_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`asset_no` varchar(50) NOT NULL,
	`asset_category_id` int NOT NULL,
	`description` text NOT NULL,
	`acquisition_date` datetime NOT NULL,
	`acquisition_cost` decimal(15,2) NOT NULL,
	`salvage_value` decimal DEFAULT '0',
	`useful_life` int NOT NULL,
	`location` varchar(255),
	`custodian` varchar(255),
	`serial_no` varchar(100),
	`status` enum('active','disposed','written_off') DEFAULT 'active',
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fixed_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `fixed_assets_asset_no_unique` UNIQUE(`asset_no`)
);

CREATE TABLE `fund_clusters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fund_clusters_id` PRIMARY KEY(`id`),
	CONSTRAINT `fund_clusters_code_unique` UNIQUE(`code`)
);

CREATE TABLE `inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_code` varchar(50) NOT NULL,
	`item_name` varchar(255) NOT NULL,
	`description` text,
	`unit` varchar(50) NOT NULL,
	`unit_cost` decimal(15,2) NOT NULL,
	`quantity_on_hand` int DEFAULT 0,
	`minimum_level` int DEFAULT 0,
	`maximum_level` int,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `inventory_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_items_item_code_unique` UNIQUE(`item_code`)
);

CREATE TABLE `itinerary_of_travel` (
	`id` int AUTO_INCREMENT NOT NULL,
	`iot_no` varchar(50) NOT NULL,
	`fund_cluster_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`purpose` text NOT NULL,
	`departure_date` datetime NOT NULL,
	`return_date` datetime NOT NULL,
	`destination` varchar(255) NOT NULL,
	`itinerary_before` json,
	`itinerary_actual` json,
	`estimated_cost` decimal(15,2) NOT NULL,
	`cash_advance_amount` decimal(15,2),
	`dv_id` int,
	`status` enum('draft','pending_approval','approved','in_progress','completed','cancelled') DEFAULT 'draft',
	`approved_by` int,
	`approved_date` datetime,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itinerary_of_travel_id` PRIMARY KEY(`id`),
	CONSTRAINT `itinerary_of_travel_iot_no_unique` UNIQUE(`iot_no`)
);

CREATE TABLE `liquidation_expense_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lr_id` int NOT NULL,
	`expense_date` datetime NOT NULL,
	`expense_category` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`or_invoice_no` varchar(100),
	`or_invoice_date` datetime,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `liquidation_expense_items_id` PRIMARY KEY(`id`)
);

CREATE TABLE `liquidation_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lr_no` varchar(50) NOT NULL,
	`iot_id` int NOT NULL,
	`ctc_id` int,
	`fund_cluster_id` int NOT NULL,
	`cash_advance_amount` decimal(15,2) NOT NULL,
	`cash_advance_dv_id` int,
	`total_expenses` decimal(15,2) NOT NULL,
	`refund_amount` decimal(15,2),
	`additional_claim` decimal(15,2),
	`status` enum('draft','pending_review','approved','settled') DEFAULT 'draft',
	`submitted_by` int NOT NULL,
	`submitted_date` datetime,
	`reviewed_by` int,
	`reviewed_date` datetime,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `liquidation_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `liquidation_reports_lr_no_unique` UNIQUE(`lr_no`)
);

CREATE TABLE `mfo_pap` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`mfo_category` enum('regulation_lgu_finance','policy_formulation','revenue_evaluation','special_projects','training') NOT NULL,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `mfo_pap_id` PRIMARY KEY(`id`),
	CONSTRAINT `mfo_pap_code_unique` UNIQUE(`code`)
);

CREATE TABLE `object_of_expenditure` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('personnel_services','mooe','financial_expenses','capital_outlays') NOT NULL,
	`parent_id` int,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `object_of_expenditure_id` PRIMARY KEY(`id`),
	CONSTRAINT `object_of_expenditure_code_unique` UNIQUE(`code`)
);

CREATE TABLE `official_receipt_series` (
	`id` int AUTO_INCREMENT NOT NULL,
	`series_code` varchar(20) NOT NULL,
	`start_number` int NOT NULL,
	`end_number` int NOT NULL,
	`current_number` int NOT NULL,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `official_receipt_series_id` PRIMARY KEY(`id`),
	CONSTRAINT `official_receipt_series_series_code_unique` UNIQUE(`series_code`)
);

CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dv_id` int NOT NULL,
	`payment_type` enum('check_mds','check_commercial','ada','cash') NOT NULL,
	`payment_date` datetime NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`check_no` varchar(50),
	`bank_name` varchar(100),
	`bank_account_no` varchar(50),
	`ada_reference` varchar(100),
	`ada_issued_date` datetime,
	`status` enum('pending','issued','cleared','cancelled','stale') DEFAULT 'pending',
	`cleared_date` datetime,
	`received_by` varchar(255),
	`received_date` datetime,
	`or_no` varchar(50),
	`or_date` datetime,
	`remarks` text,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);

CREATE TABLE `payroll_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`period_code` varchar(20) NOT NULL,
	`period_month` int NOT NULL,
	`period_year` int NOT NULL,
	`start_date` datetime NOT NULL,
	`end_date` datetime NOT NULL,
	`pay_date` datetime NOT NULL,
	`status` enum('draft','processing','completed') DEFAULT 'draft',
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `payroll_periods_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_periods_period_code_unique` UNIQUE(`period_code`)
);

CREATE TABLE `payroll_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payroll_period_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`basic_salary` decimal(15,2) NOT NULL,
	`gsis_contribution` decimal(15,2) DEFAULT '0',
	`philhealth_contribution` decimal(15,2) DEFAULT '0',
	`pagibig_contribution` decimal(15,2) DEFAULT '0',
	`withholding_tax` decimal(15,2) DEFAULT '0',
	`other_deductions` decimal(15,2) DEFAULT '0',
	`total_deductions` decimal(15,2) NOT NULL,
	`net_pay` decimal(15,2) NOT NULL,
	`dv_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `payroll_transactions_id` PRIMARY KEY(`id`)
);

CREATE TABLE `registry_allotments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appropriation_id` int NOT NULL,
	`fund_cluster_id` int NOT NULL,
	`mfo_pap_id` int,
	`object_expenditure_id` int NOT NULL,
	`allotment_class` varchar(100),
	`allotment_amount` decimal(15,2) NOT NULL,
	`allotment_date` datetime NOT NULL,
	`allotment_reference` varchar(100),
	`fiscal_year` int NOT NULL,
	`remarks` text,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `registry_allotments_id` PRIMARY KEY(`id`)
);

CREATE TABLE `registry_appropriations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fund_cluster_id` int NOT NULL,
	`fiscal_year` int NOT NULL,
	`appropriation_act` varchar(100) NOT NULL,
	`total_amount` decimal(15,2) NOT NULL,
	`remarks` text,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `registry_appropriations_id` PRIMARY KEY(`id`)
);

CREATE TABLE `registry_obligations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`allotment_id` int NOT NULL,
	`fund_cluster_id` int NOT NULL,
	`ors_burs_no` varchar(50) NOT NULL,
	`obligation_date` datetime NOT NULL,
	`payee_name` varchar(255) NOT NULL,
	`particulars` text NOT NULL,
	`object_expenditure_id` int NOT NULL,
	`obligation_amount` decimal(15,2) NOT NULL,
	`fiscal_year` int NOT NULL,
	`status` enum('pending','approved','cancelled') DEFAULT 'pending',
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `registry_obligations_id` PRIMARY KEY(`id`),
	CONSTRAINT `registry_obligations_ors_burs_no_unique` UNIQUE(`ors_burs_no`)
);

CREATE TABLE `revenue_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entry_no` varchar(50) NOT NULL,
	`revenue_source_id` int NOT NULL,
	`fund_cluster_id` int NOT NULL,
	`entry_date` datetime NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`payor_name` varchar(255),
	`particulars` text,
	`fiscal_year` int NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `revenue_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_entries_entry_no_unique` UNIQUE(`entry_no`)
);

CREATE TABLE `revenue_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `revenue_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_sources_code_unique` UNIQUE(`code`)
);

CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`display_name` varchar(100) NOT NULL,
	`description` text,
	`permissions` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);

CREATE TABLE `sessions` (
	`id` varchar(255) NOT NULL,
	`user_id` int NOT NULL,
	`expires_at` datetime NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);

CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setting_key` varchar(100) NOT NULL,
	`setting_value` text,
	`setting_type` varchar(50),
	`description` text,
	`is_editable` boolean DEFAULT true,
	`updated_by` int,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_setting_key_unique` UNIQUE(`setting_key`)
);

CREATE TABLE `user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`role_id` int NOT NULL,
	`assigned_at` timestamp DEFAULT (now()),
	`assigned_by` int,
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`)
);

CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_no` varchar(50) NOT NULL,
	`username` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`middle_name` varchar(100),
	`position` varchar(100),
	`division_office` varchar(100),
	`is_active` boolean DEFAULT true,
	`last_login_at` datetime,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_employee_no_unique` UNIQUE(`employee_no`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
