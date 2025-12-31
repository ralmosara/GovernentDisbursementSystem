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
import { eq, and, sum, sql, desc, isNotNull } from 'drizzle-orm';

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

export interface FARBalanceSheetData {
  asOfDate: Date;
  fundCluster: {
    id: number;
    code: string;
    name: string;
  } | null;
  reportDate: Date;
  assets: {
    currentAssets: {
      cash: { [fundCode: string]: number };
      accountsReceivable: number;
      total: number;
    };
    nonCurrentAssets: {
      land: number;
      buildings: number;
      equipment: number;
      total: number;
    };
    total: number;
  };
  liabilities: {
    currentLiabilities: {
      accountsPayable: number;
      dueToOtherFunds: number;
      total: number;
    };
    total: number;
  };
  netWorth: number;
}

export interface FARCashFlowData {
  fromDate: Date;
  toDate: Date;
  fundCluster: {
    id: number;
    code: string;
    name: string;
  } | null;
  reportDate: Date;
  openingBalance: number;
  sources: {
    revenueCollections: number;
    allotmentsReceived: number;
    otherReceipts: number;
    total: number;
  };
  applications: {
    personnelServices: number;
    mooe: number;
    capitalOutlay: number;
    total: number;
  };
  closingBalance: number;
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

    // Build base query for aggregating budget data by object of expenditure
    const baseConditions = [eq(registryAppropriations.year, fiscalYear)];
    if (fundClusterId) {
      baseConditions.push(eq(registryAppropriations.fundClusterId, fundClusterId));
    }

    // Get budget data grouped by object of expenditure
    const budgetData = await db
      .select({
        objectCode: objectOfExpenditure.code,
        objectName: objectOfExpenditure.name,
        objectCategory: objectOfExpenditure.category,
        appropriation: sum(registryAppropriations.amount).mapWith(Number),
        allotment: sum(registryAllotments.amount).mapWith(Number),
        obligations: sum(
          sql`CASE WHEN ${registryObligations.status} = 'approved' THEN ${registryObligations.amount} ELSE 0 END`
        ).mapWith(Number),
      })
      .from(registryAppropriations)
      .leftJoin(
        registryAllotments,
        eq(registryAppropriations.id, registryAllotments.appropriationId)
      )
      .leftJoin(
        objectOfExpenditure,
        eq(registryAllotments.objectOfExpenditureId, objectOfExpenditure.id)
      )
      .leftJoin(
        registryObligations,
        eq(registryAllotments.id, registryObligations.allotmentId)
      )
      .where(and(...baseConditions))
      .groupBy(
        objectOfExpenditure.id,
        objectOfExpenditure.code,
        objectOfExpenditure.name,
        objectOfExpenditure.category
      );

    // Get disbursements (cleared payments only) grouped by object of expenditure
    const disbursementConditions = [
      eq(disbursementVouchers.fiscalYear, fiscalYear),
      eq(payments.status, 'cleared'),
    ];
    if (fundClusterId) {
      disbursementConditions.push(eq(disbursementVouchers.fundClusterId, fundClusterId));
    }

