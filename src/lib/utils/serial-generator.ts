import { db } from '../db/connection';
import { disbursementVouchers } from '../db/schema';
import { and, eq, like, desc, sql } from 'drizzle-orm';

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
 * Generate check number in format: YYYY-NNNN
 *
 * @param fiscalYear - The fiscal year
 * @returns Promise<string> - The generated check number
 */
export async function generateCheckNumber(fiscalYear: number): Promise<string> {
  // This will be implemented when we have the payments table populated
  // For now, return a placeholder format
  const year = fiscalYear.toString();
  const serial = '0001'; // TODO: Implement auto-increment from payments table

  return `${year}-${serial}`;
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
