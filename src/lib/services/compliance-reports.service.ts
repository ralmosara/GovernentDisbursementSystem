import { db } from '../db/connection';
import {
  disbursementVouchers,
  dvTaxWithholdings,
  payments,
  objectOfExpenditure,
  fundClusters,
  cashReceipts,
  bankDeposits,
  bankAccounts,
} from '../db/schema';
import { and, asc, eq, gte, inArray, isNull, lte, type SQL } from 'drizzle-orm';

/**
 * Statutory reports built from transactions already in the system:
 *  - BIR: taxes withheld by ATC (for 0619-E / 1601-EQ) and per payee per quarter (Form 2307)
 *  - COA: Report of Checks Issued (RCI), Report of ADA Issued (RADAI),
 *         Report of Collections and Deposits (RCD)
 */

const num = (value: string | number | null | undefined) => {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
};
const round2 = (value: number) => Math.round(value * 100) / 100;

export interface Period {
  from: Date;
  to: Date;
}

/** Calendar quarter containing a date, as a period */
export function quarterOf(year: number, quarter: number): Period {
  const startMonth = (quarter - 1) * 3;
  return { from: new Date(year, startMonth, 1), to: new Date(year, startMonth + 3, 0, 23, 59, 59) };
}

export class ComplianceReportsService {
  /** Every tax withheld on DVs whose liability is recognised (approved or paid) in the period */
  async getTaxesWithheld(period: Period, fundClusterId?: number) {
    const rows = await db
      .select({
        dvId: disbursementVouchers.id,
        dvNo: disbursementVouchers.dvNo,
        dvDate: disbursementVouchers.dvDate,
        payeeName: disbursementVouchers.payeeName,
        payeeTin: disbursementVouchers.payeeTin,
        payeeAddress: disbursementVouchers.payeeAddress,
        status: disbursementVouchers.status,
        taxType: dvTaxWithholdings.taxType,
        atc: dvTaxWithholdings.atc,
        description: dvTaxWithholdings.description,
        taxBase: dvTaxWithholdings.taxBase,
        rate: dvTaxWithholdings.rate,
        amount: dvTaxWithholdings.amount,
      })
      .from(dvTaxWithholdings)
      .innerJoin(disbursementVouchers, eq(dvTaxWithholdings.dvId, disbursementVouchers.id))
      .where(
        and(
          inArray(disbursementVouchers.status, ['approved', 'paid']),
          isNull(disbursementVouchers.deletedAt),
          gte(disbursementVouchers.dvDate, period.from),
          lte(disbursementVouchers.dvDate, period.to),
          fundClusterId ? eq(disbursementVouchers.fundClusterId, fundClusterId) : undefined
        )
      )
      .orderBy(asc(disbursementVouchers.dvDate), asc(disbursementVouchers.id), asc(dvTaxWithholdings.id));

    const details = rows.map(row => ({ ...row, taxBase: num(row.taxBase), rate: num(row.rate), amount: num(row.amount) }));

    // Summary by tax and ATC, as the returns are filed
    const byAtc = new Map<string, { taxType: string; atc: string | null; description: string; taxBase: number; amount: number; count: number }>();
    for (const row of details) {
      const key = `${row.taxType}|${row.atc ?? ''}`;
      const entry = byAtc.get(key) ?? { taxType: row.taxType, atc: row.atc, description: row.description, taxBase: 0, amount: 0, count: 0 };
      entry.taxBase = round2(entry.taxBase + row.taxBase);
      entry.amount = round2(entry.amount + row.amount);
      entry.count++;
      byAtc.set(key, entry);
    }

    return {
      details,
      summary: [...byAtc.values()].sort((a, b) => (a.atc ?? '').localeCompare(b.atc ?? '')),
      total: round2(details.reduce((sum, row) => sum + row.amount, 0)),
    };
  }

  /**
   * BIR Form 2307 data: per payee, the income payments and tax withheld in each month of
   * the quarter, by ATC. Only creditable expanded withholding tax goes on Form 2307; final
   * VAT and percentage tax withheld are certified on Form 2306 instead.
   */
  async getForm2307(year: number, quarter: number) {
    const period = quarterOf(year, quarter);
    const { details } = await this.getTaxesWithheld(period);
    const firstMonth = period.from.getMonth();

    const payees = new Map<string, {
      payeeName: string;
      payeeTin: string | null;
      payeeAddress: string | null;
      lines: Map<string, { atc: string; description: string; months: [number, number, number]; tax: number }>;
      totalIncome: number;
      totalTax: number;
    }>();

    for (const row of details.filter(r => r.taxType === 'ewt')) {
      const key = `${row.payeeName.trim().toLowerCase()}|${row.payeeTin ?? ''}`;
      const payee = payees.get(key) ?? {
        payeeName: row.payeeName,
        payeeTin: row.payeeTin,
        payeeAddress: row.payeeAddress,
        lines: new Map(),
        totalIncome: 0,
        totalTax: 0,
      };
      const atc = row.atc ?? '—';
      const line = payee.lines.get(atc) ?? { atc, description: row.description, months: [0, 0, 0] as [number, number, number], tax: 0 };
      const monthIndex = new Date(row.dvDate).getMonth() - firstMonth;
      if (monthIndex >= 0 && monthIndex < 3) line.months[monthIndex] = round2(line.months[monthIndex] + row.taxBase);
      line.tax = round2(line.tax + row.amount);
      payee.lines.set(atc, line);
      payee.totalIncome = round2(payee.totalIncome + row.taxBase);
      payee.totalTax = round2(payee.totalTax + row.amount);
      payees.set(key, payee);
    }

    const monthNames = [0, 1, 2].map(i => new Date(year, firstMonth + i, 1).toLocaleDateString('en-PH', { month: 'long' }));
    return {
      period,
      monthNames,
      payees: [...payees.values()]
        .map(p => ({ ...p, lines: [...p.lines.values()] }))
        .sort((a, b) => a.payeeName.localeCompare(b.payeeName)),
    };
  }

