import { db } from '../db/connection';
import {
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  objectOfExpenditure,
  disbursementVouchers,
  payments,
  cashReceipts,
  revenueSources,
  accountsReceivable,
  collections,
  bankDeposits,
  bankAccounts,
  fundClusters,
  ncaRegistry,
  payrollPeriods,
  payrollTransactions,
  remittances,
  fiscalYearClosings,
  fixedAssets,
  assetCategories,
  assetDisposals,
  propertyIssuances,
  cashAdvances,
  itineraryOfTravel,
  liquidationReports,
  inventoryItems,
  inventoryTransactions,
  inspectionAcceptanceReports,
  users,
} from '../db/schema';
import { calculateGSISContribution, calculatePhilHealthContribution, calculatePagIBIGContribution } from '../utils/payroll-calculator';
import { CAPITALIZATION_THRESHOLD, PPE_ACCOUNTS } from '../constants/property';
import { SUPPLY_ACCOUNTS, supplyAccountFor } from '../constants/inventory';
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, like, ne, notInArray, or, sql, type Column, type SQL } from 'drizzle-orm';
import { logAudit } from '../middleware/audit-logger';

/**
 * General ledger (Government Accounting Manual for NGAs, Revised Chart of Accounts).
 *
 * Every financial event posts one balanced Journal Entry Voucher (JEV). Entries are
 * keyed by (sourceType, sourceId), so posting is idempotent: calling a post* method
 * twice, or running postAllUnposted(), never duplicates an entry. Entries are never
 * edited or deleted; a mistake is corrected with a reversing entry.
 *
 * Automatic postings:
 *   DV fully approved    Dr Expense (object code)      Cr Due to BIR, Accounts Payable
 *   Check / ADA issued   Dr Accounts Payable           Cr Cash-MDS / Cash in Bank
 *   Check cancelled/stale  reversal of the issue entry
 *   Official receipt     Dr Cash-Collecting Officers   Cr Revenue account of the source
 *   AR invoice           Dr Accounts Receivable        Cr Revenue account of the source
 *   AR collection        Dr Cash-Collecting Officers   Cr Accounts Receivable
 *   Deposit confirmed    Dr Cash in Bank               Cr Cash-Collecting Officers
 *   NCA received         Dr Cash-MDS, Regular          Cr Subsidy from National Government
 *   Payroll processed    Dr Salaries, PERA, allowances, employer shares
 *                        Cr Due to BIR/GSIS/Pag-IBIG/PhilHealth, Other Payables, Due to Officers and Employees
 *   Payroll paid out     Dr Due to Officers and Employees  Cr Cash-MDS, Regular
 *   Remittance paid      Dr Due to GSIS/Pag-IBIG/PhilHealth  Cr Cash-MDS (BIR: Cr Cash-Tax Remittance Advice)
 *   Receivable written off  Dr Impairment Loss            Cr Accounts Receivable
 *   Advance granted      Dr Advances to Officers and Employees  Cr the account the DV was debited to
 *   Advance liquidated   Dr Expense (up to the advance), Cash-Collecting Officers (refund)
 *                        Cr Advances to Officers and Employees
 *   Depreciation (month) Dr Depreciation expense       Cr Accumulated Depreciation (one line per asset)
 *   ICS issue            Dr Semi-Expendable Expenses   Cr Semi-Expendable Machinery and Equipment
 *   Asset disposed       Dr Accumulated Depreciation, Other Receivables (proceeds), Loss
 *                        Cr PPE (cost), Gain
 *   Supplies into stock  Dr Supplies Inventory          Cr the expense the DV was debited to (IAR deliveries only)
 *   Supplies issued      Dr Supplies Expense            Cr Supplies Inventory (up to the stock in the books)
 *   Year-end closing     revenue and expense balances → Accumulated Surplus/(Deficit), per fund
 *
 * Capital outlay object codes (506xx) are capitalised in the matching PPE account, and
 * semi-expendable equipment in inventory, rather than expensed.
 *
 * A closed fiscal year accepts no entries; reopening it reverses its closing entries.
 */

export const ACCOUNTS = {
  CASH_COLLECTING_OFFICERS: '1010101000',
  PETTY_CASH: '1010102000',
  CASH_IN_BANK_CURRENT: '1010202000',
  CASH_MDS_REGULAR: '1010404000',
  CASH_TRA: '1010407000',
  ACCOUNTS_RECEIVABLE: '1030101000',
  OTHER_RECEIVABLES: '1030599000',
  SEMI_EXPENDABLE_EQUIPMENT: '1040501000',
  MACHINERY: '1060501000',
  ADVANCES_OFFICERS_EMPLOYEES: '1990104000',
  ACCOUNTS_PAYABLE: '2010101000',
  DUE_TO_OFFICERS_EMPLOYEES: '2010102000',
  DUE_TO_BIR: '2020101000',
  DUE_TO_GSIS: '2020102000',
  DUE_TO_PAGIBIG: '2020103000',
  DUE_TO_PHILHEALTH: '2020104000',
  OTHER_PAYABLES: '2999999000',
  ACCUMULATED_SURPLUS: '3010101000',
  IMPAIRMENT_LOSS_RECEIVABLES: '5050301000',
  SALARIES_REGULAR: '5010101000',
  PERA: '5010201000',
  OVERTIME: '5010213000',
  OTHER_BONUSES_ALLOWANCES: '5010299000',
  RETIREMENT_LIFE_INSURANCE: '5010301000',
  PAGIBIG_CONTRIBUTIONS: '5010302000',
  PHILHEALTH_CONTRIBUTIONS: '5010303000',
  SEMI_EXPENDABLE_EXPENSE: '5020321000',
  LOSS_ON_SALE_PPE: '5050404000',
  SUBSIDY_FROM_NG: '4030101000',
  GAIN_ON_SALE_PPE: '4050104000',
  MISCELLANEOUS_INCOME: '4060101000',
} as const;

export { PPE_ACCOUNTS };

/** Capital outlay object codes (by 5-digit prefix) and the asset account each is capitalised in */
const CAPITAL_OUTLAY_ACCOUNTS: Record<string, string> = {
  '50601': '1060101000', // Land
  '50602': '1060401000', // Buildings and other structures
  '50603': '1060501000', // Machinery and equipment
  '50604': '1060601000', // Transportation equipment
  '50605': '1060701000', // Furniture, fixtures and books
  '50606': ACCOUNTS.SEMI_EXPENDABLE_EQUIPMENT, // Semi-expendable: inventory until issued on an ICS
};

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

/** Account type from the first digit of an RCA code */
export function accountTypeOf(code: string): AccountType {
  return ({ '1': 'asset', '2': 'liability', '3': 'equity', '4': 'revenue' } as const)[code[0] as '1'] ?? 'expense';
}

/** Account a DV's object of expenditure is debited to: capital outlay is capitalised, the rest expensed */
export function debitAccountFor(objectCode: string): string {
  if (objectCode.startsWith('506')) return CAPITAL_OUTLAY_ACCOUNTS[objectCode.slice(0, 5)] ?? ACCOUNTS.MACHINERY;
  return objectCode;
}

/** The PPE class an asset category is carried in (Machinery when the category names none) */
export function ppeAccountFor(code: string | null | undefined) {
  return PPE_ACCOUNTS.find(a => a.code === code) ?? PPE_ACCOUNTS.find(a => a.code === ACCOUNTS.MACHINERY)!;
}

/**
 * Straight-line depreciation an asset should have accumulated by the end of a month (1-12).
 * Depreciation starts the month after acquisition and stops at cost less residual value.
 * Semi-expendable items (below the capitalization threshold) are not depreciated.
 */
export function accumulatedDepreciationThrough(
  asset: { acquisitionDate: Date | string; cost: number; salvage: number; usefulLife: number },
  year: number,
  month: number
): number {
  if (asset.cost < CAPITALIZATION_THRESHOLD || !(asset.usefulLife > 0)) return 0;
  const depreciable = toCentavos(asset.cost) - toCentavos(asset.salvage);
  if (depreciable <= 0) return 0;
  const acquired = new Date(asset.acquisitionDate);
  const months = year * 12 + (month - 1) - (acquired.getFullYear() * 12 + acquired.getMonth());
  if (months <= 0) return 0;
  const lifeMonths = asset.usefulLife * 12;
  return (months >= lifeMonths ? depreciable : Math.round((depreciable * months) / lifeMonths)) / 100;
}

export type JournalType = 'general' | 'cash_receipts' | 'cash_disbursements' | 'check_disbursements';

export const JOURNAL_LABELS: Record<JournalType, string> = {
  general: 'General Journal',
  cash_receipts: 'Cash Receipts Journal',
  cash_disbursements: 'Cash Disbursements Journal',
  check_disbursements: 'Check Disbursements Journal',
};

export const SOURCE_LABELS: Record<string, string> = {
  dv_approval: 'DV approved',
  payment: 'Payment issued',
  payment_reversal: 'Payment reversed',
  cash_receipt: 'Official receipt',
  ar_invoice: 'Receivable',
  collection: 'Collection',
  deposit: 'Bank deposit',
  nca: 'NCA received',
  payroll: 'Payroll',
  payroll_payout: 'Payroll paid',
  remittance: 'Remittance',
  ar_writeoff: 'Receivable written off',
  ca_granted: 'Cash advance granted',
  ca_liquidation: 'Cash advance liquidated',
  travel_advance: 'Travel advance granted',
  travel_liquidation: 'Travel liquidated',
  depreciation: 'Depreciation',
  semi_expendable_issue: 'Semi-expendable issued (ICS)',
  asset_disposal: 'Asset disposed',
  asset_disposal_reversal: 'Disposal cancelled',
  stock_receipt: 'Supplies received into stock',
  stock_issue: 'Supplies issued (RIS)',
  stock_reversal: 'Stock transaction cancelled',
  closing: 'Year-end closing',
  closing_reversal: 'Closing reversed',
  manual: 'Manual entry',
  reversal: 'Reversal',
};

export interface JournalLineInput {
  accountCode: string;
  debit?: number;
  credit?: number;
  description?: string;
  subsidiary?: string;
  responsibilityCenter?: string;
}

export interface PostEntryInput {
  date: Date;
  fundClusterId: number;
  journalType: JournalType;
  particulars: string;
  sourceType: string;
  /** Null only for manual entries */
  sourceId: number | null;
  lines: JournalLineInput[];
  createdBy: number;
  reversesId?: number;
}

export interface PostResult {
  id: number;
  jevNo: string;
  /** False when an entry already existed for this source */
  created: boolean;
}

const toCentavos = (value: number | string | null | undefined) => Math.round(Number(value ?? 0) * 100);
const fromCentavos = (centavos: number) => (centavos / 100).toFixed(2);
const num = (value: string | number | null | undefined) => {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
};

/** Check a set of lines is a valid double entry; returns an error message or null */
export function validateLines(lines: JournalLineInput[]): string | null {
  if (lines.length < 2) return 'A journal entry needs at least two lines';
  let debits = 0;
  let credits = 0;
  for (const [i, line] of lines.entries()) {
    const debit = toCentavos(line.debit);
    const credit = toCentavos(line.credit);
    if (!line.accountCode) return `Line ${i + 1} has no account`;
    if (debit < 0 || credit < 0) return `Line ${i + 1} has a negative amount`;
    if ((debit > 0) === (credit > 0)) return `Line ${i + 1} must have either a debit or a credit`;
    debits += debit;
    credits += credit;
  }
  if (debits !== credits) {
    return `Debits (₱${fromCentavos(debits)}) and credits (₱${fromCentavos(credits)}) do not balance`;
  }
  return null;
}

