import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database. Each db.select()/update() call consumes the next queued result;
// the returned builder is chainable (.from().leftJoin().where()...) and awaitable.
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
  },
}));

/**
 * Queue the results for one getBudgetAvailability() call.
 * Decimal columns are strings, exactly as the MySQL driver returns them.
 */
function queueAvailability(opts: {
  allotment: string;
  appropriation?: string;
  approved?: number;
  pending?: number;
  obligationRefs?: { orsNumber: string | null; bursNumber: string | null }[];
  disbursed?: number;
}) {
  queuedResults.push([
    { allotment_id: 1, allotment_amount: opts.allotment, appropriation_amount: opts.appropriation ?? '5000000.00' },
  ]);

  const statusRows = [];
  if (opts.approved !== undefined) statusRows.push({ status: 'approved', total: opts.approved });
  if (opts.pending !== undefined) statusRows.push({ status: 'pending', total: opts.pending });
  queuedResults.push(statusRows);

  const refs = opts.obligationRefs ?? [];
  queuedResults.push(refs);
  if (refs.some(r => r.orsNumber || r.bursNumber)) {
    queuedResults.push([{ total: opts.disbursed ?? 0 }]);
  }
}

async function getService() {
  const { BudgetService } = await import('../../src/lib/services/budget.service');
  return new BudgetService();
}

