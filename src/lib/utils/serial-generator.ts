import { db } from '../db/connection';
import { disbursementVouchers, payments, fundClusters, officialReceiptSeries, bankDeposits, cashAdvances, revenueEntries, accountsReceivable, collections, fixedAssets, inventoryItems, assetDisposals, inventoryTransactions, physicalInventoryCount, employees, payrollPeriods, remittances } from '../db/schema';
import { and, eq, like, desc, sql, isNotNull } from 'drizzle-orm';

/**
 * Generate DV serial number in format: 0000-00-0000 (Serial-Month-Year)
 * Serial resets at the beginning of each fiscal year
 *
 * @param fiscalYear - The fiscal year for this DV
 * @returns Promise<string> - The generated DV number (e.g., "0001-01-2024")
 */
export async function generateDVNumber(fiscalYear: number): Promise<string> {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = fiscalYear.toString();

  // Get the latest DV number for this fiscal year
  const latestDV = await db
    .select({
      dvNo: disbursementVouchers.dvNo,
    })
    .from(disbursementVouchers)
    .where(eq(disbursementVouchers.fiscalYear, fiscalYear))
    .orderBy(desc(disbursementVouchers.id))
    .limit(1);

  let nextSerial = 1;

  if (latestDV.length > 0) {
    // Extract serial number from format "0001-01-2024"
    const currentDvNo = latestDV[0].dvNo;
    const serialPart = currentDvNo.split('-')[0];
    const currentSerial = parseInt(serialPart, 10);
    nextSerial = currentSerial + 1;
  }

  // Format: Serial (4 digits) - Month (2 digits) - Year (4 digits)
  const dvNumber = `${nextSerial.toString().padStart(4, '0')}-${month}-${year}`;

  return dvNumber;
}

/**
 * Validate DV number format
 *
 * @param dvNo - The DV number to validate
 * @returns boolean - True if valid format
 */
export function validateDVNumber(dvNo: string): boolean {
  // Format: 0000-00-0000
  const pattern = /^\d{4}-\d{2}-\d{4}$/;
  return pattern.test(dvNo);
}

/**
 * Parse DV number to extract components
 *
 * @param dvNo - The DV number to parse
 * @returns Object containing serial, month, and year
 */
export function parseDVNumber(dvNo: string): {
  serial: number;
  month: number;
  year: number;
} | null {
  if (!validateDVNumber(dvNo)) {
    return null;
  }

  const parts = dvNo.split('-');
  return {
    serial: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    year: parseInt(parts[2], 10),
  };
}

/**
 * Check if a DV number already exists
 *
 * @param dvNo - The DV number to check
 * @returns Promise<boolean> - True if exists
 */
export async function dvNumberExists(dvNo: string): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(disbursementVouchers)
    .where(eq(disbursementVouchers.dvNo, dvNo));

  return result[0].count > 0;
}

/**
 * Generate check number in format: YYYY-FC-NNNNNN
 * Separate sequences for MDS checks vs commercial checks per fund cluster
 *
 * @param fiscalYear - The fiscal year
 * @param fundClusterId - The fund cluster ID
 * @param paymentType - The payment type (check_mds or check_commercial)
 * @returns Promise<string> - The generated check number
 */
export async function generateCheckNumber(
  fiscalYear: number,
  fundClusterId: number,
  paymentType: 'check_mds' | 'check_commercial'
): Promise<string> {
  // Get fund cluster code
  const fundCluster = await db
    .select({ code: fundClusters.code })
    .from(fundClusters)
    .where(eq(fundClusters.id, fundClusterId))
    .limit(1);

  const fcCode = fundCluster[0]?.code || '01';

  // Get latest check number for this fiscal year, fund cluster, and payment type
  const latestPayment = await db
    .select({ checkNo: payments.checkNo })
    .from(payments)
    .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id))
    .where(
      and(
        eq(disbursementVouchers.fiscalYear, fiscalYear),
        eq(disbursementVouchers.fundClusterId, fundClusterId),
        eq(payments.paymentType, paymentType),
        isNotNull(payments.checkNo)
      )
    )
    .orderBy(desc(payments.id))
    .limit(1);

  let nextSerial = 1;

  if (latestPayment.length > 0 && latestPayment[0].checkNo) {
    // Extract serial from format "2024-01-000001"
    const parts = latestPayment[0].checkNo.split('-');
    const currentSerial = parseInt(parts[parts.length - 1], 10);
    nextSerial = currentSerial + 1;
  }

  // Format: YYYY-FC-NNNNNN
  return `${fiscalYear}-${fcCode}-${nextSerial.toString().padStart(6, '0')}`;
}

