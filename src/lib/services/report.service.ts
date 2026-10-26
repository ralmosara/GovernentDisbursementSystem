import { db } from '../db/connection';
import {
  registryAppropriations,
  registryAllotments,
  registryObligations,
  disbursementVouchers,
  payments,
  fundClusters,
  objectOfExpenditure,
} from '../db/schema';
import { eq, and, or, sum, sql, desc, isNotNull } from 'drizzle-orm';

export interface BARReportData {
  fiscalYear: number;
  fundCluster: {
    id: number;
    code: string;
    name: string;
  } | null;
  reportDate: Date;
  items: BARReportItem[];
  totals: {
    appropriation: number;
    allotment: number;
    obligations: number;
    disbursements: number;
    unobligated: number;
    available: number;
    utilizationRate: number;
  };
}

export interface BARReportItem {
  objectCode: string;
  objectName: string;
  category: string;
  appropriation: number;
  allotment: number;
  obligations: number;
  disbursements: number;
  unobligated: number;
  available: number;
  utilizationRate: number;
}

export class ReportService {
  /**
   * Generate BAR No. 1 - Budget Accountability Report
   * Shows budget appropriations, allotments, obligations, and disbursements
   */
  async getBARReport(fiscalYear: number, fundClusterId?: number): Promise<BARReportData> {
    // Get fund cluster info if specified
    let fundCluster = null;
    if (fundClusterId) {
      const fcResult = await db
        .select()
        .from(fundClusters)
        .where(eq(fundClusters.id, fundClusterId))
        .limit(1);

      if (fcResult.length > 0) {
        fundCluster = {
          id: fcResult[0].id,
          code: fcResult[0].code,
          name: fcResult[0].name,
        };
      }
    }

    const [appropriationTotal, allotments, obligations, disbursements] = await Promise.all([
      this.appropriationTotal(fiscalYear, fundClusterId),
      this.allotmentsByObject(fiscalYear, fundClusterId),
      this.obligationsByObject(fiscalYear, fundClusterId),
      this.disbursementsByObject({ fiscalYear, fundClusterId }),
    ]);

    // Appropriations are not itemised by object of expenditure: each object's share is what
    // was allotted to it, and the rest of the appropriation is shown on its own line
    const item = (objectCode: string, objectName: string, category: string, appropriation: number, allotment: number, objectId?: number): BARReportItem => {
      const obligated = objectId ? obligations.get(objectId) ?? 0 : 0;
      return {
        objectCode,
        objectName,
        category,
        appropriation,
        allotment,
        obligations: obligated,
        disbursements: objectId ? disbursements.get(objectId) ?? 0 : 0,
        unobligated: allotment - obligated,
        available: appropriation - allotment,
        utilizationRate: appropriation > 0 ? (obligated / appropriation) * 100 : 0,
      };
    };
    const items = allotments.map(a => item(a.objectCode, a.objectName, a.category, a.total, a.total, a.objectId));
    const allotted = allotments.reduce((total, a) => total + a.total, 0);
    const unallotted = Math.round((appropriationTotal - allotted) * 100) / 100;
    if (unallotted !== 0) items.push(item('', 'Appropriations not yet allotted', '', unallotted, 0));

    // Calculate totals
    const totals = items.reduce(
      (acc, item) => ({
        appropriation: acc.appropriation + item.appropriation,
        allotment: acc.allotment + item.allotment,
        obligations: acc.obligations + item.obligations,
        disbursements: acc.disbursements + item.disbursements,
        unobligated: acc.unobligated + item.unobligated,
        available: acc.available + item.available,
        utilizationRate: 0, // Will calculate after
      }),
      {
        appropriation: 0,
        allotment: 0,
        obligations: 0,
        disbursements: 0,
        unobligated: 0,
        available: 0,
        utilizationRate: 0,
      }
    );

    // Calculate total utilization rate
    totals.utilizationRate =
      totals.appropriation > 0 ? (totals.obligations / totals.appropriation) * 100 : 0;

    return {
      fiscalYear,
      fundCluster,
      reportDate: new Date(),
      items,
      totals,
    };
  }

  // Budget figures are each summed in their own query: joining appropriations, allotments,
  // obligations and payments in one query repeats every amount once per row of the others.

  private appropriationFilter(fiscalYear: number, fundClusterId?: number) {
    return and(
      eq(registryAppropriations.year, fiscalYear),
      fundClusterId ? eq(registryAppropriations.fundClusterId, fundClusterId) : undefined
    );
  }