describe('Budget Service', () => {
  beforeEach(() => {
    queuedResults.length = 0;
    vi.clearAllMocks();
  });

  describe('Budget Availability Calculation', () => {
    it('should calculate correct unobligated balance', async () => {
      queueAvailability({ allotment: '1000000.00', approved: 350000 });
      const service = await getService();

      const availability = await service.getBudgetAvailability(1);

      expect(availability.allotment).toBe(1000000);
      expect(availability.obligation).toBe(350000);
      expect(availability.unobligatedBalance).toBe(650000);
      expect(availability.availableBalance).toBe(650000);
    });

    it('should return numbers, not driver strings, for decimal columns', async () => {
      queueAvailability({ allotment: '1000000.00', appropriation: '2500000.50' });
      const service = await getService();

      const availability = await service.getBudgetAvailability(1);

      expect(typeof availability.allotment).toBe('number');
      expect(typeof availability.appropriation).toBe('number');
      expect(availability.appropriation).toBe(2500000.5);
    });

    it('should handle zero obligations correctly', async () => {
      queueAvailability({ allotment: '750000.00' });
      const service = await getService();

      const availability = await service.getBudgetAvailability(1);

      expect(availability.obligation).toBe(0);
      expect(availability.pendingObligation).toBe(0);
      expect(availability.unobligatedBalance).toBe(750000);
    });

    it('should reserve funds for pending obligations', async () => {
      queueAvailability({ allotment: '1000000.00', approved: 400000, pending: 500000 });
      const service = await getService();

      const availability = await service.getBudgetAvailability(1);

      expect(availability.unobligatedBalance).toBe(600000);
      expect(availability.availableBalance).toBe(100000);
    });

    it('should throw for a non-existent allotment', async () => {
      queuedResults.push([]);
      const service = await getService();

      await expect(service.getBudgetAvailability(999)).rejects.toThrow('Allotment not found');
    });
  });

  describe('Obligation Requests (checkBudgetAvailability)', () => {
    it('should prevent over-obligation', async () => {
      queueAvailability({ allotment: '500000.00', approved: 400000 });
      const service = await getService();

      expect(await service.checkBudgetAvailability(1, 150000)).toBe(false);
    });

    it('should allow obligation within available balance', async () => {
      queueAvailability({ allotment: '500000.00', approved: 300000 });
      const service = await getService();

      expect(await service.checkBudgetAvailability(1, 150000)).toBe(true);
    });

    it('should reject a request that only fits if pending obligations are ignored', async () => {
      // 1,000,000 allotment; 600,000 approved + 300,000 pending leaves 100,000
      queueAvailability({ allotment: '1000000.00', approved: 600000, pending: 300000 });
      const service = await getService();

      expect(await service.checkBudgetAvailability(1, 200000)).toBe(false);
    });

    it('should allow an obligation for the exact remaining balance', async () => {
      queueAvailability({ allotment: '1000000.00', approved: 999999.99 });
      const service = await getService();

      expect(await service.checkBudgetAvailability(1, 0.01)).toBe(true);
    });

    it('should compare decimal amounts at centavo precision', async () => {
      // 0.1 + 0.2 style floating-point drift must not block a valid request
      queueAvailability({ allotment: '0.30', approved: 0.1 });
      const service = await getService();

      expect(await service.checkBudgetAvailability(1, 0.2)).toBe(true);
    });
  });

  describe('Obligation Approval (canApproveObligation)', () => {
    it('should approve when approved obligations plus this one fit the allotment', async () => {
      // The obligation being approved is itself one of the pending ones
      queueAvailability({ allotment: '1000000.00', approved: 600000, pending: 400000 });
      const service = await getService();

      expect(await service.canApproveObligation(1, 400000)).toBe(true);
    });

    it('should block approval that would exceed the allotment', async () => {
      queueAvailability({ allotment: '1000000.00', approved: 900000 });
      const service = await getService();

      expect(await service.canApproveObligation(1, 100000.01)).toBe(false);
    });
  });

  describe('Disbursement Tracking', () => {
    it('should include paid DVs matched by ORS/BURS number', async () => {
      queueAvailability({
        allotment: '1000000.00',
        approved: 500000,
        obligationRefs: [{ orsNumber: 'ORS-2026-001', bursNumber: null }],
        disbursed: 125000,
      });
      const service = await getService();

      const availability = await service.getBudgetAvailability(1);

      expect(availability.disbursement).toBe(125000);
      expect(availability.unpaidObligation).toBe(375000);
    });

    it('should report zero disbursements when obligations have no ORS/BURS numbers', async () => {
      queueAvailability({
        allotment: '1000000.00',
        approved: 500000,
        obligationRefs: [{ orsNumber: null, bursNumber: null }],
      });
      const service = await getService();

      const availability = await service.getBudgetAvailability(1);

      expect(availability.disbursement).toBe(0);
      expect(availability.unpaidObligation).toBe(500000);
    });
  });

  describe('Allotment Creation', () => {
    it('should reject an allotment that exceeds the appropriation', async () => {
      queuedResults.push([{ id: 1, amount: '1000000.00' }]); // appropriation
      queuedResults.push([{ total: 800000 }]); // existing allotments
      const service = await getService();

      await expect(
        service.createAllotment({
          appropriationId: 1,
          objectOfExpenditureId: 1,
          amount: 200000.01,
          allotmentClass: 'MOOE',
          purpose: 'Office supplies',
        })
      ).rejects.toThrow('exceeds available appropriation');
    });

    it('should reject an allotment for a missing appropriation', async () => {
      queuedResults.push([]);
      const service = await getService();

      await expect(
        service.createAllotment({
          appropriationId: 42,
          objectOfExpenditureId: 1,
          amount: 1,
          allotmentClass: 'MOOE',
          purpose: 'x',
        })
      ).rejects.toThrow('Appropriation not found');
    });
  });

  describe('Obligation Status Transitions', () => {
    it('should not approve an obligation that is not pending', async () => {
      queuedResults.push([{ id: 1, allotmentId: 1, amount: '1000.00', status: 'approved' }]);
      const service = await getService();

      await expect(service.approveObligation(1, 7)).rejects.toThrow('Only pending obligations');
    });

    it('should not reject an obligation that is already approved', async () => {
      queuedResults.push([{ status: 'approved' }]);
      const service = await getService();

      await expect(service.rejectObligation(1, 7, 'late')).rejects.toThrow('Only pending obligations');
    });
  });
});
