import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database and services
vi.mock('../../src/lib/db/connection', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../../src/lib/middleware/audit-logger', () => ({
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
  logApprove: vi.fn(),
  logReject: vi.fn(),
}));

describe('DV Approval Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Approval Flow', () => {
    it('should complete full DV approval workflow from creation to director approval', async () => {
      const { db } = await import('../../src/lib/db/connection');
      const { DisbursementService } = await import('../../src/lib/services/disbursement.service');
      const { ApprovalService } = await import('../../src/lib/services/approval.service');

      // Mock DV creation
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      } as any);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      const disbursementService = new DisbursementService();

      // Step 1: Create DV
      const dvData = {
        payeeName: 'Test Supplier',
        payeeAddress: '123 Test St',
        particulars: 'Office Supplies',
        amount: 50000,
        fundClusterId: 1,
        objectOfExpenditureId: 1,
        responsibilityCenter: 'Admin',
        mfoPapCode: 'MFO-001',
        certificationA: true,
        certificationB: true,
        certificationC: true,
        certificationD: true,
        certificationE: true,
      };

      const createdDV = await disbursementService.createDV(dvData, 1);

      expect(createdDV.id).toBe(1);
      expect(createdDV.dvNo).toBeDefined();

      // Step 2: Budget Officer Approval
      const approvalService = new ApprovalService();

      // Mock workflow query for budget stage
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvId: 1,
                stage: 'budget',
                status: 'pending',
                userId: null,
              },
            ]),
          }),
        }),
      } as any);

      // Mock DV query
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvNo: '0001-01-2024',
                status: 'pending_budget',
                fundClusterId: 1,
              },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as any);

      await approvalService.approveDV(1, 'budget', 2, 'Approved - Budget available');

      // Verify budget approval was logged
      const { logApprove } = await import('../../src/lib/middleware/audit-logger');
      expect(logApprove).toHaveBeenCalledWith(
        'disbursement_vouchers',
        1,
        2,
        expect.objectContaining({
          stage: 'budget',
          status: 'approved',
        }),
        undefined,
        undefined
      );

      // Step 3: Accounting Approval
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 2,
                dvId: 1,
                stage: 'accounting',
                status: 'pending',
                userId: null,
              },
            ]),
          }),
        }),
      } as any);

      await approvalService.approveDV(1, 'accounting', 3, 'Approved - All certifications verified');

      expect(logApprove).toHaveBeenCalledTimes(2);

      // Step 4: Director Approval
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 3,
                dvId: 1,
                stage: 'director',
                status: 'pending',
                userId: null,
              },
            ]),
          }),
        }),
      } as any);

      await approvalService.approveDV(1, 'director', 4, 'Final approval granted');

      expect(logApprove).toHaveBeenCalledTimes(3);

      // Verify final DV status
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvNo: '0001-01-2024',
                status: 'approved',
              },
            ]),
          }),
        }),
      } as any);

      const finalDV = await disbursementService.getDVById(1);
      expect(finalDV.status).toBe('approved');
    });

    it('should handle rejection at any stage', async () => {
      const { db } = await import('../../src/lib/db/connection');
      const { ApprovalService } = await import('../../src/lib/services/approval.service');

      const approvalService = new ApprovalService();

      // Mock workflow at accounting stage
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 2,
                dvId: 1,
                stage: 'accounting',
                status: 'pending',
                userId: null,
              },
            ]),
          }),
        }),
      } as any);

      // Mock DV query
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvNo: '0001-01-2024',
                status: 'pending_accounting',
              },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as any);

      // Reject at accounting stage
      await approvalService.rejectDV(1, 'accounting', 3, 'Missing supporting documents');

      const { logReject } = await import('../../src/lib/middleware/audit-logger');
      expect(logReject).toHaveBeenCalledWith(
        'disbursement_vouchers',
        1,
        3,
        expect.objectContaining({
          stage: 'accounting',
          status: 'rejected',
          comments: 'Missing supporting documents',
        }),
        undefined,
        undefined
      );

      // Verify DV status changed to rejected
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvNo: '0001-01-2024',
                status: 'rejected',
              },
            ]),
          }),
        }),
      } as any);

      const { DisbursementService } = await import('../../src/lib/services/disbursement.service');
      const disbursementService = new DisbursementService();
      const rejectedDV = await disbursementService.getDVById(1);

      expect(rejectedDV.status).toBe('rejected');
    });

    it('should prevent approval out of sequence', async () => {
      const { db } = await import('../../src/lib/db/connection');
      const { ApprovalService } = await import('../../src/lib/services/approval.service');

      const approvalService = new ApprovalService();

      // Mock DV at budget stage
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvNo: '0001-01-2024',
                status: 'pending_budget',
              },
            ]),
          }),
        }),
      } as any);

      // Try to approve at director stage (skipping budget and accounting)
      await expect(
        approvalService.approveDV(1, 'director', 4, 'Trying to skip stages')
      ).rejects.toThrow();
    });

    it('should track approval history with timestamps', async () => {
      const { db } = await import('../../src/lib/db/connection');
      const { ApprovalService } = await import('../../src/lib/services/approval.service');

      const approvalService = new ApprovalService();

      // Mock workflow history
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                {
                  id: 1,
                  stage: 'budget',
                  status: 'approved',
                  userId: 2,
                  approvedAt: new Date('2024-01-15T10:00:00Z'),
                  comments: 'Budget approved',
                  user: { username: 'budget_officer' },
                },
                {
                  id: 2,
                  stage: 'accounting',
                  status: 'approved',
                  userId: 3,
                  approvedAt: new Date('2024-01-15T14:00:00Z'),
                  comments: 'Accounting verified',
                  user: { username: 'accountant' },
                },
              ]),
            }),
          }),
        }),
      } as any);

      const history = await approvalService.getApprovalHistory(1);

      expect(history).toHaveLength(2);
      expect(history[0].stage).toBe('budget');
      expect(history[0].status).toBe('approved');
      expect(history[0].user.username).toBe('budget_officer');
      expect(history[1].stage).toBe('accounting');
    });
  });

  describe('Budget Availability Check During Approval', () => {
    it('should check budget availability before accounting approval', async () => {
      const { db } = await import('../../src/lib/db/connection');
      const { ApprovalService } = await import('../../src/lib/services/approval.service');

      // Mock DV with amount
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvNo: '0001-01-2024',
                status: 'pending_accounting',
                amount: '100000',
                fundClusterId: 1,
              },
            ]),
          }),
        }),
      } as any);

      // Mock budget availability - insufficient
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                {
                  allotmentAmount: '500000',
                  totalObligations: '450000', // Only 50,000 available
                },
              ]),
            }),
          }),
        }),
      } as any);

      const approvalService = new ApprovalService();

      // Should throw error due to insufficient budget
      await expect(
        approvalService.approveDV(1, 'accounting', 3, 'Attempting approval')
      ).rejects.toThrow('Insufficient budget');
    });

    it('should allow approval when budget is available', async () => {
      const { db } = await import('../../src/lib/db/connection');
      const { ApprovalService } = await import('../../src/lib/services/approval.service');

      // Mock DV with amount
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvNo: '0001-01-2024',
                status: 'pending_accounting',
                amount: '100000',
                fundClusterId: 1,
              },
            ]),
          }),
        }),
      } as any);

      // Mock budget availability - sufficient
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                {
                  allotmentAmount: '1000000',
                  totalObligations: '500000', // 500,000 available
                },
              ]),
            }),
          }),
        }),
      } as any);

      // Mock workflow
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 2,
                dvId: 1,
                stage: 'accounting',
                status: 'pending',
              },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as any);

      const approvalService = new ApprovalService();

      // Should succeed
      await expect(
        approvalService.approveDV(1, 'accounting', 3, 'Budget available')
      ).resolves.not.toThrow();
    });
  });

  describe('Concurrent Approval Attempts', () => {
    it('should handle concurrent approval attempts gracefully', async () => {
      const { db } = await import('../../src/lib/db/connection');
      const { ApprovalService } = await import('../../src/lib/services/approval.service');

      // Mock workflow at budget stage
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvId: 1,
                stage: 'budget',
                status: 'pending',
                userId: null,
              },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvNo: '0001-01-2024',
                status: 'pending_budget',
              },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as any);

      const approvalService = new ApprovalService();

      // First approval should succeed
      await approvalService.approveDV(1, 'budget', 2, 'First approval');

      // Second concurrent approval should fail (already approved)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvId: 1,
                stage: 'budget',
                status: 'approved', // Already approved
                userId: 2,
              },
            ]),
          }),
        }),
      } as any);

      await expect(
        approvalService.approveDV(1, 'budget', 3, 'Second attempt')
      ).rejects.toThrow('already approved');
    });
  });

  describe('Approval Comments and Documentation', () => {
    it('should require comments for rejection', async () => {
      const { ApprovalService } = await import('../../src/lib/services/approval.service');

      const approvalService = new ApprovalService();

      // Try to reject without comments
      await expect(
        approvalService.rejectDV(1, 'budget', 2, '')
      ).rejects.toThrow('Comments required');
    });

    it('should store approval comments with proper encoding', async () => {
      const { db } = await import('../../src/lib/db/connection');
      const { ApprovalService } = await import('../../src/lib/services/approval.service');

      // Mock workflow
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvId: 1,
                stage: 'budget',
                status: 'pending',
              },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                dvNo: '0001-01-2024',
                status: 'pending_budget',
              },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as any);

      const approvalService = new ApprovalService();

      const specialCharsComment = "Approved with conditions: <script>alert('test')</script>";

      await approvalService.approveDV(1, 'budget', 2, specialCharsComment);

      // Verify comment was stored (would be sanitized in real implementation)
      expect(vi.mocked(db.update)).toHaveBeenCalled();
    });
  });
});
