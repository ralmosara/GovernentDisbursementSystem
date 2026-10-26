import { db } from '../db/connection';
import {
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  payments,
  disbursementVouchers,
  objectOfExpenditure,
  registryAppropriations,
  registryAllotments,
  registryObligations,
  fundClusters,
  revenueTargets,
  revenueSources,
  cashReceipts,
  collections,
  accountsReceivable,
} from '../db/schema';
import { and, eq, gte, inArray, lt, lte, notInArray, sql, type SQL } from 'drizzle-orm';
import { ACCOUNTS, debitAccountFor } from './ledger.service';

/**
 * General purpose financial statements (PPSAS / GAM for NGAs), built from the posted
 * journal entries:
 *   Statement of Financial Position          balances as of a date, with the prior year-end
 *   Statement of Financial Performance       revenue and expenses for a period
 *   Statement of Changes in Net Assets/Equity
 *   Statement of Cash Flows (direct method)  each cash movement classified by its counter-entry
 *   Statement of Comparison of Budget and Actual Amounts  budgeted against collected receipts, and
 *                                            allotments against obligations (from the budget registries)
 *
 * Year-end closing entries are left out of period figures; otherwise a closed year would show
 * no revenue or expenses. Each builder takes one or more columns (current, comparative) and
 * works in centavos so totals foot exactly.
 */

/** An account's net balance; positive is a debit balance */
export interface AccountBalance {
  code: string;
  title: string;
  balance: number;
}

export interface StatementLine {
  code: string;
  title: string;
  amounts: number[];
}

export interface StatementGroup {
  label: string;
  lines: StatementLine[];
  totals: number[];
}

interface GroupDef {
  prefix: string;
  label: string;
}

const CLOSING_SOURCES = ['closing', 'closing_reversal'];
const toCentavos = (value: number) => Math.round(value * 100);
const sum = (columns: number[][]) => columns[0]?.map((_, i) => columns.reduce((total, c) => total + c[i], 0)) ?? [];
const zeros = (n: number) => Array.from({ length: n }, () => 0);
const pesos = (centavos: number[]) => centavos.map(c => c / 100);

/**
 * Group the accounts `include` selects, by code prefix in definition order. Amounts are
 * multiplied by `sign` (1 for debit-normal, -1 for credit-normal presentation).
 * Accounts matching no definition go in a group labelled `fallback`.
 */
export function groupAccounts(columns: AccountBalance[][], include: (code: string) => boolean, defs: GroupDef[], fallback: string, sign: 1 | -1): StatementGroup[] {
  const n = columns.length;
  const lines = new Map<string, { code: string; title: string; amounts: number[] }>();
  columns.forEach((balances, i) => {
    for (const b of balances) {
      if (!include(b.code)) continue;
      const line = lines.get(b.code) ?? { code: b.code, title: b.title, amounts: zeros(n) };
      line.amounts[i] += sign * toCentavos(b.balance);
      lines.set(b.code, line);
    }
  });

  const groups = [...defs.map(d => ({ label: d.label, prefix: d.prefix })), { label: fallback, prefix: '' }].map(d => ({
    label: d.label,
    prefix: d.prefix,
    lines: [] as { code: string; title: string; amounts: number[] }[],
  }));
  const sorted = [...lines.values()].filter(l => l.amounts.some(a => a !== 0)).sort((a, b) => a.code.localeCompare(b.code));
  for (const line of sorted) {
    const group = groups.find(g => g.prefix && line.code.startsWith(g.prefix)) ?? groups[groups.length - 1];
    group.lines.push(line);
  }

  return groups
    .filter(g => g.lines.length > 0)
    .map(g => ({
      label: g.label,
      lines: g.lines.map(l => ({ ...l, amounts: pesos(l.amounts) })),
      totals: pesos(sum(g.lines.map(l => l.amounts))),
    }));
}

const totalOf = (groups: StatementGroup[], n: number) =>
  groups.length ? pesos(sum(groups.map(g => g.totals.map(toCentavos)))) : zeros(n);

// ---------------------------------------------------------------------------
// Statement of Financial Position
// ---------------------------------------------------------------------------

