-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 03, 2026 at 05:18 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `government_fms`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts_receivable`
--

CREATE TABLE `accounts_receivable` (
  `id` int(11) NOT NULL,
  `ar_no` varchar(50) NOT NULL,
  `revenue_source_id` int(11) NOT NULL,
  `debtor_name` varchar(255) NOT NULL,
  `invoice_no` varchar(50) DEFAULT NULL,
  `invoice_date` datetime NOT NULL,
  `due_date` datetime NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `amount_collected` decimal(15,2) DEFAULT 0.00,
  `balance` decimal(15,2) NOT NULL,
  `status` enum('outstanding','partial','paid','written_off') DEFAULT 'outstanding',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `approval_workflows`
--

CREATE TABLE `approval_workflows` (
  `id` int(11) NOT NULL,
  `dv_id` int(11) NOT NULL,
  `stage` enum('division','budget','accounting','director') NOT NULL,
  `stage_order` int(11) NOT NULL,
  `approver_role_id` int(11) NOT NULL,
  `approver_user_id` int(11) DEFAULT NULL,
  `status` enum('pending','approved','rejected','skipped') DEFAULT 'pending',
  `comments` text DEFAULT NULL,
  `action_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `approval_workflows`
--

INSERT INTO `approval_workflows` (`id`, `dv_id`, `stage`, `stage_order`, `approver_role_id`, `approver_user_id`, `status`, `comments`, `action_date`, `created_at`) VALUES
(1, 1, 'division', 1, 6, 1, 'approved', 'adsa', '2025-12-31 05:02:29', '2025-12-31 05:02:16'),
(2, 1, 'budget', 2, 4, 1, 'approved', 'asd', '2025-12-31 05:02:59', '2025-12-31 05:02:16'),
(3, 1, 'accounting', 3, 3, 1, 'approved', 'ad', '2025-12-31 05:03:08', '2025-12-31 05:02:16'),
(4, 1, 'director', 4, 2, 1, 'approved', 'asdas', '2025-12-31 05:03:12', '2025-12-31 05:02:16'),
(5, 2, 'division', 1, 6, 1, 'approved', 'ads', '2025-12-31 07:31:25', '2025-12-31 07:31:21'),
(6, 2, 'budget', 2, 4, 1, 'approved', 'ad', '2025-12-31 07:31:36', '2025-12-31 07:31:21'),
(7, 2, 'accounting', 3, 3, 1, 'approved', 'asd', '2025-12-31 07:31:42', '2025-12-31 07:31:21'),
(8, 2, 'director', 4, 2, 1, 'approved', NULL, '2025-12-31 07:31:49', '2025-12-31 07:31:21'),
(9, 3, 'division', 1, 6, 1, 'approved', 'ad', '2025-12-31 09:19:45', '2025-12-31 09:19:40'),
(10, 3, 'budget', 2, 4, 1, 'approved', 'ad', '2025-12-31 09:19:49', '2025-12-31 09:19:40'),
(11, 3, 'accounting', 3, 3, 1, 'approved', 'asd', '2025-12-31 09:19:52', '2025-12-31 09:19:40'),
(12, 3, 'director', 4, 2, 1, 'approved', 'adas', '2025-12-31 09:19:56', '2025-12-31 09:19:40'),
(13, 4, 'division', 1, 6, 1, 'approved', 'asd', '2026-01-02 09:48:10', '2026-01-02 09:48:02'),
(14, 4, 'budget', 2, 4, 1, 'approved', 'asdas', '2026-01-02 09:48:14', '2026-01-02 09:48:02'),
(15, 4, 'accounting', 3, 3, 1, 'approved', 'adsas', '2026-01-02 09:48:19', '2026-01-02 09:48:02'),
(16, 4, 'director', 4, 2, 1, 'approved', 'asdasd', '2026-01-02 09:48:23', '2026-01-02 09:48:02');

-- --------------------------------------------------------

--
-- Table structure for table `asset_categories`
--

