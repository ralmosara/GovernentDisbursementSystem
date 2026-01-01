import { db } from '../db/connection';
import {
  cashReceipts,
  officialReceiptSeries,
  fundClusters,
  revenueSources,
  bankAccounts,
  bankDeposits,
  bankReconciliations,
  pettyCashFunds,
  pettyCashTransactions,
  cashAdvances,
  dailyCashPosition,
  disbursementVouchers,
  users,
} from '../db/schema';
import { eq, and, or, desc, sum, sql, isNotNull, isNull, gte, lte } from 'drizzle-orm';
import { generateORNumber, generateDepositSlipNumber, generateCANumber } from '../utils/serial-generator';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CreateCashReceiptData {
  orSeriesId: number;
  receiptDate: Date;
  payorName: string;
  amount: number;
  paymentMode: 'cash' | 'check' | 'online';
  checkNo?: string;
  checkDate?: Date;
  checkBank?: string;
  particulars: string;
  fundClusterId: number;
  revenueSourceId?: number;
}

export interface CreateBankDepositData {
  bankAccountId: number;
  depositDate: Date;
  receiptIds: number[];
  depositedBy: string;
}

export interface CreateReconciliationData {
  bankAccountId: number;
  reconciliationDate: Date;
  periodMonth: number;
  periodYear: number;
  bankBalance: number;
  bookBalance: number;
  outstandingChecks: any[];
  depositsInTransit: any[];
  bankCharges?: number;
  bankInterest?: number;
}

export interface CreatePettyCashFundData {
  fundCode: string;
  fundName: string;
  custodian: string;
  custodianEmployeeId?: number;
  fundAmount: number;
  replenishmentThreshold?: number;
  fundClusterId: number;
}

export interface PettyCashDisbursementData {
  transactionDate: Date;
  amount: number;
  purpose: string;
  orNo?: string;
  payee: string;
}

export interface DailyCashPositionData {
  reportDate: Date;
  fundClusterId: number;
  openingBalance: number;
  receipts: number;
  disbursements: number;
  closingBalance: number;
}

// ============================================
// CASH SERVICE CLASS
// ============================================

export class CashService {
  // ============================================
  // 1. OFFICIAL RECEIPT & CASH RECEIPT METHODS
  // ============================================