const CURRENT_ASSETS: GroupDef[] = [
  { prefix: '101', label: 'Cash and cash equivalents' },
  { prefix: '102', label: 'Investments' },
  { prefix: '103', label: 'Receivables' },
  { prefix: '104', label: 'Inventories' },
  { prefix: '105', label: 'Prepayments and deferred charges' },
  { prefix: '199', label: 'Other current assets' },
];
const NON_CURRENT_ASSETS: GroupDef[] = [
  { prefix: '106', label: 'Property, plant and equipment' },
  { prefix: '107', label: 'Biological assets' },
  { prefix: '108', label: 'Intangible assets' },
];
const CURRENT_LIABILITIES: GroupDef[] = [
  { prefix: '201', label: 'Financial liabilities' },
  { prefix: '202', label: 'Inter-agency payables' },
  { prefix: '203', label: 'Intra-agency payables' },
  { prefix: '204', label: 'Trust liabilities' },
  { prefix: '205', label: 'Deferred credits/unearned income' },
  { prefix: '206', label: 'Provisions' },
  { prefix: '299', label: 'Other payables' },
];

const isCurrentAsset = (code: string) => CURRENT_ASSETS.some(d => code.startsWith(d.prefix));
const isCurrentLiability = (code: string) => CURRENT_LIABILITIES.some(d => code.startsWith(d.prefix));

export function buildFinancialPosition(columns: AccountBalance[][]) {
  const n = columns.length;
  const currentAssets = groupAccounts(columns, c => c.startsWith('1') && isCurrentAsset(c), CURRENT_ASSETS, 'Other current assets', 1);
  const nonCurrentAssets = groupAccounts(columns, c => c.startsWith('1') && !isCurrentAsset(c), NON_CURRENT_ASSETS, 'Other non-current assets', 1);
  const currentLiabilities = groupAccounts(columns, c => c.startsWith('2') && isCurrentLiability(c), CURRENT_LIABILITIES, 'Other current liabilities', -1);
  const nonCurrentLiabilities = groupAccounts(columns, c => c.startsWith('2') && !isCurrentLiability(c), [], 'Non-current liabilities', -1);

  // Equity accounts, plus revenue less expenses not yet closed to Accumulated Surplus/(Deficit)
  const equityAccounts = groupAccounts(columns, c => c.startsWith('3'), [], 'Net assets/equity', -1);
  const unclosed = columns.map(balances => -balances.filter(b => b.code[0] === '4' || b.code[0] === '5').reduce((t, b) => t + toCentavos(b.balance), 0));
  const equityLines = [...(equityAccounts[0]?.lines ?? [])];
  if (unclosed.some(c => c !== 0)) {
    equityLines.push({ code: '', title: 'Surplus/(deficit) for the period, not yet closed', amounts: pesos(unclosed) });
  }
  const equity: StatementGroup[] = equityLines.length
    ? [{ label: 'Net assets/equity', lines: equityLines, totals: pesos(sum(equityLines.map(l => l.amounts.map(toCentavos)))) }]
    : [];

  const totals = {
    currentAssets: totalOf(currentAssets, n),
    nonCurrentAssets: totalOf(nonCurrentAssets, n),
    currentLiabilities: totalOf(currentLiabilities, n),
    nonCurrentLiabilities: totalOf(nonCurrentLiabilities, n),
    equity: totalOf(equity, n),
  };
  const assets = pesos(sum([totals.currentAssets, totals.nonCurrentAssets].map(t => t.map(toCentavos))));
  const liabilities = pesos(sum([totals.currentLiabilities, totals.nonCurrentLiabilities].map(t => t.map(toCentavos))));
  const liabilitiesAndEquity = pesos(sum([liabilities, totals.equity].map(t => t.map(toCentavos))));

  return {
    currentAssets,
    nonCurrentAssets,
    currentLiabilities,
    nonCurrentLiabilities,
    equity,
    totals: { ...totals, assets, liabilities, liabilitiesAndEquity },
    balanced: assets.every((a, i) => toCentavos(a) === toCentavos(liabilitiesAndEquity[i])),
  };
}

// ---------------------------------------------------------------------------
// Statement of Financial Performance
// ---------------------------------------------------------------------------

const REVENUE: GroupDef[] = [
  { prefix: '401', label: 'Tax revenue' },
  { prefix: '402', label: 'Service and business income' },
  { prefix: '404', label: 'Shares, grants and donations' },
  { prefix: '406', label: 'Miscellaneous income' },
];
const EXPENSES: GroupDef[] = [
  { prefix: '501', label: 'Personnel services' },
  { prefix: '502', label: 'Maintenance and other operating expenses' },
  { prefix: '503', label: 'Financial expenses and assistance' },
  { prefix: '504', label: 'Direct costs' },
  { prefix: '505', label: 'Non-cash expenses' },
  { prefix: '506', label: 'Capital outlay charged to expense' },
];
const isSubsidy = (code: string) => code.startsWith('403');
const isGain = (code: string) => code.startsWith('405');
const isLoss = (code: string) => code.startsWith('50504');

