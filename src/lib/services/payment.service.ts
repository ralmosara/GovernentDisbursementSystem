import { db } from '../db/connection';
import { payments, disbursementVouchers, fundClusters, checkDisbursementRecords, auditLogs } from '../db/schema';
import { eq, and, desc, ne, isNotNull, sql } from 'drizzle-orm';
import { generateCheckNumber } from '../utils/serial-generator';

/**
 * Payment types
 */
export type PaymentType = 'check_mds' | 'check_commercial' | 'ada' | 'cash';
export type PaymentStatus = 'pending' | 'issued' | 'cleared' | 'cancelled' | 'stale';

export interface CreatePaymentData {
  dvId: number;
  paymentType: PaymentType;
  paymentDate: Date;
  amount: string;
  bankName?: string;
  bankAccountNo?: string;
  adaReference?: string;
  adaIssuedDate?: Date;
  createdBy: number;
}

export interface IssuePaymentData {
  receivedBy: string;
  receivedDate: Date;
  orNo?: string;
  orDate?: Date;
  remarks?: string;
}

export interface PaymentFilters {
  status?: PaymentStatus;
  paymentType?: PaymentType | PaymentType[];
  fiscalYear?: number;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export class PaymentService {
  /**
   * Create a new payment from an approved DV
   */
  async createPayment(data: CreatePaymentData): Promise<{ id: number; checkNo?: string }> {
    // 1. Get DV and validate it's approved
    const dv = await db
      .select()
      .from(disbursementVouchers)
      .where(eq(disbursementVouchers.id, data.dvId))
      .limit(1);

    if (dv.length === 0) {
      throw new Error('Disbursement voucher not found');
    }

    if (dv[0].status !== 'approved') {
      throw new Error('Only approved DVs can be paid. Current status: ' + dv[0].status);
    }

    // 2. Check for duplicate payments (prevent paying same DV twice)
    const existingPayments = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.dvId, data.dvId),
          ne(payments.status, 'cancelled')
        )
      );

    if (existingPayments.length > 0) {
      throw new Error('Payment already exists for this DV. Cancel existing payment first.');
    }

    // 3. Validate amount matches DV amount
    if (parseFloat(data.amount) !== parseFloat(dv[0].amount.toString())) {
      throw new Error(`Payment amount (${data.amount}) must match DV amount (${dv[0].amount})`);
    }

    // 4. Generate check number if payment type is check
    let checkNo: string | undefined;
    if (data.paymentType === 'check_mds' || data.paymentType === 'check_commercial') {
      checkNo = await generateCheckNumber(
        dv[0].fiscalYear,
        dv[0].fundClusterId,
        data.paymentType
      );
    }

    // 5. Create payment record
    const result = await db.insert(payments).values({
      dvId: data.dvId,
      paymentType: data.paymentType,
      paymentDate: data.paymentDate,
      amount: data.amount,
      checkNo,
      bankName: data.bankName,
      bankAccountNo: data.bankAccountNo,
      adaReference: data.adaReference,
      adaIssuedDate: data.adaIssuedDate,
      status: 'pending',
      createdBy: data.createdBy,
    });

    const paymentId = Number(result.insertId);

    // 6. Create audit log
    await db.insert(auditLogs).values({
      userId: data.createdBy,
      action: 'create_payment',
      tableName: 'payments',
      recordId: paymentId,
      newValues: {
        dvId: data.dvId,
        paymentType: data.paymentType,
        amount: data.amount,
        checkNo,
      },
    });

    return { id: paymentId, checkNo };
  }

  /**
   * Issue payment - mark as given to payee
   */
  async issuePayment(
    paymentId: number,
    userId: number,
    data: IssuePaymentData
  ): Promise<{ success: boolean; message: string }> {
    // Get current payment
    const payment = await this.getPaymentById(paymentId);

    if (!payment) {
      return { success: false, message: 'Payment not found' };
    }

    if (payment.status !== 'pending') {
      return { success: false, message: `Cannot issue payment with status: ${payment.status}` };
    }

    // Update payment to issued
    await db
      .update(payments)
      .set({
        status: 'issued',
        receivedBy: data.receivedBy,
        receivedDate: data.receivedDate,
        orNo: data.orNo,
        orDate: data.orDate,
        remarks: data.remarks,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    // Create audit log
    await db.insert(auditLogs).values({
      userId,
      action: 'issue_payment',
      tableName: 'payments',
      recordId: paymentId,
      newValues: {
        status: 'issued',
        receivedBy: data.receivedBy,
        orNo: data.orNo,
        checkNo: payment.checkNo,
      },
    });

    return {
      success: true,
      message: 'Payment issued successfully',
    };
  }

  /**
   * Clear payment - mark as cleared/settled
   */
  async clearPayment(
    paymentId: number,
    userId: number,
    clearDate: Date
  ): Promise<{ success: boolean; message: string }> {
    // Get current payment
    const payment = await this.getPaymentById(paymentId);

    if (!payment) {
      return { success: false, message: 'Payment not found' };
    }

    if (payment.status !== 'issued') {
      return { success: false, message: `Cannot clear payment with status: ${payment.status}. Payment must be issued first.` };
    }

    // Update payment to cleared
    await db
      .update(payments)
      .set({
        status: 'cleared',
        clearedDate: clearDate,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    // Update DV status to paid
    await db
      .update(disbursementVouchers)
      .set({ status: 'paid' })
      .where(eq(disbursementVouchers.id, payment.dvId));

    // Create check disbursement record for bank reconciliation
    if (payment.paymentType === 'check_mds' || payment.paymentType === 'check_commercial') {
      await db.insert(checkDisbursementRecords).values({
        paymentId: paymentId,
        fundClusterId: payment.fundClusterId,
        recordDate: clearDate,
        createdBy: userId,
      });
    }

    // Create audit log
    await db.insert(auditLogs).values({
      userId,
      action: 'clear_payment',
      tableName: 'payments',
      recordId: paymentId,
      newValues: {
        status: 'cleared',
        clearedDate: clearDate,
        checkNo: payment.checkNo,
      },
    });

    return {
      success: true,
      message: 'Payment cleared successfully. DV status updated to paid.',
    };
  }

  /**
   * Cancel payment
   */
  async cancelPayment(
    paymentId: number,
    userId: number,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    // Get current payment
    const payment = await this.getPaymentById(paymentId);

    if (!payment) {
      return { success: false, message: 'Payment not found' };
    }

    if (payment.status === 'cleared') {
      return { success: false, message: 'Cannot cancel cleared payment. Reversal entry required.' };
    }

    if (payment.status === 'cancelled') {
      return { success: false, message: 'Payment is already cancelled' };
    }

    // Update payment to cancelled
    await db
      .update(payments)
      .set({
        status: 'cancelled',
        remarks: reason,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    // Create audit log
    await db.insert(auditLogs).values({
      userId,
      action: 'cancel_payment',
      tableName: 'payments',
      recordId: paymentId,
      newValues: {
        status: 'cancelled',
        reason,
        checkNo: payment.checkNo,
      },
    });

    return {
      success: true,
      message: 'Payment cancelled successfully',
    };
  }

  /**
   * Mark check as stale (not cleared within 6 months)
   */
  async markStale(
    paymentId: number,
    userId: number
  ): Promise<{ success: boolean; message: string }> {
    const payment = await this.getPaymentById(paymentId);

    if (!payment) {
      return { success: false, message: 'Payment not found' };
    }

    if (payment.status !== 'issued') {
      return { success: false, message: 'Only issued payments can be marked as stale' };
    }

    await db
      .update(payments)
      .set({
        status: 'stale',
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    await db.insert(auditLogs).values({
      userId,
      action: 'mark_payment_stale',
      tableName: 'payments',
      recordId: paymentId,
      newValues: {
        status: 'stale',
        checkNo: payment.checkNo,
      },
    });

    return {
      success: true,
      message: 'Payment marked as stale',
    };
  }

  /**
   * Get payment by ID with full details
   */
  async getPaymentById(id: number): Promise<any | null> {
    const result = await db
      .select({
        id: payments.id,
        dvId: payments.dvId,
        paymentType: payments.paymentType,
        paymentDate: payments.paymentDate,
        amount: payments.amount,
        checkNo: payments.checkNo,
        bankName: payments.bankName,
        bankAccountNo: payments.bankAccountNo,
        adaReference: payments.adaReference,
        adaIssuedDate: payments.adaIssuedDate,
        status: payments.status,
        clearedDate: payments.clearedDate,
        receivedBy: payments.receivedBy,
        receivedDate: payments.receivedDate,
        orNo: payments.orNo,
        orDate: payments.orDate,
        remarks: payments.remarks,
        createdBy: payments.createdBy,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        // DV details
        dvNo: disbursementVouchers.dvNo,
        payeeName: disbursementVouchers.payeeName,
        particulars: disbursementVouchers.particulars,
        dvDate: disbursementVouchers.dvDate,
        dvStatus: disbursementVouchers.status,
        fiscalYear: disbursementVouchers.fiscalYear,
        fundClusterId: disbursementVouchers.fundClusterId,
        // Fund cluster details
        fundClusterCode: fundClusters.code,
        fundClusterName: fundClusters.name,
      })
      .from(payments)
      .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id))
      .leftJoin(fundClusters, eq(disbursementVouchers.fundClusterId, fundClusters.id))
      .where(eq(payments.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get payments with filtering
   */
  async getPayments(filters: PaymentFilters = {}): Promise<any[]> {
    let query = db
      .select({
        id: payments.id,
        dvId: payments.dvId,
        paymentType: payments.paymentType,
        paymentDate: payments.paymentDate,
        amount: payments.amount,
        checkNo: payments.checkNo,
        bankName: payments.bankName,
        bankAccountNo: payments.bankAccountNo,
        adaReference: payments.adaReference,
        adaIssuedDate: payments.adaIssuedDate,
        status: payments.status,
        clearedDate: payments.clearedDate,
        receivedBy: payments.receivedBy,
        receivedDate: payments.receivedDate,
        orNo: payments.orNo,
        createdAt: payments.createdAt,
        // DV details
        dvNo: disbursementVouchers.dvNo,
        payeeName: disbursementVouchers.payeeName,
        dvDate: disbursementVouchers.dvDate,
        fiscalYear: disbursementVouchers.fiscalYear,
      })
      .from(payments)
      .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id))
      .$dynamic();

    // Apply filters
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(payments.status, filters.status));
    }

    if (filters.paymentType) {
      if (Array.isArray(filters.paymentType)) {
        // Handle array of payment types using OR condition
        const typeConditions = filters.paymentType.map(type => eq(payments.paymentType, type));
        conditions.push(sql`${payments.paymentType} IN (${sql.join(filters.paymentType.map(t => sql`${t}`), sql`, `)})`);
      } else {
        conditions.push(eq(payments.paymentType, filters.paymentType));
      }
    }

    if (filters.fiscalYear) {
      conditions.push(eq(disbursementVouchers.fiscalYear, filters.fiscalYear));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(payments.createdAt));

    // Client-side search filter (for simplicity)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return results.filter(p =>
        p.checkNo?.toLowerCase().includes(searchLower) ||
        p.dvNo?.toLowerCase().includes(searchLower) ||
        p.payeeName?.toLowerCase().includes(searchLower)
      );
    }

    return results;
  }

  /**
   * Get pending payments (approved DVs ready for payment)
   */
  async getPendingPayments(): Promise<any[]> {
    // Get all approved DVs
    const approvedDVs = await db
      .select({
        id: disbursementVouchers.id,
        dvNo: disbursementVouchers.dvNo,
        dvDate: disbursementVouchers.dvDate,
        payeeName: disbursementVouchers.payeeName,
        amount: disbursementVouchers.amount,
        particulars: disbursementVouchers.particulars,
        fiscalYear: disbursementVouchers.fiscalYear,
        fundClusterId: disbursementVouchers.fundClusterId,
      })
      .from(disbursementVouchers)
      .where(eq(disbursementVouchers.status, 'approved'))
      .orderBy(desc(disbursementVouchers.createdAt));

    // Get all active payments
    const activePayments = await db
      .select({ dvId: payments.dvId })
      .from(payments)
      .where(ne(payments.status, 'cancelled'));

    const paidDvIds = new Set(activePayments.map(p => p.dvId));

    // Filter out DVs that already have payments
    return approvedDVs.filter(dv => !paidDvIds.has(dv.id));
  }

  /**
   * Get payments by DV ID
   */
  async getPaymentsByDVId(dvId: number): Promise<any[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.dvId, dvId))
      .orderBy(desc(payments.createdAt));
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(fiscalYear?: number): Promise<any> {
    let query = db.select().from(payments).$dynamic();

    if (fiscalYear) {
      query = query
        .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id))
        .where(eq(disbursementVouchers.fiscalYear, fiscalYear));
    }

    const allPayments = await query;

    const stats = {
      total: allPayments.length,
      pending: allPayments.filter(p => p.status === 'pending').length,
      issued: allPayments.filter(p => p.status === 'issued').length,
      cleared: allPayments.filter(p => p.status === 'cleared').length,
      cancelled: allPayments.filter(p => p.status === 'cancelled').length,
      stale: allPayments.filter(p => p.status === 'stale').length,
      totalAmount: allPayments
        .filter(p => p.status !== 'cancelled')
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
    };

    return stats;
  }
}

export const paymentService = new PaymentService();
