import { describe, it, expect, vi, beforeEach } from 'vitest';

// Each db.select() consumes the next queued result; the builder is chainable and awaitable
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

const settings = { enforce_segregation_of_duties: false };
vi.mock('../../src/lib/services/settings.service', () => ({
  getSetting: vi.fn(async (key: keyof typeof settings) => settings[key]),
}));

// approval.service pulls in the audit logger; only its stage table is needed here
vi.mock('../../src/lib/middleware/audit-logger', () => ({ logApprove: vi.fn(), logReject: vi.fn() }));

const { workQueueService, formatWaiting } = await import('../../src/lib/services/work-queue.service');

type StageStatus = 'pending' | 'approved' | 'rejected' | 'skipped';
const STAGES = ['division', 'budget', 'accounting', 'director'] as const;

/** Workflow rows for one DV, as the joined query returns them */
function dvRows(opts: {
  dvId: number;
  statuses: StageStatus[];
  approvers?: (number | null)[];
  actionDates?: (string | null)[];
  createdBy?: number;
  createdAt?: string;
}) {
  return STAGES.map((stage, i) => ({
    dvId: opts.dvId,
    dvNo: `DV-2026-10-${String(opts.dvId).padStart(4, '0')}`,
    dvDate: '2026-10-01',
    payeeName: `Payee ${opts.dvId}`,
    particulars: 'Office supplies',
    amount: '1000.00',
    orsBursNo: `ORS-${opts.dvId}`,
    createdBy: opts.createdBy ?? 99,
    createdAt: opts.createdAt ?? '2026-10-01T00:00:00Z',
    fundClusterCode: '01',
    stage,
    stageOrder: i + 1,
    stageStatus: opts.statuses[i],
    approverUserId: opts.approvers?.[i] ?? null,
    actionDate: opts.actionDates?.[i] ?? null,
  }));
}

beforeEach(() => {
  queuedResults.length = 0;
  settings.enforce_segregation_of_duties = false;
});

describe('WorkQueueService.getDvApprovals', () => {
  it('shows a DV only to the role that owns its current stage', async () => {
    // DV 1 is still at division: all four stage rows are pending
    const rows = dvRows({ dvId: 1, statuses: ['pending', 'pending', 'pending', 'pending'] });

    queuedResults.push(rows);
    const director = await workQueueService.getDvApprovals({ id: 5, roles: ['director'] });
    expect(director.approvals).toEqual([]);

    queuedResults.push(rows);
    const division = await workQueueService.getDvApprovals({ id: 6, roles: ['division_staff'] });
    expect(division.approvals.map(a => a.dvId)).toEqual([1]);
    expect(division.approvals[0].stage).toBe('division');
  });

  it('lets administrators act on any current stage', async () => {
    queuedResults.push([
      ...dvRows({ dvId: 1, statuses: ['pending', 'pending', 'pending', 'pending'] }),
      ...dvRows({ dvId: 2, statuses: ['approved', 'approved', 'pending', 'pending'], actionDates: ['2026-10-02', '2026-10-03', null, null] }),
    ]);
    const admin = await workQueueService.getDvApprovals({ id: 1, roles: ['administrator'] });
    expect(admin.approvals.map(a => [a.dvId, a.stage])).toEqual([
      [1, 'division'],
      [2, 'accounting'],
    ]);
  });

  it('measures waiting time from when the previous stage was approved', async () => {
    queuedResults.push(
      dvRows({ dvId: 3, statuses: ['approved', 'pending', 'pending', 'pending'], actionDates: ['2026-10-05T08:00:00Z', null, null, null] })
    );
    const { approvals } = await workQueueService.getDvApprovals({ id: 2, roles: ['budget_officer'] });
    expect(approvals[0].waitingSince.toISOString()).toBe('2026-10-05T08:00:00.000Z');
  });

  it('sorts the oldest-waiting voucher first', async () => {
    queuedResults.push([
      ...dvRows({ dvId: 1, statuses: ['pending', 'pending', 'pending', 'pending'], createdAt: '2026-10-10T00:00:00Z' }),
      ...dvRows({ dvId: 2, statuses: ['pending', 'pending', 'pending', 'pending'], createdAt: '2026-10-02T00:00:00Z' }),
    ]);
    const { approvals } = await workQueueService.getDvApprovals({ id: 6, roles: ['division_staff'] });
    expect(approvals.map(a => a.dvId)).toEqual([2, 1]);
  });

  it('moves items blocked by segregation of duties out of the actionable list', async () => {
    settings.enforce_segregation_of_duties = true;
    queuedResults.push([
      // Prepared by user 7
      ...dvRows({ dvId: 1, statuses: ['pending', 'pending', 'pending', 'pending'], createdBy: 7 }),
      // User 7 approved division; budget is now current
      ...dvRows({ dvId: 2, statuses: ['approved', 'pending', 'pending', 'pending'], approvers: [7, null, null, null], actionDates: ['2026-10-03', null, null, null] }),
    ]);
    const { approvals, blocked } = await workQueueService.getDvApprovals({ id: 7, roles: ['administrator'] });
    expect(approvals).toEqual([]);
    expect(blocked.map(b => [b.dvId, b.blockedReason])).toEqual([
      [1, 'You prepared this voucher'],
      [2, 'You approved the division stage'],
    ]);
  });

  it('returns nothing for users without an approval role', async () => {
    const result = await workQueueService.getDvApprovals({ id: 8, roles: ['cashier'] });
    expect(result).toEqual({ approvals: [], blocked: [] });
  });
});