export function buildFinancialPerformance(columns: AccountBalance[][]) {
  const n = columns.length;
  const revenue = groupAccounts(columns, c => c[0] === '4' && !isSubsidy(c) && !isGain(c), REVENUE, 'Other revenue', -1);
  const expenses = groupAccounts(columns, c => c[0] === '5' && !isLoss(c), EXPENSES, 'Other expenses', 1);
  const gains = groupAccounts(columns, isGain, [], 'Gains', -1);
  const losses = groupAccounts(columns, isLoss, [], 'Losses', 1);
  const subsidy = groupAccounts(columns, isSubsidy, [], 'Financial assistance/subsidy from National Government', -1);

  const c = (values: number[]) => values.map(toCentavos);
  const t = {
    revenue: totalOf(revenue, n),
    expenses: totalOf(expenses, n),
    gains: totalOf(gains, n),
    losses: totalOf(losses, n),
    subsidy: totalOf(subsidy, n),
  };
  const fromOperations = c(t.revenue).map((r, i) => r - c(t.expenses)[i]);
  const beforeSubsidy = fromOperations.map((v, i) => v + c(t.gains)[i] - c(t.losses)[i]);
  const surplus = beforeSubsidy.map((v, i) => v + c(t.subsidy)[i]);

  return {
    revenue,
    expenses,
    gains,
    losses,
    subsidy,
    totals: { ...t, fromOperations: pesos(fromOperations), beforeSubsidy: pesos(beforeSubsidy), surplus: pesos(surplus) },
  };
}

// ---------------------------------------------------------------------------
// Statement of Changes in Net Assets/Equity
// ---------------------------------------------------------------------------

/** Net assets/equity in a set of balances: equity accounts plus unclosed revenue less expenses */
export function equityOf(balances: AccountBalance[]): number {
  return -balances.filter(b => ['3', '4', '5'].includes(b.code[0])).reduce((t, b) => t + toCentavos(b.balance), 0) / 100;
}

/**
 * @param opening balances before the period
 * @param period  movements in the period, without closing entries
 * @param closing balances at the end of the period
 */
export function buildChangesInEquity(opening: AccountBalance[], period: AccountBalance[], closing: AccountBalance[]) {
  const surplus = -period.filter(b => b.code[0] === '4' || b.code[0] === '5').reduce((t, b) => t + toCentavos(b.balance), 0);
  const adjustments = period
    .filter(b => b.code[0] === '3' && toCentavos(b.balance) !== 0)
    .map(b => ({ code: b.code, title: b.title, amount: -toCentavos(b.balance) / 100 }));
  const start = toCentavos(equityOf(opening));
  const end = toCentavos(equityOf(closing));
  const changes = surplus + adjustments.reduce((t, a) => t + toCentavos(a.amount), 0);
  return {
    opening: start / 100,
    surplus: surplus / 100,
    adjustments,
    changes: changes / 100,
    closing: end / 100,
    reconciles: start + changes === end,
  };
}

// ---------------------------------------------------------------------------
// Statement of Cash Flows (direct method)
// ---------------------------------------------------------------------------

export type CashActivity = 'operating' | 'investing' | 'financing';

export interface CashEntry {
  id: number;
  /** A payment of a capital outlay DV (or its reversal) */
  capital: boolean;
  lines: { accountCode: string; debit: number; credit: number }[];
}

export interface CashFlowItem {
  activity: CashActivity;
  label: string;
  direction: 'inflow' | 'outflow';
  /** Net cash effect: positive increases cash */
  amount: number;
}

export const isCashAccount = (code: string) => code.startsWith('101');

/**
 * Classify one entry's effect on cash by the account on the other side. Entries that only
 * move money between cash accounts (deposits, transfers) have no net effect and return null.
 */
