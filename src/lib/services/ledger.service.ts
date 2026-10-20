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
} from '../db/schema';
import { and, asc, desc, eq, gte, inArray, isNull, lte, like, notInArray, sql, type SQL } from 'drizzle-orm';
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
 */

export const ACCOUNTS = {
  CASH_COLLECTING_OFFICERS: '1010101000',
  PETTY_CASH: '1010102000',
  CASH_IN_BANK_CURRENT: '1010202000',
  CASH_MDS_REGULAR: '1010404000',
  ACCOUNTS_RECEIVABLE: '1030101000',
  ACCOUNTS_PAYABLE: '2010101000',
  DUE_TO_BIR: '2020101000',
  SUBSIDY_FROM_NG: '4030101000',
  MISCELLANEOUS_INCOME: '4060101000',
} as const;

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
  async reverse(entryId: number, userId: number, reason: string, sourceType = 'reversal'): Promise<PostResult> {
    const entry = await this.getEntry(entryId);
    if (!entry) throw new Error('Journal entry not found');
    if (entry.status === 'reversed') {
      const existing = await this.findBySource(sourceType, entryId);
      if (existing) return { id: existing.id, jevNo: existing.jevNo, created: false };
      throw new Error(`JEV ${entry.jevNo} is already reversed`);
    }

    const result = await this.post({
      date: new Date(),
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

  /** Make sure an object-of-expenditure code exists as an expense account */
  private async ensureExpenseAccount(code: string, title: string) {
    await db
      .insert(chartOfAccounts)
      .ignore()
      .values({ code, title, accountType: 'expense', normalBalance: 'debit' });
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
    await this.ensureExpenseAccount(dv.expenseCode, dv.expenseName ?? dv.expenseCode);

    const gross = num(dv.amount);
    const tax = num(dv.totalTaxWithheld);
    const net = dv.netAmount === null ? gross - tax : num(dv.netAmount);
    const rc = dv.responsibilityCenter ?? undefined;

    const lines: JournalLineInput[] = [
      { accountCode: dv.expenseCode, debit: gross, description: dv.particulars, responsibilityCenter: rc },
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
    const [dvs, paid, reversed, receipts, invoices, colls, deposits, ncas] = await Promise.all([
      this.unpostedIds('dv_approval', disbursementVouchers, disbursementVouchers.id,
        and(inArray(disbursementVouchers.status, ['approved', 'paid']), isNull(disbursementVouchers.deletedAt))),
      this.unpostedIds('payment', payments, payments.id, inArray(payments.status, ['issued', 'cleared', 'stale'])),
      this.unpostedPaymentReversals(),
      this.unpostedIds('cash_receipt', cashReceipts, cashReceipts.id),
      this.unpostedIds('ar_invoice', accountsReceivable, accountsReceivable.id),
      this.unpostedIds('collection', collections, collections.id),
      this.unpostedIds('deposit', bankDeposits, bankDeposits.id, eq(bankDeposits.status, 'confirmed')),
      this.unpostedIds('nca', ncaRegistry, ncaRegistry.id),
    ]);
    const groups = { dvs, payments: paid, paymentReversals: reversed, receipts, invoices, collections: colls, deposits, ncas };
    const total = Object.values(groups).reduce((sum, ids) => sum + ids.length, 0);
    return { ...groups, total };
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