describe('WorkQueueService.getQueue', () => {
  it('adds pending obligations for budget officers and counts both', async () => {
    queuedResults.push(dvRows({ dvId: 4, statuses: ['approved', 'pending', 'pending', 'pending'], actionDates: ['2026-10-03', null, null, null] }));
    queuedResults.push([{ id: 11, payee: 'Supplier', particulars: 'x', amount: '500.00', orsNumber: 'ORS-11', obligationDate: '2026-10-01', createdAt: '2026-10-01' }]);
    const queue = await workQueueService.getQueue({ id: 2, roles: ['budget_officer'] });
    expect(queue.approvals).toHaveLength(1);
    expect(queue.obligations).toEqual([expect.objectContaining({ id: 11, amount: 500 })]);
    expect(queue.count).toBe(2);
  });

  it('does not show obligations to roles that cannot certify them', async () => {
    queuedResults.push([]);
    const queue = await workQueueService.getQueue({ id: 3, roles: ['accountant'] });
    expect(queue.obligations).toEqual([]);
  });
});

describe('WorkQueueService.getNextDv', () => {
  it('skips the voucher just handled and reports how many remain', async () => {
    queuedResults.push([
      ...dvRows({ dvId: 1, statuses: ['pending', 'pending', 'pending', 'pending'], createdAt: '2026-10-01T00:00:00Z' }),
      ...dvRows({ dvId: 2, statuses: ['pending', 'pending', 'pending', 'pending'], createdAt: '2026-10-02T00:00:00Z' }),
      ...dvRows({ dvId: 3, statuses: ['pending', 'pending', 'pending', 'pending'], createdAt: '2026-10-03T00:00:00Z' }),
    ]);
    const { next, remaining } = await workQueueService.getNextDv({ id: 6, roles: ['division_staff'] }, 1);
    expect(next?.dvId).toBe(2);
    expect(remaining).toBe(2);
  });
});

describe('formatWaiting', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  it.each([
    ['2026-10-20T11:30:00Z', 'less than an hour'],
    ['2026-10-20T11:00:00Z', '1 hour'],
    ['2026-10-20T02:00:00Z', '10 hours'],
    ['2026-10-19T12:00:00Z', '1 day'],
    ['2026-10-13T12:00:00Z', '7 days'],
  ])('%s → %s', (since, expected) => {
    expect(formatWaiting(new Date(since), now)).toBe(expected);
  });
});