  private async appropriationTotal(fiscalYear: number, fundClusterId?: number): Promise<number> {
    const [row] = await db
      .select({ total: sum(registryAppropriations.amount).mapWith(Number) })
      .from(registryAppropriations)
      .where(this.appropriationFilter(fiscalYear, fundClusterId));
    return row?.total || 0;
  }

  /** Allotments per object of expenditure */
  private async allotmentsByObject(fiscalYear: number, fundClusterId?: number) {
    const rows = await db
      .select({
        objectId: objectOfExpenditure.id,
        objectCode: objectOfExpenditure.code,
        objectName: objectOfExpenditure.name,
        category: objectOfExpenditure.category,
        total: sum(registryAllotments.amount).mapWith(Number),
      })
      .from(registryAllotments)
      .innerJoin(registryAppropriations, eq(registryAllotments.appropriationId, registryAppropriations.id))
      .innerJoin(objectOfExpenditure, eq(registryAllotments.objectOfExpenditureId, objectOfExpenditure.id))
      .where(this.appropriationFilter(fiscalYear, fundClusterId))
      .groupBy(objectOfExpenditure.id, objectOfExpenditure.code, objectOfExpenditure.name, objectOfExpenditure.category)
      .orderBy(objectOfExpenditure.code);
    return rows.map(r => ({ ...r, total: r.total || 0 }));
  }

  /** Approved obligations per object of expenditure, keyed by object id */
  private async obligationsByObject(fiscalYear: number, fundClusterId?: number): Promise<Map<number, number>> {
    const rows = await db
      .select({ objectId: registryAllotments.objectOfExpenditureId, total: sum(registryObligations.amount).mapWith(Number) })
      .from(registryObligations)
      .innerJoin(registryAllotments, eq(registryObligations.allotmentId, registryAllotments.id))
      .innerJoin(registryAppropriations, eq(registryAllotments.appropriationId, registryAppropriations.id))
      .where(and(this.appropriationFilter(fiscalYear, fundClusterId), eq(registryObligations.status, 'approved')))
      .groupBy(registryAllotments.objectOfExpenditureId);
    return new Map(rows.map(r => [r.objectId, r.total || 0]));
  }

  /**
   * Disbursements per object of expenditure, keyed by object id: the gross amount of each DV
   * paid by a cleared check or ADA (taxes withheld are disbursed too, through the TRA). A DV
   * counts once however many payments it has. `months` limits to DVs dated in those months.
   */
  private async disbursementsByObject(params: { fiscalYear: number; fundClusterId?: number; months?: [number, number] }): Promise<Map<number, number>> {
    const { fiscalYear, fundClusterId, months } = params;
    const rows = await db
      .select({ objectId: disbursementVouchers.objectExpenditureId, total: sum(disbursementVouchers.amount).mapWith(Number) })
      .from(disbursementVouchers)
      .where(
        and(
          months
            ? sql`YEAR(${disbursementVouchers.dvDate}) = ${fiscalYear} AND MONTH(${disbursementVouchers.dvDate}) BETWEEN ${months[0]} AND ${months[1]}`
            : eq(disbursementVouchers.fiscalYear, fiscalYear),
          fundClusterId ? eq(disbursementVouchers.fundClusterId, fundClusterId) : undefined,
          sql`EXISTS (SELECT 1 FROM ${payments} WHERE ${payments.dvId} = ${disbursementVouchers.id} AND ${payments.status} = 'cleared')`
        )
      )
      .groupBy(disbursementVouchers.objectExpenditureId);
    // DVs with no object of expenditure are kept under 0 so totals still include them
    return new Map(rows.map(r => [r.objectId ?? 0, r.total || 0]));
  }

  /**
   * Get report metadata (agency info, certification details)
   */
  async getReportMetadata() {
    return {
      agencyName: 'Department of Budget and Management - Regional Office',
      agencyAddress: 'Regional Government Center, City',
      preparedBy: {
        name: 'Budget Officer',
        position: 'Budget Officer III',
      },
      reviewedBy: {
        name: 'Chief Accountant',
        position: 'Accountant IV',
      },
      approvedBy: {
        name: 'Regional Director',
        position: 'Regional Director',
      },
    };
  }

  /**
   * ========================================
   * COA REPORTING - FAR & BAR (Per Phases Document)
   * ========================================
   */

