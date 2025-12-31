import { db } from '../db/connection';
import {
  disbursementVouchers,
  fundClusters,
  objectOfExpenditure,
  mfoPap,
} from '../db/schema';
import { eq, and, desc, like, gte, lte, or, sql } from 'drizzle-orm';
import { generateDVNumber } from '../utils/serial-generator';
import { approvalService } from './approval.service';

export interface CreateDVData {
  fundClusterId: number;
  orsBursNo: string;
  fiscalYear: number;
  payeeName: string;
  payeeTin?: string;
  payeeAddress?: string;
  particulars: string;
  responsibilityCenter?: string;
  mfoPapId?: number;
  objectExpenditureId: number;
  amount: number;
  paymentMode: 'mds_check' | 'commercial_check' | 'ada' | 'other';
  createdBy: number;
}

export interface UpdateDVData {
  payeeName?: string;
  payeeTin?: string;
  payeeAddress?: string;
  particulars?: string;
  responsibilityCenter?: string;
  mfoPapId?: number;
  objectExpenditureId?: number;
  amount?: number;
  paymentMode?: 'mds_check' | 'commercial_check' | 'ada' | 'other';
}

export class DisbursementService {
  /**
   * Create a new Disbursement Voucher
   */
  async createDV(data: CreateDVData) {
    // Generate DV number
    const dvNo = await generateDVNumber(data.fiscalYear);

    // Create DV record
    const [result] = await db.insert(disbursementVouchers).values({
      dvNo,
      fundClusterId: data.fundClusterId,
      orsBursNo: data.orsBursNo,
      dvDate: new Date(),
      fiscalYear: data.fiscalYear,
      payeeName: data.payeeName,
      payeeTin: data.payeeTin,
      payeeAddress: data.payeeAddress,
      particulars: data.particulars,
      responsibilityCenter: data.responsibilityCenter,
      mfoPapId: data.mfoPapId,
      objectExpenditureId: data.objectExpenditureId,
      amount: data.amount,
      paymentMode: data.paymentMode,
      status: 'draft',
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const dvId = result.insertId;

    // Initialize approval workflow
    await approvalService.initializeWorkflow(dvId);

    // Update status to pending_budget (first approval stage)
    await db
      .update(disbursementVouchers)
      .set({ status: 'pending_budget' })
      .where(eq(disbursementVouchers.id, dvId));

    return { id: dvId, dvNo };
  }

  /**
   * Get DV by ID
   */
  async getDVById(id: number) {
    const result = await db
      .select({
        // DV fields
        id: disbursementVouchers.id,
        dvNo: disbursementVouchers.dvNo,
        fundClusterId: disbursementVouchers.fundClusterId,
        orsBursNo: disbursementVouchers.orsBursNo,
        dvDate: disbursementVouchers.dvDate,
        fiscalYear: disbursementVouchers.fiscalYear,
        payeeName: disbursementVouchers.payeeName,
        payeeTin: disbursementVouchers.payeeTin,
        payeeAddress: disbursementVouchers.payeeAddress,
        particulars: disbursementVouchers.particulars,
        responsibilityCenter: disbursementVouchers.responsibilityCenter,
        mfoPapId: disbursementVouchers.mfoPapId,
        objectExpenditureId: disbursementVouchers.objectExpenditureId,
        amount: disbursementVouchers.amount,
        paymentMode: disbursementVouchers.paymentMode,
        status: disbursementVouchers.status,
        jevNo: disbursementVouchers.jevNo,
        jevDate: disbursementVouchers.jevDate,
        createdBy: disbursementVouchers.createdBy,
        createdAt: disbursementVouchers.createdAt,
        updatedAt: disbursementVouchers.updatedAt,
        // Fund cluster
        fundCluster_id: fundClusters.id,
        fundCluster_code: fundClusters.code,
        fundCluster_name: fundClusters.name,
        // Object of Expenditure
        objectExpenditure_id: objectOfExpenditure.id,
        objectExpenditure_code: objectOfExpenditure.code,
        objectExpenditure_name: objectOfExpenditure.name,
        objectExpenditure_category: objectOfExpenditure.category,
        // MFO/PAP (optional)
        mfoPap_id: mfoPap.id,
        mfoPap_code: mfoPap.code,
        mfoPap_description: mfoPap.description,
      })
      .from(disbursementVouchers)
      .leftJoin(fundClusters, eq(disbursementVouchers.fundClusterId, fundClusters.id))
      .leftJoin(objectOfExpenditure, eq(disbursementVouchers.objectExpenditureId, objectOfExpenditure.id))
      .leftJoin(mfoPap, eq(disbursementVouchers.mfoPapId, mfoPap.id))
      .where(eq(disbursementVouchers.id, id))
      .limit(1);

    if (!result.length) {
      return null;
    }

    const row = result[0];

    return {
      id: row.id,
      dvNo: row.dvNo,
      fundClusterId: row.fundClusterId,
      orsBursNo: row.orsBursNo,
      dvDate: row.dvDate,
      fiscalYear: row.fiscalYear,
      payeeName: row.payeeName,
      payeeTin: row.payeeTin,
      payeeAddress: row.payeeAddress,
      particulars: row.particulars,
      responsibilityCenter: row.responsibilityCenter,
      mfoPapId: row.mfoPapId,
      objectExpenditureId: row.objectExpenditureId,
      amount: row.amount,
      paymentMode: row.paymentMode,
      status: row.status,
      jevNo: row.jevNo,
      jevDate: row.jevDate,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      fundCluster: row.fundCluster_id
        ? {
            id: row.fundCluster_id,
            code: row.fundCluster_code,
            name: row.fundCluster_name,
          }
        : null,
      objectOfExpenditure: row.objectExpenditure_id
        ? {
            id: row.objectExpenditure_id,
            code: row.objectExpenditure_code,
            name: row.objectExpenditure_name,
            category: row.objectExpenditure_category,
          }
        : null,
      mfoPap: row.mfoPap_id
        ? {
            id: row.mfoPap_id,
            code: row.mfoPap_code,
            description: row.mfoPap_description,
          }
        : null,
    };
  }

  /**
   * Get all DVs with optional filters
   */
  async getDVs(filters?: {
    status?: string;
    fiscalYear?: number;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
  }) {
    let query = db
      .select({
        id: disbursementVouchers.id,
        dvNo: disbursementVouchers.dvNo,
        dvDate: disbursementVouchers.dvDate,
        payeeName: disbursementVouchers.payeeName,
        particulars: disbursementVouchers.particulars,
        amount: disbursementVouchers.amount,
        status: disbursementVouchers.status,
        fiscalYear: disbursementVouchers.fiscalYear,
        fundCluster_code: fundClusters.code,
        fundCluster_name: fundClusters.name,
        createdAt: disbursementVouchers.createdAt,
      })
      .from(disbursementVouchers)
      .leftJoin(fundClusters, eq(disbursementVouchers.fundClusterId, fundClusters.id))
      .$dynamic();

    // Apply filters
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(disbursementVouchers.status, filters.status as any));
    }

    if (filters?.fiscalYear) {
      conditions.push(eq(disbursementVouchers.fiscalYear, filters.fiscalYear));
    }

    if (filters?.dateFrom) {
      conditions.push(gte(disbursementVouchers.dvDate, filters.dateFrom));
    }

    if (filters?.dateTo) {
      conditions.push(lte(disbursementVouchers.dvDate, filters.dateTo));
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(disbursementVouchers.dvNo, `%${filters.search}%`),
          like(disbursementVouchers.payeeName, `%${filters.search}%`),
          like(disbursementVouchers.particulars, `%${filters.search}%`),
          like(disbursementVouchers.orsBursNo, `%${filters.search}%`)
        )!
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)!);
    }

    const rows = await query.orderBy(desc(disbursementVouchers.createdAt));

    return rows.map(row => ({
      id: row.id,
      dvNo: row.dvNo,
      dvDate: row.dvDate,
      payeeName: row.payeeName,
      particulars: row.particulars,
      amount: row.amount,
      status: row.status,
      fiscalYear: row.fiscalYear,
      fundCluster: row.fundCluster_code
        ? {
            code: row.fundCluster_code,
            name: row.fundCluster_name,
          }
        : null,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Update DV (only allowed for draft status)
   */
  async updateDV(id: number, data: UpdateDVData) {
    // Check if DV is in draft status
    const dv = await this.getDVById(id);

    if (!dv) {
      throw new Error('DV not found');
    }

    if (dv.status !== 'draft') {
      throw new Error('Only draft DVs can be updated');
    }

    await db
      .update(disbursementVouchers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(disbursementVouchers.id, id));

    return true;
  }

  /**
   * Cancel DV
   */
  async cancelDV(id: number, userId: number) {
    const dv = await this.getDVById(id);

    if (!dv) {
      throw new Error('DV not found');
    }

    if (dv.status === 'paid') {
      throw new Error('Cannot cancel a paid DV');
    }

    if (dv.status === 'cancelled') {
      throw new Error('DV is already cancelled');
    }

    await db
      .update(disbursementVouchers)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(disbursementVouchers.id, id));

    return true;
  }

  /**
   * Get DV statistics
   */
  async getDVStatistics(fiscalYear?: number) {
    const conditions = fiscalYear
      ? [eq(disbursementVouchers.fiscalYear, fiscalYear)]
      : [];

    const stats = await db
      .select({
        status: disbursementVouchers.status,
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(${disbursementVouchers.amount})`,
      })
      .from(disbursementVouchers)
      .where(conditions.length > 0 ? and(...conditions)! : undefined)
      .groupBy(disbursementVouchers.status);

    return stats;
  }
}

export const disbursementService = new DisbursementService();