    const disbursementData = await db
      .select({
        objectCode: objectOfExpenditure.code,
        disbursements: sum(payments.amount).mapWith(Number),
      })
      .from(payments)
      .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id))
      .leftJoin(
        objectOfExpenditure,
        eq(disbursementVouchers.objectExpenditureId, objectOfExpenditure.id)
      )
      .where(and(...disbursementConditions))
      .groupBy(objectOfExpenditure.code);

    // Create disbursement lookup map
    const disbursementMap = new Map<string, number>();
    disbursementData.forEach((item) => {
      if (item.objectCode) {
        disbursementMap.set(item.objectCode, item.disbursements || 0);
      }
    });

    // Combine budget and disbursement data
    const items: BARReportItem[] = budgetData
      .filter((row) => row.objectCode) // Only include rows with object codes
      .map((row) => {
        const appropriation = row.appropriation || 0;
        const allotment = row.allotment || 0;
        const obligations = row.obligations || 0;
        const disbursements = disbursementMap.get(row.objectCode!) || 0;
        const unobligated = allotment - obligations;
        const available = appropriation - allotment;
        const utilizationRate = appropriation > 0 ? (obligations / appropriation) * 100 : 0;

        return {
          objectCode: row.objectCode!,
          objectName: row.objectName!,
          category: row.objectCategory!,
          appropriation,
          allotment,
          obligations,
          disbursements,
          unobligated,
          available,
          utilizationRate,
        };
      });

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

  /**
   * Generate FAR No. 1 - Statement of Assets, Liabilities & Net Worth
   * Shows financial position as of a specific date
   */
  async getFARBalanceSheet(asOfDate: Date, fundClusterId?: number): Promise<FARBalanceSheetData> {
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

    // ASSETS - Cash (cleared payments represent cash outflows)
    // For a government entity, cash is calculated as NCA received minus disbursements
    const cashConditions = [
      eq(payments.status, 'cleared'),
      sql`${payments.clearedDate} <= ${asOfDate}`,
    ];
    if (fundClusterId) {
      cashConditions.push(eq(disbursementVouchers.fundClusterId, fundClusterId));
    }

    const cashDisbursements = await db
      .select({
        fundCode: fundClusters.code,
        totalDisbursed: sum(payments.amount).mapWith(Number),
      })
      .from(payments)
      .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id))
      .leftJoin(fundClusters, eq(disbursementVouchers.fundClusterId, fundClusters.id))
      .where(and(...cashConditions))
      .groupBy(fundClusters.code);

    const cashByFund: { [fundCode: string]: number } = {};
    cashDisbursements.forEach((item) => {
      if (item.fundCode) {
        // This is negative because it's disbursement
        // In real scenario, you'd add NCA received - disbursements
        // For now, showing disbursements as placeholder
        cashByFund[item.fundCode] = -(item.totalDisbursed || 0);
      }
    });

    // ASSETS - Accounts Receivable (placeholder)
    const accountsReceivable = 0;

    // ASSETS - Fixed Assets (placeholder - would come from fixedAssets table)
    const land = 0;
    const buildings = 0;
    const equipment = 0;

    const currentAssetsTotal = Object.values(cashByFund).reduce((sum, val) => sum + val, 0) + accountsReceivable;
    const nonCurrentAssetsTotal = land + buildings + equipment;
    const totalAssets = currentAssetsTotal + nonCurrentAssetsTotal;

    // LIABILITIES - Accounts Payable (approved DVs not yet paid)
    const apConditions = [
      eq(disbursementVouchers.status, 'approved'),
      sql`${disbursementVouchers.dvDate} <= ${asOfDate}`,
    ];
    if (fundClusterId) {
      apConditions.push(eq(disbursementVouchers.fundClusterId, fundClusterId));
    }

    const accountsPayableResult = await db
      .select({
        total: sum(disbursementVouchers.amount).mapWith(Number),
      })
      .from(disbursementVouchers)
      .leftJoin(payments, and(
        eq(disbursementVouchers.id, payments.dvId),
        eq(payments.status, 'cleared')
      ))
      .where(and(...apConditions, sql`${payments.id} IS NULL`));

    const accountsPayable = accountsPayableResult[0]?.total || 0;

    // LIABILITIES - Due to Other Funds (placeholder)
    const dueToOtherFunds = 0;

    const currentLiabilitiesTotal = accountsPayable + dueToOtherFunds;
    const totalLiabilities = currentLiabilitiesTotal;

    // NET WORTH
    const netWorth = totalAssets - totalLiabilities;

    return {
      asOfDate,
      fundCluster,
      reportDate: new Date(),
      assets: {
        currentAssets: {
          cash: cashByFund,
          accountsReceivable,
          total: currentAssetsTotal,
        },
        nonCurrentAssets: {
          land,
          buildings,
          equipment,
          total: nonCurrentAssetsTotal,
        },
        total: totalAssets,
      },
      liabilities: {
        currentLiabilities: {
          accountsPayable,
          dueToOtherFunds,
          total: currentLiabilitiesTotal,
        },
        total: totalLiabilities,
      },
      netWorth,
    };
  }

  /**
   * Generate FAR No. 3 - Statement of Sources and Application of Funds
   * Shows cash flow for a period
   */
  async getFARCashFlow(
    fromDate: Date,
    toDate: Date,
    fundClusterId?: number
  ): Promise<FARCashFlowData> {
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

    // Calculate opening balance (cleared payments before fromDate)
    const openingConditions = [
      eq(payments.status, 'cleared'),
      sql`${payments.clearedDate} < ${fromDate}`,
    ];
    if (fundClusterId) {
      openingConditions.push(eq(disbursementVouchers.fundClusterId, fundClusterId));
    }

    const openingDisbursements = await db
      .select({
        total: sum(payments.amount).mapWith(Number),
      })
      .from(payments)
      .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id))
      .where(and(...openingConditions));

    // Opening balance is negative of disbursements (simplified - in reality add NCA received)
    const openingBalance = -(openingDisbursements[0]?.total || 0);

    // SOURCES - Revenue Collections (placeholder - would come from revenues table)
    const revenueCollections = 0;

    // SOURCES - Allotments Received (sum of allotments for the period)
    const allotmentConditions = [
      sql`${registryAllotments.createdAt} >= ${fromDate}`,
      sql`${registryAllotments.createdAt} <= ${toDate}`,
    ];
    if (fundClusterId) {
      allotmentConditions.push(eq(registryAppropriations.fundClusterId, fundClusterId));
    }

    const allotmentsResult = await db
      .select({
        total: sum(registryAllotments.amount).mapWith(Number),
      })
      .from(registryAllotments)
      .innerJoin(
        registryAppropriations,
        eq(registryAllotments.appropriationId, registryAppropriations.id)
      )
      .where(and(...allotmentConditions));

    const allotmentsReceived = allotmentsResult[0]?.total || 0;

    // SOURCES - Other Receipts (placeholder)
    const otherReceipts = 0;

    const totalSources = revenueCollections + allotmentsReceived + otherReceipts;

    // APPLICATIONS - Disbursements by category
    const applicationConditions = [
      eq(payments.status, 'cleared'),
      sql`${payments.clearedDate} >= ${fromDate}`,
      sql`${payments.clearedDate} <= ${toDate}`,
    ];
    if (fundClusterId) {
      applicationConditions.push(eq(disbursementVouchers.fundClusterId, fundClusterId));
    }

    const applicationsByCategory = await db
      .select({
        category: objectOfExpenditure.category,
        total: sum(payments.amount).mapWith(Number),
      })
      .from(payments)
      .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id))
      .leftJoin(
        objectOfExpenditure,
        eq(disbursementVouchers.objectExpenditureId, objectOfExpenditure.id)
      )
      .where(and(...applicationConditions))
      .groupBy(objectOfExpenditure.category);

    let personnelServices = 0;
    let mooe = 0;
    let capitalOutlay = 0;

    applicationsByCategory.forEach((item) => {
      const amount = item.total || 0;
      if (item.category?.includes('Personal Services') || item.category?.includes('Salaries')) {
        personnelServices += amount;
      } else if (item.category?.includes('Capital Outlay') || item.category?.includes('Equipment')) {
        capitalOutlay += amount;
      } else {
        mooe += amount; // Maintenance and Other Operating Expenses
      }
    });

    const totalApplications = personnelServices + mooe + capitalOutlay;

    // Calculate closing balance
    const closingBalance = openingBalance + totalSources - totalApplications;

    return {
      fromDate,
      toDate,
      fundCluster,
      reportDate: new Date(),
      openingBalance,
      sources: {
        revenueCollections,
        allotmentsReceived,
        otherReceipts,
        total: totalSources,
      },
      applications: {
        personnelServices,
        mooe,
        capitalOutlay,
        total: totalApplications,
      },
      closingBalance,
    };
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
}

export const reportService = new ReportService();
