import { db } from '../db/connection';
import {
  itineraryOfTravel,
  certificateTravelCompleted,
  liquidationReports,
  liquidationExpenseItems,
  users,
  fundClusters,
  disbursementVouchers,
  auditLogs
} from '../db/schema';
import { eq, and, desc, sql, gte, lte, or, isNull } from 'drizzle-orm';
import { generateSerialNumber } from '../utils/serial-generator';

export interface ItineraryInput {
  fundClusterId: number;
  employeeId: number;
  purpose: string;
  departureDate: Date;
  returnDate: Date;
  destination: string;
  itineraryBefore: any[];
  estimatedCost: number;
  cashAdvanceAmount?: number;
  createdBy: number;
}

export interface CTCInput {
  iotId: number;
  travelCompleted: boolean;
  actualDepartureDate: Date;
  actualReturnDate: Date;
  completionRemarks?: string;
  certifiedBy: number;
  verifiedBy?: number;
}

export interface LiquidationInput {
  iotId: number;
  ctcId?: number;
  fundClusterId: number;
  cashAdvanceAmount: number;
  cashAdvanceDvId?: number;
  expenseItems: ExpenseItem[];
  submittedBy: number;
}

export interface ExpenseItem {
  expenseDate: Date;
  expenseCategory: string;
  description: string;
  amount: number;
  orInvoiceNo?: string;
  orInvoiceDate?: Date;
}

export class TravelService {

  // ============================================
  // ITINERARY OF TRAVEL (IoT)
  // ============================================

  /**
   * Create new Itinerary of Travel
   */
  static async createIoT(input: ItineraryInput) {
    try {
      // Generate IoT number
      const iotNo = await generateSerialNumber('IOT');

      // Validate dates
      if (input.departureDate >= input.returnDate) {
        throw new Error('Return date must be after departure date');
      }

      // Validate cash advance
      if (input.cashAdvanceAmount && input.cashAdvanceAmount > input.estimatedCost) {
        throw new Error('Cash advance cannot exceed estimated cost');
      }

      // Create IoT record
      const [iot] = await db.insert(itineraryOfTravel).values({
        iotNo,
        fundClusterId: input.fundClusterId,
        employeeId: input.employeeId,
        purpose: input.purpose,
        departureDate: input.departureDate,
        returnDate: input.returnDate,
        destination: input.destination,
        itineraryBefore: input.itineraryBefore,
        estimatedCost: input.estimatedCost.toString(),
        cashAdvanceAmount: input.cashAdvanceAmount?.toString() || null,
        status: 'draft',
        createdBy: input.createdBy,
      });

      // Log action
      await this.logAudit({
        userId: input.createdBy,
        action: 'CREATE_IOT',
        tableName: 'itinerary_of_travel',
        recordId: iot.insertId,
        newValues: input,
      });

      return { success: true, iotId: iot.insertId, iotNo };
    } catch (error) {
      console.error('Error creating IoT:', error);
      throw error;
    }
  }

  /**
   * Submit IoT for approval
   */
  static async submitIoTForApproval(iotId: number, userId: number) {
    try {
      const [iot] = await db
        .select()
        .from(itineraryOfTravel)
        .where(eq(itineraryOfTravel.id, iotId))
        .limit(1);

      if (!iot) {
        throw new Error('IoT not found');
      }

      if (iot.status !== 'draft') {
        throw new Error('Only draft IoTs can be submitted for approval');
      }

      await db
        .update(itineraryOfTravel)
        .set({
          status: 'pending_approval',
          updatedAt: new Date()
        })
        .where(eq(itineraryOfTravel.id, iotId));

      await this.logAudit({
        userId,
        action: 'SUBMIT_IOT',
        tableName: 'itinerary_of_travel',
        recordId: iotId,
        oldValues: { status: iot.status },
        newValues: { status: 'pending_approval' },
      });

      return { success: true };
    } catch (error) {
      console.error('Error submitting IoT:', error);
      throw error;
    }
  }

