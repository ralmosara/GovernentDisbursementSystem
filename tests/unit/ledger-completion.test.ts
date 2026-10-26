import { describe, it, expect, vi, beforeEach } from 'vitest';

// Queued-result DB mock: each query resolves to the next queued result
const queuedResults: unknown[][] = [];

function queryBuilder() {
  const result = queuedResults.shift() ?? [];
  const builder: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => Promise.resolve(result).then(resolve, reject);
        }
        return () => builder;
      },
    }
  );
  return builder;
}

const db = {
  select: vi.fn(() => queryBuilder()),
  insert: vi.fn(() => queryBuilder()),
  update: vi.fn(() => queryBuilder()),
  delete: vi.fn(() => queryBuilder()),
  transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
};
vi.mock('../../src/lib/db/connection', () => ({ db }));
vi.mock('../../src/lib/middleware/audit-logger', () => ({ logAudit: vi.fn() }));

const { ledgerService, ACCOUNTS, debitAccountFor, accountTypeOf, accumulatedDepreciationThrough, ppeAccountFor } = await import(
  '../../src/lib/services/ledger.service'
);
const {
  buildFinancialPosition,
  buildFinancialPerformance,
  buildChangesInEquity,
  buildCashFlows,
  classifyCashEntry,
  equityOf,
  buildBudgetComparison,
} = await import('../../src/lib/services/financial-statements.service');

beforeEach(() => {
  queuedResults.length = 0;
  vi.restoreAllMocks();
});

const posted = () => vi.spyOn(ledgerService, 'post').mockResolvedValue({ id: 9, jevNo: '01-2025-03-0001', created: true });

// ---------------------------------------------------------------------------
// Account mapping
// ---------------------------------------------------------------------------

