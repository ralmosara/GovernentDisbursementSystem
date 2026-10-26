import { db } from '../db/connection';
import { fundClusters } from '../db/schema';
import { eq } from 'drizzle-orm';
import { reportService } from '../services/report.service';

/**
 * COA budget and disbursement reports (BAR No. 1, FAR No. 1, 3 and 4) as one table definition
 * each, so the page, the Excel workbook and the PDF show exactly the same figures.
 */

export type ColumnType = 'text' | 'money' | 'percent' | 'number';
export type Cell = string | number | null;

export interface ReportColumn {
  header: string;
  type?: ColumnType;
  /** Excel column width in characters */
  width?: number;
}

export interface ReportSection {
  label?: string;
  rows: Cell[][];
  total?: Cell[];
}

export interface ReportTable {
  title: string;
  subtitle: string[];
  columns: ReportColumn[];
  sections: ReportSection[];
  total?: Cell[];
  /** Download name without extension */
  filename: string;
  /** Notes printed under the table */
  notes?: string[];
}

export const COA_REPORTS = {
  'bar-annual': 'BAR No. 1 – Budget Utilization (annual)',
  'bar-quarterly': 'BAR No. 1 – Quarterly Budget and Actual',
  'far-1': 'FAR No. 1 – Statement of Appropriations, Allotments, Obligations, Disbursements and Balances',
  'far-3': 'FAR No. 3 – Aging of Due and Demandable Obligations',
  'far-4': 'FAR No. 4 – Monthly Report of Disbursements',
} as const;
export type CoaReport = keyof typeof COA_REPORTS;

export const isCoaReport = (value: string | null): value is CoaReport => value !== null && value in COA_REPORTS;

const int = (value: string | null, fallback: number) => {
  const n = parseInt(value ?? '');
  return Number.isFinite(n) ? n : fallback;
};
const num = (value: unknown) => Number(value ?? 0) || 0;
const sum = (rows: Cell[][], index: number) => Math.round(rows.reduce((t, r) => t + num(r[index]), 0) * 100) / 100;
const dateText = (value: Date | string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

async function fundLabel(fundClusterId?: number) {
  if (!fundClusterId) return 'All fund clusters';
  const [cluster] = await db.select({ code: fundClusters.code, name: fundClusters.name }).from(fundClusters).where(eq(fundClusters.id, fundClusterId)).limit(1);
  return cluster ? `Fund Cluster ${cluster.code} – ${cluster.name}` : 'All fund clusters';
}

/** The report's parameters from a query string, with defaults */
export function reportParams(report: CoaReport, params: URLSearchParams) {
  const today = new Date();
  const fundClusterId = int(params.get('fund'), 0) || undefined;
  const year = int(params.get('year'), today.getFullYear());
  switch (report) {
    case 'bar-quarterly':
      return { fundClusterId, year, quarter: Math.min(Math.max(int(params.get('quarter'), Math.floor(today.getMonth() / 3) + 1), 1), 4) as 1 | 2 | 3 | 4 };
    case 'far-3': {
      const [y, m, d] = (params.get('asOf') ?? '').split('-').map(Number);
      return { fundClusterId, asOf: y && m && d ? new Date(y, m - 1, d, 23, 59, 59) : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59) };
    }
    case 'far-4': {
      const lastMonth = today.getMonth() === 0 ? 12 : today.getMonth();
      return { fundClusterId, year: int(params.get('year'), today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()), month: Math.min(Math.max(int(params.get('month'), lastMonth), 1), 12) };
    }
    default:
      return { fundClusterId, year };
  }
}