  /**
   * Approve IoT
   */
  static async approveIoT(iotId: number, approvedBy: number) {
    try {
      const [iot] = await db
        .select()
        .from(itineraryOfTravel)
        .where(eq(itineraryOfTravel.id, iotId))
        .limit(1);

      if (!iot) {
        throw new Error('IoT not found');
      }

      if (iot.status !== 'pending_approval') {
        throw new Error('Only pending IoTs can be approved');
      }

      await db
        .update(itineraryOfTravel)
        .set({
          status: 'approved',
          approvedBy,
          approvedDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(itineraryOfTravel.id, iotId));

      await this.logAudit({
        userId: approvedBy,
        action: 'APPROVE_IOT',
        tableName: 'itinerary_of_travel',
        recordId: iotId,
        oldValues: { status: iot.status },
        newValues: { status: 'approved', approvedBy, approvedDate: new Date() },
      });

      return { success: true };
    } catch (error) {
      console.error('Error approving IoT:', error);
      throw error;
    }
  }

  /**
   * Mark travel as in progress
   */
  static async startTravel(iotId: number, userId: number) {
    try {
      const [iot] = await db
        .select()
        .from(itineraryOfTravel)
        .where(eq(itineraryOfTravel.id, iotId))
        .limit(1);

      if (!iot) {
        throw new Error('IoT not found');
      }

      if (iot.status !== 'approved') {
        throw new Error('Only approved IoTs can start travel');
      }

      await db
        .update(itineraryOfTravel)
        .set({
          status: 'in_progress',
          updatedAt: new Date()
        })
        .where(eq(itineraryOfTravel.id, iotId));

      await this.logAudit({
        userId,
        action: 'START_TRAVEL',
        tableName: 'itinerary_of_travel',
        recordId: iotId,
        oldValues: { status: iot.status },
        newValues: { status: 'in_progress' },
      });

      return { success: true };
    } catch (error) {
      console.error('Error starting travel:', error);
      throw error;
    }
  }

  /**
   * Get IoT by ID with related data
   */
  static async getIoTById(iotId: number) {
    try {
      const result = await db
        .select({
          iot: itineraryOfTravel,
          employee: users,
          fundCluster: fundClusters,
          createdByUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(itineraryOfTravel)
        .leftJoin(users, eq(itineraryOfTravel.employeeId, users.id))
        .leftJoin(fundClusters, eq(itineraryOfTravel.fundClusterId, fundClusters.id))
        .where(eq(itineraryOfTravel.id, iotId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error getting IoT:', error);
      throw error;
    }
  }

  /**
   * List all IoTs with filters
   */
  static async listIoTs(filters?: {
    status?: string;
    employeeId?: number;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      const conditions = [];

      if (filters?.status) {
        conditions.push(eq(itineraryOfTravel.status, filters.status as any));
      }

      if (filters?.employeeId) {
        conditions.push(eq(itineraryOfTravel.employeeId, filters.employeeId));
      }

      if (filters?.fromDate) {
        conditions.push(gte(itineraryOfTravel.departureDate, filters.fromDate));
      }

      if (filters?.toDate) {
        conditions.push(lte(itineraryOfTravel.returnDate, filters.toDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select({
          iot: itineraryOfTravel,
          employee: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            employeeNo: users.employeeNo,
          },
          fundCluster: fundClusters,
        })
        .from(itineraryOfTravel)
        .leftJoin(users, eq(itineraryOfTravel.employeeId, users.id))
        .leftJoin(fundClusters, eq(itineraryOfTravel.fundClusterId, fundClusters.id))
        .where(whereClause)
        .orderBy(desc(itineraryOfTravel.createdAt))
        .limit(filters?.limit || 50)
        .offset(filters?.offset || 0);

      return results;
    } catch (error) {
      console.error('Error listing IoTs:', error);
      throw error;
    }
  }

  // ============================================
  // CERTIFICATE OF TRAVEL COMPLETED (CTC)
  // ============================================

  /**
   * Create Certificate of Travel Completed
   */
  static async createCTC(input: CTCInput) {
    try {
      // Validate IoT exists and is in correct status
      const [iot] = await db
        .select()
        .from(itineraryOfTravel)
        .where(eq(itineraryOfTravel.id, input.iotId))
        .limit(1);

      if (!iot) {
        throw new Error('IoT not found');
      }

      if (iot.status !== 'in_progress' && iot.status !== 'completed') {
        throw new Error('Travel must be in progress to create CTC');
      }

      // Check if CTC already exists
      const existing = await db
        .select()
        .from(certificateTravelCompleted)
        .where(eq(certificateTravelCompleted.iotId, input.iotId))
        .limit(1);

      if (existing.length > 0) {
        throw new Error('CTC already exists for this IoT');
      }

      // Generate CTC number
      const ctcNo = await generateSerialNumber('CTC');

      // Create CTC
      const [ctc] = await db.insert(certificateTravelCompleted).values({
        iotId: input.iotId,
        ctcNo,
        travelCompleted: input.travelCompleted,
        actualDepartureDate: input.actualDepartureDate,
        actualReturnDate: input.actualReturnDate,
        completionRemarks: input.completionRemarks || null,
        certifiedBy: input.certifiedBy,
        certifiedDate: new Date(),
        verifiedBy: input.verifiedBy || null,
        verifiedDate: input.verifiedBy ? new Date() : null,
      });

      // Update IoT status
      await db
        .update(itineraryOfTravel)
        .set({
          status: 'completed',
          itineraryActual: iot.itineraryBefore,
          updatedAt: new Date()
        })
        .where(eq(itineraryOfTravel.id, input.iotId));

      await this.logAudit({
        userId: input.certifiedBy,
        action: 'CREATE_CTC',
        tableName: 'certificate_travel_completed',
        recordId: ctc.insertId,
        newValues: input,
      });

      return { success: true, ctcId: ctc.insertId, ctcNo };
    } catch (error) {
      console.error('Error creating CTC:', error);
      throw error;
    }
  }

  /**
   * Get CTC by IoT ID
   */
  static async getCTCByIoTId(iotId: number) {
    try {
      const result = await db
        .select({
          ctc: certificateTravelCompleted,
          certifiedByUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(certificateTravelCompleted)
        .leftJoin(users, eq(certificateTravelCompleted.certifiedBy, users.id))
        .where(eq(certificateTravelCompleted.iotId, iotId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error getting CTC:', error);
      throw error;
    }
  }

  // ============================================
  // LIQUIDATION REPORT (LR)
  // ============================================

  /**
   * Create Liquidation Report
   */
  static async createLiquidation(input: LiquidationInput) {
    try {
      // Validate IoT
      const [iot] = await db
        .select()
        .from(itineraryOfTravel)
        .where(eq(itineraryOfTravel.id, input.iotId))
        .limit(1);

      if (!iot) {
        throw new Error('IoT not found');
      }

      if (iot.status !== 'completed') {
        throw new Error('Travel must be completed before liquidation');
      }

      // Check if liquidation already exists
      const existing = await db
        .select()
        .from(liquidationReports)
        .where(eq(liquidationReports.iotId, input.iotId))
        .limit(1);

      if (existing.length > 0) {
        throw new Error('Liquidation report already exists for this IoT');
      }

      // Calculate total expenses
      const totalExpenses = input.expenseItems.reduce((sum, item) => sum + item.amount, 0);

      // Calculate refund or additional claim
      const balance = input.cashAdvanceAmount - totalExpenses;
      const refundAmount = balance > 0 ? balance : 0;
      const additionalClaim = balance < 0 ? Math.abs(balance) : 0;

      // Generate LR number
      const lrNo = await generateSerialNumber('LR');

      // Create liquidation report
      const [lr] = await db.insert(liquidationReports).values({
        lrNo,
        iotId: input.iotId,
        ctcId: input.ctcId || null,
        fundClusterId: input.fundClusterId,
        cashAdvanceAmount: input.cashAdvanceAmount.toString(),
        cashAdvanceDvId: input.cashAdvanceDvId || null,
        totalExpenses: totalExpenses.toString(),
        refundAmount: refundAmount > 0 ? refundAmount.toString() : null,
        additionalClaim: additionalClaim > 0 ? additionalClaim.toString() : null,
        status: 'draft',
        submittedBy: input.submittedBy,
      });

      // Insert expense items
      for (const item of input.expenseItems) {
        await db.insert(liquidationExpenseItems).values({
          lrId: lr.insertId,
          expenseDate: item.expenseDate,
          expenseCategory: item.expenseCategory,
          description: item.description,
          amount: item.amount.toString(),
          orInvoiceNo: item.orInvoiceNo || null,
          orInvoiceDate: item.orInvoiceDate || null,
        });
      }

      await this.logAudit({
        userId: input.submittedBy,
        action: 'CREATE_LIQUIDATION',
        tableName: 'liquidation_reports',
        recordId: lr.insertId,
        newValues: { ...input, totalExpenses, refundAmount, additionalClaim },
      });

      return {
        success: true,
        lrId: lr.insertId,
        lrNo,
        totalExpenses,
        refundAmount,
        additionalClaim
      };
    } catch (error) {
      console.error('Error creating liquidation:', error);
      throw error;
    }
  }

  /**
   * Submit liquidation for review
   */
  static async submitLiquidation(lrId: number, userId: number) {
    try {
      const [lr] = await db
        .select()
        .from(liquidationReports)
        .where(eq(liquidationReports.id, lrId))
        .limit(1);

      if (!lr) {
        throw new Error('Liquidation report not found');
      }

      if (lr.status !== 'draft') {
        throw new Error('Only draft liquidations can be submitted');
      }

      await db
        .update(liquidationReports)
        .set({
          status: 'pending_review',
          submittedDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(liquidationReports.id, lrId));

      await this.logAudit({
        userId,
        action: 'SUBMIT_LIQUIDATION',
        tableName: 'liquidation_reports',
        recordId: lrId,
        oldValues: { status: lr.status },
        newValues: { status: 'pending_review' },
      });

      return { success: true };
    } catch (error) {
      console.error('Error submitting liquidation:', error);
      throw error;
    }
  }

  /**
   * Approve liquidation
   */
  static async approveLiquidation(lrId: number, reviewedBy: number) {
    try {
      const [lr] = await db
        .select()
        .from(liquidationReports)
        .where(eq(liquidationReports.id, lrId))
        .limit(1);

      if (!lr) {
        throw new Error('Liquidation report not found');
      }

      if (lr.status !== 'pending_review') {
        throw new Error('Only pending liquidations can be approved');
      }

      await db
        .update(liquidationReports)
        .set({
          status: 'approved',
          reviewedBy,
          reviewedDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(liquidationReports.id, lrId));

      await this.logAudit({
        userId: reviewedBy,
        action: 'APPROVE_LIQUIDATION',
        tableName: 'liquidation_reports',
        recordId: lrId,
        oldValues: { status: lr.status },
        newValues: { status: 'approved', reviewedBy, reviewedDate: new Date() },
      });

      return { success: true };
    } catch (error) {
      console.error('Error approving liquidation:', error);
      throw error;
    }
  }

  /**
   * Get liquidation by IoT ID with expense items
   */
  static async getLiquidationByIoTId(iotId: number) {
    try {
      const [lr] = await db
        .select()
        .from(liquidationReports)
        .where(eq(liquidationReports.iotId, iotId))
        .limit(1);

      if (!lr) {
        return null;
      }

      const expenseItems = await db
        .select()
        .from(liquidationExpenseItems)
        .where(eq(liquidationExpenseItems.lrId, lr.id))
        .orderBy(liquidationExpenseItems.expenseDate);

      return { ...lr, expenseItems };
    } catch (error) {
      console.error('Error getting liquidation:', error);
      throw error;
    }
  }

  /**
   * Get liquidation by ID with all details
   */
  static async getLiquidationById(lrId: number) {
    try {
      const result = await db
        .select({
          lr: liquidationReports,
          iot: itineraryOfTravel,
          employee: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            employeeNo: users.employeeNo,
          },
          fundCluster: fundClusters,
        })
        .from(liquidationReports)
        .leftJoin(itineraryOfTravel, eq(liquidationReports.iotId, itineraryOfTravel.id))
        .leftJoin(users, eq(itineraryOfTravel.employeeId, users.id))
        .leftJoin(fundClusters, eq(liquidationReports.fundClusterId, fundClusters.id))
        .where(eq(liquidationReports.id, lrId))
        .limit(1);

      if (!result[0]) {
        return null;
      }

      const expenseItems = await db
        .select()
        .from(liquidationExpenseItems)
        .where(eq(liquidationExpenseItems.lrId, lrId))
        .orderBy(liquidationExpenseItems.expenseDate);

      return { ...result[0], expenseItems };
    } catch (error) {
      console.error('Error getting liquidation:', error);
      throw error;
    }
  }

  // ============================================
  // DASHBOARD & REPORTS
  // ============================================

  /**
   * Get pending travel approvals
   */
  static async getPendingApprovals() {
    try {
      const results = await db
        .select({
          iot: itineraryOfTravel,
          employee: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            employeeNo: users.employeeNo,
          },
          fundCluster: fundClusters,
        })
        .from(itineraryOfTravel)
        .leftJoin(users, eq(itineraryOfTravel.employeeId, users.id))
        .leftJoin(fundClusters, eq(itineraryOfTravel.fundClusterId, fundClusters.id))
        .where(eq(itineraryOfTravel.status, 'pending_approval'))
        .orderBy(itineraryOfTravel.createdAt);

      return results;
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      throw error;
    }
  }

  /**
   * Get outstanding cash advances
   */
  static async getOutstandingCashAdvances() {
    try {
      const results = await db
        .select({
          iot: itineraryOfTravel,
          employee: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            employeeNo: users.employeeNo,
          },
          fundCluster: fundClusters,
        })
        .from(itineraryOfTravel)
        .leftJoin(users, eq(itineraryOfTravel.employeeId, users.id))
        .leftJoin(fundClusters, eq(itineraryOfTravel.fundClusterId, fundClusters.id))
        .where(
          and(
            or(
              eq(itineraryOfTravel.status, 'completed'),
              eq(itineraryOfTravel.status, 'in_progress')
            ),
            sql`${itineraryOfTravel.cashAdvanceAmount} IS NOT NULL AND ${itineraryOfTravel.cashAdvanceAmount} > 0`,
            sql`NOT EXISTS (
              SELECT 1 FROM liquidation_reports lr
              WHERE lr.iot_id = ${itineraryOfTravel.id}
              AND lr.status = 'approved'
            )`
          )
        )
        .orderBy(itineraryOfTravel.departureDate);

      return results;
    } catch (error) {
      console.error('Error getting outstanding cash advances:', error);
      throw error;
    }
  }

  /**
   * Get unliquidated travels
   */
  static async getUnliquidatedTravels() {
    try {
      const results = await db
        .select({
          iot: itineraryOfTravel,
          employee: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            employeeNo: users.employeeNo,
          },
          fundCluster: fundClusters,
        })
        .from(itineraryOfTravel)
        .leftJoin(users, eq(itineraryOfTravel.employeeId, users.id))
        .leftJoin(fundClusters, eq(itineraryOfTravel.fundClusterId, fundClusters.id))
        .where(
          and(
            eq(itineraryOfTravel.status, 'completed'),
            sql`NOT EXISTS (
              SELECT 1 FROM liquidation_reports lr
              WHERE lr.iot_id = ${itineraryOfTravel.id}
            )`
          )
        )
        .orderBy(itineraryOfTravel.returnDate);

      return results;
    } catch (error) {
      console.error('Error getting unliquidated travels:', error);
      throw error;
    }
  }

  /**
   * Get travel statistics for dashboard
   */
  static async getTravelStats(fiscalYear?: number) {
    try {
      const year = fiscalYear || new Date().getFullYear();

      const stats = await db
        .select({
          totalTravels: sql<number>`COUNT(*)`,
          pendingApproval: sql<number>`SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END)`,
          approved: sql<number>`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`,
          inProgress: sql<number>`SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)`,
          completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
          totalEstimatedCost: sql<number>`SUM(estimated_cost)`,
          totalCashAdvance: sql<number>`SUM(COALESCE(cash_advance_amount, 0))`,
        })
        .from(itineraryOfTravel)
        .where(sql`YEAR(departure_date) = ${year}`);

      return stats[0];
    } catch (error) {
      console.error('Error getting travel stats:', error);
      throw error;
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Log audit trail
   */
  private static async logAudit(data: {
    userId: number;
    action: string;
    tableName: string;
    recordId: number;
    oldValues?: any;
    newValues?: any;
  }) {
    try {
      await db.insert(auditLogs).values({
        userId: data.userId,
        action: data.action,
        tableName: data.tableName,
        recordId: data.recordId,
        oldValues: data.oldValues || null,
        newValues: data.newValues || null,
        ipAddress: null,
        userAgent: null,
      });
    } catch (error) {
      console.error('Error logging audit:', error);
    }
  }

  /**
   * Link IoT to DV for cash advance
   */
  static async linkIoTToDV(iotId: number, dvId: number, userId: number) {
    try {
      const [iot] = await db
        .select()
        .from(itineraryOfTravel)
        .where(eq(itineraryOfTravel.id, iotId))
        .limit(1);

      if (!iot) {
        throw new Error('IoT not found');
      }

      if (iot.status !== 'approved') {
        throw new Error('Only approved IoTs can be linked to DV');
      }

      await db
        .update(itineraryOfTravel)
        .set({
          dvId,
          updatedAt: new Date()
        })
        .where(eq(itineraryOfTravel.id, iotId));

      await this.logAudit({
        userId,
        action: 'LINK_IOT_TO_DV',
        tableName: 'itinerary_of_travel',
        recordId: iotId,
        newValues: { dvId },
      });

      return { success: true };
    } catch (error) {
      console.error('Error linking IoT to DV:', error);
      throw error;
    }
  }
}