  /** Report of Checks Issued (RCI) or Report of ADA Issued (RADAI) */
  async getDisbursementsIssued(period: Period, kind: 'checks' | 'ada', fundClusterId?: number) {
    const types = kind === 'checks' ? (['check_mds', 'check_commercial'] as const) : (['ada'] as const);
    const conditions: (SQL | undefined)[] = [
      inArray(payments.paymentType, [...types]),
      inArray(payments.status, ['issued', 'cleared', 'stale', 'cancelled']),
      gte(payments.paymentDate, period.from),
      lte(payments.paymentDate, period.to),
      fundClusterId ? eq(disbursementVouchers.fundClusterId, fundClusterId) : undefined,
    ];

    const rows = await db
      .select({
        id: payments.id,
        paymentDate: payments.paymentDate,
        paymentType: payments.paymentType,
        checkNo: payments.checkNo,
        adaReference: payments.adaReference,
        amount: payments.amount,
        status: payments.status,
        dvId: disbursementVouchers.id,
        dvNo: disbursementVouchers.dvNo,
        orsBursNo: disbursementVouchers.orsBursNo,
        payeeName: disbursementVouchers.payeeName,
        particulars: disbursementVouchers.particulars,
        responsibilityCenter: disbursementVouchers.responsibilityCenter,
        uacsCode: objectOfExpenditure.code,
        fundClusterCode: fundClusters.code,
      })
      .from(payments)
      .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id))
      .leftJoin(objectOfExpenditure, eq(disbursementVouchers.objectExpenditureId, objectOfExpenditure.id))
      .leftJoin(fundClusters, eq(disbursementVouchers.fundClusterId, fundClusters.id))
      .where(and(...conditions))
      .orderBy(asc(payments.paymentDate), asc(payments.checkNo), asc(payments.id));

    const items = rows.map(row => ({ ...row, amount: num(row.amount) }));
    // Cancelled checks stay on the report (serials must be accounted for) but carry no amount
    const total = round2(items.filter(i => i.status !== 'cancelled').reduce((sum, i) => sum + i.amount, 0));
    return { items, total };
  }

  /** Report of Collections and Deposits (RCD) */
  async getCollectionsAndDeposits(period: Period, fundClusterId?: number) {
    const receipts = await db
      .select({
        id: cashReceipts.id,
        orNo: cashReceipts.orNo,
        receiptDate: cashReceipts.receiptDate,
        payorName: cashReceipts.payorName,
        particulars: cashReceipts.particulars,
        paymentMode: cashReceipts.paymentMode,
        amount: cashReceipts.amount,
        bankDepositId: cashReceipts.bankDepositId,
      })
      .from(cashReceipts)
      .where(
        and(
          gte(cashReceipts.receiptDate, period.from),
          lte(cashReceipts.receiptDate, period.to),
          fundClusterId ? eq(cashReceipts.fundClusterId, fundClusterId) : undefined
        )
      )
      .orderBy(asc(cashReceipts.receiptDate), asc(cashReceipts.orNo));

    const deposits = await db
      .select({
        id: bankDeposits.id,
        depositSlipNo: bankDeposits.depositSlipNo,
        depositDate: bankDeposits.depositDate,
        totalAmount: bankDeposits.totalAmount,
        status: bankDeposits.status,
        bankName: bankAccounts.bankName,
        accountNumber: bankAccounts.accountNumber,
      })
      .from(bankDeposits)
      .leftJoin(bankAccounts, eq(bankDeposits.bankAccountId, bankAccounts.id))
      .where(
        and(
          gte(bankDeposits.depositDate, period.from),
          lte(bankDeposits.depositDate, period.to),
          inArray(bankDeposits.status, ['pending', 'confirmed']),
          fundClusterId ? eq(bankAccounts.fundClusterId, fundClusterId) : undefined
        )
      )
      .orderBy(asc(bankDeposits.depositDate));

    const collectionItems = receipts.map(r => ({ ...r, amount: num(r.amount) }));
    const depositItems = deposits.map(d => ({ ...d, totalAmount: num(d.totalAmount) }));
    const totalCollections = round2(collectionItems.reduce((sum, r) => sum + r.amount, 0));
    const totalDeposits = round2(depositItems.reduce((sum, d) => sum + d.totalAmount, 0));
    const undeposited = round2(collectionItems.filter(r => !r.bankDepositId).reduce((sum, r) => sum + r.amount, 0));

    return { collections: collectionItems, deposits: depositItems, totalCollections, totalDeposits, undeposited };
  }
}

export const complianceReportsService = new ComplianceReportsService();
