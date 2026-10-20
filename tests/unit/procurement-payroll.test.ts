import { describe, it, expect, vi, beforeEach } from 'vitest';

// Queued-result DB mock that also records every builder call, so tests can assert what
// was written (e.g. the status set on a purchase order)
const queuedResults: unknown[][] = [];
const calls: { method: string; args: unknown[] }[] = [];

function queryBuilder() {
  const result = queuedResults.shift() ?? [];
  const builder: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => Promise.resolve(result).then(resolve, reject);
        }
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          return builder;
        };
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
const settings = { enforce_segregation_of_duties: false };
vi.mock('../../src/lib/services/settings.service', () => ({ getSetting: vi.fn(async (key: keyof typeof settings) => settings[key]) }));

const { procurementService } = await import('../../src/lib/services/procurement.service');
const { ledgerService, validateLines, ACCOUNTS } = await import('../../src/lib/services/ledger.service');

beforeEach(() => {
  queuedResults.length = 0;
  calls.length = 0;
  settings.enforce_segregation_of_duties = false;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Procurement
// ---------------------------------------------------------------------------

const prFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  prNo: 'PR-2026-10-0001',
  status: 'approved',
  fundClusterId: 1,
  totalAmount: '100000.00',
  remainingBudget: 100000,
  items: [
    { id: 11, unit: 'ream', description: 'Bond paper', quantity: '100.00', unitCost: '500.00', remainingQty: 100, objectExpenditureId: 5 },
    { id: 12, unit: 'box', description: 'Ballpens', quantity: '50.00', unitCost: '1000.00', remainingQty: 50, objectExpenditureId: 5 },
  ],
  ...overrides,
});

const poInput = (items: { prItemId: number; quantity: number; unitCost: number }[]) => ({
  prId: 1,
  poDate: new Date('2026-10-21'),
  supplierName: 'Office Warehouse Inc.',
  modeOfProcurement: 'Small Value Procurement',
  items,
});

describe('purchase orders', () => {
  it('can only be issued against an approved purchase request', async () => {
    vi.spyOn(procurementService, 'getPr').mockResolvedValue(prFixture({ status: 'submitted' }) as any);
    await expect(procurementService.createPo(poInput([{ prItemId: 11, quantity: 1, unitCost: 500 }]), 1)).rejects.toThrow(/approved purchase request/);
  });

  it('cannot order more than remains on a request line', async () => {
    vi.spyOn(procurementService, 'getPr').mockResolvedValue(prFixture() as any);
    await expect(procurementService.createPo(poInput([{ prItemId: 11, quantity: 101, unitCost: 400 }]), 1)).rejects.toThrow(/only 100 ream remain/);
  });

  it('cannot award above the approved budget for the contract', async () => {
    vi.spyOn(procurementService, 'getPr').mockResolvedValue(prFixture() as any);
    // 100 × 600 = 60,000 + 50 × 900 = 45,000 → 105,000 > 100,000
    await expect(
      procurementService.createPo(poInput([{ prItemId: 11, quantity: 100, unitCost: 600 }, { prItemId: 12, quantity: 50, unitCost: 900 }]), 1)
    ).rejects.toThrow(/exceeds the approved budget/);
  });

  it('issues an order within budget and marks the request ordered', async () => {
    vi.spyOn(procurementService, 'getPr').mockResolvedValue(prFixture() as any);
    queuedResults.push([], [{ insertId: 7 }], [], []); // next number, insert PO, insert items, update PR
    const result = await procurementService.createPo(poInput([{ prItemId: 11, quantity: 100, unitCost: 480 }]), 1);

    expect(result).toEqual({ id: 7, poNo: 'PO-2026-10-0001' });
    const poValues = calls.find(c => c.method === 'values' && (c.args[0] as any).poNo)?.args[0] as any;
    expect(poValues.totalAmount).toBe('48000.00');
    expect(calls.some(c => c.method === 'set' && (c.args[0] as any).status === 'ordered')).toBe(true);
  });
});

