import { describe, it, expect, vi, beforeEach } from 'vitest';

// Each db.select()/insert()/update() consumes the next queued result; builders are
// chainable and awaitable
const queuedResults: unknown[][] = [];

function queryBuilder() {
  const result = queuedResults.shift() ?? [];
  const builder: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            Promise.resolve(result).then(resolve, reject);
        }
        return () => builder;
      },
    }
  );
  return builder;
}

vi.mock('../../src/lib/db/connection', () => ({
  db: {
    select: vi.fn(() => queryBuilder()),
    insert: vi.fn(() => queryBuilder()),
    update: vi.fn(() => queryBuilder()),
    delete: vi.fn(() => queryBuilder()),
  },
}));
vi.mock('../../src/lib/middleware/audit-logger', () => ({ logAudit: vi.fn() }));

const { ledgerService, validateLines, ACCOUNTS } = await import('../../src/lib/services/ledger.service');
const { ncaService } = await import('../../src/lib/services/nca.service');

beforeEach(() => {
  queuedResults.length = 0;
  vi.restoreAllMocks();
});

describe('validateLines', () => {
  it('accepts a balanced entry', () => {
    expect(validateLines([
      { accountCode: 'A', debit: 100 },
      { accountCode: 'B', credit: 60 },
      { accountCode: 'C', credit: 40 },
    ])).toBeNull();
  });

  it('rejects unbalanced entries, naming both totals', () => {
    expect(validateLines([{ accountCode: 'A', debit: 100 }, { accountCode: 'B', credit: 99.99 }])).toMatch(/₱100\.00.*₱99\.99/);
  });

  it('compares at centavo precision, ignoring floating-point noise', () => {
    expect(validateLines([
      { accountCode: 'A', debit: 0.1 },
      { accountCode: 'A', debit: 0.2 },
      { accountCode: 'B', credit: 0.3 },
    ])).toBeNull();
  });

  it('needs two lines, each with exactly one positive side', () => {
    expect(validateLines([{ accountCode: 'A', debit: 1 }])).toMatch(/at least two/);
    expect(validateLines([{ accountCode: 'A', debit: 1, credit: 1 }, { accountCode: 'B' }])).toMatch(/either a debit or a credit/);
    expect(validateLines([{ accountCode: 'A', debit: -5 }, { accountCode: 'B', credit: -5 }])).toMatch(/negative/);
    expect(validateLines([{ accountCode: '', debit: 5 }, { accountCode: 'B', credit: 5 }])).toMatch(/no account/);
  });
});

describe('postDvApproval', () => {
  const dvRow = (overrides: Record<string, unknown> = {}) => ({
    id: 7,
    dvNo: 'DV-0007',
    fundClusterId: 1,
    payeeName: 'Office Warehouse Inc.',
    particulars: 'Office supplies',
    amount: '112000.00',
    totalTaxWithheld: '6000.00',
    netAmount: '106000.00',
    responsibilityCenter: 'Finance',
    expenseCode: '5020301000',
    expenseName: 'Office Supplies Expenses',
    ...overrides,
  });

  it('debits the expense and credits Due to BIR and Accounts Payable', async () => {
    const post = vi.spyOn(ledgerService, 'post').mockResolvedValue({ id: 1, jevNo: '01-2026-10-0001', created: true });
    queuedResults.push([dvRow()], [], []); // DV, ensure account, update DV

    await ledgerService.postDvApproval(7, 3);

    const entry = post.mock.calls[0][0];
    expect(entry).toEqual(expect.objectContaining({ sourceType: 'dv_approval', sourceId: 7, journalType: 'general', fundClusterId: 1 }));
    expect(entry.lines).toEqual([
      expect.objectContaining({ accountCode: '5020301000', debit: 112000 }),
      expect.objectContaining({ accountCode: ACCOUNTS.DUE_TO_BIR, credit: 6000 }),
      expect.objectContaining({ accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, credit: 106000, subsidiary: 'Office Warehouse Inc.' }),
    ]);
    expect(validateLines(entry.lines)).toBeNull();
  });

  it('credits the full amount to Accounts Payable on vouchers from before withholding was recorded', async () => {
    const post = vi.spyOn(ledgerService, 'post').mockResolvedValue({ id: 1, jevNo: 'x', created: true });
    queuedResults.push([dvRow({ amount: '5000.00', totalTaxWithheld: '0.00', netAmount: null })], [], []);

    await ledgerService.postDvApproval(7, 3);

    expect(post.mock.calls[0][0].lines).toEqual([
      expect.objectContaining({ debit: 5000 }),
      expect.objectContaining({ accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, credit: 5000 }),
    ]);
  });

  it('refuses a DV without an object of expenditure', async () => {
    queuedResults.push([dvRow({ expenseCode: null })]);
    await expect(ledgerService.postDvApproval(7, 3)).rejects.toThrow(/no object of expenditure/);
  });
});

