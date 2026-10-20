import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTableName } from 'drizzle-orm';

/**
 * DV approval workflow scenarios against the real ApprovalService.
 *
 * The database is replaced by a query queue: each select/update consumes the next
 * queued result, in the order the service issues them. Updates are recorded so tests
 * can assert which rows changed and how.
 */

const queuedResults: unknown[][] = [];
const recordedUpdates: { table: string; values: Record<string, unknown> }[] = [];

function queryBuilder(table?: string) {
  const result = queuedResults.shift() ?? [];
  const builder: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            Promise.resolve(result).then(resolve, reject);
        }
        if (prop === 'set') {
          return (values: Record<string, unknown>) => {
            recordedUpdates.push({ table: table ?? 'unknown', values });
            return builder;
          };
        }
        return () => builder;
      },
    }
  );
  return builder;
}

vi.mock('../../src/lib/db/connection', () => {
  const db: any = {
    select: vi.fn(() => queryBuilder()),
    insert: vi.fn(() => queryBuilder()),
    update: vi.fn((table: any) => queryBuilder(getTableName(table))),
  };
  db.transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(db));
  return { db };
});

vi.mock('../../src/lib/middleware/audit-logger', () => ({
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
  logApprove: vi.fn(),
  logReject: vi.fn(),
  sanitizeData: (d: unknown) => d,
}));

let enforceSoD = true;
vi.mock('../../src/lib/services/settings.service', () => ({
  getSetting: vi.fn(async (key: string) => (key === 'enforce_segregation_of_duties' ? enforceSoD : undefined)),
}));

// Role IDs as seeded
const ROLE = { admin: 1, director: 2, accountant: 3, budget: 4, division: 6 };
const PREPARER = 10;
const BUDGET_OFFICER = 20;
const ACCOUNTANT = 30;
const DIRECTOR = 40;
const ADMIN = 99;

type Stage = 'division' | 'budget' | 'accounting' | 'director';
const STAGE_ROLE: Record<Stage, number> = {
  division: ROLE.division,
  budget: ROLE.budget,
  accounting: ROLE.accountant,
  director: ROLE.director,
};
const STAGE_ORDER: Record<Stage, number> = { division: 1, budget: 2, accounting: 3, director: 4 };

function stageRow(stage: Stage, status = 'pending', approverUserId: number | null = null) {
  return {
    id: STAGE_ORDER[stage],
    dvId: 1,
    stage,
    stageOrder: STAGE_ORDER[stage],
    approverRoleId: STAGE_ROLE[stage],
    approverUserId,
    status,
  };
}

/**
 * Queue the reads issued while authorizing a stage action.
 */
function queueAuthorization(opts: {
  dvStatus: string;
  current?: Stage | null;
  userRoleIds: number[];
  priorApprovals?: { stage: Stage; userId: number }[];
  createdBy?: number;
}) {
  queuedResults.push([{ status: opts.dvStatus, createdBy: opts.createdBy ?? PREPARER }]);

  if (!['draft', 'pending_budget', 'pending_accounting', 'pending_director'].includes(opts.dvStatus)) {
    return;
  }

  queuedResults.push(opts.current ? [stageRow(opts.current)] : []);
  if (!opts.current) return;

  queuedResults.push(opts.userRoleIds.map(roleId => ({ userId: 0, roleId })));
  queuedResults.push([{ id: ROLE.admin, name: 'administrator' }]);

  if (enforceSoD) {
    queuedResults.push((opts.priorApprovals ?? []).map(p => stageRow(p.stage, 'approved', p.userId)));
  }
}

/** Queue the reads/writes of a successful approve transaction */
function queueApproveTransaction(next: Stage | null, affectedRows = 1) {
  queuedResults.push([{ affectedRows }]); // stage update
  if (affectedRows === 0) return;
  queuedResults.push(next ? [stageRow(next)] : []); // next pending stage
  queuedResults.push([{ affectedRows: 1 }]); // DV status update
}