  /**
   * Generate FAR No. 1 (Per Phases) - Statement of Appropriations, Allotments, Obligations, Disbursements and Balances
   * Most comprehensive budget report showing complete budget cycle
   */
  async generateFARNo1(params: { fiscalYear: number; fundClusterId?: number }) {
    const { fiscalYear, fundClusterId } = params;

    // Get fund cluster(s)
    const fundQuery = fundClusterId
      ? db.select().from(fundClusters).where(eq(fundClusters.id, fundClusterId))
      : db.select().from(fundClusters);

    const funds = await fundQuery;
    const reportData = [];

    for (const fund of funds) {
      // Appropriations for this fund
      const appropriations = await db
        .select({
          total: sum(registryAppropriations.amount).mapWith(Number),
        })
        .from(registryAppropriations)
        .where(
          and(
            eq(registryAppropriations.fundClusterId, fund.id),
            eq(registryAppropriations.year, fiscalYear)
          )
        );

      // Allotments for this fund
      const allotments = await db
        .select({
          total: sum(registryAllotments.amount).mapWith(Number),
        })
        .from(registryAllotments)
        .innerJoin(
          registryAppropriations,
          eq(registryAllotments.appropriationId, registryAppropriations.id)
        )
        .where(
          and(
            eq(registryAppropriations.fundClusterId, fund.id),
            eq(registryAppropriations.year, fiscalYear)
          )
        );

      // Obligations for this fund
      const obligations = await db
        .select({
          total: sum(registryObligations.amount).mapWith(Number),
        })
        .from(registryObligations)
        .innerJoin(
          registryAllotments,
          eq(registryObligations.allotmentId, registryAllotments.id)
        )
        .innerJoin(
          registryAppropriations,
          eq(registryAllotments.appropriationId, registryAppropriations.id)
        )
        .where(
          and(
            eq(registryAppropriations.fundClusterId, fund.id),
            eq(registryAppropriations.year, fiscalYear),
            eq(registryObligations.status, 'approved')
          )
        );

      // Disbursements (DVs paid by a cleared check or ADA, each counted once) for this fund
      const disbursements = await this.disbursementsByObject({ fiscalYear, fundClusterId: fund.id });

      const appropriationTotal = appropriations[0]?.total || 0;
      const allotmentTotal = allotments[0]?.total || 0;
      const obligationTotal = obligations[0]?.total || 0;
      const disbursementTotal = [...disbursements.values()].reduce((total, amount) => total + amount, 0);

      reportData.push({
        fundCluster: {
          id: fund.id,
          code: fund.code,
          name: fund.name,
        },
        appropriations: appropriationTotal,
        allotments: allotmentTotal,
        obligations: obligationTotal,
        disbursements: disbursementTotal,
        unallottedAppropriations: appropriationTotal - allotmentTotal,
        unobligatedAllotments: allotmentTotal - obligationTotal,
        unpaidObligations: obligationTotal - disbursementTotal,
      });
    }

    return {
      reportType: 'FAR No. 1',
      fiscalYear,
      generatedAt: new Date(),
      data: reportData,
      totals: {
        appropriations: reportData.reduce((sum, item) => sum + item.appropriations, 0),
        allotments: reportData.reduce((sum, item) => sum + item.allotments, 0),
        obligations: reportData.reduce((sum, item) => sum + item.obligations, 0),
        disbursements: reportData.reduce((sum, item) => sum + item.disbursements, 0),
        unallottedAppropriations: reportData.reduce((sum, item) => sum + item.unallottedAppropriations, 0),
        unobligatedAllotments: reportData.reduce((sum, item) => sum + item.unobligatedAllotments, 0),
        unpaidObligations: reportData.reduce((sum, item) => sum + item.unpaidObligations, 0),
      },
    };
  }