export class LedgerService {
  // ---------------------------------------------------------------------------
  // Core posting
  // ---------------------------------------------------------------------------

  async findBySource(sourceType: string, sourceId: number) {
    const [entry] = await db
      .select({ id: journalEntries.id, jevNo: journalEntries.jevNo, status: journalEntries.status })
      .from(journalEntries)
      .where(and(eq(journalEntries.sourceType, sourceType), eq(journalEntries.sourceId, sourceId)))
      .limit(1);
    return entry ?? null;
  }

  /** Next JEV number for a fund cluster and month: <fund cluster>-<yyyy>-<mm>-<0001> (GAM) */
  private async nextJevNo(tx: typeof db, fundClusterId: number, date: Date): Promise<string> {
    const [cluster] = await tx.select({ code: fundClusters.code }).from(fundClusters).where(eq(fundClusters.id, fundClusterId)).limit(1);
    const prefix = `${cluster?.code ?? String(fundClusterId).padStart(2, '0')}-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-`;
    const [last] = await tx
      .select({ jevNo: journalEntries.jevNo })
      .from(journalEntries)
      .where(like(journalEntries.jevNo, `${prefix}%`))
      .orderBy(desc(journalEntries.jevNo))
      .limit(1)
      .for('update');
    const next = last ? parseInt(last.jevNo.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  /** Post a balanced entry. Returns the existing entry if this source was already posted. */
  async post(input: PostEntryInput): Promise<PostResult> {
    const error = validateLines(input.lines);
    if (error) throw new Error(error);

    if (await this.isYearClosed(input.date.getFullYear())) {
      throw new Error(`FY ${input.date.getFullYear()} is closed; entries can't be posted into it. An administrator can reopen the year.`);
    }

    if (input.sourceId !== null) {
      const existing = await this.findBySource(input.sourceType, input.sourceId);
      if (existing) return { id: existing.id, jevNo: existing.jevNo, created: false };
    }

    const codes = [...new Set(input.lines.map(l => l.accountCode))];
    const known = await db
      .select({ code: chartOfAccounts.code })
      .from(chartOfAccounts)
      .where(and(inArray(chartOfAccounts.code, codes), eq(chartOfAccounts.isActive, true)));
    const missing = codes.filter(code => !known.some(k => k.code === code));
    if (missing.length) throw new Error(`Unknown or inactive account: ${missing.join(', ')}`);

    // Retry once on a JEV number collision from a concurrent post
    for (let attempt = 0; ; attempt++) {
      try {
        return await db.transaction(async tx => {
          const jevNo = await this.nextJevNo(tx as unknown as typeof db, input.fundClusterId, input.date);
          const [result] = await tx.insert(journalEntries).values({
            jevNo,
            jevDate: input.date,
            fiscalYear: input.date.getFullYear(),
            fundClusterId: input.fundClusterId,
            journalType: input.journalType,
            particulars: input.particulars,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            reversesId: input.reversesId ?? null,
            createdBy: input.createdBy,
          });
          const id = Number(result.insertId);
          await tx.insert(journalEntryLines).values(
            input.lines.map((line, i) => ({
              journalEntryId: id,
              lineNo: i + 1,
              accountCode: line.accountCode,
              debit: fromCentavos(toCentavos(line.debit)),
              credit: fromCentavos(toCentavos(line.credit)),
              description: line.description?.slice(0, 255) ?? null,
              subsidiary: line.subsidiary?.slice(0, 255) ?? null,
              responsibilityCenter: line.responsibilityCenter?.slice(0, 100) ?? null,
            }))
          );
          return { id, jevNo, created: true };
        });
      } catch (e: any) {
        const duplicate = e?.code === 'ER_DUP_ENTRY' || /Duplicate entry/.test(String(e?.message));
        if (!duplicate || attempt >= 1) throw e;
        // The source was posted concurrently: return that entry
        if (input.sourceId !== null) {
          const existing = await this.findBySource(input.sourceType, input.sourceId);
          if (existing) return { id: existing.id, jevNo: existing.jevNo, created: false };
        }
      }
    }
  }

  /** Reverse an entry with a mirror-image entry and mark the original reversed */
  async reverse(entryId: number, userId: number, reason: string, sourceType = 'reversal', date = new Date()): Promise<PostResult> {
    const entry = await this.getEntry(entryId);
    if (!entry) throw new Error('Journal entry not found');
    if (entry.status === 'reversed') {
      const existing = await this.findBySource(sourceType, entryId);
      if (existing) return { id: existing.id, jevNo: existing.jevNo, created: false };
      throw new Error(`JEV ${entry.jevNo} is already reversed`);
    }

    const result = await this.post({
      date,
      fundClusterId: entry.fundClusterId,
      journalType: entry.journalType,
      particulars: `Reversal of JEV ${entry.jevNo}: ${reason}`,
      sourceType,
      sourceId: entryId,
      reversesId: entryId,
      createdBy: userId,
      lines: entry.lines.map(line => ({
        accountCode: line.accountCode,
        debit: num(line.credit),
        credit: num(line.debit),
        description: line.description ?? undefined,
        subsidiary: line.subsidiary ?? undefined,
        responsibilityCenter: line.responsibilityCenter ?? undefined,
      })),
    });

    await db.update(journalEntries).set({ status: 'reversed' }).where(eq(journalEntries.id, entryId));
    await logAudit({
      userId,
      action: 'UPDATE',
      tableName: 'journal_entries',
      recordId: entryId,
      newValues: { status: 'reversed', reversalJev: result.jevNo, reason },
    });
    return result;
  }

  /** Make sure an account exists, typed by its RCA code (object codes become expense accounts) */
  private async ensureAccount(code: string, title: string) {
    const accountType = accountTypeOf(code);
    await db
      .insert(chartOfAccounts)
      .ignore()
      .values({ code, title, accountType, normalBalance: accountType === 'asset' || accountType === 'expense' ? 'debit' : 'credit' });
  }

  private async defaultFundClusterId(): Promise<number> {
    const [cluster] = await db.select({ id: fundClusters.id }).from(fundClusters).where(eq(fundClusters.code, '01')).limit(1);
    return cluster?.id ?? 1;
  }

  private async revenueAccountFor(revenueSourceId: number | null | undefined): Promise<string> {
    if (!revenueSourceId) return ACCOUNTS.MISCELLANEOUS_INCOME;
    const [source] = await db
      .select({ accountCode: revenueSources.accountCode })
      .from(revenueSources)
      .where(eq(revenueSources.id, revenueSourceId))
      .limit(1);
    return source?.accountCode || ACCOUNTS.MISCELLANEOUS_INCOME;
  }

  // ---------------------------------------------------------------------------
  // Automatic postings
  // ---------------------------------------------------------------------------

  /** DV fully approved: recognise the expense and the liability, net of taxes withheld */
  async postDvApproval(dvId: number, userId: number): Promise<PostResult> {
    const [dv] = await db
      .select({
        id: disbursementVouchers.id,
        dvNo: disbursementVouchers.dvNo,
        fundClusterId: disbursementVouchers.fundClusterId,
        payeeName: disbursementVouchers.payeeName,
        particulars: disbursementVouchers.particulars,
        amount: disbursementVouchers.amount,
        totalTaxWithheld: disbursementVouchers.totalTaxWithheld,
        netAmount: disbursementVouchers.netAmount,
        responsibilityCenter: disbursementVouchers.responsibilityCenter,
        expenseCode: objectOfExpenditure.code,
        expenseName: objectOfExpenditure.name,
      })
      .from(disbursementVouchers)
      .leftJoin(objectOfExpenditure, eq(disbursementVouchers.objectExpenditureId, objectOfExpenditure.id))
      .where(eq(disbursementVouchers.id, dvId))
      .limit(1);

    if (!dv) throw new Error('Disbursement voucher not found');
    if (!dv.expenseCode) throw new Error(`DV ${dv.dvNo} has no object of expenditure`);
    const debitAccount = debitAccountFor(dv.expenseCode);
    if (debitAccount === dv.expenseCode) await this.ensureAccount(debitAccount, dv.expenseName ?? dv.expenseCode);

    const gross = num(dv.amount);
    const tax = num(dv.totalTaxWithheld);
    const net = dv.netAmount === null ? gross - tax : num(dv.netAmount);
    const rc = dv.responsibilityCenter ?? undefined;

    const lines: JournalLineInput[] = [
      { accountCode: debitAccount, debit: gross, description: dv.particulars, responsibilityCenter: rc },
    ];
    if (tax > 0) lines.push({ accountCode: ACCOUNTS.DUE_TO_BIR, credit: tax, description: 'Taxes withheld', subsidiary: dv.payeeName });
    lines.push({ accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, credit: net, subsidiary: dv.payeeName });

    const result = await this.post({
      date: new Date(),
      fundClusterId: dv.fundClusterId,
      journalType: 'general',
      particulars: `To recognise liability for DV ${dv.dvNo}: ${dv.particulars}`,
      sourceType: 'dv_approval',
      sourceId: dv.id,
      createdBy: userId,
      lines,
    });

    // Record the JEV on the DV (Box B accounting entry reference)
    await db
      .update(disbursementVouchers)
      .set({ jevNo: result.jevNo, jevDate: new Date() })
      .where(and(eq(disbursementVouchers.id, dv.id), isNull(disbursementVouchers.jevNo)));

    return result;
  }

  /** Check or ADA issued: settle the payable out of the cash account the payment draws on */
  async postPaymentIssued(paymentId: number, userId: number): Promise<PostResult> {
    const [payment] = await db
      .select({
        id: payments.id,
        dvId: payments.dvId,
        paymentType: payments.paymentType,
        amount: payments.amount,
        checkNo: payments.checkNo,
        adaReference: payments.adaReference,
        dvNo: disbursementVouchers.dvNo,
        fundClusterId: disbursementVouchers.fundClusterId,
        payeeName: disbursementVouchers.payeeName,
      })
      .from(payments)
      .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id))
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) throw new Error('Payment not found');

    // The liability must be on the books before it is paid
    await this.postDvApproval(payment.dvId, userId);

    const cashAccount =
      payment.paymentType === 'check_commercial'
        ? ACCOUNTS.CASH_IN_BANK_CURRENT
        : payment.paymentType === 'cash'
          ? ACCOUNTS.PETTY_CASH
          : ACCOUNTS.CASH_MDS_REGULAR;
    const isCheck = payment.paymentType === 'check_mds' || payment.paymentType === 'check_commercial';
    const instrument = isCheck
      ? `Check No. ${payment.checkNo ?? '—'}`
      : payment.paymentType === 'ada'
        ? `ADA ${payment.adaReference ?? ''}`.trim()
        : 'Cash';
    const amount = num(payment.amount);