describe('postPaymentIssued', () => {
  const paymentRow = (paymentType: string) => ({
    id: 9,
    dvId: 7,
    paymentType,
    amount: '106000.00',
    checkNo: '0012345',
    adaReference: 'ADA-77',
    dvNo: 'DV-0007',
    fundClusterId: 1,
    payeeName: 'Office Warehouse Inc.',
  });

  it.each([
    ['check_mds', ACCOUNTS.CASH_MDS_REGULAR, 'check_disbursements'],
    ['check_commercial', ACCOUNTS.CASH_IN_BANK_CURRENT, 'check_disbursements'],
    ['ada', ACCOUNTS.CASH_MDS_REGULAR, 'cash_disbursements'],
  ])('%s settles Accounts Payable out of %s in the %s journal', async (type, cashAccount, journal) => {
    vi.spyOn(ledgerService, 'postDvApproval').mockResolvedValue({ id: 1, jevNo: 'x', created: false });
    const post = vi.spyOn(ledgerService, 'post').mockResolvedValue({ id: 2, jevNo: 'y', created: true });
    queuedResults.push([paymentRow(type)]);

    await ledgerService.postPaymentIssued(9, 3);

    const entry = post.mock.calls[0][0];
    expect(entry.journalType).toBe(journal);
    expect(entry.lines).toEqual([
      expect.objectContaining({ accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: 106000 }),
      expect.objectContaining({ accountCode: cashAccount, credit: 106000 }),
    ]);
  });

  it('records the liability first if it was never posted', async () => {
    const liability = vi.spyOn(ledgerService, 'postDvApproval').mockResolvedValue({ id: 1, jevNo: 'x', created: true });
    vi.spyOn(ledgerService, 'post').mockResolvedValue({ id: 2, jevNo: 'y', created: true });
    queuedResults.push([paymentRow('check_mds')]);

    await ledgerService.postPaymentIssued(9, 3);
    expect(liability).toHaveBeenCalledWith(7, 3);
  });
});

describe('post', () => {
  it('returns the existing entry instead of posting a source twice', async () => {
    queuedResults.push([{ id: 5, jevNo: '01-2026-10-0005', status: 'posted' }]);
    const result = await ledgerService.post({
      date: new Date(),
      fundClusterId: 1,
      journalType: 'general',
      particulars: 'x',
      sourceType: 'dv_approval',
      sourceId: 7,
      createdBy: 1,
      lines: [{ accountCode: 'A', debit: 1 }, { accountCode: 'B', credit: 1 }],
    });
    expect(result).toEqual({ id: 5, jevNo: '01-2026-10-0005', created: false });
  });

  it('rejects accounts missing from the chart of accounts', async () => {
    queuedResults.push([{ code: '1010101000' }]); // only one of the two codes is known
    await expect(
      ledgerService.post({
        date: new Date(),
        fundClusterId: 1,
        journalType: 'general',
        particulars: 'x',
        sourceType: 'manual',
        sourceId: null,
        createdBy: 1,
        lines: [{ accountCode: '1010101000', debit: 1 }, { accountCode: '9999999999', credit: 1 }],
      })
    ).rejects.toThrow(/Unknown or inactive account: 9999999999/);
  });
});

describe('getTrialBalance', () => {
  it('nets each account to one side and checks the totals agree', async () => {
    queuedResults.push([
      { code: '1010404000', title: 'Cash - MDS', accountType: 'asset', debit: '500000.00', credit: '106000.00' },
      { code: '2010101000', title: 'Accounts Payable', accountType: 'liability', debit: '106000.00', credit: '106000.00' },
      { code: '2020101000', title: 'Due to BIR', accountType: 'liability', debit: '0.00', credit: '6000.00' },
      { code: '4030101000', title: 'Subsidy from NG', accountType: 'revenue', debit: '0.00', credit: '500000.00' },
      { code: '5020301000', title: 'Office Supplies', accountType: 'expense', debit: '112000.00', credit: '0.00' },
    ]);
    const tb = await ledgerService.getTrialBalance(new Date());

    // Accounts Payable nets to zero and drops out
    expect(tb.accounts.map(a => a.code)).toEqual(['1010404000', '2020101000', '4030101000', '5020301000']);
    expect(tb.accounts[0]).toEqual(expect.objectContaining({ debit: 394000, credit: 0 }));
    expect(tb.totalDebit).toBe(506000);
    expect(tb.totalCredit).toBe(506000);
    expect(tb.balanced).toBe(true);
  });
});

describe('NCA limit on MDS checks and ADAs', () => {
  it('does not block payments while no NCA is recorded for the fund and year', async () => {
    queuedResults.push([{ total: '0', count: 0 }], [{ total: '250000.00' }]);
    await expect(ncaService.assertAvailable(1, 2026, 1_000_000)).resolves.toBeUndefined();
  });

  it('allows a payment within the remaining allocation', async () => {
    queuedResults.push([{ total: '500000.00', count: 1 }], [{ total: '106000.00' }]);
    await expect(ncaService.assertAvailable(1, 2026, 394000)).resolves.toBeUndefined();
  });

  it('blocks a payment that would exceed it', async () => {
    queuedResults.push([{ total: '500000.00', count: 1 }], [{ total: '106000.00' }]);
    await expect(ncaService.assertAvailable(1, 2026, 394000.01)).rejects.toThrow(/Not enough cash allocation/);
  });
});