/**
 * Generate JEV (Journal Entry Voucher) number
 * Format: YYYY-MM-NNNN
 *
 * @param fiscalYear - The fiscal year
 * @param month - The month (1-12)
 * @returns Promise<string> - The generated JEV number
 */
export async function generateJEVNumber(fiscalYear: number, month?: number): Promise<string> {
  const now = new Date();
  const jevMonth = month || (now.getMonth() + 1);
  const year = fiscalYear.toString();
  const monthStr = jevMonth.toString().padStart(2, '0');
  const serial = '0001'; // TODO: Implement auto-increment from journal entries table

  return `${year}-${monthStr}-${serial}`;
}

/**
 * Generate Official Receipt (OR) number from OR series
 * Format: SERIES-NNNNNN (e.g., "2024-000001")
 *
 * @param orSeriesId - The OR series ID
 * @returns Promise<string> - The generated OR number
 * @throws Error if series not found, inactive, or exhausted
 */
export async function generateORNumber(orSeriesId: number): Promise<string> {
  // Get OR series record
  const series = await db
    .select()
    .from(officialReceiptSeries)
    .where(eq(officialReceiptSeries.id, orSeriesId))
    .limit(1);

  if (!series[0]) {
    throw new Error('OR series not found');
  }

  // Check if series is active
  if (!series[0].isActive) {
    throw new Error('OR series is inactive');
  }

  // Check if series is exhausted
  if (series[0].currentNumber >= series[0].endNumber) {
    throw new Error('OR series exhausted. Please create a new series.');
  }

  // Increment current number
  const nextNumber = series[0].currentNumber + 1;

  // Format OR number: SERIES-NNNNNN
  const orNo = `${series[0].seriesCode}-${String(nextNumber).padStart(6, '0')}`;

  // Update series current number
  await db
    .update(officialReceiptSeries)
    .set({ currentNumber: nextNumber })
    .where(eq(officialReceiptSeries.id, orSeriesId));

  return orNo;
}

/**
 * Generate Deposit Slip number
 * Format: DS-YYYY-NNNN
 *
 * @returns Promise<string> - The generated deposit slip number
 */
export async function generateDepositSlipNumber(): Promise<string> {
  const year = new Date().getFullYear();

  // Get latest deposit for current year
  const latestDeposit = await db
    .select({ depositSlipNo: bankDeposits.depositSlipNo })
    .from(bankDeposits)
    .where(sql`YEAR(${bankDeposits.depositDate}) = ${year}`)
    .orderBy(desc(bankDeposits.id))
    .limit(1);

  let serial = 1;

  if (latestDeposit.length > 0 && latestDeposit[0].depositSlipNo) {
    // Extract serial from format DS-YYYY-NNNN
    const parts = latestDeposit[0].depositSlipNo.split('-');
    if (parts.length === 3) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }

  // Format: DS-YYYY-NNNN
  return `DS-${year}-${String(serial).padStart(4, '0')}`;
}

/**
 * Generate Cash Advance number
 * Format: CA-YYYY-NNNN
 *
 * @returns Promise<string> - The generated cash advance number
 */
export async function generateCANumber(): Promise<string> {
  const year = new Date().getFullYear();

  // Get latest cash advance for current year
  const latestCA = await db
    .select({ caNo: cashAdvances.caNo })
    .from(cashAdvances)
    .where(sql`YEAR(${cashAdvances.dateIssued}) = ${year}`)
    .orderBy(desc(cashAdvances.id))
    .limit(1);

  let serial = 1;

  if (latestCA.length > 0 && latestCA[0].caNo) {
    // Extract serial from format CA-YYYY-NNNN
    const parts = latestCA[0].caNo.split('-');
    if (parts.length === 3) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }

  // Format: CA-YYYY-NNNN
  return `CA-${year}-${String(serial).padStart(4, '0')}`;
}