export function classifyCashEntry(entry: CashEntry): CashFlowItem | null {
  const net = (l: CashEntry['lines'][number]) => toCentavos(l.debit) - toCentavos(l.credit);
  const cash = entry.lines.filter(l => isCashAccount(l.accountCode)).reduce((t, l) => t + net(l), 0);
  if (cash === 0) return null;

  const counter = entry.lines
    .filter(l => !isCashAccount(l.accountCode))
    .sort((a, b) => Math.abs(net(b)) - Math.abs(net(a)))[0]?.accountCode ?? '';
  const amount = cash / 100;
  const item = (activity: CashActivity, label: string, direction: 'inflow' | 'outflow'): CashFlowItem => ({ activity, label, direction, amount });

  if (entry.capital || counter.startsWith('106')) {
    return cash > 0 && !entry.capital
      ? item('investing', 'Proceeds from sale of property, plant and equipment', 'inflow')
      : item('investing', 'Purchase/construction of property, plant and equipment', 'outflow');
  }
  if (counter === ACCOUNTS.SUBSIDY_FROM_NG) return item('operating', 'Receipt of Notice of Cash Allocation', 'inflow');
  if (counter.startsWith('4')) return item('operating', 'Collection of income/revenue', 'inflow');
  if (counter.startsWith('103')) return item('operating', 'Collection of receivables', 'inflow');
  if (counter.startsWith('199')) {
    return cash > 0 ? item('operating', 'Refund of unused cash advances', 'inflow') : item('operating', 'Grant of cash advances', 'outflow');
  }
  if (counter === ACCOUNTS.DUE_TO_OFFICERS_EMPLOYEES) return item('operating', 'Payment of personnel services', 'outflow');
  if (counter.startsWith('202')) return item('operating', 'Remittance of taxes and contributions', 'outflow');
  if (counter.startsWith('201') || counter.startsWith('299')) return item('operating', 'Payment to suppliers and creditors', 'outflow');
  if (counter.startsWith('5')) return item('operating', 'Payment of expenses', 'outflow');
  return cash > 0 ? item('operating', 'Other receipts', 'inflow') : item('operating', 'Other disbursements', 'outflow');
}

export function buildCashFlows(entries: CashEntry[], openingCash: number, closingCash: number) {
  const activities = (['operating', 'investing', 'financing'] as const).map(activity => ({
    activity,
    inflows: new Map<string, number>(),
    outflows: new Map<string, number>(),
  }));
  for (const entry of entries) {
    const item = classifyCashEntry(entry);
    if (!item) continue;
    const bucket = activities.find(a => a.activity === item.activity)!;
    const lines = item.direction === 'inflow' ? bucket.inflows : bucket.outflows;
    lines.set(item.label, (lines.get(item.label) ?? 0) + toCentavos(item.amount));
  }

  const sections = activities.map(a => {
    // Outflows are shown as positive amounts and subtracted
    const inflows = [...a.inflows].map(([label, c]) => ({ label, amount: c / 100 }));
    const outflows = [...a.outflows].map(([label, c]) => ({ label, amount: -c / 100 }));
    const totalIn = [...a.inflows.values()].reduce((t, c) => t + c, 0);
    const totalOut = -[...a.outflows.values()].reduce((t, c) => t + c, 0);
    return { activity: a.activity, inflows, outflows, totalInflows: totalIn / 100, totalOutflows: totalOut / 100, net: (totalIn - totalOut) / 100 };
  });
  const netChange = sections.reduce((t, s) => t + toCentavos(s.net), 0);
  return {
    sections,
    netChange: netChange / 100,
    openingCash,
    closingCash,
    reconciles: toCentavos(openingCash) + netChange === toCentavos(closingCash),
  };
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Statement of Comparison of Budget and Actual Amounts
// ---------------------------------------------------------------------------

export const ALLOTMENT_CLASSES: Record<string, string> = {
  PS: 'Personnel Services',
  MOOE: 'Maintenance and Other Operating Expenses',
  FA: 'Financial Assistance',
  CO: 'Capital Outlay',
};

export interface BudgetClassAmounts {
  allotmentClass: string;
  /** As first released, before modifications */
  original: number;
  /** After augmentations, reductions and realignments */
  allotted: number;
  obligated: number;
}

export interface ReceiptAmounts {
  label: string;
  original: number;
  final: number;
  actual: number;
}

export interface BudgetComparisonLine {
  label: string;
  original: number;
  final: number;
  actual: number;
  difference: number;
}

const comparisonLine = (label: string, original: number, final: number, actual: number): BudgetComparisonLine => ({
  label,
  original: original / 100,
  final: final / 100,
  actual: actual / 100,
  difference: (final - actual) / 100,
});

/**
 * Receipts by revenue source (budgeted against collected) and payments by allotment class:
 * the payments budget is what was allotted (original as released, final after modifications)
 * and the actual amount on a comparable (obligation) basis is what was obligated.
 * Appropriations not yet allotted are budget with no actual.
 */
export function buildBudgetComparison(classes: BudgetClassAmounts[], appropriation: number, receipts: ReceiptAmounts[] = []) {
  const order = Object.keys(ALLOTMENT_CLASSES);
  const sorted = [...classes].sort((a, b) => {
    const ia = order.indexOf(a.allotmentClass);
    const ib = order.indexOf(b.allotmentClass);
    return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib) || a.allotmentClass.localeCompare(b.allotmentClass);
  });
  const total = (values: number[]) => values.reduce((sum, v) => sum + v, 0);

  const lines = sorted.map(c =>
    comparisonLine(ALLOTMENT_CLASSES[c.allotmentClass] ?? c.allotmentClass, toCentavos(c.original), toCentavos(c.allotted), toCentavos(c.obligated))
  );
  const original = total(sorted.map(c => toCentavos(c.original)));
  const allotted = total(sorted.map(c => toCentavos(c.allotted)));
  const obligated = total(sorted.map(c => toCentavos(c.obligated)));
  const appropriated = toCentavos(appropriation);
  if (appropriated !== original || appropriated !== allotted) {
    lines.push(comparisonLine('Appropriations not yet allotted', appropriated - original, appropriated - allotted, 0));
  }

  const receiptLines = receipts.map(r => comparisonLine(r.label, toCentavos(r.original), toCentavos(r.final), toCentavos(r.actual)));
  return {
    receipts: {
      lines: receiptLines,
      total: comparisonLine(
        'Total receipts',
        total(receipts.map(r => toCentavos(r.original))),
        total(receipts.map(r => toCentavos(r.final))),
        total(receipts.map(r => toCentavos(r.actual)))
      ),
    },
    lines,
    total: comparisonLine('Total payments', Math.max(appropriated, original), Math.max(appropriated, allotted), obligated),
  };
}