export async function buildCoaReport(report: CoaReport, params: URLSearchParams): Promise<ReportTable> {
  switch (report) {
    case 'bar-annual': {
      const { fundClusterId, year } = reportParams(report, params) as { fundClusterId?: number; year: number };
      const data = await reportService.getBARReport(year, fundClusterId);
      const rows: Cell[][] = data.items.map(i => [i.objectCode, i.objectName, i.appropriation, i.allotment, i.obligations, i.disbursements, i.unobligated, i.available, i.utilizationRate / 100]);
      return {
        title: COA_REPORTS[report],
        subtitle: [`Fiscal Year ${year}`, await fundLabel(fundClusterId)],
        columns: [
          { header: 'Object code', width: 14 },
          { header: 'Object of expenditure', width: 36 },
          { header: 'Appropriation', type: 'money' },
          { header: 'Allotment', type: 'money' },
          { header: 'Obligations', type: 'money' },
          { header: 'Disbursements', type: 'money' },
          { header: 'Unobligated allotment', type: 'money' },
          { header: 'Unallotted appropriation', type: 'money' },
          { header: 'Utilization', type: 'percent', width: 12 },
        ],
        sections: [{ rows }],
        total: ['', 'Total', data.totals.appropriation, data.totals.allotment, data.totals.obligations, data.totals.disbursements, data.totals.unobligated, data.totals.available, data.totals.utilizationRate / 100],
        filename: `BAR-No1-FY${year}`,
        notes: ['Appropriations are not itemised by object of expenditure: each object shows what was allotted to it, and the unallotted balance is a separate line.'],
      };
    }

    case 'bar-quarterly': {
      const { fundClusterId, year, quarter } = reportParams(report, params) as { fundClusterId?: number; year: number; quarter: 1 | 2 | 3 | 4 };
      const data = await reportService.generateBARNo1Quarterly({ year, quarter, fundClusterId });
      const rows: Cell[][] = data.data.map(d => [d.program.code, d.program.description, d.budget, d.actual, d.variance, d.utilizationRate / 100]);
      const budget = sum(rows, 2);
      const actual = sum(rows, 3);
      return {
        title: COA_REPORTS[report],
        subtitle: [`${data.period.quarterName} (${data.period.months.join(', ')})`, await fundLabel(fundClusterId)],
        columns: [
          { header: 'Object code', width: 14 },
          { header: 'Object of expenditure', width: 40 },
          { header: 'Allotment for the year', type: 'money' },
          { header: 'Disbursed in the quarter', type: 'money' },
          { header: 'Balance', type: 'money' },
          { header: 'Utilization', type: 'percent', width: 12 },
        ],
        sections: [{ rows }],
        total: ['', 'Total', budget, actual, Math.round((budget - actual) * 100) / 100, budget > 0 ? actual / budget : 0],
        filename: `BAR-No1-${year}-Q${quarter}`,
        notes: ['Disbursements are DVs dated in the quarter and paid by a cleared check or ADA, at their gross amount.'],
      };
    }

    case 'far-1': {
      const { fundClusterId, year } = reportParams(report, params) as { fundClusterId?: number; year: number };
      const data = await reportService.generateFARNo1({ fiscalYear: year, fundClusterId });
      const rows: Cell[][] = data.data
        .filter(d => d.appropriations || d.allotments || d.obligations || d.disbursements)
        .map(d => [`${d.fundCluster.code} – ${d.fundCluster.name}`, d.appropriations, d.allotments, d.obligations, d.disbursements, d.unallottedAppropriations, d.unobligatedAllotments, d.unpaidObligations]);
      const t = data.totals;
      return {
        title: COA_REPORTS[report],
        subtitle: [`Fiscal Year ${year}`, await fundLabel(fundClusterId)],
        columns: [
          { header: 'Fund cluster', width: 34 },
          { header: 'Appropriations', type: 'money' },
          { header: 'Allotments', type: 'money' },
          { header: 'Obligations', type: 'money' },
          { header: 'Disbursements', type: 'money' },
          { header: 'Unallotted appropriations', type: 'money' },
          { header: 'Unobligated allotments', type: 'money' },
          { header: 'Unpaid obligations', type: 'money' },
        ],
        sections: [{ rows }],
        total: ['Total', t.appropriations, t.allotments, t.obligations, t.disbursements, t.unallottedAppropriations, t.unobligatedAllotments, t.unpaidObligations],
        filename: `FAR-No1-FY${year}`,
        notes: ['Obligations are approved obligations; disbursements are DVs paid by a cleared check or ADA, at their gross amount.'],
      };
    }

    case 'far-3': {
      const { fundClusterId, asOf } = reportParams(report, params) as { fundClusterId?: number; asOf: Date };
      const data = await reportService.generateFARNo3({ asOfDate: asOf, fundClusterId });
      const buckets: [keyof typeof data.details, string][] = [
        ['current', 'Current (0–30 days)'],
        ['days31to60', '31–60 days'],
        ['days61to90', '61–90 days'],
        ['over90days', 'Over 90 days'],
      ];
      const sections: ReportSection[] = buckets
        .filter(([key]) => data.details[key].length > 0)
        .map(([key, label]) => {
          const rows: Cell[][] = data.details[key].map((o: any) => [o.orsBursNo ?? '', dateText(o.obligationDate), o.payee, o.particulars, o.fundClusterCode, o.age, num(o.amount)]);
          return { label, rows, total: ['', '', '', `Subtotal – ${label}`, '', rows.length, sum(rows, 6)] };
        });
      return {
        title: COA_REPORTS[report],
        subtitle: [`As of ${dateText(asOf)}`, await fundLabel(fundClusterId)],
        columns: [
          { header: 'ORS/BURS No.', width: 18 },
          { header: 'Date obligated', width: 14 },
          { header: 'Payee', width: 28 },
          { header: 'Particulars', width: 40 },
          { header: 'Fund', width: 8 },
          { header: 'Age (days)', type: 'number', width: 10 },
          { header: 'Amount', type: 'money' },
        ],
        sections,
        total: ['', '', '', 'Total unpaid obligations', '', data.grandTotal.count, Math.round(data.grandTotal.amount * 100) / 100],
        filename: `FAR-No3-${asOf.toLocaleDateString('en-CA')}`,
        notes: ['Approved obligations with no DV paid by a cleared check or ADA under the same ORS/BURS number.'],
      };
    }

    case 'far-4': {
      const { fundClusterId, year, month } = reportParams(report, params) as { fundClusterId?: number; year: number; month: number };
      const data = await reportService.generateFARNo4({ year, month, fundClusterId });
      const paymentLabel: Record<string, string> = { check_mds: 'MDS check', check_commercial: 'Commercial check', ada: 'ADA', cash: 'Cash' };
      const sections: ReportSection[] = data.byObjectOfExpenditure.map((group: any) => {
        const rows: Cell[][] = group.disbursements.map((d: any) => [
          dateText(d.dvDate),
          d.dvNo,
          d.payeeName,
          d.particulars,
          d.fundClusterCode,
          paymentLabel[d.paymentType] ?? d.paymentType,
          d.checkNumber ?? '',
          num(d.amount),
        ]);
        return { label: `${group.code} – ${group.name}`, rows, total: ['', '', '', `Subtotal – ${group.code}`, '', '', '', sum(rows, 7)] };
      });
      return {
        title: COA_REPORTS[report],
        subtitle: [`For the month of ${data.period.monthName} ${year}`, await fundLabel(fundClusterId)],
        columns: [
          { header: 'DV date', width: 13 },
          { header: 'DV No.', width: 16 },
          { header: 'Payee', width: 28 },
          { header: 'Particulars', width: 40 },
          { header: 'Fund', width: 8 },
          { header: 'Mode', width: 16 },
          { header: 'Check No.', width: 14 },
          { header: 'Amount', type: 'money' },
        ],
        sections,
        total: ['', '', '', `Total (${data.summary.totalCount} disbursements)`, '', '', '', Math.round(data.summary.totalAmount * 100) / 100],
        filename: `FAR-No4-${year}-${String(month).padStart(2, '0')}`,
        notes: ['DVs dated in the month and paid by a cleared check or ADA, grouped by object of expenditure.'],
      };
    }
  }
}