  /**
   * Create a new cash receipt with OR number
   */
  async createCashReceipt(data: CreateCashReceiptData, userId: number): Promise<{ id: number; orNo: string }> {
    try {
      // Generate OR number
      const orNo = await generateORNumber(data.orSeriesId);

      // Insert cash receipt
      const result = await db.insert(cashReceipts).values({
        orNo,
        orSeriesId: data.orSeriesId,
        receiptDate: data.receiptDate,
        payorName: data.payorName,
        amount: data.amount.toString(),
        paymentMode: data.paymentMode,
        checkNo: data.checkNo,
        checkDate: data.checkDate,
        checkBank: data.checkBank,
        particulars: data.particulars,
        fundClusterId: data.fundClusterId,
        revenueSourceId: data.revenueSourceId,
        createdBy: userId,
      });

      return {
        id: Number(result.insertId),
        orNo,
      };
    } catch (error) {
      throw new Error(`Failed to create cash receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cash receipts with filters
   */
  async getCashReceipts(filters: {
    startDate?: string;
    endDate?: string;
    fundClusterId?: number;
    paymentMode?: string;
    search?: string;
    limit?: number;
  }) {
    const conditions = [];

    if (filters.startDate) {
      conditions.push(gte(cashReceipts.receiptDate, new Date(filters.startDate)));
    }

    if (filters.endDate) {
      conditions.push(lte(cashReceipts.receiptDate, new Date(filters.endDate)));
    }

    if (filters.fundClusterId) {
      conditions.push(eq(cashReceipts.fundClusterId, filters.fundClusterId));
    }

    if (filters.paymentMode) {
      conditions.push(eq(cashReceipts.paymentMode, filters.paymentMode as any));
    }

    const query = db
      .select({
        id: cashReceipts.id,
        orNo: cashReceipts.orNo,
        receiptDate: cashReceipts.receiptDate,
        payorName: cashReceipts.payorName,
        amount: cashReceipts.amount,
        paymentMode: cashReceipts.paymentMode,
        checkNo: cashReceipts.checkNo,
        particulars: cashReceipts.particulars,
        fundCluster: {
          id: fundClusters.id,
          code: fundClusters.code,
          name: fundClusters.name,
        },
        revenueSource: {
          id: revenueSources.id,
          name: revenueSources.name,
        },
        createdBy: users.username,
        createdAt: cashReceipts.createdAt,
      })
      .from(cashReceipts)
      .leftJoin(fundClusters, eq(cashReceipts.fundClusterId, fundClusters.id))
      .leftJoin(revenueSources, eq(cashReceipts.revenueSourceId, revenueSources.id))
      .leftJoin(users, eq(cashReceipts.createdBy, users.id))
      .orderBy(desc(cashReceipts.receiptDate));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    if (filters.limit) {
      query.limit(filters.limit);
    }

    return await query;
  }

  /**
   * Get cash receipt by ID
   */
  async getCashReceiptById(id: number) {
    const result = await db
      .select({
        id: cashReceipts.id,
        orNo: cashReceipts.orNo,
        orSeriesId: cashReceipts.orSeriesId,
        receiptDate: cashReceipts.receiptDate,
        payorName: cashReceipts.payorName,
        amount: cashReceipts.amount,
        paymentMode: cashReceipts.paymentMode,
        checkNo: cashReceipts.checkNo,
        checkDate: cashReceipts.checkDate,
        checkBank: cashReceipts.checkBank,
        particulars: cashReceipts.particulars,
        fundClusterId: cashReceipts.fundClusterId,
        revenueSourceId: cashReceipts.revenueSourceId,
        fundCluster: {
          id: fundClusters.id,
          code: fundClusters.code,
          name: fundClusters.name,
        },
        revenueSource: {
          id: revenueSources.id,
          code: revenueSources.code,
          name: revenueSources.name,
        },
        createdBy: {
          id: users.id,
          username: users.username,
          fullName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        },
        createdAt: cashReceipts.createdAt,
      })
      .from(cashReceipts)
      .leftJoin(fundClusters, eq(cashReceipts.fundClusterId, fundClusters.id))
      .leftJoin(revenueSources, eq(cashReceipts.revenueSourceId, revenueSources.id))
      .leftJoin(users, eq(cashReceipts.createdBy, users.id))
      .where(eq(cashReceipts.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get today's receipts total
   */
  async getTodayReceiptsTotal(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db
      .select({
        total: sum(cashReceipts.amount).mapWith(Number),
      })
      .from(cashReceipts)
      .where(
        and(
          gte(cashReceipts.receiptDate, today),
          lte(cashReceipts.receiptDate, tomorrow)
        )
      );

    return result[0]?.total || 0;
  }

  // ============================================
  // 2. BANK DEPOSIT METHODS
  // ============================================

  /**
   * Create a new bank deposit
   */
  async createBankDeposit(data: CreateBankDepositData, userId: number): Promise<{ id: number; depositSlipNo: string }> {
    try {
      // Generate deposit slip number
      const depositSlipNo = await generateDepositSlipNumber();

      // Calculate total amount from receipts
      const receipts = await db
        .select({ amount: cashReceipts.amount })
        .from(cashReceipts)
        .where(sql`${cashReceipts.id} IN (${sql.join(data.receiptIds.map(id => sql`${id}`), sql`, `)})`);

      const totalAmount = receipts.reduce((sum, r) => sum + Number(r.amount), 0);

      // Insert bank deposit
      const result = await db.insert(bankDeposits).values({
        depositSlipNo,
        bankAccountId: data.bankAccountId,
        depositDate: data.depositDate,
        totalAmount: totalAmount.toString(),
        depositedBy: data.depositedBy,
        status: 'pending',
        createdBy: userId,
      });

      const depositId = Number(result.insertId);

      // Link receipts to this deposit
      await db
        .update(cashReceipts)
        .set({ bankDepositId: depositId })
        .where(sql`${cashReceipts.id} IN (${sql.join(data.receiptIds.map(id => sql`${id}`), sql`, `)})`);

      return {
        id: depositId,
        depositSlipNo,
      };
    } catch (error) {
      throw new Error(`Failed to create bank deposit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm a bank deposit
   */
  async confirmBankDeposit(depositId: number, userId: number): Promise<void> {
    await db
      .update(bankDeposits)
      .set({ status: 'confirmed' })
      .where(eq(bankDeposits.id, depositId));
  }

  /**
   * Get bank deposits with filters
   */
  async getBankDeposits(filters: {
    status?: string;
    bankAccountId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(bankDeposits.status, filters.status as any));
    }

    if (filters.bankAccountId) {
      conditions.push(eq(bankDeposits.bankAccountId, filters.bankAccountId));
    }

    if (filters.startDate) {
      conditions.push(gte(bankDeposits.depositDate, new Date(filters.startDate)));
    }

    if (filters.endDate) {
      conditions.push(lte(bankDeposits.depositDate, new Date(filters.endDate)));
    }

    const query = db
      .select({
        id: bankDeposits.id,
        depositSlipNo: bankDeposits.depositSlipNo,
        depositDate: bankDeposits.depositDate,
        totalAmount: bankDeposits.totalAmount,
        depositedBy: bankDeposits.depositedBy,
        status: bankDeposits.status,
        bankAccount: {
          id: bankAccounts.id,
          accountName: bankAccounts.accountName,
          accountNumber: bankAccounts.accountNumber,
          bankName: bankAccounts.bankName,
        },
        createdAt: bankDeposits.createdAt,
      })
      .from(bankDeposits)
      .leftJoin(bankAccounts, eq(bankDeposits.bankAccountId, bankAccounts.id))
      .orderBy(desc(bankDeposits.depositDate));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query;
  }

  /**
   * Get pending deposits count
   */
  async getPendingDepositsCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(bankDeposits)
      .where(eq(bankDeposits.status, 'pending'));

    return result[0]?.count || 0;
  }

  // ============================================
  // 3. BANK RECONCILIATION METHODS
  // ============================================

  /**
   * Create a new bank reconciliation
   */
  async createBankReconciliation(data: CreateReconciliationData, userId: number): Promise<{ id: number }> {
    try {
      // Calculate adjusted balances
      const outstandingChecksTotal = data.outstandingChecks.reduce((sum, check) => sum + check.amount, 0);
      const depositsInTransitTotal = data.depositsInTransit.reduce((sum, dep) => sum + dep.amount, 0);

      const adjustedBankBalance =
        data.bankBalance + depositsInTransitTotal - outstandingChecksTotal;

      const adjustedBookBalance =
        data.bookBalance + (data.bankInterest || 0) - (data.bankCharges || 0);

      // Insert reconciliation
      const result = await db.insert(bankReconciliations).values({
        bankAccountId: data.bankAccountId,
        reconciliationDate: data.reconciliationDate,
        periodMonth: data.periodMonth,
        periodYear: data.periodYear,
        bookBalance: data.bookBalance.toString(),
        bankBalance: data.bankBalance.toString(),
        outstandingChecks: data.outstandingChecks,
        depositsInTransit: data.depositsInTransit,
        bankCharges: data.bankCharges?.toString(),
        bankInterest: data.bankInterest?.toString(),
        adjustedBookBalance: adjustedBookBalance.toString(),
        adjustedBankBalance: adjustedBankBalance.toString(),
        status: 'draft',
        preparedBy: userId,
        preparedDate: new Date(),
      });

      return {
        id: Number(result.insertId),
      };
    } catch (error) {
      throw new Error(`Failed to create bank reconciliation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Complete a bank reconciliation
   */
  async completeBankReconciliation(id: number, userId: number): Promise<void> {
    await db
      .update(bankReconciliations)
      .set({ status: 'completed' })
      .where(eq(bankReconciliations.id, id));
  }

  /**
   * Get bank reconciliations with filters
   */
  async getBankReconciliations(filters: {
    bankAccountId?: number;
    month?: number;
    year?: number;
  }) {
    const conditions = [];

    if (filters.bankAccountId) {
      conditions.push(eq(bankReconciliations.bankAccountId, filters.bankAccountId));
    }

    if (filters.month) {
      conditions.push(eq(bankReconciliations.periodMonth, filters.month));
    }

    if (filters.year) {
      conditions.push(eq(bankReconciliations.periodYear, filters.year));
    }

    const query = db
      .select({
        id: bankReconciliations.id,
        reconciliationDate: bankReconciliations.reconciliationDate,
        periodMonth: bankReconciliations.periodMonth,
        periodYear: bankReconciliations.periodYear,
        bookBalance: bankReconciliations.bookBalance,
        bankBalance: bankReconciliations.bankBalance,
        adjustedBookBalance: bankReconciliations.adjustedBookBalance,
        adjustedBankBalance: bankReconciliations.adjustedBankBalance,
        status: bankReconciliations.status,
        bankAccount: {
          id: bankAccounts.id,
          accountName: bankAccounts.accountName,
          accountNumber: bankAccounts.accountNumber,
          bankName: bankAccounts.bankName,
        },
        preparedBy: users.username,
        preparedDate: bankReconciliations.preparedDate,
      })
      .from(bankReconciliations)
      .leftJoin(bankAccounts, eq(bankReconciliations.bankAccountId, bankAccounts.id))
      .leftJoin(users, eq(bankReconciliations.preparedBy, users.id))
      .orderBy(desc(bankReconciliations.reconciliationDate));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query;
  }

  /**
   * Get unreconciled months count
   */
  async getUnreconciledMonthsCount(): Promise<number> {
    // This is a simplified implementation
    // In production, you would check which months haven't been reconciled yet
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(bankReconciliations)
      .where(eq(bankReconciliations.status, 'draft'));

    return result[0]?.count || 0;
  }

  // ============================================
  // 4. CASH POSITION METHODS
  // ============================================

  /**
   * Calculate daily cash position for a specific date and fund cluster
   */
  async calculateDailyCashPosition(date: Date, fundClusterId: number): Promise<DailyCashPositionData> {
    // Get previous day's closing balance as opening balance
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);

    const prevPosition = await db
      .select({
        closingBalance: dailyCashPosition.closingBalance,
      })
      .from(dailyCashPosition)
      .where(
        and(
          eq(dailyCashPosition.reportDate, prevDate),
          eq(dailyCashPosition.fundClusterId, fundClusterId)
        )
      )
      .limit(1);

    const openingBalance = prevPosition[0]?.closingBalance ? Number(prevPosition[0].closingBalance) : 0;

    // Calculate receipts for the day
    const receiptsResult = await db
      .select({
        total: sum(cashReceipts.amount).mapWith(Number),
      })
      .from(cashReceipts)
      .where(
        and(
          eq(cashReceipts.fundClusterId, fundClusterId),
          sql`DATE(${cashReceipts.receiptDate}) = DATE(${date})`
        )
      );

    const receipts = receiptsResult[0]?.total || 0;

    // Calculate disbursements for the day
    const disbursementsResult = await db
      .select({
        total: sum(disbursementVouchers.amount).mapWith(Number),
      })
      .from(disbursementVouchers)
      .where(
        and(
          eq(disbursementVouchers.fundClusterId, fundClusterId),
          eq(disbursementVouchers.status, 'paid'),
          sql`DATE(${disbursementVouchers.dvDate}) = DATE(${date})`
        )
      );

    const disbursements = disbursementsResult[0]?.total || 0;

    // Calculate closing balance
    const closingBalance = openingBalance + receipts - disbursements;

    return {
      reportDate: date,
      fundClusterId,
      openingBalance,
      receipts,
      disbursements,
      closingBalance,
    };
  }

  /**
   * Save daily cash position
   */
  async saveDailyCashPosition(data: DailyCashPositionData, userId: number): Promise<{ id: number }> {
    const result = await db.insert(dailyCashPosition).values({
      reportDate: data.reportDate,
      fundClusterId: data.fundClusterId,
      openingBalance: data.openingBalance.toString(),
      receipts: data.receipts.toString(),
      disbursements: data.disbursements.toString(),
      closingBalance: data.closingBalance.toString(),
      preparedBy: userId,
    });

    return {
      id: Number(result.insertId),
    };
  }

  /**
   * Get cash position for a date range
   */
  async getCashPosition(startDate: Date, endDate: Date, fundClusterId?: number) {
    const conditions = [
      gte(dailyCashPosition.reportDate, startDate),
      lte(dailyCashPosition.reportDate, endDate),
    ];

    if (fundClusterId) {
      conditions.push(eq(dailyCashPosition.fundClusterId, fundClusterId));
    }

    return await db
      .select({
        id: dailyCashPosition.id,
        reportDate: dailyCashPosition.reportDate,
        openingBalance: dailyCashPosition.openingBalance,
        receipts: dailyCashPosition.receipts,
        disbursements: dailyCashPosition.disbursements,
        closingBalance: dailyCashPosition.closingBalance,
        fundCluster: {
          id: fundClusters.id,
          code: fundClusters.code,
          name: fundClusters.name,
        },
        preparedBy: users.username,
        createdAt: dailyCashPosition.createdAt,
      })
      .from(dailyCashPosition)
      .leftJoin(fundClusters, eq(dailyCashPosition.fundClusterId, fundClusters.id))
      .leftJoin(users, eq(dailyCashPosition.preparedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(dailyCashPosition.reportDate));
  }

  /**
   * Get current cash position (today's closing balance)
   */
  async getCurrentCashPosition(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db
      .select({
        total: sum(dailyCashPosition.closingBalance).mapWith(Number),
      })
      .from(dailyCashPosition)
      .where(eq(dailyCashPosition.reportDate, today));

    return result[0]?.total || 0;
  }

  // ============================================
  // 5. PETTY CASH METHODS
  // ============================================

  /**
   * Create a new petty cash fund
   */
  async createPettyCashFund(data: CreatePettyCashFundData, userId: number): Promise<{ id: number }> {
    const result = await db.insert(pettyCashFunds).values({
      fundCode: data.fundCode,
      fundName: data.fundName,
      custodian: data.custodian,
      custodianEmployeeId: data.custodianEmployeeId,
      fundAmount: data.fundAmount.toString(),
      currentBalance: data.fundAmount.toString(), // Initially equal to fund amount
      replenishmentThreshold: data.replenishmentThreshold?.toString(),
      fundClusterId: data.fundClusterId,
      isActive: true,
    });

    return {
      id: Number(result.insertId),
    };
  }

  /**
   * Disburse from petty cash fund
   */
  async disbursePettyCash(fundId: number, data: PettyCashDisbursementData, userId: number): Promise<{ id: number; needsReplenishment: boolean }> {
    // Get fund details
    const fund = await db
      .select()
      .from(pettyCashFunds)
      .where(eq(pettyCashFunds.id, fundId))
      .limit(1);

    if (!fund[0]) {
      throw new Error('Petty cash fund not found');
    }

    // Check if sufficient balance
    const currentBalance = Number(fund[0].currentBalance);
    if (currentBalance < data.amount) {
      throw new Error('Insufficient petty cash balance');
    }

    // Create disbursement transaction
    const result = await db.insert(pettyCashTransactions).values({
      pettyCashFundId: fundId,
      transactionType: 'disbursement',
      transactionDate: data.transactionDate,
      amount: data.amount.toString(),
      purpose: data.purpose,
      orNo: data.orNo,
      payee: data.payee,
      createdBy: userId,
    });

    // Update fund current balance
    const newBalance = currentBalance - data.amount;
    await db
      .update(pettyCashFunds)
      .set({ currentBalance: newBalance.toString() })
      .where(eq(pettyCashFunds.id, fundId));

    // Check if below replenishment threshold
    const threshold = fund[0].replenishmentThreshold ? Number(fund[0].replenishmentThreshold) : 0;
    const needsReplenishment = threshold > 0 && newBalance < threshold;

    return {
      id: Number(result.insertId),
      needsReplenishment,
    };
  }

  /**
   * Replenish petty cash fund
   */
  async replenishPettyCash(fundId: number, dvId: number, userId: number): Promise<{ id: number }> {
    // Get fund details
    const fund = await db
      .select()
      .from(pettyCashFunds)
      .where(eq(pettyCashFunds.id, fundId))
      .limit(1);

    if (!fund[0]) {
      throw new Error('Petty cash fund not found');
    }

    const fundAmount = Number(fund[0].fundAmount);
    const currentBalance = Number(fund[0].currentBalance);
    const replenishmentAmount = fundAmount - currentBalance;

    // Create replenishment transaction
    const result = await db.insert(pettyCashTransactions).values({
      pettyCashFundId: fundId,
      transactionType: 'replenishment',
      transactionDate: new Date(),
      amount: replenishmentAmount.toString(),
      purpose: 'Petty cash replenishment',
      dvId,
      createdBy: userId,
    });

    // Update fund current balance back to fund amount
    await db
      .update(pettyCashFunds)
      .set({ currentBalance: fundAmount.toString() })
      .where(eq(pettyCashFunds.id, fundId));

    return {
      id: Number(result.insertId),
    };
  }

  /**
   * Get petty cash funds
   */
  async getPettyCashFunds(fundClusterId?: number) {
    const conditions = [];

    if (fundClusterId) {
      conditions.push(eq(pettyCashFunds.fundClusterId, fundClusterId));
    }

    const query = db
      .select({
        id: pettyCashFunds.id,
        fundCode: pettyCashFunds.fundCode,
        fundName: pettyCashFunds.fundName,
        custodian: pettyCashFunds.custodian,
        fundAmount: pettyCashFunds.fundAmount,
        currentBalance: pettyCashFunds.currentBalance,
        replenishmentThreshold: pettyCashFunds.replenishmentThreshold,
        isActive: pettyCashFunds.isActive,
        fundCluster: {
          id: fundClusters.id,
          code: fundClusters.code,
          name: fundClusters.name,
        },
        createdAt: pettyCashFunds.createdAt,
      })
      .from(pettyCashFunds)
      .leftJoin(fundClusters, eq(pettyCashFunds.fundClusterId, fundClusters.id))
      .orderBy(desc(pettyCashFunds.createdAt));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query;
  }

  // ============================================
  // 6. CASH ADVANCE METHODS
  // ============================================

  /**
   * Create a new cash advance
   */
  async createCashAdvance(data: {
    employeeId: number;
    fundClusterId: number;
    amount: number;
    purpose: string;
    dateIssued: Date;
    dueDateReturn?: Date;
  }, userId: number): Promise<{ id: number; caNo: string }> {
    try {
      const caNo = await generateCANumber();

      const result = await db.insert(cashAdvances).values({
        caNo,
        employeeId: data.employeeId,
        fundClusterId: data.fundClusterId,
        amount: data.amount.toString(),
        purpose: data.purpose,
        dateIssued: data.dateIssued,
        dueDateReturn: data.dueDateReturn,
        status: 'draft',
        createdBy: userId,
      });

      return {
        id: Number(result.insertId),
        caNo,
      };
    } catch (error) {
      throw new Error(`Failed to create cash advance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cash advances with filters
   */
  async getCashAdvances(filters: {
    employeeId?: number;
    status?: string;
    fundClusterId?: number;
  }) {
    const conditions = [];

    if (filters.employeeId) {
      conditions.push(eq(cashAdvances.employeeId, filters.employeeId));
    }

    if (filters.status) {
      conditions.push(eq(cashAdvances.status, filters.status as any));
    }

    if (filters.fundClusterId) {
      conditions.push(eq(cashAdvances.fundClusterId, filters.fundClusterId));
    }

    const query = db
      .select()
      .from(cashAdvances)
      .orderBy(desc(cashAdvances.dateIssued));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query;
  }
}

// Export singleton instance
export const cashService = new CashService();