/**
 * Generate Revenue Entry number in format: REV-YYYY-NNNN
 * Serial resets at the beginning of each year
 *
 * @returns Promise<string> - The generated entry number (e.g., "REV-2026-0001")
 */
export async function generateRevenueEntryNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const latestEntry = await db
    .select({ entryNo: revenueEntries.entryNo })
    .from(revenueEntries)
    .where(sql`YEAR(${revenueEntries.entryDate}) = ${year}`)
    .orderBy(desc(revenueEntries.id))
    .limit(1);

  let serial = 1;
  if (latestEntry.length > 0 && latestEntry[0].entryNo) {
    const parts = latestEntry[0].entryNo.split('-');
    if (parts.length === 3) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }

  return `REV-${year}-${String(serial).padStart(4, '0')}`;
}

/**
 * Generate Accounts Receivable number in format: AR-YYYY-NNNN
 * Serial resets at the beginning of each year
 *
 * @returns Promise<string> - The generated AR number (e.g., "AR-2026-0001")
 */
export async function generateARNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const latestAR = await db
    .select({ arNo: accountsReceivable.arNo })
    .from(accountsReceivable)
    .where(sql`YEAR(${accountsReceivable.invoiceDate}) = ${year}`)
    .orderBy(desc(accountsReceivable.id))
    .limit(1);

  let serial = 1;
  if (latestAR.length > 0 && latestAR[0].arNo) {
    const parts = latestAR[0].arNo.split('-');
    if (parts.length === 3) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }

  return `AR-${year}-${String(serial).padStart(4, '0')}`;
}

/**
 * Generate Collection number in format: COL-YYYY-NNNN
 * Serial resets at the beginning of each year
 *
 * @returns Promise<string> - The generated collection number (e.g., "COL-2026-0001")
 */
export async function generateCollectionNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const latestCollection = await db
    .select({ collectionNo: collections.collectionNo })
    .from(collections)
    .where(sql`YEAR(${collections.collectionDate}) = ${year}`)
    .orderBy(desc(collections.id))
    .limit(1);

  let serial = 1;
  if (latestCollection.length > 0 && latestCollection[0].collectionNo) {
    const parts = latestCollection[0].collectionNo.split('-');
    if (parts.length === 3) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }

  return `COL-${year}-${String(serial).padStart(4, '0')}`;
}

/**
 * Generate Fixed Asset number in format: ASSET-YYYY-NNNN
 * Serial resets at the beginning of each year
 *
 * @returns Promise<string> - The generated asset number (e.g., "ASSET-2026-0001")
 */
export async function generateAssetNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const latestAsset = await db
    .select({ assetNo: fixedAssets.assetNo })
    .from(fixedAssets)
    .where(sql`YEAR(${fixedAssets.acquisitionDate}) = ${year}`)
    .orderBy(desc(fixedAssets.id))
    .limit(1);

  let serial = 1;
  if (latestAsset.length > 0 && latestAsset[0].assetNo) {
    const parts = latestAsset[0].assetNo.split('-');
    if (parts.length === 3) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }

  return `ASSET-${year}-${String(serial).padStart(4, '0')}`;
}

/**
 * Generate Inventory Item code in format: INV-YYYY-NNNN
 * Serial resets at the beginning of each year
 *
 * @returns Promise<string> - The generated inventory code (e.g., "INV-2026-0001")
 */
export async function generateInventoryCode(): Promise<string> {
  const year = new Date().getFullYear();

  const latestItem = await db
    .select({ itemCode: inventoryItems.itemCode })
    .from(inventoryItems)
    .where(sql`${inventoryItems.itemCode} LIKE ${'INV-' + year + '-%'}`)
    .orderBy(desc(inventoryItems.id))
    .limit(1);

  let serial = 1;
  if (latestItem.length > 0 && latestItem[0].itemCode) {
    const parts = latestItem[0].itemCode.split('-');
    if (parts.length === 3) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }

  return `INV-${year}-${String(serial).padStart(4, '0')}`;
}

/**
 * Generate Disposal number in format: DSP-YYYY-NNNN
 * Serial resets at the beginning of each year
 *
 * @returns Promise<string> - The generated disposal number (e.g., "DSP-2026-0001")
 */