async function service() {
  const { ApprovalService } = await import('../../src/lib/services/approval.service');
  return new ApprovalService();
}

const dvStatusUpdates = () =>
  recordedUpdates.filter(u => u.table === 'disbursement_vouchers').map(u => u.values.status);

describe('DV Approval Workflow Integration Tests', () => {
  beforeEach(() => {
    queuedResults.length = 0;
    recordedUpdates.length = 0;
    enforceSoD = true;
    vi.clearAllMocks();
  });

  describe('Complete Approval Flow', () => {
    it('should move a DV through all four stages to approved', async () => {
      const approvals = await service();
      const prior: { stage: Stage; userId: number }[] = [];

      const steps: { stage: Stage; user: number; role: number; next: Stage | null; status: string }[] = [
        { stage: 'division', user: 11, role: ROLE.division, next: 'budget', status: 'pending_budget' },
        { stage: 'budget', user: BUDGET_OFFICER, role: ROLE.budget, next: 'accounting', status: 'pending_accounting' },
        { stage: 'accounting', user: ACCOUNTANT, role: ROLE.accountant, next: 'director', status: 'pending_director' },
        { stage: 'director', user: DIRECTOR, role: ROLE.director, next: null, status: 'approved' },
      ];

      let dvStatus = 'pending_budget';
      for (const step of steps) {
        queueAuthorization({ dvStatus, current: step.stage, userRoleIds: [step.role], priorApprovals: [...prior] });
        queueApproveTransaction(step.next);

        const result = await approvals.approveStage(1, step.user, `${step.stage} ok`);

        expect(result.success).toBe(true);
        expect(result.nextStage).toBe(step.next ?? undefined);
        prior.push({ stage: step.stage, userId: step.user });
        dvStatus = step.status;
      }

      expect(dvStatusUpdates()).toEqual(['pending_budget', 'pending_accounting', 'pending_director', 'approved']);
    });

    it('should record approver, comments and timestamp on the stage', async () => {
      const approvals = await service();
      queueAuthorization({ dvStatus: 'pending_budget', current: 'budget', userRoleIds: [ROLE.budget] });
      queueApproveTransaction('accounting');

      await approvals.approveStage(1, BUDGET_OFFICER, 'Funds available — ORS 2026-01-0001');

      const stageUpdate = recordedUpdates.find(u => u.table === 'approval_workflows');
      expect(stageUpdate?.values).toMatchObject({
        status: 'approved',
        approverUserId: BUDGET_OFFICER,
        comments: 'Funds available — ORS 2026-01-0001',
      });
      expect(stageUpdate?.values.actionDate).toBeInstanceOf(Date);
    });
  });

  describe('Rejection', () => {
    it('should reject the DV and skip all later stages', async () => {
      const approvals = await service();
      queueAuthorization({ dvStatus: 'pending_accounting', current: 'accounting', userRoleIds: [ROLE.accountant] });
      queuedResults.push([{ affectedRows: 1 }], [{ affectedRows: 1 }], [{ affectedRows: 1 }]);

      const result = await approvals.rejectStage(1, ACCOUNTANT, 'Missing supporting documents');

      expect(result.success).toBe(true);
      const workflowUpdates = recordedUpdates.filter(u => u.table === 'approval_workflows').map(u => u.values.status);
      expect(workflowUpdates).toEqual(['rejected', 'skipped']);
      expect(dvStatusUpdates()).toEqual(['rejected']);
    });

    it('should require comments for rejection', async () => {
      const approvals = await service();

      const result = await approvals.rejectStage(1, ACCOUNTANT, '   ');

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/comments are required/i);
      expect(recordedUpdates).toHaveLength(0);
    });

    it('should not allow a rejected DV to be approved by the next stage', async () => {
      const approvals = await service();
      queueAuthorization({ dvStatus: 'rejected', userRoleIds: [ROLE.director] });

      const result = await approvals.approveStage(1, DIRECTOR);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/not awaiting approval/);
      expect(recordedUpdates).toHaveLength(0);
    });

    it.each(['approved', 'paid', 'cancelled'])('should not act on a DV that is %s', async (status) => {
      const approvals = await service();
      queueAuthorization({ dvStatus: status, userRoleIds: [ROLE.director] });

      const result = await approvals.approveStage(1, DIRECTOR);

      expect(result.success).toBe(false);
      expect(recordedUpdates).toHaveLength(0);
    });
  });

  describe('Permissions', () => {
    it('should prevent approval by a user without the stage role', async () => {
      const approvals = await service();
      // Accountant tries to act while the DV is still at the budget stage
      queueAuthorization({ dvStatus: 'pending_budget', current: 'budget', userRoleIds: [ROLE.accountant] });

      const result = await approvals.approveStage(1, ACCOUNTANT);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/permission/);
      expect(recordedUpdates).toHaveLength(0);
    });

    it('should let an administrator act on any stage', async () => {
      const approvals = await service();
      queueAuthorization({ dvStatus: 'pending_director', current: 'director', userRoleIds: [ROLE.admin] });
      queueApproveTransaction(null);

      const result = await approvals.approveStage(1, ADMIN);

      expect(result.success).toBe(true);
    });
  });

  describe('Segregation of Duties', () => {
    it('should stop the preparer from approving their own DV', async () => {
      const approvals = await service();
      queueAuthorization({
        dvStatus: 'pending_budget',
        current: 'budget',
        userRoleIds: [ROLE.budget],
        createdBy: BUDGET_OFFICER,
      });

      const result = await approvals.approveStage(1, BUDGET_OFFICER);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Segregation of duties/);
      expect(recordedUpdates).toHaveLength(0);
    });

    it('should stop one person approving two stages of the same DV', async () => {
      const approvals = await service();
      queueAuthorization({
        dvStatus: 'pending_director',
        current: 'director',
        userRoleIds: [ROLE.admin],
        priorApprovals: [{ stage: 'accounting', userId: ADMIN }],
      });

      const result = await approvals.approveStage(1, ADMIN);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/already approved the accounting stage/);
    });

    it('should allow a single administrator to complete stages when the control is disabled', async () => {
      enforceSoD = false;
      const approvals = await service();
      queueAuthorization({
        dvStatus: 'pending_director',
        current: 'director',
        userRoleIds: [ROLE.admin],
        createdBy: ADMIN,
      });
      queueApproveTransaction(null);

      const result = await approvals.approveStage(1, ADMIN);

      expect(result.success).toBe(true);
    });
  });

  describe('Concurrent Approval Attempts', () => {
    it('should fail cleanly when another approver already acted on the stage', async () => {
      const approvals = await service();
      queueAuthorization({ dvStatus: 'pending_budget', current: 'budget', userRoleIds: [ROLE.budget] });
      queueApproveTransaction('accounting', 0); // conditional update matched no pending row

      const result = await approvals.approveStage(1, BUDGET_OFFICER);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/just acted on by another user/);
      // The DV status must not be touched by the losing request
      expect(dvStatusUpdates()).toHaveLength(0);
    });

    it('should not write an audit approval for the losing request', async () => {
      const { logApprove } = await import('../../src/lib/middleware/audit-logger');
      const approvals = await service();
      queueAuthorization({ dvStatus: 'pending_budget', current: 'budget', userRoleIds: [ROLE.budget] });
      queueApproveTransaction('accounting', 0);

      await approvals.approveStage(1, BUDGET_OFFICER);

      expect(logApprove).not.toHaveBeenCalled();
    });
  });

  describe('Missing records', () => {
    it('should report a missing DV', async () => {
      const approvals = await service();
      queuedResults.push([]);

      const result = await approvals.approveStage(404, DIRECTOR);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/not found/);
    });

    it('should report when no stage is pending', async () => {
      const approvals = await service();
      queueAuthorization({ dvStatus: 'pending_director', current: null, userRoleIds: [ROLE.director] });

      const result = await approvals.approveStage(1, DIRECTOR);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/No pending approval stage/);
    });
  });
});