    return this.post({
      date: new Date(),
      fundClusterId: payment.fundClusterId,
      journalType: isCheck ? 'check_disbursements' : 'cash_disbursements',
      particulars: `Payment of DV ${payment.dvNo} by ${instrument}`,
      sourceType: 'payment',
      sourceId: payment.id,
      createdBy: userId,
      lines: [
        { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: amount, subsidiary: payment.payeeName },
        { accountCode: cashAccount, credit: amount, description: instrument },
      ],
    });
  }

  /** A cancelled or stale check restores the payable: reverse its issue entry, if any */
  async reversePayment(paymentId: number, userId: number, reason: string): Promise<PostResult | null> {
    const issued = await this.findBySource('payment', paymentId);
    if (!issued) return null;
    return this.reverse(issued.id, userId, reason, 'payment_reversal');
  }

  async postCashReceipt(receiptId: number, userId: number): Promise<PostResult> {
    const [receipt] = await db.select().from(cashReceipts).where(eq(cashReceipts.id, receiptId)).limit(1);
    if (!receipt) throw new Error('Cash receipt not found');
    const amount = num(receipt.amount);
    return this.post({
      date: new Date(receipt.receiptDate),
      fundClusterId: receipt.fundClusterId,
      journalType: 'cash_receipts',
      particulars: `Collection per OR No. ${receipt.orNo}: ${receipt.particulars}`,
      sourceType: 'cash_receipt',
      sourceId: receipt.id,
      createdBy: userId,
      lines: [
        { accountCode: ACCOUNTS.CASH_COLLECTING_OFFICERS, debit: amount, description: `OR No. ${receipt.orNo}` },
        { accountCode: await this.revenueAccountFor(receipt.revenueSourceId), credit: amount, subsidiary: receipt.payorName },
      ],
    });
  }

  async postArInvoice(arId: number, userId: number): Promise<PostResult> {
    const [ar] = await db.select().from(accountsReceivable).where(eq(accountsReceivable.id, arId)).limit(1);
    if (!ar) throw new Error('Receivable not found');
    const amount = num(ar.amount);
    return this.post({
      date: new Date(ar.invoiceDate),
      fundClusterId: await this.defaultFundClusterId(),
      journalType: 'general',
      particulars: `To recognise receivable ${ar.arNo}${ar.invoiceNo ? ` (Invoice ${ar.invoiceNo})` : ''}`,
      sourceType: 'ar_invoice',
      sourceId: ar.id,
      createdBy: userId,
      lines: [
        { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: amount, subsidiary: ar.debtorName },
        { accountCode: await this.revenueAccountFor(ar.revenueSourceId), credit: amount, subsidiary: ar.debtorName },
      ],
    });
  }

  async postCollection(collectionId: number, userId: number): Promise<PostResult> {
    const [row] = await db
      .select({
        id: collections.id,
        collectionNo: collections.collectionNo,
        orNo: collections.orNo,
        collectionDate: collections.collectionDate,
        amount: collections.amount,
        arId: collections.arId,
        arNo: accountsReceivable.arNo,
        debtorName: accountsReceivable.debtorName,
      })
      .from(collections)
      .innerJoin(accountsReceivable, eq(collections.arId, accountsReceivable.id))
      .where(eq(collections.id, collectionId))
      .limit(1);
    if (!row) throw new Error('Collection not found');

    // The receivable must exist in the books before it is collected
    await this.postArInvoice(row.arId, userId);

    const amount = num(row.amount);
    return this.post({
      date: new Date(row.collectionDate),
      fundClusterId: await this.defaultFundClusterId(),
      journalType: 'cash_receipts',
      particulars: `Collection ${row.collectionNo} on receivable ${row.arNo}${row.orNo ? `, OR No. ${row.orNo}` : ''}`,
      sourceType: 'collection',
      sourceId: row.id,
      createdBy: userId,
      lines: [
        { accountCode: ACCOUNTS.CASH_COLLECTING_OFFICERS, debit: amount, description: row.orNo ? `OR No. ${row.orNo}` : undefined },
        { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, credit: amount, subsidiary: row.debtorName },
      ],
    });
  }

  async postDeposit(depositId: number, userId: number): Promise<PostResult> {
    const [deposit] = await db
      .select({
        id: bankDeposits.id,
        depositSlipNo: bankDeposits.depositSlipNo,
        depositDate: bankDeposits.depositDate,
        totalAmount: bankDeposits.totalAmount,
        fundClusterId: bankAccounts.fundClusterId,
        bankName: bankAccounts.bankName,
        accountNumber: bankAccounts.accountNumber,
      })
      .from(bankDeposits)
      .leftJoin(bankAccounts, eq(bankDeposits.bankAccountId, bankAccounts.id))
      .where(eq(bankDeposits.id, depositId))
      .limit(1);
    if (!deposit) throw new Error('Bank deposit not found');
    const amount = num(deposit.totalAmount);
    return this.post({
      date: new Date(deposit.depositDate),
      fundClusterId: deposit.fundClusterId ?? (await this.defaultFundClusterId()),
      journalType: 'cash_receipts',
      particulars: `Deposit of collections per deposit slip ${deposit.depositSlipNo}`,
      sourceType: 'deposit',
      sourceId: deposit.id,
      createdBy: userId,
      lines: [
        { accountCode: ACCOUNTS.CASH_IN_BANK_CURRENT, debit: amount, description: `${deposit.bankName ?? 'Bank'} ${deposit.accountNumber ?? ''}`.trim() },
        { accountCode: ACCOUNTS.CASH_COLLECTING_OFFICERS, credit: amount },
      ],
    });
  }

  async postNca(ncaId: number, userId: number): Promise<PostResult> {
    const [nca] = await db.select().from(ncaRegistry).where(eq(ncaRegistry.id, ncaId)).limit(1);
    if (!nca) throw new Error('NCA not found');
    const amount = num(nca.amount);
    return this.post({
      date: new Date(nca.ncaDate),
      fundClusterId: nca.fundClusterId,
      journalType: 'general',
      particulars: `To record receipt of NCA No. ${nca.ncaNo}${nca.purpose ? `: ${nca.purpose}` : ''}`,
      sourceType: 'nca',
      sourceId: nca.id,
      createdBy: userId,
      lines: [
        { accountCode: ACCOUNTS.CASH_MDS_REGULAR, debit: amount, description: nca.mdsAccount ?? undefined },
        { accountCode: ACCOUNTS.SUBSIDY_FROM_NG, credit: amount },
      ],
    });
  }

  /**
   * Payroll processed: recognise salary expense, employer contributions and what is owed
   * to the BIR, GSIS, Pag-IBIG, PhilHealth, other creditors and the employees.
   * Employer shares are computed from basic salary with the same rules as the payroll run.
   */
  async postPayroll(periodId: number, userId: number): Promise<PostResult> {
    const [period] = await db.select().from(payrollPeriods).where(eq(payrollPeriods.id, periodId)).limit(1);
    if (!period) throw new Error('Payroll period not found');

    const rows = await db.select().from(payrollTransactions).where(eq(payrollTransactions.payrollPeriodId, periodId));
    if (rows.length === 0) throw new Error(`Payroll ${period.periodNo} has no transactions`);

    const t = {
      basic: 0, pera: 0, overtime: 0, allowances: 0,
      gsisEe: 0, gsisEr: 0, philhealthEe: 0, philhealthEr: 0, pagibigEe: 0, pagibigEr: 0,
      tax: 0, gsisLoan: 0, pagibigLoan: 0, otherPayables: 0, net: 0,
    };
    for (const row of rows) {
      const basic = num(row.basicSalary);
      t.basic += basic;
      t.pera += num(row.pera);
      t.overtime += num(row.overtime);
      t.allowances += num(row.additionalAllowance) + num(row.otherEarnings);
      t.gsisEe += num(row.gsisContribution);
      t.philhealthEe += num(row.philhealthContribution);
      t.pagibigEe += num(row.pagibigContribution);
      t.gsisEr += calculateGSISContribution(basic).employerShare;
      t.philhealthEr += calculatePhilHealthContribution(basic).employerShare;
      t.pagibigEr += calculatePagIBIGContribution(basic).employerShare;
      t.tax += num(row.withholdingTax);
      t.gsisLoan += num(row.gsisLoan);
      t.pagibigLoan += num(row.pagibigLoan);
      t.otherPayables += num(row.salaryLoan) + num(row.otherDeductions);
      t.net += num(row.netPay);
    }

    const r2 = (value: number) => Math.round(value * 100) / 100;
    const debit = (accountCode: string, amount: number, description: string): JournalLineInput[] =>
      r2(amount) > 0 ? [{ accountCode, debit: r2(amount), description }] : [];
    const credit = (accountCode: string, amount: number, description: string): JournalLineInput[] =>
      r2(amount) > 0 ? [{ accountCode, credit: r2(amount), description }] : [];

    const lines: JournalLineInput[] = [
      ...debit(ACCOUNTS.SALARIES_REGULAR, t.basic, 'Basic salaries'),
      ...debit(ACCOUNTS.PERA, t.pera, 'PERA'),
      ...debit(ACCOUNTS.OVERTIME, t.overtime, 'Overtime'),
      ...debit(ACCOUNTS.OTHER_BONUSES_ALLOWANCES, t.allowances, 'Allowances and other earnings'),
      ...debit(ACCOUNTS.RETIREMENT_LIFE_INSURANCE, t.gsisEr, 'GSIS government share'),
      ...debit(ACCOUNTS.PAGIBIG_CONTRIBUTIONS, t.pagibigEr, 'Pag-IBIG government share'),
      ...debit(ACCOUNTS.PHILHEALTH_CONTRIBUTIONS, t.philhealthEr, 'PhilHealth government share'),
      ...credit(ACCOUNTS.DUE_TO_BIR, t.tax, 'Withholding tax on compensation'),
      ...credit(ACCOUNTS.DUE_TO_GSIS, t.gsisEe + t.gsisEr + t.gsisLoan, 'GSIS premiums and loan amortizations'),
      ...credit(ACCOUNTS.DUE_TO_PAGIBIG, t.pagibigEe + t.pagibigEr + t.pagibigLoan, 'Pag-IBIG contributions and loan amortizations'),
      ...credit(ACCOUNTS.DUE_TO_PHILHEALTH, t.philhealthEe + t.philhealthEr, 'PhilHealth premiums'),
      ...credit(ACCOUNTS.OTHER_PAYABLES, t.otherPayables, 'Salary loans and other deductions'),
      ...credit(ACCOUNTS.DUE_TO_OFFICERS_EMPLOYEES, t.net, 'Net pay'),
    ];

    // Each payslip is rounded separately; absorb any centavo difference in net pay
    const gap = lines.reduce((sum, l) => sum + toCentavos(l.debit) - toCentavos(l.credit), 0);
    if (gap !== 0 && Math.abs(gap) <= rows.length) {
      const netLine = lines.find(l => l.accountCode === ACCOUNTS.DUE_TO_OFFICERS_EMPLOYEES);
      if (netLine) netLine.credit = r2((netLine.credit ?? 0) + gap / 100);
    }

    return this.post({
      date: new Date(period.periodEnd),
      fundClusterId: await this.defaultFundClusterId(),
      journalType: 'general',
      particulars: `To recognise payroll ${period.periodNo} (${period.periodName}), ${rows.length} employee${rows.length === 1 ? '' : 's'}`,
      sourceType: 'payroll',
      sourceId: period.id,
      createdBy: userId,
      lines,
    });
  }

  /** Net pay released to employees (ADA to payroll accounts) */
  async postPayrollPayout(periodId: number, userId: number): Promise<PostResult> {
    const [period] = await db.select().from(payrollPeriods).where(eq(payrollPeriods.id, periodId)).limit(1);
    if (!period) throw new Error('Payroll period not found');

    // The payroll must be in the books before it is paid
    const recognised = await this.postPayroll(periodId, userId);
    const entry = await this.getEntry(recognised.id);
    const net = num(entry?.lines.find(l => l.accountCode === ACCOUNTS.DUE_TO_OFFICERS_EMPLOYEES)?.credit);
    if (!(net > 0)) throw new Error(`Payroll ${period.periodNo} has no net pay to release`);

    return this.post({
      date: new Date(period.payDate),
      fundClusterId: await this.defaultFundClusterId(),
      journalType: 'cash_disbursements',
      particulars: `Release of net pay for payroll ${period.periodNo} (${period.periodName})`,
      sourceType: 'payroll_payout',
      sourceId: period.id,
      createdBy: userId,
      lines: [
        { accountCode: ACCOUNTS.DUE_TO_OFFICERS_EMPLOYEES, debit: net, description: 'Net pay' },
        { accountCode: ACCOUNTS.CASH_MDS_REGULAR, credit: net, description: 'ADA to payroll accounts' },
      ],
    });
  }

  /** A remittance to BIR, GSIS, Pag-IBIG or PhilHealth settles that liability */
  async postRemittance(remittanceId: number, userId: number): Promise<PostResult> {
    const [remittance] = await db.select().from(remittances).where(eq(remittances.id, remittanceId)).limit(1);
    if (!remittance) throw new Error('Remittance not found');

    const liability = {
      BIR: ACCOUNTS.DUE_TO_BIR,
      GSIS: ACCOUNTS.DUE_TO_GSIS,
      'Pag-IBIG': ACCOUNTS.DUE_TO_PAGIBIG,
      PhilHealth: ACCOUNTS.DUE_TO_PHILHEALTH,
    }[remittance.remittanceType];
    // Taxes withheld by NGAs are remitted through a Tax Remittance Advice
    const cash = remittance.remittanceType === 'BIR' ? ACCOUNTS.CASH_TRA : ACCOUNTS.CASH_MDS_REGULAR;
    const amount = num(remittance.totalAmount);

    return this.post({
      date: remittance.paymentDate ? new Date(remittance.paymentDate) : new Date(),
      fundClusterId: await this.defaultFundClusterId(),
      journalType: 'cash_disbursements',
      particulars: `Remittance ${remittance.remittanceNo} to ${remittance.remittanceType} for ${remittance.month}/${remittance.year}${remittance.referenceNo ? `, ref. ${remittance.referenceNo}` : ''}`,
      sourceType: 'remittance',
      sourceId: remittance.id,
      createdBy: userId,
      lines: [
        // The TRA is a non-cash allocation from DBM: recognise it, then apply it to the tax due
        ...(remittance.remittanceType === 'BIR'
          ? [
              { accountCode: ACCOUNTS.CASH_TRA, debit: amount, description: 'Tax Remittance Advice issued' },
              { accountCode: ACCOUNTS.SUBSIDY_FROM_NG, credit: amount, description: 'Tax Remittance Advice issued' },
            ]
          : []),
        { accountCode: liability, debit: amount, subsidiary: remittance.remittanceType },
        { accountCode: cash, credit: amount },
      ],
    });
  }

  /** A receivable written off as uncollectible: recognise the loss and remove the receivable */
  async postArWriteOff(arId: number, userId: number): Promise<PostResult> {
    const [ar] = await db.select().from(accountsReceivable).where(eq(accountsReceivable.id, arId)).limit(1);
    if (!ar) throw new Error('Receivable not found');
    if (ar.status !== 'written_off') throw new Error(`Receivable ${ar.arNo} is not written off`);

    // The receivable must be in the books before it can be written off
    await this.postArInvoice(arId, userId);
    const amount = num(ar.balance);
    if (!(amount > 0)) throw new Error(`Receivable ${ar.arNo} has no balance to write off`);

    return this.post({
      date: ar.updatedAt ? new Date(ar.updatedAt) : new Date(),
      fundClusterId: await this.defaultFundClusterId(),
      journalType: 'general',
      particulars: `To write off uncollectible receivable ${ar.arNo} from ${ar.debtorName}`,
      sourceType: 'ar_writeoff',
      sourceId: ar.id,
      createdBy: userId,
      lines: [
        { accountCode: ACCOUNTS.IMPAIRMENT_LOSS_RECEIVABLES, debit: amount, subsidiary: ar.debtorName },
        { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, credit: amount, subsidiary: ar.debtorName },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // Advances to officers and employees (cash advances and travel)
  // ---------------------------------------------------------------------------

  /** An approved DV, put in the books first, with the account it was debited to */
  private async approvedDv(dvId: number, userId: number) {
    const [dv] = await db
      .select({
        id: disbursementVouchers.id,
        dvNo: disbursementVouchers.dvNo,
        status: disbursementVouchers.status,
        amount: disbursementVouchers.amount,
        fundClusterId: disbursementVouchers.fundClusterId,
        expenseCode: objectOfExpenditure.code,
      })
      .from(disbursementVouchers)
      .leftJoin(objectOfExpenditure, eq(disbursementVouchers.objectExpenditureId, objectOfExpenditure.id))
      .where(eq(disbursementVouchers.id, dvId))
      .limit(1);
    if (!dv) throw new Error('Disbursement voucher not found');
    if (dv.status !== 'approved' && dv.status !== 'paid') throw new Error(`DV ${dv.dvNo} is not yet approved`);
    if (!dv.expenseCode) throw new Error(`DV ${dv.dvNo} has no object of expenditure`);
    await this.postDvApproval(dv.id, userId);
    return { ...dv, amount: num(dv.amount), account: debitAccountFor(dv.expenseCode) };
  }

  /** The DV paid an advance, not an expense: move it to Advances to Officers and Employees */
  private async postAdvanceGranted(source: { type: string; id: number }, dvId: number, employee: string, particulars: string, userId: number) {
    const dv = await this.approvedDv(dvId, userId);
    return this.post({
      date: new Date(),
      fundClusterId: dv.fundClusterId,
      journalType: 'general',
      particulars,
      sourceType: source.type,
      sourceId: source.id,
      createdBy: userId,
      lines: [
        { accountCode: ACCOUNTS.ADVANCES_OFFICERS_EMPLOYEES, debit: dv.amount, subsidiary: employee },
        { accountCode: dv.account, credit: dv.amount, description: `Advance paid by DV ${dv.dvNo}` },
      ],
    });
  }

  /**
   * Liquidation: expenses up to the advance are recognised and any unused balance is refunded
   * to the cashier. Spending beyond the advance is reimbursed on its own DV, so it is not
   * recognised here.
   */
  private async postAdvanceLiquidation(
    source: { type: string; id: number },
    dvId: number,
    employee: string,
    expenses: number,
    date: Date,
    particulars: string,
    userId: number
  ) {
    const dv = await this.approvedDv(dvId, userId);
    const spent = Math.min(toCentavos(expenses), toCentavos(dv.amount));
    const refund = toCentavos(dv.amount) - spent;
    const lines: JournalLineInput[] = [];
    if (spent > 0) lines.push({ accountCode: dv.account, debit: spent / 100, description: 'Expenses liquidated' });
    if (refund > 0) lines.push({ accountCode: ACCOUNTS.CASH_COLLECTING_OFFICERS, debit: refund / 100, description: 'Unused advance refunded' });
    lines.push({ accountCode: ACCOUNTS.ADVANCES_OFFICERS_EMPLOYEES, credit: dv.amount, subsidiary: employee });
    return this.post({
      date,
      fundClusterId: dv.fundClusterId,
      journalType: refund > 0 ? 'cash_receipts' : 'general',
      particulars,
      sourceType: source.type,
      sourceId: source.id,
      createdBy: userId,
      lines,
    });
  }

  private async cashAdvance(caId: number) {
    const [ca] = await db
      .select({
        id: cashAdvances.id,
        caNo: cashAdvances.caNo,
        dvId: cashAdvances.dvId,
        purpose: cashAdvances.purpose,
        status: cashAdvances.status,
        totalExpenses: cashAdvances.totalExpenses,
        dateLiquidated: cashAdvances.dateLiquidated,
        employee: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(cashAdvances)
      .leftJoin(users, eq(cashAdvances.employeeId, users.id))
      .where(eq(cashAdvances.id, caId))
      .limit(1);
    if (!ca) throw new Error('Cash advance not found');
    if (!ca.dvId) throw new Error(`Cash advance ${ca.caNo} has no disbursement voucher`);
    return { ...ca, dvId: ca.dvId, employee: ca.employee ?? ca.caNo };
  }

  async postCashAdvanceGranted(caId: number, userId: number): Promise<PostResult> {
    const ca = await this.cashAdvance(caId);
    return this.postAdvanceGranted({ type: 'ca_granted', id: ca.id }, ca.dvId, ca.employee, `To record cash advance ${ca.caNo} granted to ${ca.employee}: ${ca.purpose}`, userId);
  }

  /** A liquidated advance, or one returned unused (a full refund) */
  async postCashAdvanceLiquidation(caId: number, userId: number): Promise<PostResult> {
    const ca = await this.cashAdvance(caId);
    if (ca.status !== 'liquidated' && ca.status !== 'returned') throw new Error(`Cash advance ${ca.caNo} is not liquidated`);
    if (ca.status === 'liquidated' && ca.totalExpenses === null) throw new Error(`Cash advance ${ca.caNo} has no liquidation figures`);
    await this.postCashAdvanceGranted(caId, userId);
    return this.postAdvanceLiquidation(
      { type: 'ca_liquidation', id: ca.id },
      ca.dvId,
      ca.employee,
      ca.status === 'returned' ? 0 : num(ca.totalExpenses),
      ca.dateLiquidated ? new Date(ca.dateLiquidated) : new Date(),
      `To record liquidation of cash advance ${ca.caNo} by ${ca.employee}`,
      userId
    );
  }

  private async travel(iotId: number) {
    const [iot] = await db
      .select({
        id: itineraryOfTravel.id,
        iotNo: itineraryOfTravel.iotNo,
        dvId: itineraryOfTravel.dvId,
        destination: itineraryOfTravel.destination,
        employee: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(itineraryOfTravel)
      .leftJoin(users, eq(itineraryOfTravel.employeeId, users.id))
      .where(eq(itineraryOfTravel.id, iotId))
      .limit(1);
    if (!iot) throw new Error('Itinerary of travel not found');
    if (!iot.dvId) throw new Error(`Travel ${iot.iotNo} has no cash advance DV`);
    return { ...iot, dvId: iot.dvId, employee: iot.employee ?? iot.iotNo };
  }

  async postTravelAdvanceGranted(iotId: number, userId: number): Promise<PostResult> {
    const iot = await this.travel(iotId);
    return this.postAdvanceGranted({ type: 'travel_advance', id: iot.id }, iot.dvId, iot.employee, `To record travel cash advance for ${iot.iotNo} (${iot.destination}) granted to ${iot.employee}`, userId);
  }

  async postTravelLiquidation(lrId: number, userId: number): Promise<PostResult> {
    const [lr] = await db.select().from(liquidationReports).where(eq(liquidationReports.id, lrId)).limit(1);
    if (!lr) throw new Error('Liquidation report not found');
    if (lr.status !== 'approved' && lr.status !== 'settled') throw new Error(`Liquidation ${lr.lrNo} is not approved`);
    const iot = await this.travel(lr.iotId);
    await this.postTravelAdvanceGranted(iot.id, userId);
    return this.postAdvanceLiquidation(
      { type: 'travel_liquidation', id: lr.id },
      iot.dvId,
      iot.employee,
      num(lr.totalExpenses),
      lr.reviewedDate ? new Date(lr.reviewedDate) : new Date(),
      `To record liquidation ${lr.lrNo} of travel ${iot.iotNo} by ${iot.employee}`,
      userId
    );
  }

  /** A DV was approved: record any cash or travel advance it pays */
  async postAdvancesForDv(dvId: number, userId: number): Promise<void> {
    const [advances, travels] = await Promise.all([
      db.select({ id: cashAdvances.id }).from(cashAdvances).where(and(eq(cashAdvances.dvId, dvId), inArray(cashAdvances.status, ['released', 'liquidated', 'returned']))),
      db.select({ id: itineraryOfTravel.id }).from(itineraryOfTravel).where(and(eq(itineraryOfTravel.dvId, dvId), ne(itineraryOfTravel.status, 'cancelled'))),
    ]);
    for (const { id } of advances) await this.tryPost(`cash advance #${id}`, () => this.postCashAdvanceGranted(id, userId));
    for (const { id } of travels) await this.tryPost(`travel #${id} advance`, () => this.postTravelAdvanceGranted(id, userId));
  }

  // ---------------------------------------------------------------------------
  // Property: depreciation, semi-expendable issues and disposals
  // ---------------------------------------------------------------------------

  /** Depreciation already in the books for each asset (net credits to accumulated depreciation) */
  private async postedDepreciation(assetNos: string[]): Promise<Map<string, number>> {
    const accounts = PPE_ACCOUNTS.map(a => a.accumulated).filter((code): code is string => Boolean(code));
    if (assetNos.length === 0) return new Map();
    const rows = await db
      .select({
        assetNo: journalEntryLines.subsidiary,
        net: sql<string>`SUM(${journalEntryLines.credit}) - SUM(${journalEntryLines.debit})`,
      })
      .from(journalEntryLines)
      .where(and(inArray(journalEntryLines.accountCode, accounts), inArray(journalEntryLines.subsidiary, assetNos)))
      .groupBy(journalEntryLines.subsidiary);
    return new Map(rows.map(r => [r.assetNo ?? '', toCentavos(r.net)]));
  }

  /**
   * Depreciation for a month, per asset: what should have accumulated by month end less what
   * is already posted, so a skipped month is caught up the next time depreciation is posted.
   */
  async getDepreciationRun(year: number, month: number) {
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const assets = await db
      .select({
        id: fixedAssets.id,
        assetNo: fixedAssets.assetNo,
        description: fixedAssets.description,
        acquisitionDate: fixedAssets.acquisitionDate,
        acquisitionCost: fixedAssets.acquisitionCost,
        salvageValue: fixedAssets.salvageValue,
        usefulLife: fixedAssets.usefulLife,
        status: fixedAssets.status,
        categoryName: assetCategories.name,
        accountCode: assetCategories.accountCode,
        disposalDate: sql<string | null>`(SELECT MIN(${assetDisposals.disposalDate}) FROM ${assetDisposals} WHERE ${assetDisposals.assetId} = ${fixedAssets.id})`,
      })
      .from(fixedAssets)
      .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id))
      .where(and(lte(fixedAssets.acquisitionDate, monthEnd), sql`${fixedAssets.acquisitionCost} >= ${CAPITALIZATION_THRESHOLD}`))
      .orderBy(asc(fixedAssets.assetNo));

    // Disposed assets are depreciated up to the month before their disposal
    const inService = assets.filter(a =>
      a.status === 'active' || (a.status === 'disposed' && a.disposalDate !== null && new Date(a.disposalDate) > monthEnd)
    );
    const posted = await this.postedDepreciation(inService.map(a => a.assetNo));

    const rows = inService
      .map(asset => {
        const ppe = ppeAccountFor(asset.accountCode);
        const due = toCentavos(
          accumulatedDepreciationThrough(
            { acquisitionDate: asset.acquisitionDate, cost: num(asset.acquisitionCost), salvage: num(asset.salvageValue), usefulLife: asset.usefulLife },
            year,
            month
          )
        );
        return {
          assetId: asset.id,
          assetNo: asset.assetNo,
          description: asset.description,
          categoryName: asset.categoryName,
          ppeTitle: ppe.title,
          accumulatedAccount: ppe.accumulated,
          expenseAccount: ppe.depreciation,
          amount: ppe.accumulated ? Math.max(0, due - (posted.get(asset.assetNo) ?? 0)) / 100 : 0,
        };
      })
      .filter(row => row.amount > 0);

    return { rows, total: rows.reduce((sum, r) => sum + toCentavos(r.amount), 0) / 100 };
  }

  /** Depreciation entries posted in a year, keyed by month */
  async getDepreciationEntries(year: number) {
    const rows = await db
      .select({ id: journalEntries.id, jevNo: journalEntries.jevNo, sourceId: journalEntries.sourceId, status: journalEntries.status })
      .from(journalEntries)
      .where(and(eq(journalEntries.sourceType, 'depreciation'), gte(journalEntries.sourceId, year * 100 + 1), lte(journalEntries.sourceId, year * 100 + 12)));
    return new Map(rows.map(r => [(r.sourceId ?? 0) % 100, r]));
  }

  /** Post a month's depreciation, dated the last day of the month, once the month has ended */
  async postDepreciation(year: number, month: number, userId: number): Promise<PostResult> {
    if (!(month >= 1 && month <= 12)) throw new Error('Choose a month');
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const label = monthEnd.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    const existing = await this.findBySource('depreciation', year * 100 + month);
    if (existing) return { id: existing.id, jevNo: existing.jevNo, created: false };
    if (monthEnd > new Date()) throw new Error(`Depreciation for ${label} can be posted once the month ends`);

    const { rows } = await this.getDepreciationRun(year, month);
    if (rows.length === 0) throw new Error(`No depreciation is due for ${label}`);

    const expense = new Map<string, number>();
    for (const row of rows) expense.set(row.expenseAccount!, (expense.get(row.expenseAccount!) ?? 0) + toCentavos(row.amount));

    return this.post({
      date: monthEnd,
      fundClusterId: await this.defaultFundClusterId(),
      journalType: 'general',
      particulars: `To record depreciation of property, plant and equipment for ${label}`,
      sourceType: 'depreciation',
      sourceId: year * 100 + month,
      createdBy: userId,
      lines: [
        ...[...expense].map(([accountCode, centavos]) => ({ accountCode, debit: centavos / 100, description: `Depreciation for ${label}` })),
        ...rows.map(row => ({ accountCode: row.accumulatedAccount!, credit: row.amount, subsidiary: row.assetNo, description: row.description })),
      ],
    });
  }

  /** Semi-expendable property is expensed when first issued to an officer on an ICS */
  async postSemiExpendableIssue(assetId: number, userId: number): Promise<PostResult> {
    const [asset] = await db.select().from(fixedAssets).where(eq(fixedAssets.id, assetId)).limit(1);
    if (!asset) throw new Error('Asset not found');
    const cost = num(asset.acquisitionCost);
    if (cost >= CAPITALIZATION_THRESHOLD) throw new Error(`${asset.assetNo} is PPE, not semi-expendable property`);
    if (!(cost > 0)) throw new Error(`${asset.assetNo} has no cost`);

    const [first] = await db
      .select({ documentNo: propertyIssuances.documentNo, issueDate: propertyIssuances.issueDate, issuedTo: propertyIssuances.issuedTo })
      .from(propertyIssuances)
      .where(eq(propertyIssuances.assetId, assetId))
      .orderBy(asc(propertyIssuances.issueDate), asc(propertyIssuances.id))
      .limit(1);
    if (!first) throw new Error(`${asset.assetNo} has not been issued`);

    return this.post({
      date: new Date(first.issueDate),
      fundClusterId: await this.defaultFundClusterId(),
      journalType: 'general',
      particulars: `To record issue of semi-expendable property ${asset.assetNo} to ${first.issuedTo} per ${first.documentNo}`,
      sourceType: 'semi_expendable_issue',
      sourceId: asset.id,
      createdBy: userId,
      lines: [
        { accountCode: ACCOUNTS.SEMI_EXPENDABLE_EXPENSE, debit: cost, subsidiary: asset.assetNo, description: asset.description },
        { accountCode: ACCOUNTS.SEMI_EXPENDABLE_EQUIPMENT, credit: cost, subsidiary: asset.assetNo },
      ],
    });
  }

  /** The entry a disposal posts; empty when nothing is left on the books and nothing was received */
  private async disposalEntry(disposalId: number) {
    const [row] = await db
      .select({
        id: assetDisposals.id,
        disposalNo: assetDisposals.disposalNo,
        disposalDate: assetDisposals.disposalDate,
        disposalMethod: assetDisposals.disposalMethod,
        disposalValue: assetDisposals.disposalValue,
        buyerRecipient: assetDisposals.buyerRecipient,
        assetId: fixedAssets.id,
        assetNo: fixedAssets.assetNo,
        description: fixedAssets.description,
        acquisitionCost: fixedAssets.acquisitionCost,
        accountCode: assetCategories.accountCode,
      })
      .from(assetDisposals)
      .innerJoin(fixedAssets, eq(assetDisposals.assetId, fixedAssets.id))
      .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id))
      .where(eq(assetDisposals.id, disposalId))
      .limit(1);
    if (!row) throw new Error('Disposal not found');

    const cost = toCentavos(row.acquisitionCost);
    const proceeds = toCentavos(row.disposalValue);
    const lines: JournalLineInput[] = [];
    let carrying: number;

    if (cost >= CAPITALIZATION_THRESHOLD * 100) {
      const ppe = ppeAccountFor(row.accountCode);
      const accumulated = ppe.accumulated ? ((await this.postedDepreciation([row.assetNo])).get(row.assetNo) ?? 0) : 0;
      if (accumulated > 0) lines.push({ accountCode: ppe.accumulated!, debit: accumulated / 100, subsidiary: row.assetNo });
      lines.push({ accountCode: ppe.code, credit: cost / 100, subsidiary: row.assetNo, description: row.description });
      carrying = cost - accumulated;
    } else {
      // Semi-expendable property already expensed on issue has nothing left on the books
      carrying = (await this.findBySource('semi_expendable_issue', row.assetId)) ? 0 : cost;
      if (carrying > 0) lines.push({ accountCode: ACCOUNTS.SEMI_EXPENDABLE_EQUIPMENT, credit: carrying / 100, subsidiary: row.assetNo });
    }

    if (proceeds > 0) lines.push({ accountCode: ACCOUNTS.OTHER_RECEIVABLES, debit: proceeds / 100, subsidiary: row.buyerRecipient ?? undefined, description: 'Disposal proceeds' });
    const gain = proceeds - carrying;
    if (gain > 0) lines.push({ accountCode: ACCOUNTS.GAIN_ON_SALE_PPE, credit: gain / 100, subsidiary: row.assetNo });
    if (gain < 0) lines.push({ accountCode: ACCOUNTS.LOSS_ON_SALE_PPE, debit: -gain / 100, subsidiary: row.assetNo });

    return { disposal: row, lines };
  }

  /** Remove a disposed asset from the books; null when there is nothing to post */
  async postAssetDisposal(disposalId: number, userId: number): Promise<PostResult | null> {
    const existing = await this.findBySource('asset_disposal', disposalId);
    if (existing) return { id: existing.id, jevNo: existing.jevNo, created: false };
    const { disposal, lines } = await this.disposalEntry(disposalId);
    if (lines.length < 2) return null;
    return this.post({
      date: new Date(disposal.disposalDate),
      fundClusterId: await this.defaultFundClusterId(),
      journalType: 'general',
      particulars: `To record disposal ${disposal.disposalNo} of ${disposal.assetNo} by ${disposal.disposalMethod}`,
      sourceType: 'asset_disposal',
      sourceId: disposal.id,
      createdBy: userId,
      lines,
    });
  }

  /** A cancelled disposal puts the asset back on the books */
  async reverseAssetDisposal(disposalId: number, userId: number, reason: string): Promise<PostResult | null> {
    const entry = await this.findBySource('asset_disposal', disposalId);
    if (!entry) return null;
    return this.reverse(entry.id, userId, reason, 'asset_disposal_reversal');
  }

  // ---------------------------------------------------------------------------
  // Supplies inventory
  // ---------------------------------------------------------------------------

  private async stockTransaction(transactionId: number) {
    const [row] = await db
      .select({
        id: inventoryTransactions.id,
        transactionNo: inventoryTransactions.transactionNo,
        transactionDate: inventoryTransactions.transactionDate,
        transactionType: inventoryTransactions.transactionType,
        quantity: inventoryTransactions.quantity,
        unitCost: inventoryTransactions.unitCost,
        reference: inventoryTransactions.reference,
        requestedBy: inventoryTransactions.requestedBy,
        itemCode: inventoryItems.itemCode,
        itemName: inventoryItems.itemName,
        accountCode: inventoryItems.accountCode,
      })
      .from(inventoryTransactions)
      .innerJoin(inventoryItems, eq(inventoryTransactions.itemId, inventoryItems.id))
      .where(eq(inventoryTransactions.id, transactionId))
      .limit(1);
    if (!row) throw new Error('Inventory transaction not found');
    return { ...row, value: toCentavos(row.unitCost) * row.quantity, account: supplyAccountFor(row.accountCode) };
  }

  /** Stock of each item in the books (net debits to its inventory account), per fund cluster */
  private async postedStock(itemCodes: string[]) {
    if (itemCodes.length === 0) return [];
    const rows = await db
      .select({
        itemCode: journalEntryLines.subsidiary,
        fundClusterId: journalEntries.fundClusterId,
        balance: sql<string>`SUM(${journalEntryLines.debit} - ${journalEntryLines.credit})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(inArray(journalEntryLines.accountCode, SUPPLY_ACCOUNTS.map(a => a.code)), inArray(journalEntryLines.subsidiary, itemCodes)))
      .groupBy(journalEntryLines.subsidiary, journalEntries.fundClusterId);
    return rows.map(r => ({ itemCode: r.itemCode!, fundClusterId: r.fundClusterId, balance: toCentavos(r.balance) }));
  }

  /**
   * Supplies delivered under an IAR and received into stock: the DV charged them to expense,
   * so move them to inventory until issued. Null for receipts not delivered under an IAR
   * (opening stock, donations) or paid as capital outlay, which post no entry.
   */
  async postStockReceipt(transactionId: number, userId: number): Promise<PostResult | null> {
    const existing = await this.findBySource('stock_receipt', transactionId);
    if (existing) return { id: existing.id, jevNo: existing.jevNo, created: false };
    const receipt = await this.stockTransaction(transactionId);
    if (receipt.transactionType !== 'receipt') throw new Error(`${receipt.transactionNo} is not a receipt`);

    const iarNo = receipt.reference?.includes('/L') ? receipt.reference.slice(0, receipt.reference.lastIndexOf('/L')) : null;
    if (!iarNo) return null;
    const [iar] = await db
      .select({ dvId: inspectionAcceptanceReports.dvId })
      .from(inspectionAcceptanceReports)
      .where(eq(inspectionAcceptanceReports.iarNo, iarNo))
      .limit(1);
    if (!iar?.dvId) return null;
    const dv = await this.approvedDv(iar.dvId, userId);
    if (accountTypeOf(dv.account) !== 'expense' || receipt.value <= 0) return null;

    await this.ensureAccount(receipt.account.code, receipt.account.title);
    return this.post({
      date: new Date(receipt.transactionDate),
      fundClusterId: dv.fundClusterId,
      journalType: 'general',
      particulars: `To record receipt of ${receipt.quantity} ${receipt.itemName} into stock per ${receipt.reference} (DV ${dv.dvNo})`,
      sourceType: 'stock_receipt',
      sourceId: receipt.id,
      createdBy: userId,
      lines: [
        { accountCode: receipt.account.code, debit: receipt.value / 100, subsidiary: receipt.itemCode, description: receipt.itemName },
        { accountCode: dv.account, credit: receipt.value / 100, description: `Received into stock, paid by DV ${dv.dvNo}` },
      ],
    });
  }

  /**
   * Supplies issued (RIS): charge them to expense out of inventory. Only stock that is in the
   * books is expensed, so stock never moved to inventory (already expensed on its DV) is not
   * charged twice. Null when the item has no stock in the books.
   */
  async postStockIssue(transactionId: number, userId: number): Promise<PostResult | null> {
    const existing = await this.findBySource('stock_issue', transactionId);
    if (existing) return { id: existing.id, jevNo: existing.jevNo, created: false };
    const issue = await this.stockTransaction(transactionId);
    if (issue.transactionType !== 'issue') throw new Error(`${issue.transactionNo} is not an issue`);

    const [fund] = (await this.postedStock([issue.itemCode])).filter(s => s.balance > 0).sort((a, b) => b.balance - a.balance);
    const amount = Math.min(issue.value, fund?.balance ?? 0);
    if (amount <= 0) return null;

    await this.ensureAccount(issue.account.expense, issue.account.title.replace('Inventory', 'Expenses'));
    return this.post({
      date: new Date(issue.transactionDate),
      fundClusterId: fund.fundClusterId,
      journalType: 'general',
      particulars: `To record issue of ${issue.quantity} ${issue.itemName}${issue.requestedBy ? ` to ${issue.requestedBy}` : ''}${issue.reference ? ` per ${issue.reference}` : ''}`,
      sourceType: 'stock_issue',
      sourceId: issue.id,
      createdBy: userId,
      lines: [
        { accountCode: issue.account.expense, debit: amount / 100, subsidiary: issue.itemCode, description: issue.itemName },
        { accountCode: issue.account.code, credit: amount / 100, subsidiary: issue.itemCode },
      ],
    });
  }

  /** A deleted stock transaction takes its entry with it */
  async reverseStockTransaction(transactionId: number, userId: number, reason: string): Promise<PostResult | null> {
    const entry = (await this.findBySource('stock_receipt', transactionId)) ?? (await this.findBySource('stock_issue', transactionId));
    if (!entry) return null;
    return this.reverse(entry.id, userId, reason, 'stock_reversal');
  }

  /** A DV was approved: move supplies it paid for that are already in stock into inventory */
  async postStockReceiptsForDv(dvId: number, userId: number): Promise<void> {
    const receipts = await db
      .select({ id: inventoryTransactions.id })
      .from(inventoryTransactions)
      .innerJoin(inspectionAcceptanceReports, sql`${inventoryTransactions.reference} LIKE CONCAT(${inspectionAcceptanceReports.iarNo}, '/L%')`)
      .where(and(eq(inventoryTransactions.transactionType, 'receipt'), eq(inspectionAcceptanceReports.dvId, dvId)));
    for (const { id } of receipts) await this.tryPost(`stock receipt #${id}`, () => this.postStockReceipt(id, userId));
  }

  // ---------------------------------------------------------------------------
  // Year-end closing
  // ---------------------------------------------------------------------------

  async isYearClosed(fiscalYear: number): Promise<boolean> {
    const [row] = await db
      .select({ id: fiscalYearClosings.id })
      .from(fiscalYearClosings)
      .where(eq(fiscalYearClosings.fiscalYear, fiscalYear))
      .limit(1);
    return Boolean(row);
  }

  async getYearClosing(fiscalYear: number) {
    const [row] = await db.select().from(fiscalYearClosings).where(eq(fiscalYearClosings.fiscalYear, fiscalYear)).limit(1);
    return row ?? null;
  }

  /**
   * Revenue and expense balances for a year, per fund cluster — what closing would move to
   * Accumulated Surplus/(Deficit). After closing, the year shows nothing left to close.
   */
  async getClosingPreview(fiscalYear: number) {
    const rows = await db
      .select({
        fundClusterId: journalEntries.fundClusterId,
        fundClusterCode: fundClusters.code,
        fundClusterName: fundClusters.name,
        code: journalEntryLines.accountCode,
        title: chartOfAccounts.title,
        accountType: chartOfAccounts.accountType,
        debit: sql<string>`SUM(${journalEntryLines.debit})`,
        credit: sql<string>`SUM(${journalEntryLines.credit})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(chartOfAccounts, eq(journalEntryLines.accountCode, chartOfAccounts.code))
      .leftJoin(fundClusters, eq(journalEntries.fundClusterId, fundClusters.id))
      .where(and(eq(journalEntries.fiscalYear, fiscalYear), inArray(chartOfAccounts.accountType, ['revenue', 'expense'])))
      .groupBy(journalEntries.fundClusterId, fundClusters.code, fundClusters.name, journalEntryLines.accountCode, chartOfAccounts.title, chartOfAccounts.accountType)
      .orderBy(asc(journalEntries.fundClusterId), asc(journalEntryLines.accountCode));

    const funds = new Map<number, {
      fundClusterId: number;
      fundClusterCode: string | null;
      fundClusterName: string | null;
      accounts: { code: string; title: string; accountType: string; balance: number }[];
      revenue: number;
      expense: number;
      surplus: number;
    }>();

    for (const row of rows) {
      // Positive = debit balance
      const net = (toCentavos(row.debit) - toCentavos(row.credit)) / 100;
      if (net === 0) continue;
      const fund = funds.get(row.fundClusterId) ?? {
        fundClusterId: row.fundClusterId,
        fundClusterCode: row.fundClusterCode,
        fundClusterName: row.fundClusterName,
        accounts: [],
        revenue: 0,
        expense: 0,
        surplus: 0,
      };
      fund.accounts.push({ code: row.code, title: row.title, accountType: row.accountType, balance: net });
      if (row.accountType === 'revenue') fund.revenue = Math.round((fund.revenue - net) * 100) / 100;
      else fund.expense = Math.round((fund.expense + net) * 100) / 100;
      fund.surplus = Math.round((fund.revenue - fund.expense) * 100) / 100;
      funds.set(row.fundClusterId, fund);
    }
    return [...funds.values()];
  }

  /** Closing entries posted for a year (any attempt), newest first */
  async getClosingEntries(fiscalYear: number) {
    return db
      .select({ id: journalEntries.id, jevNo: journalEntries.jevNo, status: journalEntries.status, fundClusterId: journalEntries.fundClusterId, sourceId: journalEntries.sourceId })
      .from(journalEntries)
      .where(and(eq(journalEntries.sourceType, 'closing'), eq(journalEntries.fiscalYear, fiscalYear)))
      .orderBy(desc(journalEntries.id));
  }

  /** Things that must be true before a year can be closed */
  async getClosingChecks(fiscalYear: number) {
    const now = new Date();
    const [unposted, tb] = await Promise.all([
      this.getUnposted(),
      this.getTrialBalance(new Date(fiscalYear, 11, 31, 23, 59, 59)),
    ]);
    return {
      yearEnded: fiscalYear < now.getFullYear(),
      alreadyClosed: await this.isYearClosed(fiscalYear),
      unposted: unposted.total,
      balanced: tb.balanced,
    };
  }

  /**
   * Close a fiscal year: per fund cluster, post one entry that zeroes every revenue and
   * expense account into Accumulated Surplus/(Deficit), then lock the year.
   * Safe to retry: funds already closed in this attempt are not closed twice.
   */
  async closeYear(fiscalYear: number, userId: number, remarks?: string) {
    const checks = await this.getClosingChecks(fiscalYear);
    if (checks.alreadyClosed) throw new Error(`FY ${fiscalYear} is already closed`);
    if (!checks.yearEnded) throw new Error(`FY ${fiscalYear} has not ended yet`);
    if (checks.unposted > 0) throw new Error(`${checks.unposted} transaction(s) are not yet in the books. Post them first.`);
    if (!checks.balanced) throw new Error('The trial balance does not balance; investigate before closing.');

    const closingDate = new Date(fiscalYear, 11, 31, 23, 59, 59);
    const existing = await this.getClosingEntries(fiscalYear);
    const posted: PostResult[] = [];

    for (const fund of await this.getClosingPreview(fiscalYear)) {
      const lines: JournalLineInput[] = fund.accounts.map(account => ({
        accountCode: account.code,
        // Reverse each balance: a credit (revenue) balance is debited, a debit (expense) balance credited
        debit: account.balance < 0 ? -account.balance : undefined,
        credit: account.balance > 0 ? account.balance : undefined,
        description: 'Closing',
      }));
      const difference = lines.reduce((sum, l) => sum + toCentavos(l.debit) - toCentavos(l.credit), 0);
      if (difference !== 0) {
        lines.push({
          accountCode: ACCOUNTS.ACCUMULATED_SURPLUS,
          debit: difference < 0 ? -difference / 100 : undefined,
          credit: difference > 0 ? difference / 100 : undefined,
          description: difference > 0 ? 'Surplus for the year' : 'Deficit for the year',
        });
      }
      if (lines.length < 2) continue;

      // Each closing attempt for a fund gets its own source key so a reopened year can be closed again
      const attempt = existing.filter(e => Math.floor((e.sourceId ?? 0) / 100) === fiscalYear * 1000 + fund.fundClusterId).length + 1;
      posted.push(
        await this.post({
          date: closingDate,
          fundClusterId: fund.fundClusterId,
          journalType: 'general',
          particulars: `To close revenue and expense accounts for FY ${fiscalYear} to Accumulated Surplus/(Deficit)`,
          sourceType: 'closing',
          sourceId: (fiscalYear * 1000 + fund.fundClusterId) * 100 + attempt,
          createdBy: userId,
          lines,
        })
      );
    }

    await db.insert(fiscalYearClosings).values({ fiscalYear, closedBy: userId, remarks: remarks?.trim() || null });
    await logAudit({ userId, action: 'COMPLETE', tableName: 'fiscal_year_closings', recordId: fiscalYear, newValues: { fiscalYear, closingEntries: posted.map(p => p.jevNo) } });
    return { closingEntries: posted };
  }

  /** Reopen a closed year: unlock it and reverse its closing entries, dated within the year */
  async reopenYear(fiscalYear: number, userId: number, reason: string) {
    if (!reason?.trim()) throw new Error('Give a reason for reopening the year');
    if (!(await this.isYearClosed(fiscalYear))) throw new Error(`FY ${fiscalYear} is not closed`);

    await db.delete(fiscalYearClosings).where(eq(fiscalYearClosings.fiscalYear, fiscalYear));
    const closingDate = new Date(fiscalYear, 11, 31, 23, 59, 59);
    const reversed: PostResult[] = [];
    for (const entry of await this.getClosingEntries(fiscalYear)) {
      if (entry.status !== 'posted') continue;
      reversed.push(await this.reverse(entry.id, userId, `FY ${fiscalYear} reopened: ${reason.trim()}`, 'closing_reversal', closingDate));
    }
    await logAudit({ userId, action: 'UPDATE', tableName: 'fiscal_year_closings', recordId: fiscalYear, newValues: { reopened: true, reason, reversals: reversed.map(r => r.jevNo) } });
    return { reversals: reversed };
  }

  /**
   * Run an automatic posting without failing the business action that triggered it.
   * Anything that fails shows up in getUnposted() and can be posted later.
   */
  async tryPost(label: string, fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      console.error(`Ledger posting failed (${label}):`, error);
    }
  }

  // ---------------------------------------------------------------------------
  // Catch-up posting
  // ---------------------------------------------------------------------------

  /** Source ids of one type that already have an entry */
  private async postedIds(sourceType: string): Promise<number[]> {
    const rows = await db
      .select({ sourceId: journalEntries.sourceId })
      .from(journalEntries)
      .where(eq(journalEntries.sourceType, sourceType));
    return rows.map(r => r.sourceId!).filter(id => id !== null);
  }

  private async unpostedIds(sourceType: string, table: any, idColumn: any, condition?: SQL): Promise<number[]> {
    const posted = await this.postedIds(sourceType);
    const rows = await db
      .select({ id: idColumn })
      .from(table)
      .where(and(condition, posted.length ? notInArray(idColumn, posted) : undefined));
    return rows.map((r: { id: number }) => r.id);
  }

  /** Transactions that should be in the books but are not yet */
  async getUnposted() {
    const [dvs, paid, reversed, receipts, invoices, colls, deposits, ncas, payrolls, payouts, remits, writeOffs] = await Promise.all([
      this.unpostedIds('dv_approval', disbursementVouchers, disbursementVouchers.id,
        and(inArray(disbursementVouchers.status, ['approved', 'paid']), isNull(disbursementVouchers.deletedAt))),
      this.unpostedIds('payment', payments, payments.id, inArray(payments.status, ['issued', 'cleared', 'stale'])),
      this.unpostedPaymentReversals(),
      this.unpostedIds('cash_receipt', cashReceipts, cashReceipts.id),
      this.unpostedIds('ar_invoice', accountsReceivable, accountsReceivable.id),
      this.unpostedIds('collection', collections, collections.id),
      this.unpostedIds('deposit', bankDeposits, bankDeposits.id, eq(bankDeposits.status, 'confirmed')),
      this.unpostedIds('nca', ncaRegistry, ncaRegistry.id),
      this.unpostedIds('payroll', payrollPeriods, payrollPeriods.id, inArray(payrollPeriods.status, ['Completed', 'Posted'])),
      this.unpostedIds('payroll_payout', payrollPeriods, payrollPeriods.id, eq(payrollPeriods.status, 'Posted')),
      this.unpostedIds('remittance', remittances, remittances.id, eq(remittances.paymentStatus, 'Paid')),
      this.unpostedIds('ar_writeoff', accountsReceivable, accountsReceivable.id, eq(accountsReceivable.status, 'written_off')),
    ]);

    const dvApproved = (dvId: SQL | Column) =>
      sql`EXISTS (SELECT 1 FROM ${disbursementVouchers} WHERE ${disbursementVouchers.id} = ${dvId} AND ${disbursementVouchers.status} IN ('approved', 'paid'))`;
    const [advanceGrants, advanceLiquidations, travelAdvances, travelLiquidations, semiExpendableIssues, disposalIds, stockReceipts, stockIssues] = await Promise.all([
      this.unpostedIds('ca_granted', cashAdvances, cashAdvances.id,
        and(inArray(cashAdvances.status, ['released', 'liquidated', 'returned']), isNotNull(cashAdvances.dvId), dvApproved(cashAdvances.dvId))),
      this.unpostedIds('ca_liquidation', cashAdvances, cashAdvances.id,
        and(
          isNotNull(cashAdvances.dvId),
          dvApproved(cashAdvances.dvId),
          or(eq(cashAdvances.status, 'returned'), and(eq(cashAdvances.status, 'liquidated'), isNotNull(cashAdvances.totalExpenses)))
        )),
      this.unpostedIds('travel_advance', itineraryOfTravel, itineraryOfTravel.id,
        and(isNotNull(itineraryOfTravel.dvId), ne(itineraryOfTravel.status, 'cancelled'), dvApproved(itineraryOfTravel.dvId))),
      this.unpostedIds('travel_liquidation', liquidationReports, liquidationReports.id,
        and(
          inArray(liquidationReports.status, ['approved', 'settled']),
          sql`EXISTS (SELECT 1 FROM ${itineraryOfTravel} WHERE ${itineraryOfTravel.id} = ${liquidationReports.iotId} AND ${dvApproved(sql`${itineraryOfTravel.dvId}`)})`
        )),
      this.unpostedIds('semi_expendable_issue', fixedAssets, fixedAssets.id,
        and(
          sql`${fixedAssets.acquisitionCost} > 0`,
          sql`${fixedAssets.acquisitionCost} < ${CAPITALIZATION_THRESHOLD}`,
          sql`EXISTS (SELECT 1 FROM ${propertyIssuances} WHERE ${propertyIssuances.assetId} = ${fixedAssets.id})`
        )),
      this.unpostedIds('asset_disposal', assetDisposals, assetDisposals.id),
      // Receipts delivered under an IAR whose DV is approved and charged supplies to expense
      this.unpostedIds('stock_receipt', inventoryTransactions, inventoryTransactions.id,
        and(
          eq(inventoryTransactions.transactionType, 'receipt'),
          sql`EXISTS (SELECT 1 FROM ${inspectionAcceptanceReports}
            INNER JOIN ${disbursementVouchers} ON ${disbursementVouchers.id} = ${inspectionAcceptanceReports.dvId}
            INNER JOIN ${objectOfExpenditure} ON ${objectOfExpenditure.id} = ${disbursementVouchers.objectExpenditureId}
            WHERE ${inventoryTransactions.reference} LIKE CONCAT(${inspectionAcceptanceReports.iarNo}, '/L%')
              AND ${disbursementVouchers.status} IN ('approved', 'paid')
              AND ${objectOfExpenditure.code} LIKE '5%' AND ${objectOfExpenditure.code} NOT LIKE '506%')`
        )),
      this.unpostedStockIssues(),
    ]);
    // A disposal with nothing on the books and no proceeds has no entry to post
    const disposals: number[] = [];
    for (const id of disposalIds) {
      if ((await this.disposalEntry(id).catch(() => null))?.lines.length) disposals.push(id);
    }

    const groups = {
      dvs, payments: paid, paymentReversals: reversed, receipts, invoices, collections: colls, deposits, ncas,
      payrolls, payrollPayouts: payouts, remittances: remits, writeOffs,
      advanceGrants, advanceLiquidations, travelAdvances, travelLiquidations, semiExpendableIssues, disposals,
    stockReceipts, stockIssues,
    };
    const total = Object.values(groups).reduce((sum, ids) => sum + ids.length, 0);
    return { ...groups, total };
  }

  /** Issues of items that have stock in the books, oldest first */
  private async unpostedStockIssues(): Promise<number[]> {
    const posted = await this.postedIds('stock_issue');
    const issues = await db
      .select({ id: inventoryTransactions.id, itemCode: inventoryItems.itemCode })
      .from(inventoryTransactions)
      .innerJoin(inventoryItems, eq(inventoryTransactions.itemId, inventoryItems.id))
      .where(and(eq(inventoryTransactions.transactionType, 'issue'), posted.length ? notInArray(inventoryTransactions.id, posted) : undefined))
      .orderBy(asc(inventoryTransactions.transactionDate), asc(inventoryTransactions.id));
    const stocked = new Set(
      (await this.postedStock([...new Set(issues.map(i => i.itemCode))])).filter(s => s.balance > 0).map(s => s.itemCode)
    );
    return issues.filter(i => stocked.has(i.itemCode)).map(i => i.id);
  }

  /** Stale payments whose issue entry exists but has not been reversed */
  private async unpostedPaymentReversals(): Promise<number[]> {
    const rows = await db
      .select({ id: payments.id })
      .from(payments)
      .innerJoin(
        journalEntries,
        and(eq(journalEntries.sourceType, 'payment'), eq(journalEntries.sourceId, payments.id), eq(journalEntries.status, 'posted'))
      )
      .where(inArray(payments.status, ['cancelled', 'stale']));
    return rows.map(r => r.id);
  }

  /** Post everything getUnposted() reports. Safe to run repeatedly. */
  async postAllUnposted(userId: number) {
    const unposted = await this.getUnposted();
    const results = { posted: 0, failed: [] as string[] };
    const run = async (label: string, fn: () => Promise<unknown>) => {
      try {
        const result = (await fn()) as PostResult | null;
        if (result?.created) results.posted++;
      } catch (error) {
        results.failed.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    // Order matters: liabilities and receivables before their settlement
    for (const id of unposted.ncas) await run(`NCA #${id}`, () => this.postNca(id, userId));
    for (const id of unposted.dvs) await run(`DV #${id}`, () => this.postDvApproval(id, userId));
    for (const id of unposted.payments) await run(`Payment #${id}`, () => this.postPaymentIssued(id, userId));
    for (const id of unposted.paymentReversals) await run(`Payment #${id} reversal`, () => this.reversePayment(id, userId, 'Check cancelled or stale'));
    for (const id of unposted.invoices) await run(`Receivable #${id}`, () => this.postArInvoice(id, userId));
    for (const id of unposted.collections) await run(`Collection #${id}`, () => this.postCollection(id, userId));
    for (const id of unposted.receipts) await run(`OR #${id}`, () => this.postCashReceipt(id, userId));
    for (const id of unposted.deposits) await run(`Deposit #${id}`, () => this.postDeposit(id, userId));
    for (const id of unposted.payrolls) await run(`Payroll #${id}`, () => this.postPayroll(id, userId));
    for (const id of unposted.payrollPayouts) await run(`Payroll #${id} payout`, () => this.postPayrollPayout(id, userId));
    for (const id of unposted.remittances) await run(`Remittance #${id}`, () => this.postRemittance(id, userId));
    for (const id of unposted.writeOffs) await run(`Receivable #${id} write-off`, () => this.postArWriteOff(id, userId));
    for (const id of unposted.advanceGrants) await run(`Cash advance #${id}`, () => this.postCashAdvanceGranted(id, userId));
    for (const id of unposted.advanceLiquidations) await run(`Cash advance #${id} liquidation`, () => this.postCashAdvanceLiquidation(id, userId));
    for (const id of unposted.travelAdvances) await run(`Travel #${id} advance`, () => this.postTravelAdvanceGranted(id, userId));
    for (const id of unposted.travelLiquidations) await run(`Liquidation #${id}`, () => this.postTravelLiquidation(id, userId));
    for (const id of unposted.semiExpendableIssues) await run(`Asset #${id} ICS issue`, () => this.postSemiExpendableIssue(id, userId));
    for (const id of unposted.disposals) await run(`Disposal #${id}`, () => this.postAssetDisposal(id, userId));
    // Receipts before issues, so issues find the stock in the books
    for (const id of unposted.stockReceipts) await run(`Stock receipt #${id}`, () => this.postStockReceipt(id, userId));
    for (const id of unposted.stockIssues) await run(`Stock issue #${id}`, () => this.postStockIssue(id, userId));

    return results;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getAccounts(activeOnly = true) {
    return db
      .select()
      .from(chartOfAccounts)
      .where(activeOnly ? eq(chartOfAccounts.isActive, true) : undefined)
      .orderBy(asc(chartOfAccounts.code));
  }

  async getEntries(filters: {
    fiscalYear?: number;
    month?: number;
    journalType?: JournalType;
    fundClusterId?: number;
    search?: string;
  } = {}) {
    const conditions: (SQL | undefined)[] = [
      filters.fiscalYear ? eq(journalEntries.fiscalYear, filters.fiscalYear) : undefined,
      filters.month ? sql`MONTH(${journalEntries.jevDate}) = ${filters.month}` : undefined,
      filters.journalType ? eq(journalEntries.journalType, filters.journalType) : undefined,
      filters.fundClusterId ? eq(journalEntries.fundClusterId, filters.fundClusterId) : undefined,
      filters.search
        ? sql`(${journalEntries.jevNo} LIKE ${`%${filters.search}%`} OR ${journalEntries.particulars} LIKE ${`%${filters.search}%`})`
        : undefined,
    ];

    return db
      .select({
        id: journalEntries.id,
        jevNo: journalEntries.jevNo,
        jevDate: journalEntries.jevDate,
        journalType: journalEntries.journalType,
        particulars: journalEntries.particulars,
        sourceType: journalEntries.sourceType,
        sourceId: journalEntries.sourceId,
        status: journalEntries.status,
        fundClusterCode: fundClusters.code,
        amount: sql<string>`(SELECT COALESCE(SUM(${journalEntryLines.debit}), 0) FROM ${journalEntryLines} WHERE ${journalEntryLines.journalEntryId} = ${journalEntries.id})`,
      })
      .from(journalEntries)
      .leftJoin(fundClusters, eq(journalEntries.fundClusterId, fundClusters.id))
      .where(and(...conditions))
      .orderBy(desc(journalEntries.jevDate), desc(journalEntries.id))
      .limit(500);
  }

  async getEntry(id: number) {
    const [entry] = await db
      .select({
        id: journalEntries.id,
        jevNo: journalEntries.jevNo,
        jevDate: journalEntries.jevDate,
        fiscalYear: journalEntries.fiscalYear,
        fundClusterId: journalEntries.fundClusterId,
        fundClusterCode: fundClusters.code,
        fundClusterName: fundClusters.name,
        journalType: journalEntries.journalType,
        particulars: journalEntries.particulars,
        sourceType: journalEntries.sourceType,
        sourceId: journalEntries.sourceId,
        status: journalEntries.status,
        reversesId: journalEntries.reversesId,
        createdBy: journalEntries.createdBy,
        createdAt: journalEntries.createdAt,
      })
      .from(journalEntries)
      .leftJoin(fundClusters, eq(journalEntries.fundClusterId, fundClusters.id))
      .where(eq(journalEntries.id, id))
      .limit(1);
    if (!entry) return null;

    const lines = await db
      .select({
        lineNo: journalEntryLines.lineNo,
        accountCode: journalEntryLines.accountCode,
        accountTitle: chartOfAccounts.title,
        debit: journalEntryLines.debit,
        credit: journalEntryLines.credit,
        description: journalEntryLines.description,
        subsidiary: journalEntryLines.subsidiary,
        responsibilityCenter: journalEntryLines.responsibilityCenter,
      })
      .from(journalEntryLines)
      .leftJoin(chartOfAccounts, eq(journalEntryLines.accountCode, chartOfAccounts.code))
      .where(eq(journalEntryLines.journalEntryId, id))
      .orderBy(asc(journalEntryLines.lineNo));

    const [reversal] = await db
      .select({ id: journalEntries.id, jevNo: journalEntries.jevNo })
      .from(journalEntries)
      .where(eq(journalEntries.reversesId, id))
      .limit(1);

    return { ...entry, lines, reversedBy: reversal ?? null };
  }

  /** Account balances as of a date: the trial balance */
  async getTrialBalance(asOf: Date, fundClusterId?: number) {
    const rows = await db
      .select({
        code: journalEntryLines.accountCode,
        title: chartOfAccounts.title,
        accountType: chartOfAccounts.accountType,
        debit: sql<string>`SUM(${journalEntryLines.debit})`,
        credit: sql<string>`SUM(${journalEntryLines.credit})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .leftJoin(chartOfAccounts, eq(journalEntryLines.accountCode, chartOfAccounts.code))
      .where(and(lte(journalEntries.jevDate, asOf), fundClusterId ? eq(journalEntries.fundClusterId, fundClusterId) : undefined))
      .groupBy(journalEntryLines.accountCode, chartOfAccounts.title, chartOfAccounts.accountType)
      .orderBy(asc(journalEntryLines.accountCode));

    const accounts = rows
      .map(row => {
        const net = toCentavos(row.debit) - toCentavos(row.credit);
        return {
          code: row.code,
          title: row.title ?? row.code,
          accountType: row.accountType,
          debit: net > 0 ? net / 100 : 0,
          credit: net < 0 ? -net / 100 : 0,
        };
      })
      .filter(row => row.debit !== 0 || row.credit !== 0);

    const totalDebit = accounts.reduce((sum, a) => sum + toCentavos(a.debit), 0) / 100;
    const totalCredit = accounts.reduce((sum, a) => sum + toCentavos(a.credit), 0) / 100;
    return { accounts, totalDebit, totalCredit, balanced: toCentavos(totalDebit) === toCentavos(totalCredit) };
  }

  /** One account's movements in a period with opening and running balances */
  async getGeneralLedger(accountCode: string, from: Date, to: Date, fundClusterId?: number) {
    const [account] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, accountCode)).limit(1);
    if (!account) return null;
    const sign = account.normalBalance === 'debit' ? 1 : -1;
    const clusterFilter = fundClusterId ? eq(journalEntries.fundClusterId, fundClusterId) : undefined;

    const [opening] = await db
      .select({ debit: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`, credit: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)` })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(eq(journalEntryLines.accountCode, accountCode), sql`${journalEntries.jevDate} < ${from}`, clusterFilter));

    const movements = await db
      .select({
        entryId: journalEntries.id,
        jevNo: journalEntries.jevNo,
        jevDate: journalEntries.jevDate,
        particulars: journalEntries.particulars,
        debit: journalEntryLines.debit,
        credit: journalEntryLines.credit,
        subsidiary: journalEntryLines.subsidiary,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(and(eq(journalEntryLines.accountCode, accountCode), gte(journalEntries.jevDate, from), lte(journalEntries.jevDate, to), clusterFilter))
      .orderBy(asc(journalEntries.jevDate), asc(journalEntries.id), asc(journalEntryLines.lineNo));

    let running = sign * (toCentavos(opening?.debit) - toCentavos(opening?.credit));
    const openingBalance = running / 100;
    const rows = movements.map(m => {
      running += sign * (toCentavos(m.debit) - toCentavos(m.credit));
      return { ...m, debit: num(m.debit), credit: num(m.credit), balance: running / 100 };
    });

    return {
      account,
      openingBalance,
      rows,
      totalDebit: rows.reduce((sum, r) => sum + r.debit, 0),
      totalCredit: rows.reduce((sum, r) => sum + r.credit, 0),
      closingBalance: running / 100,
    };
  }
}

export const ledgerService = new LedgerService();

