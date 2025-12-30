import { db } from '../db/connection';
import {
  registryAppropriations,
  registryAllotments,
  registryObligations,
  fundClusters,
  objectOfExpenditure,
  mfoPap
} from '../db/schema';
import { eq, and, sum, sql, desc } from 'drizzle-orm';

export interface BudgetAvailability {
  appropriation: number;
  allotment: number;
  obligation: number;
  disbursement: number;
  unobligatedBalance: number;
  availableBalance: number;
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

    // Calculate total obligations for this allotment
    const obligationsResult = await db
      .select({
        total: sum(registryObligations.amount).mapWith(Number)
      })
      .from(registryObligations)
      .where(
        and(
          eq(registryObligations.allotmentId, allotmentId),
          eq(registryObligations.status, 'approved')
        )
      );

    const totalObligations = obligationsResult[0]?.total || 0;

    // Calculate total disbursements (from approved DVs linked to obligations)
    // This will be implemented when we create the DV module
    const totalDisbursements = 0; // Placeholder

    const unobligatedBalance = allotment.allotment_amount - totalObligations;
    const availableBalance = allotment.allotment_amount - totalObligations - totalDisbursements;

    return {
      appropriation: allotment.appropriation_amount || 0,
      allotment: allotment.allotment_amount,
      obligation: totalObligations,
      disbursement: totalDisbursements,
      unobligatedBalance,
      availableBalance
    };
  }

  /**
   * Check if sufficient budget is available for an obligation
   */
  async checkBudgetAvailability(allotmentId: number, amount: number): Promise<boolean> {
    const availability = await this.getBudgetAvailability(allotmentId);
    return availability.unobligatedBalance >= amount;
  }

  /**
   * Get budget summary by fund cluster
   */
  async getBudgetSummaryByFundCluster(fundClusterId: number, year: number) {
    const result = await db
      .select({
        fundClusterCode: fundClusters.code,
        fundClusterName: fundClusters.name,
        appropriation: sum(registryAppropriations.amount).mapWith(Number),
        allotment: sum(registryAllotments.amount).mapWith(Number),
        obligation: sum(registryObligations.amount).mapWith(Number)
      })
      .from(registryAppropriations)
      .leftJoin(
        registryAllotments,
        eq(registryAppropriations.id, registryAllotments.appropriationId)
      )
      .leftJoin(
        registryObligations,
        and(
          eq(registryAllotments.id, registryObligations.allotmentId),
          eq(registryObligations.status, 'approved')
        )
      )
      .leftJoin(
        fundClusters,
        eq(registryAppropriations.fundClusterId, fundClusters.id)
      )
      .where(
        and(
          eq(registryAppropriations.fundClusterId, fundClusterId),
          eq(registryAppropriations.year, year)
        )
      )
      .groupBy(fundClusters.code, fundClusters.name);

    return result.map(row => ({
      ...row,
      unobligatedBalance: (row.allotment || 0) - (row.obligation || 0),
      utilizationRate: row.allotment ? ((row.obligation || 0) / row.allotment) * 100 : 0
    }));
  }

  /**
   * Get overall budget summary for the year
   */
  async getOverallBudgetSummary(year: number) {
    try {
      const result = await db
        .select({
          appropriation: sum(registryAppropriations.amount).mapWith(Number),
          allotment: sum(registryAllotments.amount).mapWith(Number),
          obligation: sum(registryObligations.amount).mapWith(Number)
        })
        .from(registryAppropriations)
        .leftJoin(
          registryAllotments,
          eq(registryAppropriations.id, registryAllotments.appropriationId)
        )
        .leftJoin(
          registryObligations,
          and(
            eq(registryAllotments.id, registryObligations.allotmentId),
            eq(registryObligations.status, 'approved')
          )
        )
        .where(eq(registryAppropriations.year, year));

      const summary = result[0] || { appropriation: null, allotment: null, obligation: null };

      return {
        appropriation: summary.appropriation || 0,
        allotment: summary.allotment || 0,
        obligation: summary.obligation || 0,
        unobligatedBalance: (summary.allotment || 0) - (summary.obligation || 0),
        utilizationRate: summary.allotment ? ((summary.obligation || 0) / summary.allotment) * 100 : 0
      };
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
      amount: data.amount,
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

    const totalExistingAllotments = existingAllotments[0]?.total || 0;

    if (totalExistingAllotments + data.amount > parseFloat(appropriation.amount.toString())) {
      throw new Error('Allotment amount exceeds available appropriation');
    }

    const [result] = await db.insert(registryAllotments).values({
      appropriationId: data.appropriationId,
      objectOfExpenditureId: data.objectOfExpenditureId,
      mfoPapId: data.mfoPapId,
      amount: data.amount,
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
      amount: data.amount,
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

    // Check budget availability again
    const hasAvailableBudget = await this.checkBudgetAvailability(
      obligation.allotmentId,
      parseFloat(obligation.amount.toString())
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

    return appropriations[0] || null;
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

    return appropriations;
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
        objectOfExpenditure_category: objectOfExpenditure.category
      })
      .from(registryAllotments)
      .leftJoin(registryAppropriations, eq(registryAllotments.appropriationId, registryAppropriations.id))
      .leftJoin(fundClusters, eq(registryAppropriations.fundClusterId, fundClusters.id))
      .leftJoin(objectOfExpenditure, eq(registryAllotments.objectOfExpenditureId, objectOfExpenditure.id))
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
      amount: row.amount,
      purpose: row.purpose,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      appropriation: {
        id: row.appropriation_id,
        fundClusterId: row.appropriation_fundClusterId,
        year: row.appropriation_year,
        reference: row.appropriation_reference,
        description: row.appropriation_description,
        amount: row.appropriation_amount,
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
  async getObligations(status?: string) {
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

    const rows = status
      ? await query.where(eq(registryObligations.status, status))
      : await query;

    // Manually reconstruct nested structure
    return rows.map(row => ({
      id: row.id,
      allotmentId: row.allotmentId,
      payee: row.payee,
      particulars: row.particulars,
      amount: row.amount,
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
        amount: row.allotment_amount,
        purpose: row.allotment_purpose,
        appropriation: {
          id: row.appropriation_id,
          fundClusterId: row.appropriation_fundClusterId,
          year: row.appropriation_year,
          reference: row.appropriation_reference,
          amount: row.appropriation_amount,
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
}

export const budgetService = new BudgetService();