export class FinancialStatementsService {
  /** Net balance of every account with activity, for entries matching the conditions */
  private async balances(conditions: (SQL | undefined)[]): Promise<AccountBalance[]> {
    const rows = await db
      .select({
        code: journalEntryLines.accountCode,
        title: chartOfAccounts.title,
        debit: sql<string>`SUM(${journalEntryLines.debit})`,
        credit: sql<string>`SUM(${journalEntryLines.credit})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .leftJoin(chartOfAccounts, eq(journalEntryLines.accountCode, chartOfAccounts.code))
      .where(and(...conditions))
      .groupBy(journalEntryLines.accountCode, chartOfAccounts.title);
    return rows.map(r => ({ code: r.code, title: r.title ?? r.code, balance: (Math.round(parseFloat(r.debit) * 100) - Math.round(parseFloat(r.credit) * 100)) / 100 }));
  }

  private fund(fundClusterId?: number) {
    return fundClusterId ? eq(journalEntries.fundClusterId, fundClusterId) : undefined;
  }

  /** Balances at the end of a day */
  balancesAsOf(asOf: Date, fundClusterId?: number) {
    return this.balances([lte(journalEntries.jevDate, asOf), this.fund(fundClusterId)]);
  }

  /** Balances before a day */
  balancesBefore(date: Date, fundClusterId?: number) {
    return this.balances([lt(journalEntries.jevDate, date), this.fund(fundClusterId)]);
  }

  /** Movements in a period, without year-end closing entries */
  periodMovements(from: Date, to: Date, fundClusterId?: number) {
    return this.balances([
      gte(journalEntries.jevDate, from),
      lte(journalEntries.jevDate, to),
      notInArray(journalEntries.sourceType, CLOSING_SOURCES),
      this.fund(fundClusterId),
    ]);
  }

  async getFinancialPosition(asOf: Date, comparativeAsOf: Date | null, fundClusterId?: number) {
    const columns = [await this.balancesAsOf(asOf, fundClusterId)];
    if (comparativeAsOf) columns.push(await this.balancesAsOf(comparativeAsOf, fundClusterId));
    return buildFinancialPosition(columns);
  }

  async getFinancialPerformance(periods: { from: Date; to: Date }[], fundClusterId?: number) {
    const columns = await Promise.all(periods.map(p => this.periodMovements(p.from, p.to, fundClusterId)));
    return buildFinancialPerformance(columns);
  }

  async getChangesInEquity(from: Date, to: Date, fundClusterId?: number) {
    const [opening, period, closing] = await Promise.all([
      this.balancesBefore(from, fundClusterId),
      this.periodMovements(from, to, fundClusterId),
      this.balancesAsOf(to, fundClusterId),
    ]);
    return buildChangesInEquity(opening, period, closing);
  }

  async getCashFlows(from: Date, to: Date, fundClusterId?: number) {
    const cashTotal = (balances: AccountBalance[]) =>
      balances.filter(b => isCashAccount(b.code)).reduce((t, b) => t + Math.round(b.balance * 100), 0) / 100;

    const headers = await db
      .select({ id: journalEntries.id, sourceType: journalEntries.sourceType, sourceId: journalEntries.sourceId, reversesId: journalEntries.reversesId })
      .from(journalEntries)
      .where(
        and(
          gte(journalEntries.jevDate, from),
          lte(journalEntries.jevDate, to),
          notInArray(journalEntries.sourceType, CLOSING_SOURCES),
          this.fund(fundClusterId),
          sql`EXISTS (SELECT 1 FROM ${journalEntryLines} WHERE ${journalEntryLines.journalEntryId} = ${journalEntries.id} AND ${journalEntryLines.accountCode} LIKE '101%')`
        )
      );

    const ids = headers.map(h => h.id);
    const lines = ids.length
      ? await db
          .select({ journalEntryId: journalEntryLines.journalEntryId, accountCode: journalEntryLines.accountCode, debit: journalEntryLines.debit, credit: journalEntryLines.credit })
          .from(journalEntryLines)
          .where(inArray(journalEntryLines.journalEntryId, ids))
      : [];

    // Payments (and reversed payments) of capital outlay DVs are investing activities
    const reversedIds = headers.filter(h => h.sourceType === 'payment_reversal' && h.reversesId).map(h => h.reversesId!);
    const reversed = reversedIds.length
      ? await db.select({ id: journalEntries.id, sourceId: journalEntries.sourceId }).from(journalEntries).where(inArray(journalEntries.id, reversedIds))
      : [];
    const paymentIdOf = (h: (typeof headers)[number]) =>
      h.sourceType === 'payment' ? h.sourceId : h.sourceType === 'payment_reversal' ? reversed.find(r => r.id === h.reversesId)?.sourceId ?? null : null;
    const paymentIds = [...new Set(headers.map(paymentIdOf).filter((id): id is number => id !== null))];
    const capitalPayments = new Set<number>();
    if (paymentIds.length) {
      const rows = await db
        .select({ id: payments.id, code: objectOfExpenditure.code })
        .from(payments)
        .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id))
        .leftJoin(objectOfExpenditure, eq(disbursementVouchers.objectExpenditureId, objectOfExpenditure.id))
        .where(inArray(payments.id, paymentIds));
      for (const row of rows) if (row.code && debitAccountFor(row.code).startsWith('106')) capitalPayments.add(row.id);
    }

    const entries: CashEntry[] = headers.map(h => {
      const paymentId = paymentIdOf(h);
      return {
        id: h.id,
        capital: paymentId !== null && capitalPayments.has(paymentId),
        lines: lines
          .filter(l => l.journalEntryId === h.id)
          .map(l => ({ accountCode: l.accountCode, debit: parseFloat(l.debit), credit: parseFloat(l.credit) })),
      };
    });

    const [opening, closing] = await Promise.all([this.balancesBefore(from, fundClusterId), this.balancesAsOf(to, fundClusterId)]);
    return buildCashFlows(entries, cashTotal(opening), cashTotal(closing));
  }

  async getBudgetComparison(year: number, fundClusterId?: number) {
    const appropriationFilter = and(
      eq(registryAppropriations.year, year),
      fundClusterId ? eq(registryAppropriations.fundClusterId, fundClusterId) : undefined
    );
    const [[appropriation], allotments, obligations] = await Promise.all([
      db.select({ total: sql<string>`COALESCE(SUM(${registryAppropriations.amount}), 0)` }).from(registryAppropriations).where(appropriationFilter),
      db
        .select({
          allotmentClass: registryAllotments.allotmentClass,
          original: sql<string>`SUM(COALESCE(${registryAllotments.originalAmount}, ${registryAllotments.amount}))`,
          total: sql<string>`SUM(${registryAllotments.amount})`,
        })
        .from(registryAllotments)
        .innerJoin(registryAppropriations, eq(registryAllotments.appropriationId, registryAppropriations.id))
        .where(appropriationFilter)
        .groupBy(registryAllotments.allotmentClass),
      db
        .select({ allotmentClass: registryAllotments.allotmentClass, total: sql<string>`SUM(${registryObligations.amount})` })
        .from(registryObligations)
        .innerJoin(registryAllotments, eq(registryObligations.allotmentId, registryAllotments.id))
        .innerJoin(registryAppropriations, eq(registryAllotments.appropriationId, registryAppropriations.id))
        .where(and(appropriationFilter, eq(registryObligations.status, 'approved')))
        .groupBy(registryAllotments.allotmentClass),
    ]);

    const classes = allotments.map(a => ({
      allotmentClass: a.allotmentClass,
      original: Number(a.original ?? 0),
      allotted: Number(a.total ?? 0),
      obligated: Number(obligations.find(o => o.allotmentClass === a.allotmentClass)?.total ?? 0),
    }));
    return buildBudgetComparison(classes, Number(appropriation?.total ?? 0), await this.receiptsComparison(year, fundClusterId));
  }

  /**
   * Budgeted receipts per revenue source against collections in the year: official receipts
   * plus collections on receivables (which the ledger books to fund cluster 01).
   */
  private async receiptsComparison(year: number, fundClusterId?: number): Promise<ReceiptAmounts[]> {
    const [defaultFund] = await db.select({ id: fundClusters.id }).from(fundClusters).where(eq(fundClusters.code, '01')).limit(1);
    const includeCollections = !fundClusterId || fundClusterId === defaultFund?.id;
    const [targets, receipts, collected] = await Promise.all([
      db
        .select({
          sourceId: revenueTargets.revenueSourceId,
          original: sql<string>`SUM(${revenueTargets.originalAmount})`,
          final: sql<string>`SUM(${revenueTargets.amount})`,
        })
        .from(revenueTargets)
        .where(and(eq(revenueTargets.fiscalYear, year), fundClusterId ? eq(revenueTargets.fundClusterId, fundClusterId) : undefined))
        .groupBy(revenueTargets.revenueSourceId),
      db
        .select({ sourceId: cashReceipts.revenueSourceId, total: sql<string>`SUM(${cashReceipts.amount})` })
        .from(cashReceipts)
        .where(and(sql`YEAR(${cashReceipts.receiptDate}) = ${year}`, fundClusterId ? eq(cashReceipts.fundClusterId, fundClusterId) : undefined))
        .groupBy(cashReceipts.revenueSourceId),
      includeCollections
        ? db
            .select({ sourceId: accountsReceivable.revenueSourceId, total: sql<string>`SUM(${collections.amount})` })
            .from(collections)
            .innerJoin(accountsReceivable, eq(collections.arId, accountsReceivable.id))
            .where(sql`YEAR(${collections.collectionDate}) = ${year}`)
            .groupBy(accountsReceivable.revenueSourceId)
        : Promise.resolve([] as { sourceId: number | null; total: string }[]),
    ]);

    const sourceIds = [...new Set([...targets, ...receipts, ...collected].map(r => r.sourceId ?? 0))];
    const sources = sourceIds.length
      ? await db.select({ id: revenueSources.id, code: revenueSources.code, name: revenueSources.name }).from(revenueSources).where(inArray(revenueSources.id, sourceIds))
      : [];
    const amountFor = (rows: { sourceId: number | null; total: string }[], id: number) =>
      rows.filter(r => (r.sourceId ?? 0) === id).reduce((total, r) => total + Number(r.total ?? 0), 0);

    return sourceIds
      .map(id => {
        const source = sources.find(s => s.id === id);
        const target = targets.find(t => t.sourceId === id);
        return {
          code: source?.code ?? '',
          label: source?.name ?? 'Receipts with no revenue source',
          original: Number(target?.original ?? 0),
          final: Number(target?.final ?? 0),
          actual: amountFor(receipts, id) + amountFor(collected, id),
        };
      })
      .sort((a, b) => (a.code || '~').localeCompare(b.code || '~'))
      .map(({ code: _code, ...amounts }) => amounts);
  }
}

export const financialStatementsService = new FinancialStatementsService();