  /**
   * Generate FAR No. 3 (Per Phases) - Aging of Due and Demandable Obligations
   * Categorizes obligations by age
   */
  async generateFARNo3(params: { asOfDate: Date; fundClusterId?: number }) {
    const { asOfDate, fundClusterId } = params;

    // Approved obligations not yet paid: no DV under the same ORS/BURS has a cleared payment
    const orsBursNo = sql<string | null>`COALESCE(${registryObligations.orsNumber}, ${registryObligations.bursNumber})`;
    const query = db
      .select({
        id: registryObligations.id,
        orsBursNo,
        obligationDate: registryObligations.obligationDate,
        payee: registryObligations.payee,
        particulars: registryObligations.particulars,
        amount: registryObligations.amount,
        fundClusterCode: fundClusters.code,
        fundClusterName: fundClusters.name,
      })
      .from(registryObligations)
      .innerJoin(
        registryAllotments,
        eq(registryObligations.allotmentId, registryAllotments.id)
      )
      .innerJoin(
        registryAppropriations,
        eq(registryAllotments.appropriationId, registryAppropriations.id)
      )
      .innerJoin(
        fundClusters,
        eq(registryAppropriations.fundClusterId, fundClusters.id)
      )
      .where(
        and(
          eq(registryObligations.status, 'approved'),
          sql`NOT EXISTS (SELECT 1 FROM ${disbursementVouchers}
            INNER JOIN ${payments} ON ${payments.dvId} = ${disbursementVouchers.id} AND ${payments.status} = 'cleared'
            WHERE ${disbursementVouchers.orsBursNo} IN (${registryObligations.orsNumber}, ${registryObligations.bursNumber}))`,
          sql`${registryObligations.obligationDate} <= ${asOfDate}`,
          fundClusterId ? sql`${fundClusters.id} = ${fundClusterId}` : sql`1=1`
        )
      );

    const obligations = await query;

    // Categorize by age
    const today = new Date(asOfDate);
    const aged = {
      current: [] as any[], // 0-30 days
      days31to60: [] as any[],
      days61to90: [] as any[],
      over90days: [] as any[],
    };

    obligations.forEach((obligation) => {
      const obligationDate = new Date(obligation.obligationDate);
      const age = Math.floor((today.getTime() - obligationDate.getTime()) / (1000 * 60 * 60 * 24));

      const item = { ...obligation, age };

      if (age <= 30) {
        aged.current.push(item);
      } else if (age <= 60) {
        aged.days31to60.push(item);
      } else if (age <= 90) {
        aged.days61to90.push(item);
      } else {
        aged.over90days.push(item);
      }
    });

    return {
      reportType: 'FAR No. 3',
      asOfDate,
      generatedAt: new Date(),
      summary: {
        current: {
          count: aged.current.length,
          total: aged.current.reduce((sum, o) => sum + parseFloat(o.amount.toString()), 0),
        },
        days31to60: {
          count: aged.days31to60.length,
          total: aged.days31to60.reduce((sum, o) => sum + parseFloat(o.amount.toString()), 0),
        },
        days61to90: {
          count: aged.days61to90.length,
          total: aged.days61to90.reduce((sum, o) => sum + parseFloat(o.amount.toString()), 0),
        },
        over90days: {
          count: aged.over90days.length,
          total: aged.over90days.reduce((sum, o) => sum + parseFloat(o.amount.toString()), 0),
        },
      },
      details: aged,
      grandTotal: {
        count: obligations.length,
        amount: obligations.reduce((sum, o) => sum + parseFloat(o.amount.toString()), 0),
      },
    };
  }

  /**
   * Generate FAR No. 4 (Per Phases) - Monthly Report of Disbursements
   * Most frequently generated report
   */
  async generateFARNo4(params: { year: number; month: number; fundClusterId?: number }) {
    const { year, month, fundClusterId } = params;

    // Get all paid DVs for the specified month
    const disbursements = await db
      .select({
        dvId: disbursementVouchers.id,
        dvNo: disbursementVouchers.dvNo,
        dvDate: disbursementVouchers.dvDate,
        payeeName: disbursementVouchers.payeeName,
        particulars: disbursementVouchers.particulars,
        amount: disbursementVouchers.amount,
        fundClusterCode: fundClusters.code,
        fundClusterName: fundClusters.name,
        objectCode: objectOfExpenditure.code,
        objectName: objectOfExpenditure.name,
        paymentDate: payments.paymentDate,
        paymentType: payments.paymentType,
        checkNumber: payments.checkNo,
      })
      .from(disbursementVouchers)
      .innerJoin(payments, eq(payments.dvId, disbursementVouchers.id))
      .innerJoin(fundClusters, eq(fundClusters.id, disbursementVouchers.fundClusterId))
      .innerJoin(objectOfExpenditure, eq(objectOfExpenditure.id, disbursementVouchers.objectExpenditureId))
      .where(
        and(
          sql`YEAR(${disbursementVouchers.dvDate}) = ${year}`,
          sql`MONTH(${disbursementVouchers.dvDate}) = ${month}`,
          eq(payments.status, 'cleared'),
          fundClusterId ? eq(disbursementVouchers.fundClusterId, fundClusterId) : sql`1=1`
        )
      )
      .orderBy(disbursementVouchers.dvDate, disbursementVouchers.dvNo);

    // Group by object of expenditure
    const byObjectOfExpenditure = disbursements.reduce((acc, dv) => {
      const key = dv.objectCode;
      if (!acc[key]) {
        acc[key] = {
          code: dv.objectCode,
          name: dv.objectName,
          disbursements: [],
          total: 0,
        };
      }
      acc[key].disbursements.push(dv);
      acc[key].total += parseFloat(dv.amount.toString());
      return acc;
    }, {} as Record<string, any>);

    // Group by fund cluster
    const byFundCluster = disbursements.reduce((acc, dv) => {
      const key = dv.fundClusterCode;
      if (!acc[key]) {
        acc[key] = {
          code: dv.fundClusterCode,
          name: dv.fundClusterName,
          disbursements: [],
          total: 0,
        };
      }
      acc[key].disbursements.push(dv);
      acc[key].total += parseFloat(dv.amount.toString());
      return acc;
    }, {} as Record<string, any>);

    return {
      reportType: 'FAR No. 4',
      period: {
        year,
        month,
        monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' }),
      },
      generatedAt: new Date(),
      disbursements,
      byObjectOfExpenditure: Object.values(byObjectOfExpenditure),
      byFundCluster: Object.values(byFundCluster),
      summary: {
        totalCount: disbursements.length,
        totalAmount: disbursements.reduce((sum, dv) => sum + parseFloat(dv.amount.toString()), 0),
        byPaymentType: {
          check: disbursements.filter(d => d.paymentType === 'check_mds' || d.paymentType === 'check_commercial').length,
          ada: disbursements.filter(d => d.paymentType === 'ada').length,
        },
      },
    };
  }