describe('DV account mapping', () => {
  it('capitalises capital outlay in the matching PPE account', () => {
    expect(debitAccountFor('5060100000')).toBe('1060101000'); // Land
    expect(debitAccountFor('5060200000')).toBe('1060401000'); // Buildings
    expect(debitAccountFor('5060300000')).toBe(ACCOUNTS.MACHINERY);
    expect(debitAccountFor('5060400000')).toBe('1060601000'); // Motor vehicles
    expect(debitAccountFor('5060500000')).toBe('1060701000'); // Furniture
  });

  it('puts semi-expendable equipment in inventory and any other capital outlay in Machinery', () => {
    expect(debitAccountFor('5060600000')).toBe(ACCOUNTS.SEMI_EXPENDABLE_EQUIPMENT);
    expect(debitAccountFor('5060000000')).toBe(ACCOUNTS.MACHINERY);
  });

  it('expenses everything else under its own object code', () => {
    expect(debitAccountFor('5020200000')).toBe('5020200000');
    expect(debitAccountFor('5010100000')).toBe('5010100000');
  });

  it('types accounts by the first digit of the code', () => {
    expect(accountTypeOf('1060501000')).toBe('asset');
    expect(accountTypeOf('2010101000')).toBe('liability');
    expect(accountTypeOf('3010101000')).toBe('equity');
    expect(accountTypeOf('4030101000')).toBe('revenue');
    expect(accountTypeOf('5020200000')).toBe('expense');
  });

  it('defaults a category without an account to Machinery', () => {
    expect(ppeAccountFor(null).code).toBe(ACCOUNTS.MACHINERY);
    expect(ppeAccountFor('1060601000').accumulated).toBe('1060601100');
    expect(ppeAccountFor('1060101000').depreciation).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Depreciation
// ---------------------------------------------------------------------------

describe('straight-line depreciation', () => {
  const laptop = { acquisitionDate: new Date(2025, 0, 15), cost: 120000, salvage: 0, usefulLife: 5 };

  it('starts the month after acquisition', () => {
    expect(accumulatedDepreciationThrough(laptop, 2025, 1)).toBe(0);
    expect(accumulatedDepreciationThrough(laptop, 2025, 2)).toBe(2000);
    expect(accumulatedDepreciationThrough(laptop, 2025, 12)).toBe(22000);
  });

  it('stops at cost less residual value', () => {
    expect(accumulatedDepreciationThrough({ ...laptop, salvage: 6000 }, 2030, 1)).toBe(114000);
    expect(accumulatedDepreciationThrough({ ...laptop, salvage: 6000 }, 2035, 6)).toBe(114000);
  });

  it('accumulates exactly to the centavo over the useful life', () => {
    const odd = { acquisitionDate: new Date(2025, 0, 1), cost: 100000, salvage: 0, usefulLife: 3 };
    expect(accumulatedDepreciationThrough(odd, 2025, 2)).toBe(2777.78);
    expect(accumulatedDepreciationThrough(odd, 2028, 1)).toBe(100000);
  });

  it('does not depreciate semi-expendable property', () => {
    expect(accumulatedDepreciationThrough({ ...laptop, cost: 49999.99 }, 2026, 1)).toBe(0);
  });

  const asset = {
    id: 1,
    assetNo: 'FA-2025-0001',
    description: 'Server',
    acquisitionDate: new Date(2025, 0, 15),
    acquisitionCost: '120000.00',
    salvageValue: '0.00',
    usefulLife: 5,
    status: 'active',
    categoryName: 'ICT',
    accountCode: '1060503000',
    disposalDate: null,
  };

  it('posts what is due by month end, one credit per asset', async () => {
    const post = posted();
    queuedResults.push([], [asset], [], [{ id: 1 }]); // not yet posted, assets, nothing depreciated, fund cluster
    await ledgerService.postDepreciation(2025, 3, 1);
    const entry = post.mock.calls[0][0];
    expect(entry.sourceType).toBe('depreciation');
    expect(entry.sourceId).toBe(202503);
    expect(entry.lines).toEqual([
      expect.objectContaining({ accountCode: '5050105000', debit: 4000 }),
      expect.objectContaining({ accountCode: '1060503100', credit: 4000, subsidiary: 'FA-2025-0001' }),
    ]);
  });

  it('catches up only what has not been posted', async () => {
    const post = posted();
    queuedResults.push([], [asset], [{ assetNo: 'FA-2025-0001', net: '2000.00' }], [{ id: 1 }]);
    await ledgerService.postDepreciation(2025, 3, 1);
    expect(post.mock.calls[0][0].lines[1]).toEqual(expect.objectContaining({ credit: 2000 }));
  });

  it('refuses a month that has not ended', async () => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    queuedResults.push([]);
    await expect(ledgerService.postDepreciation(next.getFullYear(), next.getMonth() + 1, 1)).rejects.toThrow(/once the month ends/);
  });

  it('excludes assets disposed by the end of the month', async () => {
    queuedResults.push([{ ...asset, status: 'disposed', disposalDate: '2025-03-10' }]);
    const run = await ledgerService.getDepreciationRun(2025, 3);
    expect(run.rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Disposals
// ---------------------------------------------------------------------------

describe('asset disposal', () => {
  const disposal = {
    id: 5,
    disposalNo: 'DSP-2025-0001',
    disposalDate: '2025-06-30',
    disposalMethod: 'sale',
    disposalValue: '100000.00',
    buyerRecipient: 'Buyer Inc.',
    assetId: 1,
    assetNo: 'FA-2025-0001',
    description: 'Vehicle',
    acquisitionCost: '120000.00',
    accountCode: '1060601000',
  };

  it('removes cost and accumulated depreciation and recognises the gain', async () => {
    const post = posted();
    queuedResults.push([], [disposal], [{ assetNo: 'FA-2025-0001', net: '30000.00' }], [{ id: 1 }]);
    await ledgerService.postAssetDisposal(5, 1);
    expect(post.mock.calls[0][0].lines).toEqual([
      expect.objectContaining({ accountCode: '1060601100', debit: 30000 }),
      expect.objectContaining({ accountCode: '1060601000', credit: 120000 }),
      expect.objectContaining({ accountCode: ACCOUNTS.OTHER_RECEIVABLES, debit: 100000 }),
      expect.objectContaining({ accountCode: ACCOUNTS.GAIN_ON_SALE_PPE, credit: 10000 }),
    ]);
  });

  it('recognises a loss on a scrapped asset', async () => {
    const post = posted();
    queuedResults.push([], [{ ...disposal, disposalValue: '0', disposalMethod: 'scrap' }], [{ assetNo: 'FA-2025-0001', net: '30000.00' }], [{ id: 1 }]);
    await ledgerService.postAssetDisposal(5, 1);
    expect(post.mock.calls[0][0].lines).toContainEqual(expect.objectContaining({ accountCode: ACCOUNTS.LOSS_ON_SALE_PPE, debit: 90000 }));
  });

  it('posts nothing for semi-expendable property already expensed and given away', async () => {
    const post = posted();
    queuedResults.push([], [{ ...disposal, acquisitionCost: '15000.00', disposalValue: '0' }], [{ id: 3, jevNo: 'x', status: 'posted' }]);
    expect(await ledgerService.postAssetDisposal(5, 1)).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Advances
// ---------------------------------------------------------------------------

describe('cash advances', () => {
  const ca = (overrides = {}) => ({
    id: 7,
    caNo: 'CA-2025-0007',
    dvId: 70,
    purpose: 'Training supplies',
    status: 'liquidated',
    totalExpenses: '8000.00',
    dateLiquidated: new Date(2025, 4, 2),
    employee: 'Juan Dela Cruz',
    ...overrides,
  });
  const dv = { id: 70, dvNo: '0001-05-2025', status: 'paid', amount: '10000.00', fundClusterId: 1, expenseCode: '5020200000' };

  function liquidate(advance: ReturnType<typeof ca>) {
    vi.spyOn(ledgerService, 'postDvApproval').mockResolvedValue({ id: 1, jevNo: 'dv', created: false });
    const post = posted();
    queuedResults.push([advance], [advance], [dv], [dv]);
    return { post, run: ledgerService.postCashAdvanceLiquidation(7, 1) };
  }

  it('moves the advance from expense into Advances to Officers and Employees', async () => {
    const { post, run } = liquidate(ca());
    await run;
    expect(post.mock.calls[0][0].sourceType).toBe('ca_granted');
    expect(post.mock.calls[0][0].lines).toEqual([
      expect.objectContaining({ accountCode: ACCOUNTS.ADVANCES_OFFICERS_EMPLOYEES, debit: 10000, subsidiary: 'Juan Dela Cruz' }),
      expect.objectContaining({ accountCode: '5020200000', credit: 10000 }),
    ]);
  });

  it('recognises the expenses and the refund of the unused balance', async () => {
    const { post, run } = liquidate(ca());
    await run;
    expect(post.mock.calls[1][0].sourceType).toBe('ca_liquidation');
    expect(post.mock.calls[1][0].lines).toEqual([
      expect.objectContaining({ accountCode: '5020200000', debit: 8000 }),
      expect.objectContaining({ accountCode: ACCOUNTS.CASH_COLLECTING_OFFICERS, debit: 2000 }),
      expect.objectContaining({ accountCode: ACCOUNTS.ADVANCES_OFFICERS_EMPLOYEES, credit: 10000 }),
    ]);
  });

  it('leaves spending beyond the advance to its own reimbursement DV', async () => {
    const { post, run } = liquidate(ca({ totalExpenses: '12500.00' }));
    await run;
    expect(post.mock.calls[1][0].lines).toEqual([
      expect.objectContaining({ accountCode: '5020200000', debit: 10000 }),
      expect.objectContaining({ accountCode: ACCOUNTS.ADVANCES_OFFICERS_EMPLOYEES, credit: 10000 }),
    ]);
  });

  it('treats a returned advance as fully refunded', async () => {
    const { post, run } = liquidate(ca({ status: 'returned', totalExpenses: null }));
    await run;
    expect(post.mock.calls[1][0].lines).toEqual([
      expect.objectContaining({ accountCode: ACCOUNTS.CASH_COLLECTING_OFFICERS, debit: 10000 }),
      expect.objectContaining({ accountCode: ACCOUNTS.ADVANCES_OFFICERS_EMPLOYEES, credit: 10000 }),
    ]);
  });

  it('will not grant an advance from an unapproved DV', async () => {
    queuedResults.push([ca({ status: 'released' })], [{ ...dv, status: 'pending_director' }]);
    await expect(ledgerService.postCashAdvanceGranted(7, 1)).rejects.toThrow(/not yet approved/);
  });
});

// ---------------------------------------------------------------------------
// Financial statements
// ---------------------------------------------------------------------------

const balances = [
  { code: '1010404000', title: 'Cash - MDS, Regular', balance: 50000 },
  { code: '1060501000', title: 'Machinery', balance: 120000 },
  { code: '1060501100', title: 'Accumulated Depreciation - Machinery', balance: -4000 },
  { code: '2010101000', title: 'Accounts Payable', balance: -30000 },
  { code: '3010101000', title: 'Accumulated Surplus/(Deficit)', balance: -100000 },
  { code: '4030101000', title: 'Subsidy from National Government', balance: -150000 },
  { code: '5020200000', title: 'Supplies and Materials Expenses', balance: 110000 },
  { code: '5050105000', title: 'Depreciation - Machinery and Equipment', balance: 4000 },
];

describe('Statement of Financial Position', () => {
  const sfp = buildFinancialPosition([balances]);

  it('balances assets against liabilities and net assets/equity', () => {
    expect(sfp.totals.assets).toEqual([166000]);
    expect(sfp.totals.liabilities).toEqual([30000]);
    expect(sfp.totals.equity).toEqual([136000]);
    expect(sfp.balanced).toBe(true);
  });

  it('shows PPE net of accumulated depreciation', () => {
    expect(sfp.nonCurrentAssets[0]).toEqual(expect.objectContaining({ label: 'Property, plant and equipment', totals: [116000] }));
  });

  it('includes the surplus not yet closed in net assets/equity', () => {
    expect(sfp.equity[0].lines).toContainEqual(expect.objectContaining({ title: 'Surplus/(deficit) for the period, not yet closed', amounts: [36000] }));
  });

  it('puts each column side by side', () => {
    const two = buildFinancialPosition([balances, balances.slice(0, 2).concat([{ code: '3010101000', title: 'Accumulated Surplus/(Deficit)', balance: -170000 }])]);
    expect(two.totals.assets).toEqual([166000, 170000]);
    expect(two.balanced).toBe(true);
  });
});

describe('Statement of Financial Performance', () => {
  it('separates operations from the subsidy from National Government', () => {
    const sfpe = buildFinancialPerformance([[...balances.slice(5), { code: '4050104000', title: 'Gain', balance: -1000 }, { code: '5050404000', title: 'Loss', balance: 500 }]]);
    expect(sfpe.totals.revenue).toEqual([0]);
    expect(sfpe.totals.expenses).toEqual([114000]);
    expect(sfpe.totals.fromOperations).toEqual([-114000]);
    expect(sfpe.totals.beforeSubsidy).toEqual([-113500]);
    expect(sfpe.totals.subsidy).toEqual([150000]);
    expect(sfpe.totals.surplus).toEqual([36500]);
  });

  it('groups expenses by class', () => {
    const sfpe = buildFinancialPerformance([balances]);
    expect(sfpe.expenses.map(g => g.label)).toEqual(['Maintenance and other operating expenses', 'Non-cash expenses']);
  });
});

describe('Statement of Changes in Net Assets/Equity', () => {
  it('reconciles opening equity, the surplus and direct adjustments to closing equity', () => {
    const opening = [{ code: '3010101000', title: 'Accumulated Surplus/(Deficit)', balance: -100000 }];
    const period = [
      { code: '4030101000', title: 'Subsidy', balance: -150000 },
      { code: '5020200000', title: 'Supplies', balance: 114000 },
      { code: '3010101000', title: 'Accumulated Surplus/(Deficit)', balance: -2500 }, // prior-period adjustment
    ];
    const closing = [
      { code: '3010101000', title: 'Accumulated Surplus/(Deficit)', balance: -102500 },
      { code: '4030101000', title: 'Subsidy', balance: -150000 },
      { code: '5020200000', title: 'Supplies', balance: 114000 },
    ];
    const sce = buildChangesInEquity(opening, period, closing);
    expect(sce.opening).toBe(100000);
    expect(sce.surplus).toBe(36000);
    expect(sce.adjustments).toEqual([expect.objectContaining({ amount: 2500 })]);
    expect(sce.closing).toBe(138500);
    expect(sce.reconciles).toBe(true);
    expect(equityOf(closing)).toBe(138500);
  });
});

describe('Statement of Cash Flows', () => {
  const entry = (lines: [string, number, number][], capital = false) => ({
    id: 1,
    capital,
    lines: lines.map(([accountCode, debit, credit]) => ({ accountCode, debit, credit })),
  });

  it('classifies cash movements by their counter-entry', () => {
    expect(classifyCashEntry(entry([['1010404000', 100000, 0], ['4030101000', 0, 100000]]))).toEqual(
      expect.objectContaining({ activity: 'operating', label: 'Receipt of Notice of Cash Allocation', amount: 100000 })
    );
    expect(classifyCashEntry(entry([['2010101000', 9500, 0], ['1010404000', 0, 9500]]))).toEqual(
      expect.objectContaining({ label: 'Payment to suppliers and creditors', direction: 'outflow', amount: -9500 })
    );
    expect(classifyCashEntry(entry([['2020102000', 3000, 0], ['1010404000', 0, 3000]]))?.label).toBe('Remittance of taxes and contributions');
    expect(classifyCashEntry(entry([['2010102000', 42000, 0], ['1010404000', 0, 42000]]))?.label).toBe('Payment of personnel services');
  });

  it('treats payments of capital outlay as investing activities', () => {
    expect(classifyCashEntry(entry([['2010101000', 120000, 0], ['1010404000', 0, 120000]], true))).toEqual(
      expect.objectContaining({ activity: 'investing', direction: 'outflow' })
    );
  });

  it('ignores transfers between cash accounts and counts refunds of advances', () => {
    expect(classifyCashEntry(entry([['1010202000', 5000, 0], ['1010101000', 0, 5000]]))).toBeNull();
    expect(
      classifyCashEntry(entry([['5020200000', 8000, 0], ['1010101000', 2000, 0], ['1990104000', 0, 10000]]))
    ).toEqual(expect.objectContaining({ label: 'Refund of unused cash advances', amount: 2000 }));
  });

  it('reconciles beginning cash and the net change to ending cash', () => {
    const scf = buildCashFlows(
      [
        entry([['1010404000', 100000, 0], ['4030101000', 0, 100000]]),
        entry([['2010101000', 9500, 0], ['1010404000', 0, 9500]]),
        entry([['2010101000', 20000, 0], ['1010404000', 0, 20000]], true),
      ],
      1000,
      71500
    );
    const operating = scf.sections.find(s => s.activity === 'operating')!;
    expect(operating.totalInflows).toBe(100000);
    expect(operating.totalOutflows).toBe(9500);
    expect(operating.net).toBe(90500);
    expect(scf.sections.find(s => s.activity === 'investing')!.net).toBe(-20000);
    expect(scf.netChange).toBe(70500);
    expect(scf.reconciles).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Supplies inventory
// ---------------------------------------------------------------------------

describe('supplies inventory', () => {
  const txn = (overrides = {}) => ({
    id: 40,
    transactionNo: 'INV-T-0040',
    transactionDate: new Date(2025, 5, 3),
    transactionType: 'receipt',
    quantity: 20,
    unitCost: '245.50',
    reference: 'IAR-2025-0003/L1',
    requestedBy: null,
    itemCode: 'INV-0001',
    itemName: 'Bond paper A4',
    accountCode: null,
    ...overrides,
  });
  const dv = { id: 71, dvNo: '0002-06-2025', status: 'approved', amount: '4910.00', fundClusterId: 1, expenseCode: '5020301000' };

  it('moves supplies delivered under a paid IAR from expense into inventory', async () => {
    vi.spyOn(ledgerService, 'postDvApproval').mockResolvedValue({ id: 1, jevNo: 'dv', created: false });
    const post = posted();
    queuedResults.push([], [txn()], [{ dvId: 71 }], [dv], []);
    await ledgerService.postStockReceipt(40, 1);
    expect(post.mock.calls[0][0].sourceType).toBe('stock_receipt');
    expect(post.mock.calls[0][0].lines).toEqual([
      expect.objectContaining({ accountCode: '1040401000', debit: 4910, subsidiary: 'INV-0001' }),
      expect.objectContaining({ accountCode: '5020301000', credit: 4910 }),
    ]);
  });

  it('posts nothing for stock not delivered under an IAR', async () => {
    const post = posted();
    queuedResults.push([], [txn({ reference: 'Opening stock' })]);
    expect(await ledgerService.postStockReceipt(40, 1)).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it('waits for the DV to be approved', async () => {
    queuedResults.push([], [txn()], [{ dvId: 71 }], [{ ...dv, status: 'pending_accounting' }]);
    await expect(ledgerService.postStockReceipt(40, 1)).rejects.toThrow(/not yet approved/);
  });

  it('expenses an issue out of the inventory account the item is carried in', async () => {
    const post = posted();
    queuedResults.push([], [txn({ transactionType: 'issue', quantity: 5, accountCode: '1040408000', requestedBy: 'Admin Division' })], [
      { itemCode: 'INV-0001', fundClusterId: 1, balance: '4910.00' },
    ], []);
    await ledgerService.postStockIssue(40, 1);
    expect(post.mock.calls[0][0].sourceType).toBe('stock_issue');
    expect(post.mock.calls[0][0].lines).toEqual([
      expect.objectContaining({ accountCode: '5020309000', debit: 1227.5 }),
      expect.objectContaining({ accountCode: '1040408000', credit: 1227.5, subsidiary: 'INV-0001' }),
    ]);
  });

  it('expenses no more than the stock in the books, so nothing is charged twice', async () => {
    const post = posted();
    queuedResults.push([], [txn({ transactionType: 'issue', quantity: 30 })], [{ itemCode: 'INV-0001', fundClusterId: 1, balance: '491.00' }], []);
    await ledgerService.postStockIssue(40, 1);
    expect(post.mock.calls[0][0].lines[0].debit).toBe(491);
  });

  it('posts nothing for an item with no stock in the books', async () => {
    const post = posted();
    queuedResults.push([], [txn({ transactionType: 'issue' })], []);
    expect(await ledgerService.postStockIssue(40, 1)).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Budget and actual
// ---------------------------------------------------------------------------

describe('Statement of Comparison of Budget and Actual Amounts', () => {
  it('compares allotments with obligations by class, in PS, MOOE, FA, CO order', () => {
    const scbaa = buildBudgetComparison(
      [
        { allotmentClass: 'CO', allotted: 500000, obligated: 450000 },
        { allotmentClass: 'PS', allotted: 1200000, obligated: 1180000.5 },
        { allotmentClass: 'MOOE', allotted: 800000, obligated: 610000 },
      ],
      3000000
    );
    expect(scbaa.lines.map(l => l.label)).toEqual([
      'Personnel Services',
      'Maintenance and Other Operating Expenses',
      'Capital Outlay',
      'Appropriations not yet allotted',
    ]);
    expect(scbaa.lines[0]).toEqual({ label: 'Personnel Services', original: 1200000, final: 1200000, actual: 1180000.5, difference: 19999.5 });
    expect(scbaa.lines[3]).toMatchObject({ final: 500000, actual: 0 });
    expect(scbaa.total).toMatchObject({ final: 3000000, actual: 2240000.5, difference: 759999.5 });
  });

  it('shows no unallotted line when the appropriation is fully allotted', () => {
    const scbaa = buildBudgetComparison([{ allotmentClass: 'MOOE', allotted: 100, obligated: 40 }], 100);
    expect(scbaa.lines).toHaveLength(1);
    expect(scbaa.total.difference).toBe(60);
  });
});
