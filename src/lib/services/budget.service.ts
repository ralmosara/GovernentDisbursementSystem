import { db } from '../db/connection';
import {
  registryAppropriations,
  registryAllotments,
  registryObligations,
  fundClusters,
  objectOfExpenditure,
  mfoPap
} from '../db/schema';
import { eq, and, sum, sql } from 'drizzle-orm';

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
    // Get the allotment details
    const allotment = await db.query.registryAllotments.findFirst({
      where: eq(registryAllotments.id, allotmentId),
      with: {
        appropriation: true
      }
    });

    if (!allotment) {
      throw new Error('Allotment not found');
    }

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

    const unobligatedBalance = allotment.amount - totalObligations;
    const availableBalance = allotment.amount - totalObligations - totalDisbursements;

    return {
      appropriation: allotment.appropriation?.amount || 0,
      allotment: allotment.amount,
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

    const summary = result[0] || { appropriation: 0, allotment: 0, obligation: 0 };

    return {
      ...summary,
      unobligatedBalance: (summary.allotment || 0) - (summary.obligation || 0),
      utilizationRate: summary.allotment ? ((summary.obligation || 0) / summary.allotment) * 100 : 0
    };
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
    // Verify appropriation exists
    const appropriation = await db.query.registryAppropriations.findFirst({
      where: eq(registryAppropriations.id, data.appropriationId)
    });

    if (!appropriation) {
      throw new Error('Appropriation not found');
    }

    // Check if total allotments would exceed appropriation
    const existingAllotments = await db
      .select({
        total: sum(registryAllotments.amount).mapWith(Number)
      })
      .from(registryAllotments)
      .where(eq(registryAllotments.appropriationId, data.appropriationId));

    const totalExistingAllotments = existingAllotments[0]?.total || 0;

    if (totalExistingAllotments + data.amount > appropriation.amount) {
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
    // Get the obligation
    const obligation = await db.query.registryObligations.findFirst({
      where: eq(registryObligations.id, obligationId)
    });

    if (!obligation) {
      throw new Error('Obligation not found');
    }

    if (obligation.status !== 'pending') {
      throw new Error('Only pending obligations can be approved');
    }

    // Check budget availability again
    const hasAvailableBudget = await this.checkBudgetAvailability(
      obligation.allotmentId,
      obligation.amount
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
   * Get all appropriations for a year
   */
  async getAppropriations(year: number) {
    const appropriations = await db.query.registryAppropriations.findMany({
      where: eq(registryAppropriations.year, year),
      with: {
        fundCluster: true
      },
      orderBy: (appropriations, { desc }) => [desc(appropriations.createdAt)]
    });

    return appropriations;
  }

  /**
   * Get all allotments for an appropriation
   */
  async getAllotments(appropriationId?: number) {
    const allotments = await db.query.registryAllotments.findMany({
      where: appropriationId
        ? eq(registryAllotments.appropriationId, appropriationId)
        : undefined,
      with: {
        appropriation: {
          with: {
            fundCluster: true
          }
        },
        objectOfExpenditure: true,
        mfoPap: true
      },
      orderBy: (allotments, { desc }) => [desc(allotments.createdAt)]
    });

    return allotments;
  }

  /**
   * Get all obligations
   */
  async getObligations(status?: string) {
    const obligations = await db.query.registryObligations.findMany({
      where: status ? eq(registryObligations.status, status) : undefined,
      with: {
        allotment: {
          with: {
            appropriation: {
              with: {
                fundCluster: true
              }
            },
            objectOfExpenditure: true
          }
        }
      },
      orderBy: (obligations, { desc }) => [desc(obligations.createdAt)]
    });

    return obligations;
  }
}

export const budgetService = new BudgetService();