CREATE TABLE `asset_categories` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `useful_life` int(11) DEFAULT NULL,
  `depreciation_method` enum('straight_line','declining_balance') DEFAULT NULL,
  `capitalization_threshold` decimal(15,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `asset_categories`
--

INSERT INTO `asset_categories` (`id`, `code`, `name`, `useful_life`, `depreciation_method`, `capitalization_threshold`, `is_active`, `created_at`) VALUES
(1, 'IT22', 'mouse', 2, 'straight_line', 22222.00, 1, '2026-01-01 15:26:04');

-- --------------------------------------------------------

--
-- Table structure for table `attachments`
--

CREATE TABLE `attachments` (
  `id` int(11) NOT NULL,
  `attachable_type` varchar(50) NOT NULL,
  `attachable_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_original_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) NOT NULL,
  `file_type` varchar(100) NOT NULL,
  `file_extension` varchar(10) DEFAULT NULL,
  `document_type` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `uploaded_by` int(11) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(100) NOT NULL,
  `record_id` int(11) NOT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 1, 'approve_dv_stage', 'disbursement_vouchers', 2, NULL, '{\"stage\":\"division\",\"status\":\"approved\",\"comments\":\"ads\",\"workflowId\":5}', NULL, NULL, '2025-12-31 07:31:25'),
(2, 1, 'approve_dv_stage', 'disbursement_vouchers', 2, NULL, '{\"stage\":\"budget\",\"status\":\"approved\",\"comments\":\"ad\",\"workflowId\":6}', NULL, NULL, '2025-12-31 07:31:37'),
(3, 1, 'approve_dv_stage', 'disbursement_vouchers', 2, NULL, '{\"stage\":\"accounting\",\"status\":\"approved\",\"comments\":\"asd\",\"workflowId\":7}', NULL, NULL, '2025-12-31 07:31:42'),
(4, 1, 'approve_dv_stage', 'disbursement_vouchers', 2, NULL, '{\"stage\":\"director\",\"status\":\"approved\",\"workflowId\":8}', NULL, NULL, '2025-12-31 07:31:49'),
(5, 1, 'issue_payment', 'payments', 2, NULL, '{\"status\":\"issued\",\"receivedBy\":\"kkk\",\"checkNo\":null}', NULL, NULL, '2025-12-31 09:15:53'),
(6, 1, 'approve_dv_stage', 'disbursement_vouchers', 3, NULL, '{\"stage\":\"division\",\"status\":\"approved\",\"comments\":\"ad\",\"workflowId\":9}', NULL, NULL, '2025-12-31 09:19:45'),
(7, 1, 'approve_dv_stage', 'disbursement_vouchers', 3, NULL, '{\"stage\":\"budget\",\"status\":\"approved\",\"comments\":\"ad\",\"workflowId\":10}', NULL, NULL, '2025-12-31 09:19:49'),
(8, 1, 'approve_dv_stage', 'disbursement_vouchers', 3, NULL, '{\"stage\":\"accounting\",\"status\":\"approved\",\"comments\":\"asd\",\"workflowId\":11}', NULL, NULL, '2025-12-31 09:19:52'),
(9, 1, 'approve_dv_stage', 'disbursement_vouchers', 3, NULL, '{\"stage\":\"director\",\"status\":\"approved\",\"comments\":\"adas\",\"workflowId\":12}', NULL, NULL, '2025-12-31 09:19:56'),
(10, 1, 'issue_payment', 'payments', 3, NULL, '{\"status\":\"issued\",\"receivedBy\":\"asdas\",\"orNo\":\"f2222\",\"checkNo\":\"2025-01-000001\"}', NULL, NULL, '2025-12-31 09:20:47'),
(11, 1, 'CREATE', 'disbursement_vouchers', 4, NULL, '\"{\\\"fundClusterId\\\":1,\\\"orsBursNo\\\":\\\"2222\\\",\\\"fiscalYear\\\":2026,\\\"payeeName\\\":\\\"ghjkl\\\",\\\"payeeTin\\\":\\\"2229-5555\\\",\\\"payeeAddress\\\":\\\"ghghghg\\\",\\\"particulars\\\":\\\"asdasd\\\",\\\"responsibilityCenter\\\":\\\"22\\\",\\\"objectExpenditureId\\\":229,\\\"amount\\\":2222,\\\"paymentMode\\\":\\\"ada\\\",\\\"createdBy\\\":1,\\\"dvNo\\\":\\\"0001-01-2026\\\",\\\"status\\\":\\\"pending_budget\\\"}\"', NULL, NULL, '2026-01-02 09:48:02'),
(12, 1, 'APPROVE', 'disbursement_vouchers', 4, NULL, '\"{\\\"stage\\\":\\\"division\\\",\\\"status\\\":\\\"approved\\\",\\\"comments\\\":\\\"asd\\\",\\\"workflowId\\\":13}\"', NULL, NULL, '2026-01-02 09:48:10'),
(13, 1, 'APPROVE', 'disbursement_vouchers', 4, NULL, '\"{\\\"stage\\\":\\\"budget\\\",\\\"status\\\":\\\"approved\\\",\\\"comments\\\":\\\"asdas\\\",\\\"workflowId\\\":14}\"', NULL, NULL, '2026-01-02 09:48:14'),
(14, 1, 'APPROVE', 'disbursement_vouchers', 4, NULL, '\"{\\\"stage\\\":\\\"accounting\\\",\\\"status\\\":\\\"approved\\\",\\\"comments\\\":\\\"adsas\\\",\\\"workflowId\\\":15}\"', NULL, NULL, '2026-01-02 09:48:19'),
(15, 1, 'APPROVE', 'disbursement_vouchers', 4, NULL, '\"{\\\"stage\\\":\\\"director\\\",\\\"status\\\":\\\"approved\\\",\\\"comments\\\":\\\"asdasd\\\",\\\"workflowId\\\":16}\"', NULL, NULL, '2026-01-02 09:48:23'),
(16, 1, 'issue_payment', 'payments', 4, NULL, '{\"status\":\"issued\",\"receivedBy\":\"asd\",\"orNo\":\"asd\",\"checkNo\":null}', NULL, NULL, '2026-01-02 09:48:53');

-- --------------------------------------------------------

--
-- Table structure for table `bank_accounts`
--

CREATE TABLE `bank_accounts` (
  `id` int(11) NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `bank_branch` varchar(100) DEFAULT NULL,
  `account_type` enum('checking','savings','current') NOT NULL,
  `fund_cluster_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bank_deposits`
--

CREATE TABLE `bank_deposits` (
  `id` int(11) NOT NULL,
  `deposit_slip_no` varchar(50) NOT NULL,
  `bank_account_id` int(11) NOT NULL,
  `deposit_date` datetime NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `deposited_by` varchar(255) DEFAULT NULL,
  `status` enum('pending','confirmed','cancelled') DEFAULT 'pending',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bank_reconciliations`
--

CREATE TABLE `bank_reconciliations` (
  `id` int(11) NOT NULL,
  `bank_account_id` int(11) NOT NULL,
  `reconciliation_date` datetime NOT NULL,
  `period_month` int(11) NOT NULL,
  `period_year` int(11) NOT NULL,
  `book_balance` decimal(15,2) NOT NULL,
  `bank_balance` decimal(15,2) NOT NULL,
  `outstanding_checks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`outstanding_checks`)),
  `deposits_in_transit` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`deposits_in_transit`)),
  `bank_charges` decimal(15,2) DEFAULT NULL,
  `bank_interest` decimal(15,2) DEFAULT NULL,
  `adjusted_book_balance` decimal(15,2) DEFAULT NULL,
  `adjusted_bank_balance` decimal(15,2) DEFAULT NULL,
  `status` enum('draft','completed') DEFAULT 'draft',
  `prepared_by` int(11) NOT NULL,
  `prepared_date` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cash_advances`
--

CREATE TABLE `cash_advances` (
  `id` int(11) NOT NULL,
  `ca_no` varchar(50) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `fund_cluster_id` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `purpose` text NOT NULL,
  `date_issued` datetime NOT NULL,
  `due_date_return` datetime DEFAULT NULL,
  `date_liquidated` datetime DEFAULT NULL,
  `status` enum('draft','approved','released','liquidated','returned') DEFAULT 'draft',
  `dv_id` int(11) DEFAULT NULL,
  `liquidation_dv_id` int(11) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cash_receipts`
--

CREATE TABLE `cash_receipts` (
  `id` int(11) NOT NULL,
  `or_no` varchar(50) NOT NULL,
  `or_series_id` int(11) NOT NULL,
  `receipt_date` datetime NOT NULL,
  `payor_name` varchar(255) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_mode` enum('cash','check','online') NOT NULL,
  `check_no` varchar(50) DEFAULT NULL,
  `check_date` datetime DEFAULT NULL,
  `check_bank` varchar(100) DEFAULT NULL,
  `particulars` text NOT NULL,
  `fund_cluster_id` int(11) NOT NULL,
  `revenue_source_id` int(11) DEFAULT NULL,
  `bank_deposit_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `certificate_travel_completed`
--

CREATE TABLE `certificate_travel_completed` (
  `id` int(11) NOT NULL,
  `iot_id` int(11) NOT NULL,
  `ctc_no` varchar(50) NOT NULL,
  `travel_completed` tinyint(1) NOT NULL,
  `actual_departure_date` datetime NOT NULL,
  `actual_return_date` datetime NOT NULL,
  `completion_remarks` text DEFAULT NULL,
  `certified_by` int(11) NOT NULL,
  `certified_date` datetime NOT NULL,
  `verified_by` int(11) DEFAULT NULL,
  `verified_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `check_disbursement_records`
--

CREATE TABLE `check_disbursement_records` (
  `id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `fund_cluster_id` int(11) NOT NULL,
  `record_date` datetime NOT NULL,
  `nca_balance` decimal(15,2) DEFAULT NULL,
  `bank_balance` decimal(15,2) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `collections`
--

CREATE TABLE `collections` (
  `id` int(11) NOT NULL,
  `collection_no` varchar(50) NOT NULL,
  `ar_id` int(11) NOT NULL,
  `or_no` varchar(50) DEFAULT NULL,
  `collection_date` datetime NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_mode` enum('cash','check','online') NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_cash_position`
--

CREATE TABLE `daily_cash_position` (
  `id` int(11) NOT NULL,
  `report_date` date NOT NULL,
  `fund_cluster_id` int(11) NOT NULL,
  `opening_balance` decimal(15,2) NOT NULL,
  `receipts` decimal(15,2) NOT NULL DEFAULT 0.00,
  `disbursements` decimal(15,2) NOT NULL DEFAULT 0.00,
  `closing_balance` decimal(15,2) NOT NULL,
  `prepared_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `depreciation_schedule`
--

CREATE TABLE `depreciation_schedule` (
  `id` int(11) NOT NULL,
  `asset_id` int(11) NOT NULL,
  `period_month` int(11) NOT NULL,
  `period_year` int(11) NOT NULL,
  `depreciation_amount` decimal(15,2) NOT NULL,
  `accumulated_depreciation` decimal(15,2) NOT NULL,
  `book_value` decimal(15,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `depreciation_schedule`
--

INSERT INTO `depreciation_schedule` (`id`, `asset_id`, `period_month`, `period_year`, `depreciation_amount`, `accumulated_depreciation`, `book_value`, `created_at`) VALUES
(1, 1, 1, 2026, 7.58, 7.58, 2214.42, '2026-01-01 15:26:38'),
(2, 1, 2, 2026, 7.58, 15.15, 2206.85, '2026-01-01 15:26:38'),
(3, 1, 3, 2026, 7.58, 22.73, 2199.27, '2026-01-01 15:26:38'),
(4, 1, 4, 2026, 7.58, 30.30, 2191.70, '2026-01-01 15:26:38'),
(5, 1, 5, 2026, 7.58, 37.88, 2184.12, '2026-01-01 15:26:38'),
(6, 1, 6, 2026, 7.58, 45.45, 2176.55, '2026-01-01 15:26:38'),
(7, 1, 7, 2026, 7.58, 53.03, 2168.97, '2026-01-01 15:26:38'),
(8, 1, 8, 2026, 7.58, 60.61, 2161.39, '2026-01-01 15:26:38'),
(9, 1, 9, 2026, 7.58, 68.18, 2153.82, '2026-01-01 15:26:38'),
(10, 1, 10, 2026, 7.58, 75.76, 2146.24, '2026-01-01 15:26:38'),
(11, 1, 11, 2026, 7.58, 83.33, 2138.67, '2026-01-01 15:26:38'),
(12, 1, 12, 2026, 7.58, 90.91, 2131.09, '2026-01-01 15:26:38'),
(13, 1, 1, 2027, 7.58, 98.48, 2123.52, '2026-01-01 15:26:38'),
(14, 1, 2, 2027, 7.58, 106.06, 2115.94, '2026-01-01 15:26:38'),
(15, 1, 3, 2027, 7.58, 113.64, 2108.36, '2026-01-01 15:26:38'),
(16, 1, 4, 2027, 7.58, 121.21, 2100.79, '2026-01-01 15:26:38'),
(17, 1, 5, 2027, 7.58, 128.79, 2093.21, '2026-01-01 15:26:38'),
(18, 1, 6, 2027, 7.58, 136.36, 2085.64, '2026-01-01 15:26:38'),
(19, 1, 7, 2027, 7.58, 143.94, 2078.06, '2026-01-01 15:26:38'),
(20, 1, 8, 2027, 7.58, 151.52, 2070.48, '2026-01-01 15:26:38'),
(21, 1, 9, 2027, 7.58, 159.09, 2062.91, '2026-01-01 15:26:38'),
(22, 1, 10, 2027, 7.58, 166.67, 2055.33, '2026-01-01 15:26:38'),
(23, 1, 11, 2027, 7.58, 174.24, 2047.76, '2026-01-01 15:26:38'),
(24, 1, 12, 2027, 7.58, 181.82, 2040.18, '2026-01-01 15:26:38'),
(25, 1, 1, 2028, 7.58, 189.39, 2032.61, '2026-01-01 15:26:38'),
(26, 1, 2, 2028, 7.58, 196.97, 2025.03, '2026-01-01 15:26:38'),
(27, 1, 3, 2028, 7.58, 204.55, 2017.45, '2026-01-01 15:26:38'),
(28, 1, 4, 2028, 7.58, 212.12, 2009.88, '2026-01-01 15:26:38'),
(29, 1, 5, 2028, 7.58, 219.70, 2002.30, '2026-01-01 15:26:38'),
(30, 1, 6, 2028, 7.58, 227.27, 1994.73, '2026-01-01 15:26:38'),
(31, 1, 7, 2028, 7.58, 234.85, 1987.15, '2026-01-01 15:26:38'),
(32, 1, 8, 2028, 7.58, 242.42, 1979.58, '2026-01-01 15:26:38'),
(33, 1, 9, 2028, 7.58, 250.00, 1972.00, '2026-01-01 15:26:38'),
(34, 1, 10, 2028, 7.58, 257.58, 1964.42, '2026-01-01 15:26:38'),
(35, 1, 11, 2028, 7.58, 265.15, 1956.85, '2026-01-01 15:26:38'),
(36, 1, 12, 2028, 7.58, 272.73, 1949.27, '2026-01-01 15:26:38'),
(37, 1, 1, 2029, 7.58, 280.30, 1941.70, '2026-01-01 15:26:38'),
(38, 1, 2, 2029, 7.58, 287.88, 1934.12, '2026-01-01 15:26:38'),
(39, 1, 3, 2029, 7.58, 295.45, 1926.55, '2026-01-01 15:26:38'),
(40, 1, 4, 2029, 7.58, 303.03, 1918.97, '2026-01-01 15:26:38'),
(41, 1, 5, 2029, 7.58, 310.61, 1911.39, '2026-01-01 15:26:38'),
(42, 1, 6, 2029, 7.58, 318.18, 1903.82, '2026-01-01 15:26:38'),
(43, 1, 7, 2029, 7.58, 325.76, 1896.24, '2026-01-01 15:26:38'),
(44, 1, 8, 2029, 7.58, 333.33, 1888.67, '2026-01-01 15:26:38'),
(45, 1, 9, 2029, 7.58, 340.91, 1881.09, '2026-01-01 15:26:38'),
(46, 1, 10, 2029, 7.58, 348.48, 1873.52, '2026-01-01 15:26:38'),
(47, 1, 11, 2029, 7.58, 356.06, 1865.94, '2026-01-01 15:26:38'),
(48, 1, 12, 2029, 7.58, 363.64, 1858.36, '2026-01-01 15:26:38'),
(49, 1, 1, 2030, 7.58, 371.21, 1850.79, '2026-01-01 15:26:38'),
(50, 1, 2, 2030, 7.58, 378.79, 1843.21, '2026-01-01 15:26:38'),
(51, 1, 3, 2030, 7.58, 386.36, 1835.64, '2026-01-01 15:26:38'),
(52, 1, 4, 2030, 7.58, 393.94, 1828.06, '2026-01-01 15:26:38'),
(53, 1, 5, 2030, 7.58, 401.52, 1820.48, '2026-01-01 15:26:38'),
(54, 1, 6, 2030, 7.58, 409.09, 1812.91, '2026-01-01 15:26:38'),
(55, 1, 7, 2030, 7.58, 416.67, 1805.33, '2026-01-01 15:26:38'),
(56, 1, 8, 2030, 7.58, 424.24, 1797.76, '2026-01-01 15:26:38'),
(57, 1, 9, 2030, 7.58, 431.82, 1790.18, '2026-01-01 15:26:38'),
(58, 1, 10, 2030, 7.58, 439.39, 1782.61, '2026-01-01 15:26:38'),
(59, 1, 11, 2030, 7.58, 446.97, 1775.03, '2026-01-01 15:26:38'),
(60, 1, 12, 2030, 7.58, 454.55, 1767.45, '2026-01-01 15:26:38'),
(61, 1, 1, 2031, 7.58, 462.12, 1759.88, '2026-01-01 15:26:38'),
(62, 1, 2, 2031, 7.58, 469.70, 1752.30, '2026-01-01 15:26:38'),
(63, 1, 3, 2031, 7.58, 477.27, 1744.73, '2026-01-01 15:26:38'),
(64, 1, 4, 2031, 7.58, 484.85, 1737.15, '2026-01-01 15:26:38'),
(65, 1, 5, 2031, 7.58, 492.42, 1729.58, '2026-01-01 15:26:38'),
(66, 1, 6, 2031, 7.58, 500.00, 1722.00, '2026-01-01 15:26:38'),
(67, 1, 7, 2031, 7.58, 507.58, 1714.42, '2026-01-01 15:26:38'),
(68, 1, 8, 2031, 7.58, 515.15, 1706.85, '2026-01-01 15:26:38'),
(69, 1, 9, 2031, 7.58, 522.73, 1699.27, '2026-01-01 15:26:38'),
(70, 1, 10, 2031, 7.58, 530.30, 1691.70, '2026-01-01 15:26:38'),
(71, 1, 11, 2031, 7.58, 537.88, 1684.12, '2026-01-01 15:26:38'),
(72, 1, 12, 2031, 7.58, 545.45, 1676.55, '2026-01-01 15:26:38'),
(73, 1, 1, 2032, 7.58, 553.03, 1668.97, '2026-01-01 15:26:38'),
(74, 1, 2, 2032, 7.58, 560.61, 1661.39, '2026-01-01 15:26:38'),
(75, 1, 3, 2032, 7.58, 568.18, 1653.82, '2026-01-01 15:26:38'),
(76, 1, 4, 2032, 7.58, 575.76, 1646.24, '2026-01-01 15:26:38'),
(77, 1, 5, 2032, 7.58, 583.33, 1638.67, '2026-01-01 15:26:38'),
(78, 1, 6, 2032, 7.58, 590.91, 1631.09, '2026-01-01 15:26:38'),
(79, 1, 7, 2032, 7.58, 598.48, 1623.52, '2026-01-01 15:26:38'),
(80, 1, 8, 2032, 7.58, 606.06, 1615.94, '2026-01-01 15:26:38'),
(81, 1, 9, 2032, 7.58, 613.64, 1608.36, '2026-01-01 15:26:38'),
(82, 1, 10, 2032, 7.58, 621.21, 1600.79, '2026-01-01 15:26:38'),
(83, 1, 11, 2032, 7.58, 628.79, 1593.21, '2026-01-01 15:26:38'),
(84, 1, 12, 2032, 7.58, 636.36, 1585.64, '2026-01-01 15:26:38'),
(85, 1, 1, 2033, 7.58, 643.94, 1578.06, '2026-01-01 15:26:38'),
(86, 1, 2, 2033, 7.58, 651.52, 1570.48, '2026-01-01 15:26:38'),
(87, 1, 3, 2033, 7.58, 659.09, 1562.91, '2026-01-01 15:26:38'),
(88, 1, 4, 2033, 7.58, 666.67, 1555.33, '2026-01-01 15:26:38'),
(89, 1, 5, 2033, 7.58, 674.24, 1547.76, '2026-01-01 15:26:38'),
(90, 1, 6, 2033, 7.58, 681.82, 1540.18, '2026-01-01 15:26:38'),
(91, 1, 7, 2033, 7.58, 689.39, 1532.61, '2026-01-01 15:26:38'),
(92, 1, 8, 2033, 7.58, 696.97, 1525.03, '2026-01-01 15:26:38'),
(93, 1, 9, 2033, 7.58, 704.55, 1517.45, '2026-01-01 15:26:38'),
(94, 1, 10, 2033, 7.58, 712.12, 1509.88, '2026-01-01 15:26:38'),
(95, 1, 11, 2033, 7.58, 719.70, 1502.30, '2026-01-01 15:26:38'),
(96, 1, 12, 2033, 7.58, 727.27, 1494.73, '2026-01-01 15:26:38'),
(97, 1, 1, 2034, 7.58, 734.85, 1487.15, '2026-01-01 15:26:38'),
(98, 1, 2, 2034, 7.58, 742.42, 1479.58, '2026-01-01 15:26:38'),
(99, 1, 3, 2034, 7.58, 750.00, 1472.00, '2026-01-01 15:26:38'),
(100, 1, 4, 2034, 7.58, 757.58, 1464.42, '2026-01-01 15:26:38'),
(101, 1, 5, 2034, 7.58, 765.15, 1456.85, '2026-01-01 15:26:38'),
(102, 1, 6, 2034, 7.58, 772.73, 1449.27, '2026-01-01 15:26:38'),
(103, 1, 7, 2034, 7.58, 780.30, 1441.70, '2026-01-01 15:26:38'),
(104, 1, 8, 2034, 7.58, 787.88, 1434.12, '2026-01-01 15:26:38'),
(105, 1, 9, 2034, 7.58, 795.45, 1426.55, '2026-01-01 15:26:38'),
(106, 1, 10, 2034, 7.58, 803.03, 1418.97, '2026-01-01 15:26:38'),
(107, 1, 11, 2034, 7.58, 810.61, 1411.39, '2026-01-01 15:26:38'),
(108, 1, 12, 2034, 7.58, 818.18, 1403.82, '2026-01-01 15:26:38'),
(109, 1, 1, 2035, 7.58, 825.76, 1396.24, '2026-01-01 15:26:38'),
(110, 1, 2, 2035, 7.58, 833.33, 1388.67, '2026-01-01 15:26:38'),
(111, 1, 3, 2035, 7.58, 840.91, 1381.09, '2026-01-01 15:26:38'),
(112, 1, 4, 2035, 7.58, 848.48, 1373.52, '2026-01-01 15:26:38'),
(113, 1, 5, 2035, 7.58, 856.06, 1365.94, '2026-01-01 15:26:38'),
(114, 1, 6, 2035, 7.58, 863.64, 1358.36, '2026-01-01 15:26:38'),
(115, 1, 7, 2035, 7.58, 871.21, 1350.79, '2026-01-01 15:26:38'),
(116, 1, 8, 2035, 7.58, 878.79, 1343.21, '2026-01-01 15:26:38'),
(117, 1, 9, 2035, 7.58, 886.36, 1335.64, '2026-01-01 15:26:38'),
(118, 1, 10, 2035, 7.58, 893.94, 1328.06, '2026-01-01 15:26:38'),
(119, 1, 11, 2035, 7.58, 901.52, 1320.48, '2026-01-01 15:26:38'),
(120, 1, 12, 2035, 7.58, 909.09, 1312.91, '2026-01-01 15:26:38'),
(121, 1, 1, 2036, 7.58, 916.67, 1305.33, '2026-01-01 15:26:38'),
(122, 1, 2, 2036, 7.58, 924.24, 1297.76, '2026-01-01 15:26:38'),
(123, 1, 3, 2036, 7.58, 931.82, 1290.18, '2026-01-01 15:26:38'),
(124, 1, 4, 2036, 7.58, 939.39, 1282.61, '2026-01-01 15:26:38'),
(125, 1, 5, 2036, 7.58, 946.97, 1275.03, '2026-01-01 15:26:38'),
(126, 1, 6, 2036, 7.58, 954.55, 1267.45, '2026-01-01 15:26:38'),
(127, 1, 7, 2036, 7.58, 962.12, 1259.88, '2026-01-01 15:26:38'),
(128, 1, 8, 2036, 7.58, 969.70, 1252.30, '2026-01-01 15:26:38'),
(129, 1, 9, 2036, 7.58, 977.27, 1244.73, '2026-01-01 15:26:38'),
(130, 1, 10, 2036, 7.58, 984.85, 1237.15, '2026-01-01 15:26:38'),
(131, 1, 11, 2036, 7.58, 992.42, 1229.58, '2026-01-01 15:26:38'),
(132, 1, 12, 2036, 7.58, 1000.00, 1222.00, '2026-01-01 15:26:38'),
(133, 1, 1, 2037, 7.58, 1007.58, 1214.42, '2026-01-01 15:26:38'),
(134, 1, 2, 2037, 7.58, 1015.15, 1206.85, '2026-01-01 15:26:38'),
(135, 1, 3, 2037, 7.58, 1022.73, 1199.27, '2026-01-01 15:26:38'),
(136, 1, 4, 2037, 7.58, 1030.30, 1191.70, '2026-01-01 15:26:38'),
(137, 1, 5, 2037, 7.58, 1037.88, 1184.12, '2026-01-01 15:26:38'),
(138, 1, 6, 2037, 7.58, 1045.45, 1176.55, '2026-01-01 15:26:38'),
(139, 1, 7, 2037, 7.58, 1053.03, 1168.97, '2026-01-01 15:26:38'),
(140, 1, 8, 2037, 7.58, 1060.61, 1161.39, '2026-01-01 15:26:38'),
(141, 1, 9, 2037, 7.58, 1068.18, 1153.82, '2026-01-01 15:26:38'),
(142, 1, 10, 2037, 7.58, 1075.76, 1146.24, '2026-01-01 15:26:38'),
(143, 1, 11, 2037, 7.58, 1083.33, 1138.67, '2026-01-01 15:26:38'),
(144, 1, 12, 2037, 7.58, 1090.91, 1131.09, '2026-01-01 15:26:38'),
(145, 1, 1, 2038, 7.58, 1098.48, 1123.52, '2026-01-01 15:26:38'),
(146, 1, 2, 2038, 7.58, 1106.06, 1115.94, '2026-01-01 15:26:38'),
(147, 1, 3, 2038, 7.58, 1113.64, 1108.36, '2026-01-01 15:26:38'),
(148, 1, 4, 2038, 7.58, 1121.21, 1100.79, '2026-01-01 15:26:38'),
(149, 1, 5, 2038, 7.58, 1128.79, 1093.21, '2026-01-01 15:26:38'),
(150, 1, 6, 2038, 7.58, 1136.36, 1085.64, '2026-01-01 15:26:38'),
(151, 1, 7, 2038, 7.58, 1143.94, 1078.06, '2026-01-01 15:26:38'),
(152, 1, 8, 2038, 7.58, 1151.52, 1070.48, '2026-01-01 15:26:38'),
(153, 1, 9, 2038, 7.58, 1159.09, 1062.91, '2026-01-01 15:26:38'),
(154, 1, 10, 2038, 7.58, 1166.67, 1055.33, '2026-01-01 15:26:38'),
(155, 1, 11, 2038, 7.58, 1174.24, 1047.76, '2026-01-01 15:26:38'),
(156, 1, 12, 2038, 7.58, 1181.82, 1040.18, '2026-01-01 15:26:38'),
(157, 1, 1, 2039, 7.58, 1189.39, 1032.61, '2026-01-01 15:26:38'),
(158, 1, 2, 2039, 7.58, 1196.97, 1025.03, '2026-01-01 15:26:38'),
(159, 1, 3, 2039, 7.58, 1204.55, 1017.45, '2026-01-01 15:26:38'),
(160, 1, 4, 2039, 7.58, 1212.12, 1009.88, '2026-01-01 15:26:38'),
(161, 1, 5, 2039, 7.58, 1219.70, 1002.30, '2026-01-01 15:26:38'),
(162, 1, 6, 2039, 7.58, 1227.27, 994.73, '2026-01-01 15:26:38'),
(163, 1, 7, 2039, 7.58, 1234.85, 987.15, '2026-01-01 15:26:38'),
(164, 1, 8, 2039, 7.58, 1242.42, 979.58, '2026-01-01 15:26:38'),
(165, 1, 9, 2039, 7.58, 1250.00, 972.00, '2026-01-01 15:26:38'),
(166, 1, 10, 2039, 7.58, 1257.58, 964.42, '2026-01-01 15:26:38'),
(167, 1, 11, 2039, 7.58, 1265.15, 956.85, '2026-01-01 15:26:38'),
(168, 1, 12, 2039, 7.58, 1272.73, 949.27, '2026-01-01 15:26:38'),
(169, 1, 1, 2040, 7.58, 1280.30, 941.70, '2026-01-01 15:26:38'),
(170, 1, 2, 2040, 7.58, 1287.88, 934.12, '2026-01-01 15:26:38'),
(171, 1, 3, 2040, 7.58, 1295.45, 926.55, '2026-01-01 15:26:38'),
(172, 1, 4, 2040, 7.58, 1303.03, 918.97, '2026-01-01 15:26:38'),
(173, 1, 5, 2040, 7.58, 1310.61, 911.39, '2026-01-01 15:26:38'),
(174, 1, 6, 2040, 7.58, 1318.18, 903.82, '2026-01-01 15:26:38'),
(175, 1, 7, 2040, 7.58, 1325.76, 896.24, '2026-01-01 15:26:38'),
(176, 1, 8, 2040, 7.58, 1333.33, 888.67, '2026-01-01 15:26:38'),
(177, 1, 9, 2040, 7.58, 1340.91, 881.09, '2026-01-01 15:26:38'),
(178, 1, 10, 2040, 7.58, 1348.48, 873.52, '2026-01-01 15:26:38'),
(179, 1, 11, 2040, 7.58, 1356.06, 865.94, '2026-01-01 15:26:38'),
(180, 1, 12, 2040, 7.58, 1363.64, 858.36, '2026-01-01 15:26:38'),
(181, 1, 1, 2041, 7.58, 1371.21, 850.79, '2026-01-01 15:26:38'),
(182, 1, 2, 2041, 7.58, 1378.79, 843.21, '2026-01-01 15:26:38'),
(183, 1, 3, 2041, 7.58, 1386.36, 835.64, '2026-01-01 15:26:38'),
(184, 1, 4, 2041, 7.58, 1393.94, 828.06, '2026-01-01 15:26:38'),
(185, 1, 5, 2041, 7.58, 1401.52, 820.48, '2026-01-01 15:26:38'),
(186, 1, 6, 2041, 7.58, 1409.09, 812.91, '2026-01-01 15:26:38'),
(187, 1, 7, 2041, 7.58, 1416.67, 805.33, '2026-01-01 15:26:38'),
(188, 1, 8, 2041, 7.58, 1424.24, 797.76, '2026-01-01 15:26:38'),
(189, 1, 9, 2041, 7.58, 1431.82, 790.18, '2026-01-01 15:26:38'),
(190, 1, 10, 2041, 7.58, 1439.39, 782.61, '2026-01-01 15:26:38'),
(191, 1, 11, 2041, 7.58, 1446.97, 775.03, '2026-01-01 15:26:38'),
(192, 1, 12, 2041, 7.58, 1454.55, 767.45, '2026-01-01 15:26:38'),
(193, 1, 1, 2042, 7.58, 1462.12, 759.88, '2026-01-01 15:26:38'),
(194, 1, 2, 2042, 7.58, 1469.70, 752.30, '2026-01-01 15:26:38'),
(195, 1, 3, 2042, 7.58, 1477.27, 744.73, '2026-01-01 15:26:38'),
(196, 1, 4, 2042, 7.58, 1484.85, 737.15, '2026-01-01 15:26:38'),
(197, 1, 5, 2042, 7.58, 1492.42, 729.58, '2026-01-01 15:26:38'),
(198, 1, 6, 2042, 7.58, 1500.00, 722.00, '2026-01-01 15:26:38'),
(199, 1, 7, 2042, 7.58, 1507.58, 714.42, '2026-01-01 15:26:38'),
(200, 1, 8, 2042, 7.58, 1515.15, 706.85, '2026-01-01 15:26:38'),
(201, 1, 9, 2042, 7.58, 1522.73, 699.27, '2026-01-01 15:26:38'),
(202, 1, 10, 2042, 7.58, 1530.30, 691.70, '2026-01-01 15:26:38'),
(203, 1, 11, 2042, 7.58, 1537.88, 684.12, '2026-01-01 15:26:38'),
(204, 1, 12, 2042, 7.58, 1545.45, 676.55, '2026-01-01 15:26:38'),
(205, 1, 1, 2043, 7.58, 1553.03, 668.97, '2026-01-01 15:26:38'),
(206, 1, 2, 2043, 7.58, 1560.61, 661.39, '2026-01-01 15:26:38'),
(207, 1, 3, 2043, 7.58, 1568.18, 653.82, '2026-01-01 15:26:38'),
(208, 1, 4, 2043, 7.58, 1575.76, 646.24, '2026-01-01 15:26:38'),
(209, 1, 5, 2043, 7.58, 1583.33, 638.67, '2026-01-01 15:26:38'),
(210, 1, 6, 2043, 7.58, 1590.91, 631.09, '2026-01-01 15:26:38'),
(211, 1, 7, 2043, 7.58, 1598.48, 623.52, '2026-01-01 15:26:38'),
(212, 1, 8, 2043, 7.58, 1606.06, 615.94, '2026-01-01 15:26:38'),
(213, 1, 9, 2043, 7.58, 1613.64, 608.36, '2026-01-01 15:26:38'),
(214, 1, 10, 2043, 7.58, 1621.21, 600.79, '2026-01-01 15:26:38'),
(215, 1, 11, 2043, 7.58, 1628.79, 593.21, '2026-01-01 15:26:38'),
(216, 1, 12, 2043, 7.58, 1636.36, 585.64, '2026-01-01 15:26:38'),
(217, 1, 1, 2044, 7.58, 1643.94, 578.06, '2026-01-01 15:26:38'),
(218, 1, 2, 2044, 7.58, 1651.52, 570.48, '2026-01-01 15:26:38'),
(219, 1, 3, 2044, 7.58, 1659.09, 562.91, '2026-01-01 15:26:38'),
(220, 1, 4, 2044, 7.58, 1666.67, 555.33, '2026-01-01 15:26:38'),
(221, 1, 5, 2044, 7.58, 1674.24, 547.76, '2026-01-01 15:26:38'),
(222, 1, 6, 2044, 7.58, 1681.82, 540.18, '2026-01-01 15:26:38'),
(223, 1, 7, 2044, 7.58, 1689.39, 532.61, '2026-01-01 15:26:38'),
(224, 1, 8, 2044, 7.58, 1696.97, 525.03, '2026-01-01 15:26:38'),
(225, 1, 9, 2044, 7.58, 1704.55, 517.45, '2026-01-01 15:26:38'),
(226, 1, 10, 2044, 7.58, 1712.12, 509.88, '2026-01-01 15:26:38'),
(227, 1, 11, 2044, 7.58, 1719.70, 502.30, '2026-01-01 15:26:38'),
(228, 1, 12, 2044, 7.58, 1727.27, 494.73, '2026-01-01 15:26:38'),
(229, 1, 1, 2045, 7.58, 1734.85, 487.15, '2026-01-01 15:26:38'),
(230, 1, 2, 2045, 7.58, 1742.42, 479.58, '2026-01-01 15:26:38'),
(231, 1, 3, 2045, 7.58, 1750.00, 472.00, '2026-01-01 15:26:38'),
(232, 1, 4, 2045, 7.58, 1757.58, 464.42, '2026-01-01 15:26:38'),
(233, 1, 5, 2045, 7.58, 1765.15, 456.85, '2026-01-01 15:26:38'),
(234, 1, 6, 2045, 7.58, 1772.73, 449.27, '2026-01-01 15:26:38'),
(235, 1, 7, 2045, 7.58, 1780.30, 441.70, '2026-01-01 15:26:38'),
(236, 1, 8, 2045, 7.58, 1787.88, 434.12, '2026-01-01 15:26:38'),
(237, 1, 9, 2045, 7.58, 1795.45, 426.55, '2026-01-01 15:26:38'),
(238, 1, 10, 2045, 7.58, 1803.03, 418.97, '2026-01-01 15:26:38'),
(239, 1, 11, 2045, 7.58, 1810.61, 411.39, '2026-01-01 15:26:38'),
(240, 1, 12, 2045, 7.58, 1818.18, 403.82, '2026-01-01 15:26:38'),
(241, 1, 1, 2046, 7.58, 1825.76, 396.24, '2026-01-01 15:26:38'),
(242, 1, 2, 2046, 7.58, 1833.33, 388.67, '2026-01-01 15:26:38'),
(243, 1, 3, 2046, 7.58, 1840.91, 381.09, '2026-01-01 15:26:38'),
(244, 1, 4, 2046, 7.58, 1848.48, 373.52, '2026-01-01 15:26:38'),
(245, 1, 5, 2046, 7.58, 1856.06, 365.94, '2026-01-01 15:26:38'),
(246, 1, 6, 2046, 7.58, 1863.64, 358.36, '2026-01-01 15:26:38'),
(247, 1, 7, 2046, 7.58, 1871.21, 350.79, '2026-01-01 15:26:38'),
(248, 1, 8, 2046, 7.58, 1878.79, 343.21, '2026-01-01 15:26:38'),
(249, 1, 9, 2046, 7.58, 1886.36, 335.64, '2026-01-01 15:26:38'),
(250, 1, 10, 2046, 7.58, 1893.94, 328.06, '2026-01-01 15:26:38'),
(251, 1, 11, 2046, 7.58, 1901.52, 320.48, '2026-01-01 15:26:38'),
(252, 1, 12, 2046, 7.58, 1909.09, 312.91, '2026-01-01 15:26:38'),
(253, 1, 1, 2047, 7.58, 1916.67, 305.33, '2026-01-01 15:26:38'),
(254, 1, 2, 2047, 7.58, 1924.24, 297.76, '2026-01-01 15:26:38'),
(255, 1, 3, 2047, 7.58, 1931.82, 290.18, '2026-01-01 15:26:38'),
(256, 1, 4, 2047, 7.58, 1939.39, 282.61, '2026-01-01 15:26:38'),
(257, 1, 5, 2047, 7.58, 1946.97, 275.03, '2026-01-01 15:26:38'),
(258, 1, 6, 2047, 7.58, 1954.55, 267.45, '2026-01-01 15:26:38'),
(259, 1, 7, 2047, 7.58, 1962.12, 259.88, '2026-01-01 15:26:38'),
(260, 1, 8, 2047, 7.58, 1969.70, 252.30, '2026-01-01 15:26:38'),
(261, 1, 9, 2047, 7.58, 1977.27, 244.73, '2026-01-01 15:26:38'),
(262, 1, 10, 2047, 7.58, 1984.85, 237.15, '2026-01-01 15:26:38'),
(263, 1, 11, 2047, 7.58, 1992.42, 229.58, '2026-01-01 15:26:38'),
(264, 1, 12, 2047, 7.58, 2000.00, 222.00, '2026-01-01 15:26:38');

-- --------------------------------------------------------

--
-- Table structure for table `disbursement_vouchers`
--

CREATE TABLE `disbursement_vouchers` (
  `id` int(11) NOT NULL,
  `dv_no` varchar(50) NOT NULL,
  `fund_cluster_id` int(11) NOT NULL,
  `ors_burs_no` varchar(50) NOT NULL,
  `dv_date` datetime NOT NULL,
  `fiscal_year` int(11) NOT NULL,
  `payee_name` varchar(255) NOT NULL,
  `payee_tin` varchar(50) DEFAULT NULL,
  `payee_address` text DEFAULT NULL,
  `particulars` text NOT NULL,
  `responsibility_center` varchar(100) DEFAULT NULL,
  `mfo_pap_id` int(11) DEFAULT NULL,
  `object_expenditure_id` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_mode` enum('mds_check','commercial_check','ada','other') NOT NULL,
  `status` enum('draft','pending_budget','pending_accounting','pending_director','approved','paid','rejected','cancelled') DEFAULT 'draft',
  `cert_box_a_user_id` int(11) DEFAULT NULL,
  `cert_box_a_date` datetime DEFAULT NULL,
  `cert_box_a_signature` text DEFAULT NULL,
  `cert_box_b_accounting_entry` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`cert_box_b_accounting_entry`)),
  `cert_box_c_user_id` int(11) DEFAULT NULL,
  `cert_box_c_date` datetime DEFAULT NULL,
  `cert_box_c_cash_available` tinyint(1) DEFAULT NULL,
  `cert_box_c_subject_to_ada` tinyint(1) DEFAULT NULL,
  `cert_box_d_user_id` int(11) DEFAULT NULL,
  `cert_box_d_date` datetime DEFAULT NULL,
  `cert_box_d_approved` tinyint(1) DEFAULT NULL,
  `cert_box_e_payee_signature` text DEFAULT NULL,
  `cert_box_e_receipt_date` datetime DEFAULT NULL,
  `cert_box_e_check_no` varchar(50) DEFAULT NULL,
  `cert_box_e_bank_name` varchar(100) DEFAULT NULL,
  `cert_box_e_account_no` varchar(50) DEFAULT NULL,
  `cert_box_e_or_no` varchar(50) DEFAULT NULL,
  `cert_box_e_or_date` datetime DEFAULT NULL,
  `jev_no` varchar(50) DEFAULT NULL,
  `jev_date` datetime DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `disbursement_vouchers`
--

INSERT INTO `disbursement_vouchers` (`id`, `dv_no`, `fund_cluster_id`, `ors_burs_no`, `dv_date`, `fiscal_year`, `payee_name`, `payee_tin`, `payee_address`, `particulars`, `responsibility_center`, `mfo_pap_id`, `object_expenditure_id`, `amount`, `payment_mode`, `status`, `cert_box_a_user_id`, `cert_box_a_date`, `cert_box_a_signature`, `cert_box_b_accounting_entry`, `cert_box_c_user_id`, `cert_box_c_date`, `cert_box_c_cash_available`, `cert_box_c_subject_to_ada`, `cert_box_d_user_id`, `cert_box_d_date`, `cert_box_d_approved`, `cert_box_e_payee_signature`, `cert_box_e_receipt_date`, `cert_box_e_check_no`, `cert_box_e_bank_name`, `cert_box_e_account_no`, `cert_box_e_or_no`, `cert_box_e_or_date`, `jev_no`, `jev_date`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, '0001-12-2025', 1, 'ORS: or2', '2025-12-31 05:02:16', 2025, 'raf', '222222222222222222', 'asdas', 'asdasd', '200000', NULL, 216, 20000.00, 'mds_check', 'approved', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2025-12-30 21:02:16', '2025-12-31 05:03:12', NULL),
(2, '0002-12-2025', 1, 'ORS: or2', '2025-12-31 07:31:20', 2025, 'asd', '222222222222222222', 'asdas', 'asda', '200000', NULL, 233, 60000.00, 'ada', 'approved', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2025-12-30 23:31:20', '2025-12-31 07:31:49', NULL),
(3, '0003-12-2025', 1, 'ad333', '2025-12-31 09:19:40', 2025, 'adgg', '2222ads', 'asdas', 'adasdasd', '222222222222', NULL, 232, 2222222.00, 'mds_check', 'approved', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2025-12-31 01:19:40', '2025-12-31 09:19:56', NULL),
(4, '0001-01-2026', 1, '2222', '2026-01-02 09:48:02', 2026, 'ghjkl', '2229-5555', 'ghghghg', 'asdasd', '22', NULL, 229, 2222.00, 'ada', 'approved', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-01-02 01:48:02', '2026-01-02 09:48:23', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `employee_no` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `suffix` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `civil_status` enum('Single','Married','Widowed','Separated') DEFAULT NULL,
  `gender` enum('Male','Female') DEFAULT NULL,
  `position` varchar(100) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `division` varchar(100) DEFAULT NULL,
  `section` varchar(100) DEFAULT NULL,
  `salary_grade` varchar(20) DEFAULT NULL,
  `step_increment` int(11) DEFAULT 1,
  `appointment_status` enum('Permanent','Temporary','Casual','Contractual','Co-terminus') DEFAULT NULL,
  `employment_status` enum('Active','Resigned','Retired','Terminated','On Leave') DEFAULT 'Active',
  `date_hired` date NOT NULL,
  `date_regularized` date DEFAULT NULL,
  `date_resigned` date DEFAULT NULL,
  `basic_salary` decimal(15,2) NOT NULL,
  `pera` decimal(10,2) DEFAULT 0.00,
  `additional_allowance` decimal(10,2) DEFAULT 0.00,
  `tin_no` varchar(20) DEFAULT NULL,
  `gsis_no` varchar(20) DEFAULT NULL,
  `philhealth_no` varchar(20) DEFAULT NULL,
  `pagibig_no` varchar(20) DEFAULT NULL,
  `sss_no` varchar(20) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `bank_account_no` varchar(50) DEFAULT NULL,
  `bank_account_name` varchar(100) DEFAULT NULL,
  `mobile_no` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `tax_exemption_code` varchar(10) DEFAULT 'S',
  `number_of_dependents` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `user_id`, `employee_no`, `first_name`, `last_name`, `middle_name`, `suffix`, `date_of_birth`, `civil_status`, `gender`, `position`, `department`, `division`, `section`, `salary_grade`, `step_increment`, `appointment_status`, `employment_status`, `date_hired`, `date_regularized`, `date_resigned`, `basic_salary`, `pera`, `additional_allowance`, `tin_no`, `gsis_no`, `philhealth_no`, `pagibig_no`, `sss_no`, `bank_name`, `bank_account_no`, `bank_account_name`, `mobile_no`, `email`, `address`, `tax_exemption_code`, `number_of_dependents`, `is_active`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'EMP-2026-0001', 'raf', 'fadsa', 'ra', '', '2000-01-02', 'Single', 'Male', 'sdas', NULL, NULL, NULL, '22', 1, 'Permanent', 'Active', '2020-01-09', '2021-01-09', NULL, 2222222.00, 2000.00, 222.00, '', '', '', '', NULL, '', '', '', '', '', '', 'S', 0, 1, 1, '2026-01-02 04:44:36', '2026-01-02 04:44:36');

-- --------------------------------------------------------

--
-- Table structure for table `employee_deductions`
--

CREATE TABLE `employee_deductions` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `deduction_type` enum('GSIS Loan','Pag-IBIG Loan','Salary Loan','Other') NOT NULL,
  `deduction_name` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `installments` int(11) NOT NULL,
  `installments_paid` int(11) DEFAULT 0,
  `balance` decimal(15,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fixed_assets`
--

CREATE TABLE `fixed_assets` (
  `id` int(11) NOT NULL,
  `asset_no` varchar(50) NOT NULL,
  `asset_category_id` int(11) NOT NULL,
  `description` text NOT NULL,
  `acquisition_date` datetime NOT NULL,
  `acquisition_cost` decimal(15,2) NOT NULL,
  `salvage_value` decimal(10,0) DEFAULT 0,
  `useful_life` int(11) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `custodian` varchar(255) DEFAULT NULL,
  `serial_no` varchar(100) DEFAULT NULL,
  `status` enum('active','disposed','written_off') DEFAULT 'active',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fixed_assets`
--

INSERT INTO `fixed_assets` (`id`, `asset_no`, `asset_category_id`, `description`, `acquisition_date`, `acquisition_cost`, `salvage_value`, `useful_life`, `location`, `custodian`, `serial_no`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'ASSET-2026-0001', 1, 'asda', '2026-01-01 00:00:00', 2222.00, 222, 22, 'asd', 'asd', 'ads', 'active', 1, '2026-01-01 15:26:38', '2026-01-01 15:26:38');

-- --------------------------------------------------------

--
-- Table structure for table `fund_clusters`
--

CREATE TABLE `fund_clusters` (
  `id` int(11) NOT NULL,
  `code` varchar(10) NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fund_clusters`
--

INSERT INTO `fund_clusters` (`id`, `code`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, '01', 'Regular Agency Fund', 'For regular operating expenses', 1, '2025-12-30 17:38:09', '2025-12-30 17:38:09'),
(2, '02', 'Foreign Assisted Projects', 'For foreign-assisted project funds', 1, '2025-12-30 17:38:09', '2025-12-30 17:38:09'),
(3, '03', 'Special Account - Locally Funded/Domestic Grants', 'For locally funded special accounts', 1, '2025-12-30 17:38:09', '2025-12-30 17:38:09'),
(4, '04', 'Special Account - Foreign Assisted/Foreign Grants', 'For foreign-assisted special accounts', 1, '2025-12-30 17:38:09', '2025-12-30 17:38:09'),
(5, '05', 'Trust Receipts', 'For trust receipt funds', 1, '2025-12-30 17:38:09', '2025-12-30 17:38:09'),
(6, '06', 'Trust Liabilities', 'For trust liability funds', 1, '2025-12-30 17:38:09', '2025-12-30 17:38:09'),
(7, '07', 'Intra-Agency Fund Transfers', 'For intra-agency fund transfers', 1, '2025-12-30 17:38:09', '2025-12-30 17:38:09');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_items`
--

CREATE TABLE `inventory_items` (
  `id` int(11) NOT NULL,
  `item_code` varchar(50) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `unit` varchar(50) NOT NULL,
  `unit_cost` decimal(15,2) NOT NULL,
  `quantity_on_hand` int(11) DEFAULT 0,
  `minimum_level` int(11) DEFAULT 0,
  `maximum_level` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `itinerary_of_travel`
--

CREATE TABLE `itinerary_of_travel` (
  `id` int(11) NOT NULL,
  `iot_no` varchar(50) NOT NULL,
  `fund_cluster_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `purpose` text NOT NULL,
  `departure_date` datetime NOT NULL,
  `return_date` datetime NOT NULL,
  `destination` varchar(255) NOT NULL,
  `itinerary_before` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`itinerary_before`)),
  `itinerary_actual` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`itinerary_actual`)),
  `estimated_cost` decimal(15,2) NOT NULL,
  `cash_advance_amount` decimal(15,2) DEFAULT NULL,
  `dv_id` int(11) DEFAULT NULL,
  `status` enum('draft','pending_approval','approved','in_progress','completed','cancelled') DEFAULT 'draft',
  `approved_by` int(11) DEFAULT NULL,
  `approved_date` datetime DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `liquidation_expense_items`
--

CREATE TABLE `liquidation_expense_items` (
  `id` int(11) NOT NULL,
  `lr_id` int(11) NOT NULL,
  `expense_date` datetime NOT NULL,
  `expense_category` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `or_invoice_no` varchar(100) DEFAULT NULL,
  `or_invoice_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `liquidation_reports`
--

CREATE TABLE `liquidation_reports` (
  `id` int(11) NOT NULL,
  `lr_no` varchar(50) NOT NULL,
  `iot_id` int(11) NOT NULL,
  `ctc_id` int(11) DEFAULT NULL,
  `fund_cluster_id` int(11) NOT NULL,
  `cash_advance_amount` decimal(15,2) NOT NULL,
  `cash_advance_dv_id` int(11) DEFAULT NULL,
  `total_expenses` decimal(15,2) NOT NULL,
  `refund_amount` decimal(15,2) DEFAULT NULL,
  `additional_claim` decimal(15,2) DEFAULT NULL,
  `status` enum('draft','pending_review','approved','settled') DEFAULT 'draft',
  `submitted_by` int(11) NOT NULL,
  `submitted_date` datetime DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mfo_pap`
--

CREATE TABLE `mfo_pap` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `mfo_category` enum('regulation_lgu_finance','policy_formulation','revenue_evaluation','special_projects','training') NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `object_of_expenditure`
--

CREATE TABLE `object_of_expenditure` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `object_of_expenditure`
--

INSERT INTO `object_of_expenditure` (`id`, `code`, `name`, `category`, `description`, `parent_id`, `is_active`, `created_at`) VALUES
(216, '5010000000', 'Salaries and Wages', 'Personnel Services', 'Basic salary of permanent and casual employees', NULL, 1, '2025-12-30 19:14:19'),
(217, '5010100000', 'Salaries and Wages - Regular', 'Personnel Services', 'Regular salaries', NULL, 1, '2025-12-30 19:14:19'),
(218, '5010200000', 'Salaries and Wages - Casual', 'Personnel Services', 'Casual employee wages', NULL, 1, '2025-12-30 19:14:19'),
(219, '5010300000', 'Other Compensation', 'Personnel Services', 'PERA, Additional Compensation, etc.', NULL, 1, '2025-12-30 19:14:19'),
(220, '5010400000', 'Personnel Benefits', 'Personnel Services', 'Retirement and life insurance, etc.', NULL, 1, '2025-12-30 19:14:19'),
(221, '5010500000', 'Other Personnel Benefits', 'Personnel Services', 'Terminal leave benefits, etc.', NULL, 1, '2025-12-30 19:14:19'),
(222, '5020000000', 'Traveling Expenses', 'MOOE', 'Traveling expenses - local and foreign', NULL, 1, '2025-12-30 19:14:19'),
(223, '5020100000', 'Training and Scholarship Expenses', 'MOOE', 'Training expenses, scholarship grants, etc.', NULL, 1, '2025-12-30 19:14:19'),
(224, '5020200000', 'Supplies and Materials Expenses', 'MOOE', 'Office supplies, accountable forms, etc.', NULL, 1, '2025-12-30 19:14:19'),
(225, '5020300000', 'Utility Expenses', 'MOOE', 'Water, electricity, gas, etc.', NULL, 1, '2025-12-30 19:14:19'),
(226, '5020400000', 'Communication Expenses', 'MOOE', 'Telephone, internet, postage, etc.', NULL, 1, '2025-12-30 19:14:19'),
(227, '5020500000', 'Awards/Rewards and Prizes', 'MOOE', 'Awards and incentives', NULL, 1, '2025-12-30 19:14:19'),
(228, '5020600000', 'Survey, Research, Exploration', 'MOOE', 'Survey and research activities', NULL, 1, '2025-12-30 19:14:19'),
(229, '5020700000', 'Demolition and Relocation', 'MOOE', 'Demolition and relocation expenses', NULL, 1, '2025-12-30 19:14:19'),
(230, '5020800000', 'Generation, Transmission and Distribution', 'MOOE', 'Utilities generation and distribution', NULL, 1, '2025-12-30 19:14:19'),
(231, '5020900000', 'Confidential, Intelligence and Extraordinary Expenses', 'MOOE', 'Confidential and extraordinary expenses', NULL, 1, '2025-12-30 19:14:19'),
(232, '5021000000', 'Professional Services', 'MOOE', 'Consultancy, legal, auditing services, etc.', NULL, 1, '2025-12-30 19:14:19'),
(233, '5021100000', 'General Services', 'MOOE', 'Janitorial, security, etc.', NULL, 1, '2025-12-30 19:14:19'),
(234, '5021200000', 'Repairs and Maintenance', 'MOOE', 'Repairs and maintenance expenses', NULL, 1, '2025-12-30 19:14:19'),
(235, '5021300000', 'Financial Assistance/Subsidy to GOCCs', 'MOOE', 'Subsidy to government corporations', NULL, 1, '2025-12-30 19:14:19'),
(236, '5021400000', 'Taxes, Duties and Licenses', 'MOOE', 'Taxes, insurance premiums, fidelity bonds', NULL, 1, '2025-12-30 19:14:19'),
(237, '5021500000', 'Fidelity Bond Premiums', 'MOOE', 'Fidelity bond insurance', NULL, 1, '2025-12-30 19:14:19'),
(238, '5021600000', 'Insurance Expenses', 'MOOE', 'Insurance premiums', NULL, 1, '2025-12-30 19:14:19'),
(239, '5021700000', 'Advertising, Promotional and Marketing Expense', 'MOOE', 'Advertising and promotions', NULL, 1, '2025-12-30 19:14:19'),
(240, '5021800000', 'Printing and Publication Expenses', 'MOOE', 'Printing of reports, IEC materials, etc.', NULL, 1, '2025-12-30 19:14:19'),
(241, '5021900000', 'Representation Expenses', 'MOOE', 'Representation and entertainment', NULL, 1, '2025-12-30 19:14:19'),
(242, '5022000000', 'Transportation and Delivery Expenses', 'MOOE', 'Freight, handling, etc.', NULL, 1, '2025-12-30 19:14:19'),
(243, '5022100000', 'Rent/Lease Expenses', 'MOOE', 'Rent of buildings, equipment, etc.', NULL, 1, '2025-12-30 19:14:19'),
(244, '5022200000', 'Membership Dues and Contributions', 'MOOE', 'Membership fees and contributions', NULL, 1, '2025-12-30 19:14:19'),
(245, '5022300000', 'Subscription Expenses', 'MOOE', 'Newspapers, magazines, journals', NULL, 1, '2025-12-30 19:14:19'),
(246, '5022400000', 'Donations', 'MOOE', 'Charitable donations', NULL, 1, '2025-12-30 19:14:19'),
(247, '5060000000', 'Property, Plant and Equipment Outlay', 'Capital Outlay', 'Purchase of PPE', NULL, 1, '2025-12-30 19:14:19'),
(248, '5060100000', 'Land', 'Capital Outlay', 'Land acquisition', NULL, 1, '2025-12-30 19:14:19'),
(249, '5060200000', 'Buildings and Other Structures', 'Capital Outlay', 'Building construction and improvement', NULL, 1, '2025-12-30 19:14:19'),
(250, '5060300000', 'Machinery and Equipment', 'Capital Outlay', 'Machinery and equipment', NULL, 1, '2025-12-30 19:14:19'),
(251, '5060400000', 'Transportation Equipment', 'Capital Outlay', 'Vehicles and transportation equipment', NULL, 1, '2025-12-30 19:14:19'),
(252, '5060500000', 'Furniture, Fixtures and Books', 'Capital Outlay', 'Furniture, fixtures and library books', NULL, 1, '2025-12-30 19:14:19'),
(253, '5060600000', 'Semi-Expendable Machinery and Equipment', 'Capital Outlay', 'Semi-expendable property', NULL, 1, '2025-12-30 19:14:19'),
(254, '5030000000', 'Subsidies', 'Financial Assistance', 'Subsidies to individuals and organizations', NULL, 1, '2025-12-30 19:14:19'),
(255, '5030100000', 'Subsidies - Others', 'Financial Assistance', 'Other subsidies', NULL, 1, '2025-12-30 19:14:19'),
(256, '5030200000', 'Assistance to Individuals', 'Financial Assistance', 'Financial assistance to individuals', NULL, 1, '2025-12-30 19:14:19'),
(257, '5030300000', 'Assistance to LGUs', 'Financial Assistance', 'Assistance to local government units', NULL, 1, '2025-12-30 19:14:19'),
(258, '5030400000', 'Assistance to NGOs/POs', 'Financial Assistance', 'Assistance to civil society organizations', NULL, 1, '2025-12-30 19:14:19');

-- --------------------------------------------------------

--
-- Table structure for table `official_receipt_series`
--

CREATE TABLE `official_receipt_series` (
  `id` int(11) NOT NULL,
  `series_code` varchar(20) NOT NULL,
  `start_number` int(11) NOT NULL,
  `end_number` int(11) NOT NULL,
  `current_number` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `dv_id` int(11) NOT NULL,
  `payment_type` enum('check_mds','check_commercial','ada','cash') NOT NULL,
  `payment_date` datetime NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `check_no` varchar(50) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `bank_account_no` varchar(50) DEFAULT NULL,
  `ada_reference` varchar(100) DEFAULT NULL,
  `ada_issued_date` datetime DEFAULT NULL,
  `status` enum('pending','issued','cleared','cancelled','stale') DEFAULT 'pending',
  `cleared_date` datetime DEFAULT NULL,
  `received_by` varchar(255) DEFAULT NULL,
  `received_date` datetime DEFAULT NULL,
  `or_no` varchar(50) DEFAULT NULL,
  `or_date` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `dv_id`, `payment_type`, `payment_date`, `amount`, `check_no`, `bank_name`, `bank_account_no`, `ada_reference`, `ada_issued_date`, `status`, `cleared_date`, `received_by`, `received_date`, `or_no`, `or_date`, `remarks`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'ada', '2025-12-31 00:00:00', 20000.00, NULL, NULL, NULL, '6666', NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, 1, '2025-12-31 07:32:14', '2025-12-31 07:32:14'),
(2, 2, 'ada', '2025-12-31 00:00:00', 60000.00, NULL, NULL, NULL, '', NULL, 'issued', NULL, 'kkk', '2025-12-31 09:15:52', NULL, NULL, NULL, 1, '2025-12-31 07:33:01', '2025-12-31 01:15:53'),
(3, 3, 'check_mds', '2025-12-31 00:00:00', 2222222.00, '2025-01-000001', 'dad', '2asda22', NULL, NULL, 'issued', NULL, 'asdas', '2025-12-31 09:20:47', 'f2222', NULL, NULL, 1, '2025-12-31 09:20:16', '2025-12-31 01:20:47'),
(4, 4, 'ada', '2026-01-02 00:00:00', 2222.00, NULL, NULL, NULL, 'asdas', '2026-01-02 00:00:00', 'issued', NULL, 'asd', '2026-01-02 09:48:53', 'asd', NULL, NULL, 1, '2026-01-02 09:48:39', '2026-01-02 01:48:53');

-- --------------------------------------------------------

--
-- Table structure for table `payroll_adjustments`
--

CREATE TABLE `payroll_adjustments` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `adjustment_type` enum('Salary Increase','Step Increment','Retroactive Pay','Correction','Other') NOT NULL,
  `adjustment_name` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `is_addition` tinyint(1) DEFAULT 1,
  `effective_date` date NOT NULL,
  `applied_in_period` varchar(50) DEFAULT NULL,
  `status` enum('Pending','Applied','Cancelled') DEFAULT 'Pending',
  `remarks` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_periods`
--

CREATE TABLE `payroll_periods` (
  `id` int(11) NOT NULL,
  `period_no` varchar(50) NOT NULL,
  `period_name` varchar(100) DEFAULT NULL,
  `period_type` enum('Regular','Special','13th Month','Mid-Year Bonus') DEFAULT 'Regular',
  `month` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `pay_date` date NOT NULL,
  `status` enum('Draft','Processing','Completed','Posted','Cancelled') DEFAULT 'Draft',
  `total_employees` int(11) DEFAULT 0,
  `total_gross_pay` decimal(15,2) DEFAULT NULL,
  `total_deductions` decimal(15,2) DEFAULT NULL,
  `total_net_pay` decimal(15,2) DEFAULT NULL,
  `processed_by` int(11) DEFAULT NULL,
  `processed_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `remarks` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_transactions`
--

CREATE TABLE `payroll_transactions` (
  `id` int(11) NOT NULL,
  `payroll_period_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `basic_salary` decimal(15,2) NOT NULL,
  `pera` decimal(10,2) DEFAULT 0.00,
  `additional_allowance` decimal(10,2) DEFAULT 0.00,
  `overtime` decimal(10,2) DEFAULT 0.00,
  `other_earnings` decimal(10,2) DEFAULT 0.00,
  `gross_pay` decimal(15,2) NOT NULL,
  `gsis_contribution` decimal(10,2) DEFAULT 0.00,
  `philhealth_contribution` decimal(10,2) DEFAULT 0.00,
  `pagibig_contribution` decimal(10,2) DEFAULT 0.00,
  `withholding_tax` decimal(10,2) DEFAULT 0.00,
  `gsis_loan` decimal(10,2) DEFAULT 0.00,
  `pagibig_loan` decimal(10,2) DEFAULT 0.00,
  `salary_loan` decimal(10,2) DEFAULT 0.00,
  `other_deductions` decimal(10,2) DEFAULT 0.00,
  `total_deductions` decimal(15,2) NOT NULL,
  `net_pay` decimal(15,2) NOT NULL,
  `payment_status` enum('Pending','Paid') DEFAULT 'Pending',
  `payment_date` date DEFAULT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `petty_cash_funds`
--

CREATE TABLE `petty_cash_funds` (
  `id` int(11) NOT NULL,
  `fund_code` varchar(50) NOT NULL,
  `fund_name` varchar(255) NOT NULL,
  `custodian` varchar(255) NOT NULL,
  `custodian_employee_id` int(11) DEFAULT NULL,
  `fund_amount` decimal(15,2) NOT NULL,
  `current_balance` decimal(15,2) NOT NULL,
  `replenishment_threshold` decimal(15,2) DEFAULT NULL,
  `fund_cluster_id` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `petty_cash_transactions`
--

CREATE TABLE `petty_cash_transactions` (
  `id` int(11) NOT NULL,
  `petty_cash_fund_id` int(11) NOT NULL,
  `transaction_type` enum('disbursement','replenishment') NOT NULL,
  `transaction_date` datetime NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `purpose` text DEFAULT NULL,
  `or_no` varchar(50) DEFAULT NULL,
  `payee` varchar(255) DEFAULT NULL,
  `dv_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `registry_allotments`
--

CREATE TABLE `registry_allotments` (
  `id` int(11) NOT NULL,
  `appropriation_id` int(11) NOT NULL,
  `object_of_expenditure_id` int(11) NOT NULL,
  `mfo_pap_id` int(11) DEFAULT NULL,
  `allotment_class` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `purpose` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `registry_allotments`
--

INSERT INTO `registry_allotments` (`id`, `appropriation_id`, `object_of_expenditure_id`, `mfo_pap_id`, `allotment_class`, `amount`, `purpose`, `created_at`, `updated_at`) VALUES
(1, 1, 216, NULL, 'MOOE', 500000.00, 'Sample', '2025-12-30 11:27:43', '2025-12-30 11:27:43'),
(2, 4, 231, NULL, 'MOOE', 3000.00, 'hhhh', '2026-01-02 01:46:58', '2026-01-02 01:46:58');

-- --------------------------------------------------------

--
-- Table structure for table `registry_appropriations`
--

CREATE TABLE `registry_appropriations` (
  `id` int(11) NOT NULL,
  `fund_cluster_id` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `reference` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `registry_appropriations`
--

INSERT INTO `registry_appropriations` (`id`, `fund_cluster_id`, `year`, `reference`, `description`, `amount`, `created_at`, `updated_at`) VALUES
(1, 1, 2025, 'GAA 2025', 'asdada', 21000000.00, '2025-12-30 10:51:50', '2025-12-30 10:51:50'),
(2, 1, 2024, 'GAA 2024', 'GAA 2024', 10000.00, '2025-12-30 10:59:12', '2025-12-30 10:59:12'),
(3, 1, 2025, 'GAA 2025', 'gvhgh', 2222.00, '2026-01-02 01:46:06', '2026-01-02 01:46:06'),
(4, 1, 2026, 'jj999', 'dfvghjkl;', 60000.30, '2026-01-02 01:46:35', '2026-01-02 01:46:35');

-- --------------------------------------------------------

--
-- Table structure for table `registry_obligations`
--

CREATE TABLE `registry_obligations` (
  `id` int(11) NOT NULL,
  `allotment_id` int(11) NOT NULL,
  `payee` varchar(255) NOT NULL,
  `particulars` text NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `ors_number` varchar(50) DEFAULT NULL,
  `burs_number` varchar(50) DEFAULT NULL,
  `obligation_date` datetime NOT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `remarks` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `registry_obligations`
--

INSERT INTO `registry_obligations` (`id`, `allotment_id`, `payee`, `particulars`, `amount`, `ors_number`, `burs_number`, `obligation_date`, `status`, `remarks`, `created_by`, `approved_by`, `approved_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'raf', 'asdasd', 22222.00, 'or2', 'asd', '2025-12-30 00:00:00', 'approved', NULL, 1, 1, '2025-12-30 19:39:04', '2025-12-30 11:38:16', '2025-12-30 11:39:04'),
(2, 1, 'asd', 'asdas', 200000.00, 'ORS-222', '22111', '2025-12-31 00:00:00', 'approved', NULL, 1, 1, '2025-12-31 05:17:52', '2025-12-30 21:14:00', '2025-12-30 21:17:52'),
(3, 1, 'asd', 'ads', 1.00, '2025-asdas22', 'asdas', '2025-12-31 00:00:00', 'pending', NULL, 1, NULL, NULL, '2025-12-30 21:16:04', '2025-12-30 21:16:04');

-- --------------------------------------------------------

--
-- Table structure for table `remittances`
--

CREATE TABLE `remittances` (
  `id` int(11) NOT NULL,
  `remittance_no` varchar(50) NOT NULL,
  `payroll_period_id` int(11) NOT NULL,
  `remittance_type` enum('GSIS','PhilHealth','Pag-IBIG','BIR') NOT NULL,
  `month` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `employee_share` decimal(15,2) NOT NULL,
  `employer_share` decimal(15,2) NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `due_date` date NOT NULL,
  `payment_date` date DEFAULT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `payment_status` enum('Pending','Paid') DEFAULT 'Pending',
  `remarks` text DEFAULT NULL,
  `processed_by` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `revenue_entries`
--

CREATE TABLE `revenue_entries` (
  `id` int(11) NOT NULL,
  `entry_no` varchar(50) NOT NULL,
  `revenue_source_id` int(11) NOT NULL,
  `fund_cluster_id` int(11) NOT NULL,
  `entry_date` datetime NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payor_name` varchar(255) DEFAULT NULL,
  `particulars` text DEFAULT NULL,
  `fiscal_year` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `revenue_sources`
--

CREATE TABLE `revenue_sources` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `display_name`, `description`, `permissions`, `created_at`, `updated_at`) VALUES
(1, 'administrator', 'Administrator', 'Full system access', '\"{\\\"all\\\":true}\"', '2025-12-30 17:38:09', '2025-12-30 17:38:09'),
(2, 'director', 'Director', 'Final approval authority', '\"{\\\"disbursements\\\":[\\\"read\\\",\\\"approve\\\"]}\"', '2025-12-30 17:38:09', '2025-12-30 17:38:09'),
(3, 'accountant', 'Accountant', 'Budget and accounting operations', '\"{\\\"disbursements\\\":[\\\"create\\\",\\\"read\\\",\\\"update\\\",\\\"approve\\\"]}\"', '2025-12-30 17:38:09', '2025-12-30 17:38:09'),
(4, 'budget_officer', 'Budget Officer', 'Budget tracking', '\"{\\\"budget\\\":[\\\"create\\\",\\\"read\\\",\\\"update\\\"]}\"', '2025-12-30 17:38:09', '2025-12-30 17:38:09'),
(5, 'cashier', 'Cashier', 'Payment processing', '\"{\\\"payments\\\":[\\\"create\\\",\\\"read\\\",\\\"update\\\"]}\"', '2025-12-30 17:38:09', '2025-12-30 17:38:09'),
(6, 'division_staff', 'Division Staff', 'DV creation', '\"{\\\"disbursements\\\":[\\\"create\\\",\\\"read\\\"]}\"', '2025-12-30 17:38:09', '2025-12-30 17:38:09');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expires_at` datetime NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`id`, `user_id`, `expires_at`, `ip_address`, `user_agent`, `created_at`) VALUES
('36lw5xraab3xkwuhglakprbyqnhamy6w3fm2quly', 1, '2026-02-02 04:00:58', NULL, NULL, '2026-01-03 04:00:58'),
('7gr6c7ksx5lwgvpwrvvnayndsdmqprxuvorbhg2k', 1, '2026-02-02 03:05:12', NULL, NULL, '2026-01-03 03:05:12'),
('htk7bjr4gmjdwjqztniyzdwjhmckadnqt3fbsus6', 1, '2026-02-02 02:23:44', NULL, NULL, '2026-01-03 02:23:44'),
('jtnqrevamxmtqkzxvpxss3e6keiqhbkhj3ep5rtx', 1, '2026-01-29 17:51:57', NULL, NULL, '2025-12-30 17:51:57'),
('mwglnu2cd42m72ee25syupsecx7u3ft47njtlgoo', 1, '2026-02-02 02:56:47', NULL, NULL, '2026-01-03 02:56:47'),
('xvqibbgjegzg6cvpos5wbxypclyeob7hqvzyowwq', 1, '2026-02-01 10:13:33', NULL, NULL, '2026-01-02 10:13:33');

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `setting_type` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_editable` tinyint(1) DEFAULT 1,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `setting_type`, `description`, `is_editable`, `updated_by`, `updated_at`) VALUES
(1, 'dv_serial_current', '0', NULL, 'Current DV serial number', 1, NULL, '2025-12-30 17:42:31'),
(2, 'agency_name', 'Government Agency', NULL, 'Agency name', 1, NULL, '2025-12-30 17:42:31');

-- --------------------------------------------------------

--
-- Table structure for table `thirteenth_month_pay`
--

CREATE TABLE `thirteenth_month_pay` (
  `id` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `total_basic_salary` decimal(15,2) NOT NULL,
  `months_worked` decimal(5,2) NOT NULL,
  `thirteenth_month_amount` decimal(15,2) NOT NULL,
  `withholding_tax` decimal(10,2) DEFAULT 0.00,
  `net_amount` decimal(15,2) NOT NULL,
  `payment_date` date DEFAULT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `processed_by` int(11) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `payment_status` enum('Pending','Paid','Cancelled') DEFAULT 'Pending',
  `remarks` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `employee_no` varchar(50) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `division_office` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `employee_no`, `username`, `email`, `password_hash`, `first_name`, `last_name`, `middle_name`, `position`, `division_office`, `is_active`, `last_login_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, '', 'admin', 'admin@agency.gov.ph', '$2b$10$eCvcSOP8tn9jRiyy7ja/bu00yMQNVnPshWyfdMRlw/XkBE5Q9X2Ha', 'System', 'Administrator', NULL, NULL, NULL, 1, '2026-01-03 04:00:58', '2025-12-30 17:42:31', '2026-01-03 04:00:58', NULL),
(8, 'dir', 'dir', 'dir@gmail.com', '$2b$10$PwsvtD00Zjq9YWNXco7evOnARJOyhCSPhI5o5FyG.Ua1wTFg0G4JW', 'dir', 'dir', NULL, 'dir', 'it', 1, '2026-01-02 10:07:14', '2026-01-02 10:06:55', '2026-01-02 10:07:14', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `assigned_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `assigned_at`, `assigned_by`) VALUES
(1, 1, 1, '2025-12-30 17:42:31', NULL),
(2, 1, 1, '2025-12-30 17:49:36', NULL),
(3, 1, 1, '2025-12-30 18:32:52', NULL),
(4, 1, 1, '2025-12-30 19:06:05', NULL),
(5, 1, 1, '2025-12-30 19:11:58', NULL),
(6, 8, 2, '2026-01-02 10:06:55', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `__drizzle_migrations`
--

CREATE TABLE `__drizzle_migrations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `hash` text NOT NULL,
  `created_at` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts_receivable`
--
ALTER TABLE `accounts_receivable`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `accounts_receivable_ar_no_unique` (`ar_no`);

--
-- Indexes for table `approval_workflows`
--
ALTER TABLE `approval_workflows`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `asset_categories`
--
ALTER TABLE `asset_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `asset_categories_code_unique` (`code`);

--
-- Indexes for table `attachments`
--
ALTER TABLE `attachments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bank_accounts`
--
ALTER TABLE `bank_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `bank_accounts_account_number_unique` (`account_number`);

--
-- Indexes for table `bank_deposits`
--
ALTER TABLE `bank_deposits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `bank_deposits_deposit_slip_no_unique` (`deposit_slip_no`);

--
-- Indexes for table `bank_reconciliations`
--
ALTER TABLE `bank_reconciliations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `cash_advances`
--
ALTER TABLE `cash_advances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ca_no` (`ca_no`),
  ADD KEY `idx_employee` (`employee_id`),
  ADD KEY `idx_fund_cluster` (`fund_cluster_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_dv` (`dv_id`);

--
-- Indexes for table `cash_receipts`
--
ALTER TABLE `cash_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cash_receipts_or_no_unique` (`or_no`),
  ADD KEY `idx_cash_receipts_deposit` (`bank_deposit_id`);

--
-- Indexes for table `certificate_travel_completed`
--
ALTER TABLE `certificate_travel_completed`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `certificate_travel_completed_ctc_no_unique` (`ctc_no`);

--
-- Indexes for table `check_disbursement_records`
--
ALTER TABLE `check_disbursement_records`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `collections`
--
ALTER TABLE `collections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `collections_collection_no_unique` (`collection_no`);

--
-- Indexes for table `daily_cash_position`
--
ALTER TABLE `daily_cash_position`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_date_fund_cluster` (`report_date`,`fund_cluster_id`),
  ADD KEY `idx_report_date` (`report_date`);

--
-- Indexes for table `depreciation_schedule`
--
ALTER TABLE `depreciation_schedule`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `disbursement_vouchers`
--
ALTER TABLE `disbursement_vouchers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `disbursement_vouchers_dv_no_unique` (`dv_no`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `employee_no` (`employee_no`);

--
-- Indexes for table `employee_deductions`
--
ALTER TABLE `employee_deductions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `fixed_assets`
--
ALTER TABLE `fixed_assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `fixed_assets_asset_no_unique` (`asset_no`);

--
-- Indexes for table `fund_clusters`
--
ALTER TABLE `fund_clusters`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `fund_clusters_code_unique` (`code`);

--
-- Indexes for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `inventory_items_item_code_unique` (`item_code`);

--
-- Indexes for table `itinerary_of_travel`
--
ALTER TABLE `itinerary_of_travel`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `itinerary_of_travel_iot_no_unique` (`iot_no`);

--
-- Indexes for table `liquidation_expense_items`
--
ALTER TABLE `liquidation_expense_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `liquidation_reports`
--
ALTER TABLE `liquidation_reports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `liquidation_reports_lr_no_unique` (`lr_no`);

--
-- Indexes for table `mfo_pap`
--
ALTER TABLE `mfo_pap`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `mfo_pap_code_unique` (`code`);

--
-- Indexes for table `object_of_expenditure`
--
ALTER TABLE `object_of_expenditure`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `object_of_expenditure_code_unique` (`code`);

--
-- Indexes for table `official_receipt_series`
--
ALTER TABLE `official_receipt_series`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `official_receipt_series_series_code_unique` (`series_code`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payroll_adjustments`
--
ALTER TABLE `payroll_adjustments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `payroll_periods`
--
ALTER TABLE `payroll_periods`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `period_no` (`period_no`);

--
-- Indexes for table `payroll_transactions`
--
ALTER TABLE `payroll_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `payroll_period_id` (`payroll_period_id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `petty_cash_funds`
--
ALTER TABLE `petty_cash_funds`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `fund_code` (`fund_code`),
  ADD KEY `idx_fund_cluster` (`fund_cluster_id`),
  ADD KEY `idx_custodian_employee` (`custodian_employee_id`);

--
-- Indexes for table `petty_cash_transactions`
--
ALTER TABLE `petty_cash_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_petty_cash_fund` (`petty_cash_fund_id`),
  ADD KEY `idx_dv` (`dv_id`),
  ADD KEY `idx_transaction_date` (`transaction_date`);

--
-- Indexes for table `registry_allotments`
--
ALTER TABLE `registry_allotments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `appropriation_id` (`appropriation_id`),
  ADD KEY `object_of_expenditure_id` (`object_of_expenditure_id`),
  ADD KEY `mfo_pap_id` (`mfo_pap_id`);

--
-- Indexes for table `registry_appropriations`
--
ALTER TABLE `registry_appropriations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fund_cluster_id` (`fund_cluster_id`);

--
-- Indexes for table `registry_obligations`
--
ALTER TABLE `registry_obligations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `allotment_id` (`allotment_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `remittances`
--
ALTER TABLE `remittances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `remittance_no` (`remittance_no`),
  ADD KEY `payroll_period_id` (`payroll_period_id`);

--
-- Indexes for table `revenue_entries`
--
ALTER TABLE `revenue_entries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `revenue_entries_entry_no_unique` (`entry_no`);

--
-- Indexes for table `revenue_sources`
--
ALTER TABLE `revenue_sources`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `revenue_sources_code_unique` (`code`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `roles_name_unique` (`name`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `system_settings_setting_key_unique` (`setting_key`);

--
-- Indexes for table `thirteenth_month_pay`
--
ALTER TABLE `thirteenth_month_pay`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_employee_year` (`employee_id`,`year`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_employee_no_unique` (`employee_no`),
  ADD UNIQUE KEY `users_username_unique` (`username`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `__drizzle_migrations`
--
ALTER TABLE `__drizzle_migrations`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts_receivable`
--
ALTER TABLE `accounts_receivable`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `approval_workflows`
--
ALTER TABLE `approval_workflows`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `asset_categories`
--
ALTER TABLE `asset_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `attachments`
--
ALTER TABLE `attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `bank_accounts`
--
ALTER TABLE `bank_accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bank_deposits`
--
ALTER TABLE `bank_deposits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bank_reconciliations`
--
ALTER TABLE `bank_reconciliations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cash_advances`
--
ALTER TABLE `cash_advances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cash_receipts`
--
ALTER TABLE `cash_receipts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `certificate_travel_completed`
--
ALTER TABLE `certificate_travel_completed`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `check_disbursement_records`
--
ALTER TABLE `check_disbursement_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `collections`
--
ALTER TABLE `collections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daily_cash_position`
--
ALTER TABLE `daily_cash_position`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `depreciation_schedule`
--
ALTER TABLE `depreciation_schedule`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=265;

--
-- AUTO_INCREMENT for table `disbursement_vouchers`
--
ALTER TABLE `disbursement_vouchers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `employee_deductions`
--
ALTER TABLE `employee_deductions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fixed_assets`
--
ALTER TABLE `fixed_assets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `fund_clusters`
--
ALTER TABLE `fund_clusters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=85;

--
-- AUTO_INCREMENT for table `inventory_items`
--
ALTER TABLE `inventory_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `itinerary_of_travel`
--
ALTER TABLE `itinerary_of_travel`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `liquidation_expense_items`
--
ALTER TABLE `liquidation_expense_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `liquidation_reports`
--
ALTER TABLE `liquidation_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mfo_pap`
--
ALTER TABLE `mfo_pap`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `object_of_expenditure`
--
ALTER TABLE `object_of_expenditure`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=259;

--
-- AUTO_INCREMENT for table `official_receipt_series`
--
ALTER TABLE `official_receipt_series`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `payroll_adjustments`
--
ALTER TABLE `payroll_adjustments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payroll_periods`
--
ALTER TABLE `payroll_periods`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payroll_transactions`
--
ALTER TABLE `payroll_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `petty_cash_funds`
--
ALTER TABLE `petty_cash_funds`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `petty_cash_transactions`
--
ALTER TABLE `petty_cash_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `registry_allotments`
--
ALTER TABLE `registry_allotments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `registry_appropriations`
--
ALTER TABLE `registry_appropriations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `registry_obligations`
--
ALTER TABLE `registry_obligations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `remittances`
--
ALTER TABLE `remittances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `revenue_entries`
--
ALTER TABLE `revenue_entries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `revenue_sources`
--
ALTER TABLE `revenue_sources`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=73;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `thirteenth_month_pay`
--
ALTER TABLE `thirteenth_month_pay`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `__drizzle_migrations`
--
ALTER TABLE `__drizzle_migrations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cash_receipts`
--
ALTER TABLE `cash_receipts`
  ADD CONSTRAINT `fk_cash_receipts_deposit` FOREIGN KEY (`bank_deposit_id`) REFERENCES `bank_deposits` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employee_deductions`
--
ALTER TABLE `employee_deductions`
  ADD CONSTRAINT `employee_deductions_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payroll_adjustments`
--
ALTER TABLE `payroll_adjustments`
  ADD CONSTRAINT `payroll_adjustments_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payroll_transactions`
--
ALTER TABLE `payroll_transactions`
  ADD CONSTRAINT `payroll_transactions_ibfk_1` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payroll_transactions_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `registry_allotments`
--
ALTER TABLE `registry_allotments`
  ADD CONSTRAINT `registry_allotments_ibfk_1` FOREIGN KEY (`appropriation_id`) REFERENCES `registry_appropriations` (`id`),
  ADD CONSTRAINT `registry_allotments_ibfk_2` FOREIGN KEY (`object_of_expenditure_id`) REFERENCES `object_of_expenditure` (`id`),
  ADD CONSTRAINT `registry_allotments_ibfk_3` FOREIGN KEY (`mfo_pap_id`) REFERENCES `mfo_pap` (`id`);

--
-- Constraints for table `registry_appropriations`
--
ALTER TABLE `registry_appropriations`
  ADD CONSTRAINT `registry_appropriations_ibfk_1` FOREIGN KEY (`fund_cluster_id`) REFERENCES `fund_clusters` (`id`);

--
-- Constraints for table `registry_obligations`
--
ALTER TABLE `registry_obligations`
  ADD CONSTRAINT `registry_obligations_ibfk_1` FOREIGN KEY (`allotment_id`) REFERENCES `registry_allotments` (`id`),
  ADD CONSTRAINT `registry_obligations_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `registry_obligations_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `remittances`
--
ALTER TABLE `remittances`
  ADD CONSTRAINT `remittances_ibfk_1` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `thirteenth_month_pay`
--
ALTER TABLE `thirteenth_month_pay`
  ADD CONSTRAINT `thirteenth_month_pay_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