describe('inspection and acceptance', () => {
  const poFixture = (overrides: Record<string, unknown> = {}) => ({
    id: 7,
    poNo: 'PO-2026-10-0001',
    status: 'issued',
    items: [
      { id: 21, unit: 'ream', description: 'Bond paper', quantity: '100.00', unitCost: '480.00', remainingQty: 100 },
      { id: 22, unit: 'box', description: 'Ballpens', quantity: '50.00', unitCost: '900.00', remainingQty: 50 },
    ],
    ...overrides,
  });
  const iarInput = (items: { poItemId: number; quantity: number }[]) => ({
    poId: 7,
    iarDate: new Date('2026-10-25'),
    inspectedBy: 'Inspection Committee',
    dateInspected: new Date('2026-10-25'),
    receivedBy: 'Supply Officer',
    dateReceived: new Date('2026-10-25'),
    items,
  });

  it('accepts no more than is undelivered', async () => {
    vi.spyOn(procurementService, 'getPo').mockResolvedValue(poFixture() as any);
    await expect(procurementService.createIar(iarInput([{ poItemId: 21, quantity: 120 }]), 1)).rejects.toThrow(/only 100 ream remain undelivered/);
  });

  it('marks a partial delivery and values it at the contract price', async () => {
    vi.spyOn(procurementService, 'getPo').mockResolvedValue(poFixture() as any);
    queuedResults.push([], [{ insertId: 3 }], [], []);
    await procurementService.createIar(iarInput([{ poItemId: 21, quantity: 60 }]), 1);

    const iarValues = calls.find(c => c.method === 'values' && (c.args[0] as any).iarNo)?.args[0] as any;
    expect(iarValues).toEqual(expect.objectContaining({ acceptance: 'partial', totalAmount: '28800.00' }));
    expect(calls.some(c => c.method === 'set' && (c.args[0] as any).status === 'partially_delivered')).toBe(true);
  });

  it('marks the order delivered when everything has arrived', async () => {
    vi.spyOn(procurementService, 'getPo').mockResolvedValue(poFixture() as any);
    queuedResults.push([], [{ insertId: 4 }], [], []);
    await procurementService.createIar(iarInput([{ poItemId: 21, quantity: 100 }, { poItemId: 22, quantity: 50 }]), 1);
    expect(calls.some(c => c.method === 'set' && (c.args[0] as any).status === 'delivered')).toBe(true);
  });

  it('refuses deliveries on a completed order', async () => {
    vi.spyOn(procurementService, 'getPo').mockResolvedValue(poFixture({ status: 'delivered' }) as any);
    await expect(procurementService.createIar(iarInput([{ poItemId: 21, quantity: 1 }]), 1)).rejects.toThrow(/can't be accepted/);
  });
});

describe('purchase request approval', () => {
  it('blocks the requester from approving their own request under segregation of duties', async () => {
    settings.enforce_segregation_of_duties = true;
    queuedResults.push([{ id: 1, status: 'submitted', requestedBy: 9, remarks: null }]);
    await expect(procurementService.decidePr(1, 9, 'approved')).rejects.toThrow(/Segregation of duties/);
  });

  it('requires a reason to reject', async () => {
    queuedResults.push([{ id: 1, status: 'submitted', requestedBy: 9, remarks: null }]);
    await expect(procurementService.decidePr(1, 2, 'rejected', '  ')).rejects.toThrow(/reason/);
  });
});

// ---------------------------------------------------------------------------
// Payroll in the books
// ---------------------------------------------------------------------------

describe('payroll posting', () => {
  const period = { id: 5, periodNo: 'PAY-2026-10', periodName: 'October 2026', periodEnd: '2026-10-31', payDate: '2026-10-31' };
  // Basic 30,000, PERA 2,000; GSIS 2,700; PhilHealth 750; Pag-IBIG 200; tax 827.55; GSIS loan 1,000; salary loan 500
  const transaction = {
    basicSalary: '30000.00', pera: '2000.00', overtime: '0.00', additionalAllowance: '0.00', otherEarnings: '0.00',
    gsisContribution: '2700.00', philhealthContribution: '750.00', pagibigContribution: '200.00', withholdingTax: '827.55',
    gsisLoan: '1000.00', pagibigLoan: '0.00', salaryLoan: '500.00', otherDeductions: '0.00',
    netPay: '26022.45',
  };

  it('posts a balanced entry with employee and government shares owed to each agency', async () => {
    const post = vi.spyOn(ledgerService, 'post').mockResolvedValue({ id: 1, jevNo: 'x', created: true });
    queuedResults.push([period], [transaction], [{ id: 1 }]); // period, transactions, default fund cluster
    await ledgerService.postPayroll(5, 1);

    const entry = post.mock.calls[0][0];
    const line = (code: string) => entry.lines.find(l => l.accountCode === code);
    expect(validateLines(entry.lines)).toBeNull();
    expect(line(ACCOUNTS.SALARIES_REGULAR)?.debit).toBe(30000);
    expect(line(ACCOUNTS.PERA)?.debit).toBe(2000);
    expect(line(ACCOUNTS.RETIREMENT_LIFE_INSURANCE)?.debit).toBe(3600); // GSIS 12%
    expect(line(ACCOUNTS.DUE_TO_GSIS)?.credit).toBe(2700 + 3600 + 1000); // shares + loan
    expect(line(ACCOUNTS.DUE_TO_PAGIBIG)?.credit).toBe(400); // ₱200 each, capped
    expect(line(ACCOUNTS.DUE_TO_PHILHEALTH)?.credit).toBe(1500);
    expect(line(ACCOUNTS.DUE_TO_BIR)?.credit).toBe(827.55);
    expect(line(ACCOUNTS.OTHER_PAYABLES)?.credit).toBe(500);
    expect(line(ACCOUNTS.DUE_TO_OFFICERS_EMPLOYEES)?.credit).toBe(26022.45);
  });

  it('pays BIR remittances through the Tax Remittance Advice account', async () => {
    const post = vi.spyOn(ledgerService, 'post').mockResolvedValue({ id: 2, jevNo: 'y', created: true });
    queuedResults.push(
      [{ id: 3, remittanceNo: 'REM-2026-0003', remittanceType: 'BIR', month: 10, year: 2026, totalAmount: '827.55', paymentDate: '2026-11-10', referenceNo: 'TRA-1' }],
      [{ id: 1 }]
    );
    await ledgerService.postRemittance(3, 1);
    expect(post.mock.calls[0][0].lines).toEqual([
      expect.objectContaining({ accountCode: ACCOUNTS.DUE_TO_BIR, debit: 827.55 }),
      expect.objectContaining({ accountCode: ACCOUNTS.CASH_TRA, credit: 827.55 }),
    ]);
  });
});

// ---------------------------------------------------------------------------
// Property accountability, write-offs and stock receipts
// ---------------------------------------------------------------------------

const { propertyService, documentTypeFor } = await import('../../src/lib/services/property.service');

describe('property accountability', () => {
  it('uses a PAR from ₱50,000 and an ICS below (COA Circular 2022-004)', () => {
    expect(documentTypeFor(50000)).toBe('PAR');
    expect(documentTypeFor(49999.99)).toBe('ICS');
  });

  it('refuses to issue an asset that someone already holds', async () => {
    queuedResults.push(
      [{ id: 3, assetNo: 'PPE-001', status: 'active', acquisitionCost: '85000.00' }],
      [{ id: 9, issuedTo: 'Ana Reyes', documentNo: 'PAR-2026-10-0001', status: 'active' }]
    );
    await expect(propertyService.issue({ assetId: 3, issuedTo: 'Ben Cruz', issueDate: new Date() }, 1)).rejects.toThrow(/already issued to Ana Reyes/);
  });

  it('refuses to issue disposed property', async () => {
    queuedResults.push([{ id: 3, assetNo: 'PPE-001', status: 'disposed', acquisitionCost: '85000.00' }]);
    await expect(propertyService.issue({ assetId: 3, issuedTo: 'Ben Cruz', issueDate: new Date() }, 1)).rejects.toThrow(/disposed/);
  });

  it('refuses a transfer to the officer who already holds it', async () => {
    queuedResults.push([{ id: 9, assetId: 3, issuedTo: 'Ana Reyes', documentNo: 'PAR-2026-10-0001', status: 'active' }]);
    await expect(propertyService.transfer(9, { issuedTo: 'ana reyes', issueDate: new Date() }, 'reassignment', 1)).rejects.toThrow(/already with this officer/);
  });
});

describe('receivable write-off', () => {
  it('recognises the impairment loss and removes the receivable', async () => {
    vi.spyOn(ledgerService, 'postArInvoice').mockResolvedValue({ id: 1, jevNo: 'x', created: false });
    const post = vi.spyOn(ledgerService, 'post').mockResolvedValue({ id: 2, jevNo: 'y', created: true });
    queuedResults.push(
      [{ id: 4, arNo: 'AR-0004', status: 'written_off', balance: '1500.00', debtorName: 'Juan Dela Cruz', updatedAt: new Date('2026-10-20') }],
      [{ id: 1 }]
    );
    await ledgerService.postArWriteOff(4, 1);
    expect(post.mock.calls[0][0].lines).toEqual([
      expect.objectContaining({ accountCode: ACCOUNTS.IMPAIRMENT_LOSS_RECEIVABLES, debit: 1500 }),
      expect.objectContaining({ accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, credit: 1500 }),
    ]);
  });
});

describe('receiving deliveries into stock', () => {
  it('refuses fractional quantities, since stock is counted in whole units', async () => {
    vi.spyOn(procurementService, 'getIar').mockResolvedValue({
      id: 2, iarNo: 'IAR-2026-10-0002', dateReceived: new Date(), po: { supplierName: 'S', poNo: 'PO-1' },
      items: [{ poItemId: 21, itemNo: 1, description: 'Bond paper', quantity: '2.50', unitCost: '480.00' }],
    } as any);
    vi.spyOn(procurementService, 'getStockReceipts').mockResolvedValue(new Map());
    await expect(procurementService.receiveIntoStock(2, [{ poItemId: 21, inventoryItemId: 5 }], 1)).rejects.toThrow(/whole units/);
  });

  it('receives each line only once', async () => {
    vi.spyOn(procurementService, 'getIar').mockResolvedValue({
      id: 2, iarNo: 'IAR-2026-10-0002', dateReceived: new Date(), po: { supplierName: 'S', poNo: 'PO-1' },
      items: [{ poItemId: 21, itemNo: 1, description: 'Bond paper', quantity: '10.00', unitCost: '480.00' }],
    } as any);
    vi.spyOn(procurementService, 'getStockReceipts').mockResolvedValue(new Map([['IAR-2026-10-0002/L1', { id: 1 } as any]]));
    await expect(procurementService.receiveIntoStock(2, [{ poItemId: 21, inventoryItemId: 5 }], 1)).rejects.toThrow(/already received/);
  });
});