export async function generateDisposalNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const latestDisposal = await db
    .select({ disposalNo: assetDisposals.disposalNo })
    .from(assetDisposals)
    .where(sql`YEAR(${assetDisposals.disposalDate}) = ${year}`)
    .orderBy(desc(assetDisposals.id))
    .limit(1);

  let serial = 1;
  if (latestDisposal.length > 0 && latestDisposal[0].disposalNo) {
    const parts = latestDisposal[0].disposalNo.split('-');
    if (parts.length === 3) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }

  return `DSP-${year}-${String(serial).padStart(4, '0')}`;
}

/**
 * Generate Inventory Transaction number in format: INVT-YYYY-NNNN
 * Serial resets at the beginning of each year
 *
 * @returns Promise<string> - The generated transaction number (e.g., "INVT-2026-0001")
 */
export async function generateInventoryTransactionNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const latestTransaction = await db
    .select({ transactionNo: inventoryTransactions.transactionNo })
    .from(inventoryTransactions)
    .where(sql`YEAR(${inventoryTransactions.transactionDate}) = ${year}`)
    .orderBy(desc(inventoryTransactions.id))
    .limit(1);

  let serial = 1;
  if (latestTransaction.length > 0 && latestTransaction[0].transactionNo) {
    const parts = latestTransaction[0].transactionNo.split('-');
    if (parts.length === 3) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }

  return `INVT-${year}-${String(serial).padStart(4, '0')}`;
}

/**
 * Generate Physical Count number in format: PCOUNT-YYYY-NNNN
 * Serial resets at the beginning of each year
 *
 * @returns Promise<string> - The generated physical count number (e.g., "PCOUNT-2026-0001")
 */
export async function generatePhysicalCountNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const latestCount = await db
    .select({ countNo: physicalInventoryCount.countNo })
    .from(physicalInventoryCount)
    .where(sql`YEAR(${physicalInventoryCount.countDate}) = ${year}`)
    .orderBy(desc(physicalInventoryCount.id))
    .limit(1);

  let serial = 1;
  if (latestCount.length > 0 && latestCount[0].countNo) {
    const parts = latestCount[0].countNo.split('-');
    if (parts.length === 3) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }

  return `PCOUNT-${year}-${String(serial).padStart(4, '0')}`;
}

/**
 * Generate Employee number in format: EMP-YYYY-NNNN
 * Serial resets at the beginning of each year
 *
 * @returns Promise<string> - The generated employee number (e.g., "EMP-2026-0001")
 */
export async function generateEmployeeNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EMP-${year}-`;

  const latestEmployee = await db
    .select({ employeeNo: employees.employeeNo })
    .from(employees)
    .where(sql`${employees.employeeNo} LIKE ${prefix + '%'}`)
    .orderBy(desc(employees.id))
    .limit(1);

  let serial = 1;
  if (latestEmployee.length > 0 && latestEmployee[0].employeeNo) {
    const parts = latestEmployee[0].employeeNo.split('-');
    if (parts.length === 3) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }

  return `EMP-${year}-${String(serial).padStart(4, '0')}`;
}

/**
 * Generate Payroll Period number in format: PAY-YYYY-MM
 * Format uses year and month (no serial needed)
 *
 * @param year - The year (e.g., 2026)
 * @param month - The month (1-12)
 * @returns string - The generated period number (e.g., "PAY-2026-01")
 */
export function generatePayrollPeriodNumber(year: number, month: number): string {
  return `PAY-${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Generate Remittance number in format: REM-YYYY-NNNN
 * Serial resets at the beginning of each year
 *
 * @returns Promise<string> - The generated remittance number (e.g., "REM-2026-0001")
 */
export async function generateRemittanceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REM-${year}-`;

  const latestRemittance = await db
    .select({ remittanceNo: remittances.remittanceNo })
    .from(remittances)
    .where(sql`${remittances.remittanceNo} LIKE ${prefix + '%'}`)
    .orderBy(desc(remittances.id))
    .limit(1);

  let serial = 1;
  if (latestRemittance.length > 0 && latestRemittance[0].remittanceNo) {
    const parts = latestRemittance[0].remittanceNo.split('-');
    if (parts.length === 3) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }

  return `REM-${year}-${String(serial).padStart(4, '0')}`;
}
