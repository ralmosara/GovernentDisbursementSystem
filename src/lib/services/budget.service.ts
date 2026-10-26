import { db } from '../db/connection';
import {
  registryAppropriations,
  registryAllotments,
  registryObligations,
  fundClusters,
  objectOfExpenditure,
  mfoPap,
  disbursementVouchers,
  allotmentModifications,
  revenueTargets,
  revenueSources,
} from '../db/schema';
import { eq, and, sum, sql, desc, inArray, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { logAudit } from '../middleware/audit-logger';

export interface BudgetAvailability {
  appropriation: number;
  allotment: number;
  /** Approved obligations */
  obligation: number;
  /** Obligations awaiting approval; these reserve funds */
  pendingObligation: number;
  /** Paid DVs charged against this allotment's ORS/BURS numbers */
  disbursement: number;
  /** Allotment less approved obligations */
  unobligatedBalance: number;
  /** Allotment less approved and pending obligations (what a new request may use) */
  availableBalance: number;
  /** Approved obligations not yet disbursed */
  unpaidObligation: number;
}

/** Drizzle returns DECIMAL columns as strings; convert for arithmetic and display */
function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** Compare peso amounts at centavo precision to avoid floating-point drift */
function toCentavos(value: number): number {
  return Math.round(value * 100);
}

export class BudgetService {
  /**
   * Get budget availability for a specific allotment
   */
  async getBudgetAvailability(allotmentId: number): Promise<BudgetAvailability> {
    // Get the allotment details with appropriation using manual JOIN to avoid JSON aggregation
    const allotmentResult = await db
      .select({
        allotment_id: registryAllotments.id,
        allotment_amount: registryAllotments.amount,
        appropriation_amount: registryAppropriations.amount
      })
      .from(registryAllotments)
      .leftJoin(registryAppropriations, eq(registryAllotments.appropriationId, registryAppropriations.id))
      .where(eq(registryAllotments.id, allotmentId))
      .limit(1);

    if (!allotmentResult.length) {
      throw new Error('Allotment not found');
    }

    const allotment = allotmentResult[0];
    const allotmentAmount = toNumber(allotment.allotment_amount);

    // Total obligations for this allotment, split by status
    const obligationRows = await db
      .select({
        status: registryObligations.status,
        total: sum(registryObligations.amount).mapWith(Number)
      })
      .from(registryObligations)
      .where(
        and(
          eq(registryObligations.allotmentId, allotmentId),
          inArray(registryObligations.status, ['approved', 'pending'])
        )
      )
      .groupBy(registryObligations.status);

    const totalObligations = toNumber(obligationRows.find(r => r.status === 'approved')?.total);
    const pendingObligations = toNumber(obligationRows.find(r => r.status === 'pending')?.total);

    const totalDisbursements = await this.getDisbursedAmount(allotmentId);

    const unobligatedBalance = allotmentAmount - totalObligations;
    const availableBalance = allotmentAmount - totalObligations - pendingObligations;

    return {
      appropriation: toNumber(allotment.appropriation_amount),
      allotment: allotmentAmount,
      obligation: totalObligations,
      pendingObligation: pendingObligations,
      disbursement: totalDisbursements,
      unobligatedBalance,
      availableBalance,
      unpaidObligation: Math.max(totalObligations - totalDisbursements, 0)
    };
  }

  /**
   * Sum of paid DVs whose ORS/BURS number matches an approved obligation of this allotment
   */
  private async getDisbursedAmount(allotmentId: number): Promise<number> {
    const obligationRefs = await db
      .select({
        orsNumber: registryObligations.orsNumber,
        bursNumber: registryObligations.bursNumber
      })
      .from(registryObligations)
      .where(
        and(
          eq(registryObligations.allotmentId, allotmentId),
          eq(registryObligations.status, 'approved')
        )
      );

    const refs = obligationRefs
      .flatMap(r => [r.orsNumber, r.bursNumber])
      .filter((ref): ref is string => !!ref);

    if (refs.length === 0) return 0;

    const result = await db
      .select({ total: sum(disbursementVouchers.amount).mapWith(Number) })
      .from(disbursementVouchers)
      .where(
        and(
          inArray(disbursementVouchers.orsBursNo, refs),
          eq(disbursementVouchers.status, 'paid')
        )
      );

    return toNumber(result[0]?.total);
  }

  /**
   * Check if sufficient budget is available for a new obligation request.
   * Pending obligations reserve funds so concurrent requests cannot jointly over-obligate.
   */
  async checkBudgetAvailability(allotmentId: number, amount: number): Promise<boolean> {
    const availability = await this.getBudgetAvailability(allotmentId);
    return toCentavos(availability.availableBalance) >= toCentavos(amount);
  }

  /**
   * Check whether a pending obligation can still be approved: approved obligations
   * plus this one must not exceed the allotment
   */
  async canApproveObligation(allotmentId: number, amount: number): Promise<boolean> {
    const availability = await this.getBudgetAvailability(allotmentId);
    return toCentavos(availability.unobligatedBalance) >= toCentavos(amount);
  }

  /**
   * Totals for the appropriations matching `appropriationFilter` and the allotments and
   * approved obligations beneath them. Each level is summed in its own query: summing
   * across a JOIN repeats an appropriation once per allotment (and an allotment once
   * per obligation), which inflates the totals.
   */
  private async sumBudgetLevels(appropriationFilter: SQL) {
    const [appropriationRow] = await db
      .select({ total: sum(registryAppropriations.amount).mapWith(Number) })
      .from(registryAppropriations)
      .where(appropriationFilter);

    const [allotmentRow] = await db
      .select({ total: sum(registryAllotments.amount).mapWith(Number) })
      .from(registryAllotments)
      .innerJoin(registryAppropriations, eq(registryAllotments.appropriationId, registryAppropriations.id))
      .where(appropriationFilter);

    const [obligationRow] = await db
      .select({ total: sum(registryObligations.amount).mapWith(Number) })
      .from(registryObligations)
      .innerJoin(registryAllotments, eq(registryObligations.allotmentId, registryAllotments.id))
      .innerJoin(registryAppropriations, eq(registryAllotments.appropriationId, registryAppropriations.id))
      .where(and(appropriationFilter, eq(registryObligations.status, 'approved')));

    const appropriation = toNumber(appropriationRow?.total);
    const allotment = toNumber(allotmentRow?.total);
    const obligation = toNumber(obligationRow?.total);

    return {
      appropriation,
      allotment,
      obligation,
      unobligatedBalance: allotment - obligation,
      utilizationRate: allotment ? (obligation / allotment) * 100 : 0
    };
  }

  /**
   * Get budget summary by fund cluster
   */
  async getBudgetSummaryByFundCluster(fundClusterId: number, year: number) {
    const [cluster] = await db
      .select({ code: fundClusters.code, name: fundClusters.name })
      .from(fundClusters)
      .where(eq(fundClusters.id, fundClusterId))
      .limit(1);

    if (!cluster) return [];

    const totals = await this.sumBudgetLevels(
      and(eq(registryAppropriations.fundClusterId, fundClusterId), eq(registryAppropriations.year, year))!
    );

    return [{ fundClusterCode: cluster.code, fundClusterName: cluster.name, ...totals }];
  }

  /**
   * Get overall budget summary for the year
   */
  async getOverallBudgetSummary(year: number) {
    try {
      return await this.sumBudgetLevels(eq(registryAppropriations.year, year));
    } catch (error) {
      // If there are no appropriations, return empty summary
      console.error('Error getting budget summary:', error);
      return {
        appropriation: 0,
        allotment: 0,
        obligation: 0,
        unobligatedBalance: 0,
        utilizationRate: 0
      };
    }
  }

  /**
   * Get budget by object of expenditure
   */
  async getBudgetByObjectOfExpenditure(year: number) {
    const result = await db
      .select({
        objectCode: objectOfExpenditure.code,
        objectName: objectOfExpenditure.name,
        category: objectOfExpenditure.category,
        allotment: sum(registryAllotments.amount).mapWith(Number),
        obligation: sum(registryObligations.amount).mapWith(Number)
      })
      .from(registryAllotments)
      .leftJoin(
        registryObligations,
        and(
          eq(registryAllotments.id, registryObligations.allotmentId),
          eq(registryObligations.status, 'approved')
        )
      )
      .leftJoin(
        objectOfExpenditure,
        eq(registryAllotments.objectOfExpenditureId, objectOfExpenditure.id)
      )
      .leftJoin(
        registryAppropriations,
        eq(registryAllotments.appropriationId, registryAppropriations.id)
      )
      .where(eq(registryAppropriations.year, year))
      .groupBy(
        objectOfExpenditure.code,
        objectOfExpenditure.name,
        objectOfExpenditure.category
      );

    return result.map(row => ({
      ...row,
      unobligatedBalance: (row.allotment || 0) - (row.obligation || 0),
      utilizationRate: row.allotment ? ((row.obligation || 0) / row.allotment) * 100 : 0
    }));
  }

  /**
   * Create a new appropriation
   */
  async createAppropriation(data: {
    fundClusterId: number;
    year: number;
    amount: number;
    description: string;
    reference: string;
  }) {
    const [result] = await db.insert(registryAppropriations).values({
      fundClusterId: data.fundClusterId,
      year: data.year,
      amount: data.amount.toFixed(2),
      description: data.description,
      reference: data.reference,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return result;
  }

  /**
   * Create a new allotment
   */
  async createAllotment(data: {
    appropriationId: number;
    objectOfExpenditureId: number;
    mfoPapId?: number;
    amount: number;
    allotmentClass: string;
    purpose: string;
  }) {
    // Verify appropriation exists using SELECT to avoid JSON aggregation
    const appropriationResult = await db
      .select()
      .from(registryAppropriations)
      .where(eq(registryAppropriations.id, data.appropriationId))
      .limit(1);

    if (!appropriationResult.length) {
      throw new Error('Appropriation not found');
    }

    const appropriation = appropriationResult[0];

    // Check if total allotments would exceed appropriation
    const existingAllotments = await db
      .select({
        total: sum(registryAllotments.amount).mapWith(Number)
      })
      .from(registryAllotments)
      .where(eq(registryAllotments.appropriationId, data.appropriationId));

    const totalExistingAllotments = toNumber(existingAllotments[0]?.total);

    if (toCentavos(totalExistingAllotments + data.amount) > toCentavos(toNumber(appropriation.amount))) {
      throw new Error('Allotment amount exceeds available appropriation');
    }

    const [result] = await db.insert(registryAllotments).values({
      appropriationId: data.appropriationId,
      objectOfExpenditureId: data.objectOfExpenditureId,
      mfoPapId: data.mfoPapId,
      amount: data.amount.toFixed(2),
      allotmentClass: data.allotmentClass,
      purpose: data.purpose,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return result;
  }

  /**
   * Create a new obligation request
   */
  async createObligation(data: {
    allotmentId: number;
    payee: string;
    particulars: string;
    amount: number;
    orsNumber?: string;
    bursNumber?: string;
    obligationDate: Date;
    createdBy: number;
  }) {
    // Check budget availability
    const hasAvailableBudget = await this.checkBudgetAvailability(
      data.allotmentId,
      data.amount
    );

    if (!hasAvailableBudget) {
      throw new Error('Insufficient budget available for this obligation');
    }

    const [result] = await db.insert(registryObligations).values({
      allotmentId: data.allotmentId,
      payee: data.payee,
      particulars: data.particulars,
      amount: data.amount.toFixed(2),
      orsNumber: data.orsNumber,
      bursNumber: data.bursNumber,
      obligationDate: data.obligationDate,
      status: 'pending',
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return result;
  }

  /**
   * Approve an obligation
   */
  async approveObligation(obligationId: number, approvedBy: number) {
    // Get the obligation using SELECT to avoid JSON aggregation
    const obligationResult = await db
      .select()
      .from(registryObligations)
      .where(eq(registryObligations.id, obligationId))
      .limit(1);

    if (!obligationResult.length) {
      throw new Error('Obligation not found');
    }

    const obligation = obligationResult[0];

    if (obligation.status !== 'pending') {
      throw new Error('Only pending obligations can be approved');
    }

    // Check budget availability again (this obligation's own reservation is excluded)
    const hasAvailableBudget = await this.canApproveObligation(
      obligation.allotmentId,
      toNumber(obligation.amount)
    );

    if (!hasAvailableBudget) {
      throw new Error('Insufficient budget available for this obligation');
    }

    // Update obligation status
    await db
      .update(registryObligations)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(registryObligations.id, obligationId));

    return true;
  }

  /**
   * Reject an obligation
   */
  async rejectObligation(obligationId: number, rejectedBy: number, remarks: string) {
    const obligationResult = await db
      .select({ status: registryObligations.status })
      .from(registryObligations)
      .where(eq(registryObligations.id, obligationId))
      .limit(1);

    if (!obligationResult.length) {
      throw new Error('Obligation not found');
    }

    if (obligationResult[0].status !== 'pending') {
      throw new Error('Only pending obligations can be rejected');
    }

    await db
      .update(registryObligations)
      .set({
        status: 'rejected',
        remarks,
        updatedAt: new Date()
      })
      .where(eq(registryObligations.id, obligationId));

    return true;
  }

  /**
   * Get appropriation by ID
   */
  async getAppropriationById(id: number) {
    const appropriations = await db
      .select({
        id: registryAppropriations.id,
        fundClusterId: registryAppropriations.fundClusterId,
        year: registryAppropriations.year,
        reference: registryAppropriations.reference,
        description: registryAppropriations.description,
        amount: registryAppropriations.amount,
        createdAt: registryAppropriations.createdAt,
        updatedAt: registryAppropriations.updatedAt,
        fundCluster: {
          id: fundClusters.id,
          code: fundClusters.code,
          name: fundClusters.name,
          description: fundClusters.description
        }
      })
      .from(registryAppropriations)
      .leftJoin(fundClusters, eq(registryAppropriations.fundClusterId, fundClusters.id))
      .where(eq(registryAppropriations.id, id));

    const appropriation = appropriations[0];
    return appropriation ? { ...appropriation, amount: toNumber(appropriation.amount) } : null;
  }

  /**
   * Get all appropriations for a year
   */
  async getAppropriations(year: number) {
    const appropriations = await db
      .select({
        id: registryAppropriations.id,
        fundClusterId: registryAppropriations.fundClusterId,
        year: registryAppropriations.year,
        reference: registryAppropriations.reference,
        description: registryAppropriations.description,
        amount: registryAppropriations.amount,
        createdAt: registryAppropriations.createdAt,
        updatedAt: registryAppropriations.updatedAt,
        fundCluster: {
          id: fundClusters.id,
          code: fundClusters.code,
          name: fundClusters.name,
          description: fundClusters.description
        }
      })
      .from(registryAppropriations)
      .leftJoin(fundClusters, eq(registryAppropriations.fundClusterId, fundClusters.id))
      .where(eq(registryAppropriations.year, year))
      .orderBy(desc(registryAppropriations.createdAt));

    return appropriations.map(a => ({ ...a, amount: toNumber(a.amount) }));
  }

  /**
   * Get a single allotment with its appropriation, fund cluster, object of expenditure and MFO/PAP
   */
  async getAllotmentById(id: number) {
    const rows = await db
      .select({
        id: registryAllotments.id,
        appropriationId: registryAllotments.appropriationId,
        allotmentClass: registryAllotments.allotmentClass,
        amount: registryAllotments.amount,
        purpose: registryAllotments.purpose,
        createdAt: registryAllotments.createdAt,
        originalAmount: registryAllotments.originalAmount,
        updatedAt: registryAllotments.updatedAt,
        appropriation_reference: registryAppropriations.reference,
        appropriation_year: registryAppropriations.year,
        appropriation_amount: registryAppropriations.amount,
        fundCluster_code: fundClusters.code,
        fundCluster_name: fundClusters.name,
        objectOfExpenditure_code: objectOfExpenditure.code,
        objectOfExpenditure_name: objectOfExpenditure.name,
        objectOfExpenditure_category: objectOfExpenditure.category,
        mfoPap_code: mfoPap.code,
        mfoPap_name: mfoPap.name
      })
      .from(registryAllotments)
      .leftJoin(registryAppropriations, eq(registryAllotments.appropriationId, registryAppropriations.id))
      .leftJoin(fundClusters, eq(registryAppropriations.fundClusterId, fundClusters.id))
      .leftJoin(objectOfExpenditure, eq(registryAllotments.objectOfExpenditureId, objectOfExpenditure.id))
      .leftJoin(mfoPap, eq(registryAllotments.mfoPapId, mfoPap.id))
      .where(eq(registryAllotments.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      appropriationId: row.appropriationId,
      allotmentClass: row.allotmentClass,
      amount: toNumber(row.amount),
      purpose: row.purpose,
      createdAt: row.createdAt,
      originalAmount: row.originalAmount === null ? null : toNumber(row.originalAmount),
      updatedAt: row.updatedAt,
      appropriation: {
        id: row.appropriationId,
        reference: row.appropriation_reference,
        year: row.appropriation_year,
        amount: toNumber(row.appropriation_amount),
        fundCluster: { code: row.fundCluster_code, name: row.fundCluster_name }
      },
      objectOfExpenditure: {
        code: row.objectOfExpenditure_code,
        name: row.objectOfExpenditure_name,
        category: row.objectOfExpenditure_category
      },
      mfoPap: row.mfoPap_code ? { code: row.mfoPap_code, name: row.mfoPap_name } : null
    };
  }

  /**
   * Get obligations charged against an allotment
   */
  async getObligationsByAllotment(allotmentId: number) {
    const rows = await db
      .select()
      .from(registryObligations)
      .where(eq(registryObligations.allotmentId, allotmentId))
      .orderBy(desc(registryObligations.obligationDate));

    return rows.map(r => ({ ...r, amount: toNumber(r.amount) }));
  }

  /**
   * Get a single obligation with its allotment hierarchy
   */
  async getObligationById(id: number) {
    const rows = await this.getObligations(undefined, id);
    return rows[0] || null;
  }

  /**
   * Get all allotments for an appropriation
   */
  async getAllotments(appropriationId?: number) {
    // Use flat SELECT to avoid MariaDB JSON aggregation issues
    const query = db
      .select({
        // Allotment fields
        id: registryAllotments.id,
        appropriationId: registryAllotments.appropriationId,
        objectOfExpenditureId: registryAllotments.objectOfExpenditureId,
        mfoPapId: registryAllotments.mfoPapId,
        allotmentClass: registryAllotments.allotmentClass,
        amount: registryAllotments.amount,
        purpose: registryAllotments.purpose,
        createdAt: registryAllotments.createdAt,
        updatedAt: registryAllotments.updatedAt,
        // Appropriation fields (flat)
        appropriation_id: registryAppropriations.id,
        appropriation_fundClusterId: registryAppropriations.fundClusterId,
        appropriation_year: registryAppropriations.year,
        appropriation_reference: registryAppropriations.reference,
        appropriation_description: registryAppropriations.description,
        appropriation_amount: registryAppropriations.amount,
        // Fund cluster fields (flat)
        fundCluster_id: fundClusters.id,
        fundCluster_code: fundClusters.code,
        fundCluster_name: fundClusters.name,
        // Object of Expenditure fields (flat)
        objectOfExpenditure_id: objectOfExpenditure.id,
        objectOfExpenditure_code: objectOfExpenditure.code,
        objectOfExpenditure_name: objectOfExpenditure.name,
        objectOfExpenditure_category: objectOfExpenditure.category,
        // MFO/PAP fields (flat)
        mfoPap_code: mfoPap.code,
        mfoPap_name: mfoPap.name
      })
      .from(registryAllotments)
      .leftJoin(registryAppropriations, eq(registryAllotments.appropriationId, registryAppropriations.id))
      .leftJoin(fundClusters, eq(registryAppropriations.fundClusterId, fundClusters.id))
      .leftJoin(objectOfExpenditure, eq(registryAllotments.objectOfExpenditureId, objectOfExpenditure.id))
      .leftJoin(mfoPap, eq(registryAllotments.mfoPapId, mfoPap.id))
      .orderBy(desc(registryAllotments.createdAt));

    const rows = appropriationId
      ? await query.where(eq(registryAllotments.appropriationId, appropriationId))
      : await query;

    // Manually reconstruct nested structure
    return rows.map(row => ({
      id: row.id,
      appropriationId: row.appropriationId,
      objectOfExpenditureId: row.objectOfExpenditureId,
      mfoPapId: row.mfoPapId,
      allotmentClass: row.allotmentClass,
      amount: toNumber(row.amount),
      purpose: row.purpose,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      mfoPap: row.mfoPap_code ? { code: row.mfoPap_code, name: row.mfoPap_name } : null,
      appropriation: {
        id: row.appropriation_id,
        fundClusterId: row.appropriation_fundClusterId,
        year: row.appropriation_year,
        reference: row.appropriation_reference,
        description: row.appropriation_description,
        amount: toNumber(row.appropriation_amount),
        fundCluster: {
          id: row.fundCluster_id,
          code: row.fundCluster_code,
          name: row.fundCluster_name
        }
      },
      objectOfExpenditure: {
        id: row.objectOfExpenditure_id,
        code: row.objectOfExpenditure_code,
        name: row.objectOfExpenditure_name,
        category: row.objectOfExpenditure_category
      }
    }));
  }

  /**
   * Get all obligations
   */
  async getObligations(status?: string, id?: number) {
    // Use flat SELECT to avoid MariaDB JSON aggregation issues
    const query = db
      .select({
        // Obligation fields
        id: registryObligations.id,
        allotmentId: registryObligations.allotmentId,
        payee: registryObligations.payee,
        particulars: registryObligations.particulars,
        amount: registryObligations.amount,
        orsNumber: registryObligations.orsNumber,
        bursNumber: registryObligations.bursNumber,
        obligationDate: registryObligations.obligationDate,
        status: registryObligations.status,
        remarks: registryObligations.remarks,
        createdBy: registryObligations.createdBy,
        approvedBy: registryObligations.approvedBy,
        approvedAt: registryObligations.approvedAt,
        createdAt: registryObligations.createdAt,
        updatedAt: registryObligations.updatedAt,
        // Allotment fields (flat)
        allotment_id: registryAllotments.id,
        allotment_appropriationId: registryAllotments.appropriationId,
        allotment_objectOfExpenditureId: registryAllotments.objectOfExpenditureId,
        allotment_allotmentClass: registryAllotments.allotmentClass,
        allotment_amount: registryAllotments.amount,
        allotment_purpose: registryAllotments.purpose,
        // Appropriation fields (flat)
        appropriation_id: registryAppropriations.id,
        appropriation_fundClusterId: registryAppropriations.fundClusterId,
        appropriation_year: registryAppropriations.year,
        appropriation_reference: registryAppropriations.reference,
        appropriation_amount: registryAppropriations.amount,
        // Fund cluster fields (flat)
        fundCluster_id: fundClusters.id,
        fundCluster_code: fundClusters.code,
        fundCluster_name: fundClusters.name,
        // Object of Expenditure fields (flat)
        objectOfExpenditure_id: objectOfExpenditure.id,
        objectOfExpenditure_code: objectOfExpenditure.code,
        objectOfExpenditure_name: objectOfExpenditure.name,
        objectOfExpenditure_category: objectOfExpenditure.category
      })
      .from(registryObligations)
      .leftJoin(registryAllotments, eq(registryObligations.allotmentId, registryAllotments.id))
      .leftJoin(registryAppropriations, eq(registryAllotments.appropriationId, registryAppropriations.id))
      .leftJoin(fundClusters, eq(registryAppropriations.fundClusterId, fundClusters.id))
      .leftJoin(objectOfExpenditure, eq(registryAllotments.objectOfExpenditureId, objectOfExpenditure.id))
      .orderBy(desc(registryObligations.createdAt));

    const filters = [
      status ? eq(registryObligations.status, status) : undefined,
      id ? eq(registryObligations.id, id) : undefined
    ].filter(Boolean);

    const rows = filters.length
      ? await query.where(and(...filters))
      : await query;

    // Manually reconstruct nested structure
    return rows.map(row => ({
      id: row.id,
      allotmentId: row.allotmentId,
      payee: row.payee,
      particulars: row.particulars,
      amount: toNumber(row.amount),
      orsNumber: row.orsNumber,
      bursNumber: row.bursNumber,
      obligationDate: row.obligationDate,
      status: row.status,
      remarks: row.remarks,
      createdBy: row.createdBy,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      allotment: {
        id: row.allotment_id,
        appropriationId: row.allotment_appropriationId,
        objectOfExpenditureId: row.allotment_objectOfExpenditureId,
        allotmentClass: row.allotment_allotmentClass,
        amount: toNumber(row.allotment_amount),
        purpose: row.allotment_purpose,
        appropriation: {
          id: row.appropriation_id,
          fundClusterId: row.appropriation_fundClusterId,
          year: row.appropriation_year,
          reference: row.appropriation_reference,
          amount: toNumber(row.appropriation_amount),
          fundCluster: {
            id: row.fundCluster_id,
            code: row.fundCluster_code,
            name: row.fundCluster_name
          }
        },
        objectOfExpenditure: {
          id: row.objectOfExpenditure_id,
          code: row.objectOfExpenditure_code,
          name: row.objectOfExpenditure_name,
          category: row.objectOfExpenditure_category
        }
      }
    }));
  }

  // ---------------------------------------------------------------------------
  // Allotment modifications
  // ---------------------------------------------------------------------------

  /**
   * Augment, reduce or realign a released allotment. The allotment's amount becomes the final
   * budget, so every availability check uses it; the amount first released is kept as
   * original_amount. An augmentation must fit the appropriation, a reduction cannot take the
   * allotment below what is obligated or pending, and a realignment moves funds to another
   * allotment of the same appropriation.
   */
  async modifyAllotment(
    allotmentId: number,
    data: { type: 'augmentation' | 'reduction' | 'realignment'; amount: number; targetAllotmentId?: number; reference: string; reason?: string; date: Date },
    userId: number
  ) {
    if (!(data.amount > 0)) throw new Error('Enter an amount greater than zero');
    if (!data.reference?.trim()) throw new Error('Enter the reference of the authority for the change');
    const realignment = data.type === 'realignment';
    if (realignment && (!data.targetAllotmentId || data.targetAllotmentId === allotmentId)) throw new Error('Choose the allotment the funds move to');
    const amount = toCentavos(data.amount);

    await db.transaction(async (tx) => {
      const ids = realignment ? [allotmentId, data.targetAllotmentId!] : [allotmentId];
      const rows = await tx
        .select({ id: registryAllotments.id, appropriationId: registryAllotments.appropriationId, amount: registryAllotments.amount, originalAmount: registryAllotments.originalAmount })
        .from(registryAllotments)
        .where(inArray(registryAllotments.id, ids))
        .for('update');
      const source = rows.find(r => r.id === allotmentId);
      if (!source) throw new Error('Allotment not found');
      const target = realignment ? rows.find(r => r.id === data.targetAllotmentId) : undefined;
      if (realignment && !target) throw new Error('The allotment to realign to was not found');
      if (target && target.appropriationId !== source.appropriationId) {
        throw new Error('Funds can only be realigned between allotments of the same appropriation');
      }

      const apply = async (row: typeof source, delta: number, type: 'augmentation' | 'reduction' | 'realignment_in' | 'realignment_out', relatedId?: number) => {
        await tx
          .update(registryAllotments)
          .set({ amount: ((toCentavos(toNumber(row.amount)) + delta) / 100).toFixed(2), originalAmount: row.originalAmount ?? row.amount })
          .where(eq(registryAllotments.id, row.id));
        await tx.insert(allotmentModifications).values({
          allotmentId: row.id,
          modificationType: type,
          amount: (amount / 100).toFixed(2),
          relatedAllotmentId: relatedId ?? null,
          reference: data.reference.trim(),
          reason: data.reason?.trim() || null,
          modificationDate: data.date,
          createdBy: userId,
        });
      };

      if (data.type === 'augmentation') {
        const [appropriation] = await tx
          .select({ amount: registryAppropriations.amount })
          .from(registryAppropriations)
          .where(eq(registryAppropriations.id, source.appropriationId))
          .for('update');
        const [allotted] = await tx
          .select({ total: sum(registryAllotments.amount).mapWith(Number) })
          .from(registryAllotments)
          .where(eq(registryAllotments.appropriationId, source.appropriationId));
        const unallotted = toCentavos(toNumber(appropriation?.amount)) - toCentavos(toNumber(allotted?.total));
        if (amount > unallotted) throw new Error(`Only ₱${(unallotted / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })} of the appropriation is not yet allotted`);
        await apply(source, amount, 'augmentation');
        return;
      }

      // Funds already obligated or reserved by pending requests cannot be taken away
      const [committed] = await tx
        .select({ total: sum(registryObligations.amount).mapWith(Number) })
        .from(registryObligations)
        .where(and(eq(registryObligations.allotmentId, source.id), inArray(registryObligations.status, ['approved', 'pending'])));
      const free = toCentavos(toNumber(source.amount)) - toCentavos(toNumber(committed?.total));
      if (amount > free) throw new Error(`Only ₱${(Math.max(free, 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })} of this allotment is unobligated`);
      await apply(source, -amount, realignment ? 'realignment_out' : 'reduction', target?.id);
      if (target) await apply(target, amount, 'realignment_in', source.id);
    });

    await logAudit({
      userId,
      action: 'UPDATE',
      tableName: 'registry_allotments',
      recordId: allotmentId,
      newValues: { modification: data.type, amount: data.amount, targetAllotmentId: data.targetAllotmentId, reference: data.reference },
    });
  }

  /** Modifications of an allotment, newest first, with the other allotment of a realignment */
  async getAllotmentModifications(allotmentId: number) {
    const related = alias(registryAllotments, 'related_allotment');
    const relatedObject = alias(objectOfExpenditure, 'related_object');
    const rows = await db
      .select({
        id: allotmentModifications.id,
        modificationType: allotmentModifications.modificationType,
        amount: allotmentModifications.amount,
        reference: allotmentModifications.reference,
        reason: allotmentModifications.reason,
        modificationDate: allotmentModifications.modificationDate,
        relatedAllotmentId: allotmentModifications.relatedAllotmentId,
        relatedPurpose: related.purpose,
        relatedObjectCode: relatedObject.code,
        relatedObjectName: relatedObject.name,
      })
      .from(allotmentModifications)
      .leftJoin(related, eq(allotmentModifications.relatedAllotmentId, related.id))
      .leftJoin(relatedObject, eq(related.objectOfExpenditureId, relatedObject.id))
      .where(eq(allotmentModifications.allotmentId, allotmentId))
      .orderBy(desc(allotmentModifications.modificationDate), desc(allotmentModifications.id));
    return rows.map(r => ({ ...r, amount: toNumber(r.amount) }));
  }

  /** Other allotments of the same appropriation, which funds can be realigned to */
  async getRealignmentTargets(allotmentId: number) {
    const [allotment] = await db
      .select({ appropriationId: registryAllotments.appropriationId })
      .from(registryAllotments)
      .where(eq(registryAllotments.id, allotmentId))
      .limit(1);
    if (!allotment) return [];
    const rows = await db
      .select({
        id: registryAllotments.id,
        purpose: registryAllotments.purpose,
        allotmentClass: registryAllotments.allotmentClass,
        amount: registryAllotments.amount,
        objectCode: objectOfExpenditure.code,
        objectName: objectOfExpenditure.name,
      })
      .from(registryAllotments)
      .leftJoin(objectOfExpenditure, eq(registryAllotments.objectOfExpenditureId, objectOfExpenditure.id))
      .where(and(eq(registryAllotments.appropriationId, allotment.appropriationId), sql`${registryAllotments.id} <> ${allotmentId}`))
      .orderBy(objectOfExpenditure.code);
    return rows.map(r => ({ ...r, amount: toNumber(r.amount) }));
  }

  // ---------------------------------------------------------------------------
  // Revenue targets (budgeted receipts)
  // ---------------------------------------------------------------------------

  async getRevenueTargets(fiscalYear: number, fundClusterId?: number) {
    const rows = await db
      .select({
        id: revenueTargets.id,
        fiscalYear: revenueTargets.fiscalYear,
        fundClusterId: revenueTargets.fundClusterId,
        fundClusterCode: fundClusters.code,
        revenueSourceId: revenueTargets.revenueSourceId,
        sourceCode: revenueSources.code,
        sourceName: revenueSources.name,
        originalAmount: revenueTargets.originalAmount,
        amount: revenueTargets.amount,
        remarks: revenueTargets.remarks,
      })
      .from(revenueTargets)
      .innerJoin(revenueSources, eq(revenueTargets.revenueSourceId, revenueSources.id))
      .innerJoin(fundClusters, eq(revenueTargets.fundClusterId, fundClusters.id))
      .where(and(eq(revenueTargets.fiscalYear, fiscalYear), fundClusterId ? eq(revenueTargets.fundClusterId, fundClusterId) : undefined))
      .orderBy(fundClusters.code, revenueSources.code);
    return rows.map(r => ({ ...r, originalAmount: toNumber(r.originalAmount), amount: toNumber(r.amount) }));
  }

  /**
   * Set the budgeted receipts for a source. The first figure set is the original budget; later
   * changes update the final budget only.
   */
  async setRevenueTarget(data: { fiscalYear: number; fundClusterId: number; revenueSourceId: number; amount: number; remarks?: string }, userId: number) {
    if (!(data.amount >= 0)) throw new Error('Enter the budgeted amount');
    const amount = data.amount.toFixed(2);
    const [existing] = await db
      .select({ id: revenueTargets.id })
      .from(revenueTargets)
      .where(
        and(
          eq(revenueTargets.fiscalYear, data.fiscalYear),
          eq(revenueTargets.fundClusterId, data.fundClusterId),
          eq(revenueTargets.revenueSourceId, data.revenueSourceId)
        )
      )
      .limit(1);

    if (existing) {
      await db.update(revenueTargets).set({ amount, remarks: data.remarks?.trim() || null }).where(eq(revenueTargets.id, existing.id));
    } else {
      await db.insert(revenueTargets).values({
        fiscalYear: data.fiscalYear,
        fundClusterId: data.fundClusterId,
        revenueSourceId: data.revenueSourceId,
        originalAmount: amount,
        amount,
        remarks: data.remarks?.trim() || null,
        createdBy: userId,
      });
    }
    await logAudit({ userId, action: existing ? 'UPDATE' : 'CREATE', tableName: 'revenue_targets', recordId: existing?.id ?? 0, newValues: data });
  }

  async deleteRevenueTarget(id: number, userId: number) {
    await db.delete(revenueTargets).where(eq(revenueTargets.id, id));
    await logAudit({ userId, action: 'DELETE', tableName: 'revenue_targets', recordId: id });
  }
}

export const budgetService = new BudgetService();
