import { db } from '../db/connection';
import { ncaRegistry, payments, disbursementVouchers, fundClusters } from '../db/schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { logAudit } from '../middleware/audit-logger';
import { ledgerService } from './ledger.service';

/**
 * Notices of Cash Allocation (NCA) — the cash authority DBM issues to an agency.
 * MDS checks and ADAs are drawn against it, so they may not exceed the NCAs received
 * for the fund cluster and year.
 *
 * The limit is enforced once at least one NCA is recorded for a fund cluster and year,
 * so agencies that have not started recording NCAs can keep paying while they set up.
 */

/** Payment types charged against the NCA (commercial checks use the agency's own bank account) */
const NCA_PAYMENT_TYPES = ['check_mds', 'ada'] as const;
/** Payments that still consume cash authority (cancelled and stale checks release it) */
const LIVE_PAYMENT_STATUSES = ['pending', 'issued', 'cleared'] as const;

export interface CreateNcaData {
  ncaNo: string;
  ncaDate: Date;
  fundClusterId: number;
  amount: number;
  mdsAccount?: string;
  purpose?: string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export class NcaService {
  async createNca(data: CreateNcaData, userId: number): Promise<{ id: number }> {
    const ncaNo = data.ncaNo.trim();
    if (!ncaNo) throw new Error('NCA number is required');
    if (!(data.amount > 0)) throw new Error('Amount must be greater than zero');

    const [existing] = await db.select({ id: ncaRegistry.id }).from(ncaRegistry).where(eq(ncaRegistry.ncaNo, ncaNo)).limit(1);
    if (existing) throw new Error(`NCA No. ${ncaNo} is already recorded`);

    const [result] = await db.insert(ncaRegistry).values({
      ncaNo,
      ncaDate: data.ncaDate,
      fiscalYear: data.ncaDate.getFullYear(),
      fundClusterId: data.fundClusterId,
      amount: data.amount.toFixed(2),
      mdsAccount: data.mdsAccount?.trim() || null,
      purpose: data.purpose?.trim() || null,
      createdBy: userId,
    });
    const id = Number(result.insertId);

    await logAudit({ userId, action: 'CREATE', tableName: 'nca_registry', recordId: id, newValues: { ...data, ncaNo } });
    await ledgerService.tryPost(`NCA ${ncaNo}`, () => ledgerService.postNca(id, userId));

    return { id };
  }

  async getNcas(filters: { fiscalYear?: number; fundClusterId?: number } = {}) {
    return db
      .select({
        id: ncaRegistry.id,
        ncaNo: ncaRegistry.ncaNo,
        ncaDate: ncaRegistry.ncaDate,
        fiscalYear: ncaRegistry.fiscalYear,
        amount: ncaRegistry.amount,
        mdsAccount: ncaRegistry.mdsAccount,
        purpose: ncaRegistry.purpose,
        fundClusterId: ncaRegistry.fundClusterId,
        fundClusterCode: fundClusters.code,
        fundClusterName: fundClusters.name,
      })
      .from(ncaRegistry)
      .leftJoin(fundClusters, eq(ncaRegistry.fundClusterId, fundClusters.id))
      .where(
        and(
          filters.fiscalYear ? eq(ncaRegistry.fiscalYear, filters.fiscalYear) : undefined,
          filters.fundClusterId ? eq(ncaRegistry.fundClusterId, filters.fundClusterId) : undefined
        )
      )
      .orderBy(desc(ncaRegistry.ncaDate));
  }

  /** Cash authority received, used by MDS checks and ADAs, and remaining */
  async getBalance(fundClusterId: number, fiscalYear: number) {
    const [received] = await db
      .select({ total: sql<string>`COALESCE(SUM(${ncaRegistry.amount}), 0)`, count: sql<number>`COUNT(*)` })
      .from(ncaRegistry)
      .where(and(eq(ncaRegistry.fundClusterId, fundClusterId), eq(ncaRegistry.fiscalYear, fiscalYear)));

    const [utilized] = await db
      .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id))
      .where(
        and(
          eq(disbursementVouchers.fundClusterId, fundClusterId),
          eq(disbursementVouchers.fiscalYear, fiscalYear),
          inArray(payments.paymentType, [...NCA_PAYMENT_TYPES]),
          inArray(payments.status, [...LIVE_PAYMENT_STATUSES])
        )
      );

    const receivedAmount = round2(parseFloat(received?.total ?? '0'));
    const utilizedAmount = round2(parseFloat(utilized?.total ?? '0'));
    return {
      received: receivedAmount,
      utilized: utilizedAmount,
      available: round2(receivedAmount - utilizedAmount),
      ncaCount: Number(received?.count ?? 0),
    };
  }

  /** Balances for every fund cluster that has an NCA or an NCA-funded payment in the year */
  async getBalances(fiscalYear: number) {
    const clusters = await db.select({ id: fundClusters.id, code: fundClusters.code, name: fundClusters.name }).from(fundClusters);
    const balances = await Promise.all(clusters.map(async c => ({ ...c, ...(await this.getBalance(c.id, fiscalYear)) })));
    return balances.filter(b => b.ncaCount > 0 || b.utilized > 0);
  }

  /** Throw if an MDS check / ADA of this amount would exceed the cash authority */
  async assertAvailable(fundClusterId: number, fiscalYear: number, amount: number): Promise<void> {
    const balance = await this.getBalance(fundClusterId, fiscalYear);
    if (balance.ncaCount === 0) return; // NCAs not yet tracked for this fund and year
    if (Math.round(amount * 100) > Math.round(balance.available * 100)) {
      const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
      throw new Error(
        `Not enough cash allocation: this payment needs ${peso(amount)} but only ${peso(balance.available)} of NCA remains for FY ${fiscalYear}. Record the NCA received from DBM first.`
      );
    }
  }
}

export const ncaService = new NcaService();
