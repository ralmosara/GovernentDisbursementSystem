import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  db: { select: vi.fn(() => queryBuilder()) },
}));
vi.mock('../../src/lib/services/settings.service', () => ({ getSetting: vi.fn(async () => false) }));
vi.mock('../../src/lib/middleware/audit-logger', () => ({ logApprove: vi.fn(), logReject: vi.fn() }));

const { insightsService } = await import('../../src/lib/services/insights.service');

beforeEach(() => {
  queuedResults.length = 0;
});

const hoursAfter = (base: string, hours: number) => new Date(new Date(base).getTime() + hours * 36e5).toISOString();

describe('InsightsService.getApprovalCycleTimes', () => {
  it('times each stage from the previous approval and summarises medians', async () => {
    const created = '2026-10-01T00:00:00Z';
    const stagesFor = (dvId: number, gaps: number[]) => {
      let elapsed = 0;
      return ['division', 'budget', 'accounting', 'director'].map((stage, i) => {
        elapsed += gaps[i];
        return { dvId, stage, stageOrder: i + 1, status: 'approved', actionDate: hoursAfter(created, elapsed), dvCreatedAt: created };
      });
    };
    queuedResults.push([...stagesFor(1, [2, 10, 4, 1]), ...stagesFor(2, [4, 30, 6, 3])]);

    const { stages, endToEnd } = await insightsService.getApprovalCycleTimes(90);
    const byStage = Object.fromEntries(stages.map(s => [s.stage, s]));

    expect(byStage.division.medianHours).toBe(3);
    expect(byStage.budget.medianHours).toBe(20);
    expect(byStage.budget.p90Hours).toBe(30);
    expect(byStage.director.count).toBe(2);
    expect(endToEnd.count).toBe(2);
    expect(endToEnd.medianHours).toBe((17 + 43) / 2);
  });

  it('stops timing a voucher after a rejection', async () => {
    const created = '2026-10-01T00:00:00Z';
    queuedResults.push([
      { dvId: 1, stage: 'division', stageOrder: 1, status: 'approved', actionDate: hoursAfter(created, 5), dvCreatedAt: created },
      { dvId: 1, stage: 'budget', stageOrder: 2, status: 'rejected', actionDate: hoursAfter(created, 9), dvCreatedAt: created },
      { dvId: 1, stage: 'accounting', stageOrder: 3, status: 'skipped', actionDate: null, dvCreatedAt: created },
      { dvId: 1, stage: 'director', stageOrder: 4, status: 'skipped', actionDate: null, dvCreatedAt: created },
    ]);
    const { stages, endToEnd } = await insightsService.getApprovalCycleTimes(90);
    expect(stages.find(s => s.stage === 'division')!.count).toBe(1);
    expect(stages.find(s => s.stage === 'budget')!.count).toBe(0);
    expect(endToEnd.count).toBe(0);
  });
});

describe('InsightsService.getQueueAges', () => {
  it('buckets open vouchers by days waiting at their current stage', async () => {
    const now = new Date('2026-10-20T00:00:00Z');
    const row = (dvId: number, stageOrder: number, status: string, actionDate: string | null, created: string) => ({
      dvId,
      stage: ['division', 'budget', 'accounting', 'director'][stageOrder - 1],
      stageOrder,
      status,
      actionDate,
      dvCreatedAt: created,
    });
    queuedResults.push([
      // At division for 10 days
      row(1, 1, 'pending', null, '2026-10-10T00:00:00Z'),
      row(1, 2, 'pending', null, '2026-10-10T00:00:00Z'),
      // At budget for 2 days
      row(2, 1, 'approved', '2026-10-18T00:00:00Z', '2026-10-15T00:00:00Z'),
      row(2, 2, 'pending', null, '2026-10-15T00:00:00Z'),
    ]);
    const ages = await insightsService.getQueueAges(now);
    const division = ages.find(a => a.stage === 'division')!;
    const budget = ages.find(a => a.stage === 'budget')!;
    expect(division.buckets).toEqual([0, 0, 0, 1]);
    expect(division.oldestDays).toBe(10);
    expect(budget.buckets).toEqual([0, 1, 0, 0]);
  });
});

describe('InsightsService.findPossibleDuplicates', () => {
  it('returns nothing without a payee or a positive amount', async () => {
    expect(await insightsService.findPossibleDuplicates({ payeeName: '', amount: 100 })).toEqual([]);
    expect(await insightsService.findPossibleDuplicates({ payeeName: 'A', amount: 0 })).toEqual([]);
  });

  it('labels why each match was flagged and excludes the voucher itself', async () => {
    queuedResults.push([
      { id: 1, dvNo: 'DV-1', dvDate: '2026-10-01', payeeName: ' Office Warehouse ', amount: '500.00', orsBursNo: 'X', status: 'approved' },
      { id: 2, dvNo: 'DV-2', dvDate: '2026-10-02', payeeName: 'Someone Else', amount: '500.00', orsBursNo: 'ORS-9', status: 'pending_budget' },
      { id: 3, dvNo: 'DV-3', dvDate: '2026-10-03', payeeName: 'Office Warehouse', amount: '500.00', orsBursNo: 'Y', status: 'draft' },
    ]);
    const matches = await insightsService.findPossibleDuplicates({
      payeeName: 'office warehouse',
      amount: 500,
      orsBursNo: 'ORS-9',
      excludeId: 3,
    });
    expect(matches.map(m => [m.dvNo, m.reason, m.amount])).toEqual([
      ['DV-1', 'Same payee and amount', 500],
      ['DV-2', 'Same ORS/BURS number and amount', 500],
    ]);
  });
});

describe('InsightsService.getObligationByReference', () => {
  it('reports how much of the obligation vouchers have committed', async () => {
    queuedResults.push([{ id: 4, payee: 'P', particulars: 'x', amount: '10000.00', status: 'approved', orsNumber: 'ORS-4', bursNumber: null }]);
    queuedResults.push([{ total: 7500, count: 2 }]);
    const result = await insightsService.getObligationByReference('ORS-4');
    expect(result).toEqual(expect.objectContaining({ amount: 10000, committed: 7500, remaining: 2500, voucherCount: 2 }));
  });

  it('returns null for an unknown reference', async () => {
    queuedResults.push([]);
    expect(await insightsService.getObligationByReference('NOPE')).toBeNull();
  });
});

describe('InsightsService.getPayeeSuggestions', () => {
  it('keeps the latest details per payee and up to three distinct particulars', async () => {
    queuedResults.push([
      { payeeName: 'Acme', payeeTin: '111', payeeAddress: 'New', particulars: 'P1', createdAt: '2026-10-05' },
      { payeeName: 'acme', payeeTin: '000', payeeAddress: 'Old', particulars: 'P2', createdAt: '2026-10-04' },
      { payeeName: 'Acme', payeeTin: '000', payeeAddress: 'Old', particulars: 'P1', createdAt: '2026-10-03' },
      { payeeName: 'Acme', payeeTin: '000', payeeAddress: 'Old', particulars: 'P3', createdAt: '2026-10-02' },
      { payeeName: 'Acme', payeeTin: '000', payeeAddress: 'Old', particulars: 'P4', createdAt: '2026-10-01' },
    ]);
    const [acme] = await insightsService.getPayeeSuggestions('ac');
    expect(acme).toEqual({ payeeName: 'Acme', payeeTin: '111', payeeAddress: 'New', particulars: ['P1', 'P2', 'P3'] });
  });

  it('needs at least two characters', async () => {
    expect(await insightsService.getPayeeSuggestions('a')).toEqual([]);
  });
});