  /**
   * Generate BAR No. 1 (Per Phases) - Quarterly Physical Report of Operations
   * Budget vs Actual performance by MFO/PAP
   */
  async generateBARNo1Quarterly(params: {
    year: number;
    quarter: 1 | 2 | 3 | 4;
    fundClusterId?: number;
  }) {
    const { year, quarter, fundClusterId } = params;

    // Quarter to months mapping
    const quarterMonths = {
      1: [1, 2, 3],
      2: [4, 5, 6],
      3: [7, 8, 9],
      4: [10, 11, 12],
    };

    const months = quarterMonths[quarter];
    const startMonth = months[0];
    const endMonth = months[2];

    // Budget (the year's allotments) and actual (disbursements dated in the quarter) per object
    // of expenditure, each summed on its own
    const [allotments, disbursed, objects] = await Promise.all([
      this.allotmentsByObject(year, fundClusterId),
      this.disbursementsByObject({ fiscalYear: year, fundClusterId, months: [startMonth, endMonth] }),
      db
        .select({ objectId: objectOfExpenditure.id, objectCode: objectOfExpenditure.code, objectName: objectOfExpenditure.name, category: objectOfExpenditure.category })
        .from(objectOfExpenditure),
    ]);
    const budgetActual = objects
      .filter(o => allotments.some(a => a.objectId === o.objectId) || disbursed.has(o.objectId))
      .sort((a, b) => a.objectCode.localeCompare(b.objectCode))
      .map(o => ({
        objectId: o.objectId,
        objectCode: o.objectCode,
        objectName: o.objectName,
        objectCategory: o.category,
        budget: allotments.find(a => a.objectId === o.objectId)?.total ?? 0,
        actual: disbursed.get(o.objectId) ?? 0,
      }));

    const reportData = budgetActual.map((item) => {
      const budget = item.budget || 0;
      const actual = item.actual || 0;
      const variance = budget - actual;
      const utilizationRate = budget > 0 ? (actual / budget) * 100 : 0;

      return {
        program: {
          id: item.objectId,
          code: item.objectCode,
          description: item.objectName,
          category: item.objectCategory,
        },
        budget,
        actual,
        variance,
        utilizationRate,
        status:
          utilizationRate >= 90
            ? 'on-track'
            : utilizationRate >= 70
            ? 'at-risk'
            : 'below-target',
      };
    });

    return {
      reportType: 'BAR No. 1',
      period: {
        year,
        quarter,
        quarterName: `Q${quarter} ${year}`,
        months: months.map(m =>
          new Date(year, m - 1).toLocaleDateString('en-US', { month: 'long' })
        ),
      },
      generatedAt: new Date(),
      data: reportData,
      summary: {
        totalBudget: reportData.reduce((sum, item) => sum + item.budget, 0),
        totalActual: reportData.reduce((sum, item) => sum + item.actual, 0),
        totalVariance: reportData.reduce((sum, item) => sum + item.variance, 0),
        averageUtilization:
          reportData.length > 0
            ? reportData.reduce((sum, item) => sum + item.utilizationRate, 0) / reportData.length
            : 0,
        programsOnTrack: reportData.filter(item => item.status === 'on-track').length,
        programsAtRisk: reportData.filter(item => item.status === 'at-risk').length,
        programsBelowTarget: reportData.filter(item => item.status === 'below-target').length,
      },
    };
  }
}

export const reportService = new ReportService();
