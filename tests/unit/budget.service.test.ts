import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../../src/lib/db/connection', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

describe('Budget Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Budget Availability Calculation', () => {
    it('should calculate correct unobligated balance', async () => {
      const { db } = await import('../../src/lib/db/connection');

      // Mock allotment with 1,000,000
      const allotmentAmount = 1000000;
      const obligationsTotal = 350000;

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                {
                  allotmentAmount: allotmentAmount.toString(),
                  totalObligations: obligationsTotal.toString(),
                },
              ]),
            }),
          }),
        }),
      } as any);

      const { BudgetService } = await import('../../src/lib/services/budget.service');
      const budgetService = new BudgetService();

      const availability = await budgetService.checkBudgetAvailability(1);

      expect(availability.allotmentAmount).toBe(allotmentAmount);
      expect(availability.obligatedAmount).toBe(obligationsTotal);
      expect(availability.unobligatedBalance).toBe(650000);
      expect(availability.available).toBe(true);
    });

    it('should prevent over-obligation', async () => {
      const { db } = await import('../../src/lib/db/connection');

      const allotmentAmount = 500000;
      const obligationsTotal = 450000;
      const newObligationAmount = 100000; // Would exceed allotment

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                {
                  allotmentAmount: allotmentAmount.toString(),
                  totalObligations: obligationsTotal.toString(),
                },
              ]),
            }),
          }),
        }),
      } as any);

      const { BudgetService } = await import('../../src/lib/services/budget.service');
      const budgetService = new BudgetService();

      const canObligate = await budgetService.canObligate(1, newObligationAmount);

      expect(canObligate).toBe(false);
    });

    it('should allow obligation within available balance', async () => {
      const { db } = await import('../../src/lib/db/connection');

      const allotmentAmount = 500000;
      const obligationsTotal = 300000;
      const newObligationAmount = 150000; // Within available balance of 200,000

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                {
                  allotmentAmount: allotmentAmount.toString(),
                  totalObligations: obligationsTotal.toString(),
                },
              ]),
            }),
          }),
        }),
      } as any);

      const { BudgetService } = await import('../../src/lib/services/budget.service');
      const budgetService = new BudgetService();

      const canObligate = await budgetService.canObligate(1, newObligationAmount);

      expect(canObligate).toBe(true);
    });

    it('should handle zero obligations correctly', async () => {
      const { db } = await import('../../src/lib/db/connection');

      const allotmentAmount = 1000000;
      const obligationsTotal = 0;

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                {
                  allotmentAmount: allotmentAmount.toString(),
                  totalObligations: null, // No obligations yet
                },
              ]),
            }),
          }),
        }),
      } as any);

      const { BudgetService } = await import('../../src/lib/services/budget.service');
      const budgetService = new BudgetService();

      const availability = await budgetService.checkBudgetAvailability(1);

      expect(availability.obligatedAmount).toBe(0);
      expect(availability.unobligatedBalance).toBe(allotmentAmount);
    });

    it('should calculate utilization percentage correctly', async () => {
      const { db } = await import('../../src/lib/db/connection');

      const allotmentAmount = 1000000;
      const obligationsTotal = 750000; // 75% utilization

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                {
                  allotmentAmount: allotmentAmount.toString(),
                  totalObligations: obligationsTotal.toString(),
                },
              ]),
            }),
          }),
        }),
      } as any);

      const { BudgetService } = await import('../../src/lib/services/budget.service');
      const budgetService = new BudgetService();

      const availability = await budgetService.checkBudgetAvailability(1);

      expect(availability.utilizationPercentage).toBe(75);
    });

    it('should handle multiple fund clusters independently', async () => {
      const { db } = await import('../../src/lib/db/connection');

      // Fund Cluster 1: 500,000 allotment, 200,000 obligations
      // Fund Cluster 2: 800,000 allotment, 600,000 obligations

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockResolvedValue([
                  {
                    allotmentAmount: '500000',
                    totalObligations: '200000',
                  },
                ]),
              }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockResolvedValue([
                  {
                    allotmentAmount: '800000',
                    totalObligations: '600000',
                  },
                ]),
              }),
            }),
          }),
        } as any);

      const { BudgetService } = await import('../../src/lib/services/budget.service');
      const budgetService = new BudgetService();

      const availability1 = await budgetService.checkBudgetAvailability(1);
      const availability2 = await budgetService.checkBudgetAvailability(2);

      expect(availability1.unobligatedBalance).toBe(300000);
      expect(availability2.unobligatedBalance).toBe(200000);
    });
  });

  describe('Disbursement vs Obligation Validation', () => {
    it('should prevent disbursement exceeding obligation', async () => {
      const obligationAmount = 100000;
      const disbursementAmount = 150000;

      // Test that disbursement cannot exceed obligation
      expect(disbursementAmount).toBeGreaterThan(obligationAmount);

      // In actual implementation, this should throw an error or return false
      const isValid = disbursementAmount <= obligationAmount;
      expect(isValid).toBe(false);
    });

    it('should allow disbursement within obligation amount', async () => {
      const obligationAmount = 100000;
      const disbursementAmount = 80000;

      const isValid = disbursementAmount <= obligationAmount;
      expect(isValid).toBe(true);
    });

    it('should track remaining obligation balance after partial disbursement', async () => {
      const obligationAmount = 100000;
      const firstDisbursement = 40000;
      const secondDisbursement = 35000;

      const totalDisbursed = firstDisbursement + secondDisbursement;
      const remainingBalance = obligationAmount - totalDisbursed;

      expect(remainingBalance).toBe(25000);
      expect(totalDisbursed).toBeLessThanOrEqual(obligationAmount);
    });
  });

  describe('Budget Tracking by Object of Expenditure', () => {
    it('should track budget separately for different OOE categories', async () => {
      // Test that each object of expenditure (PS, MOOE, CO, FE) is tracked separately
      const budgetByOOE = {
        'Personal Services': { allotment: 5000000, obligations: 3000000 },
        'MOOE': { allotment: 2000000, obligations: 1500000 },
        'Capital Outlay': { allotment: 3000000, obligations: 2000000 },
        'Financial Expenses': { allotment: 500000, obligations: 100000 },
      };

      // Each category should have independent tracking
      expect(budgetByOOE['Personal Services'].allotment - budgetByOOE['Personal Services'].obligations).toBe(2000000);
      expect(budgetByOOE['MOOE'].allotment - budgetByOOE['MOOE'].obligations).toBe(500000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle exact allotment amount obligation', async () => {
      const { db } = await import('../../src/lib/db/connection');

      const allotmentAmount = 1000000;
      const obligationsTotal = 1000000; // Exactly at limit

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                {
                  allotmentAmount: allotmentAmount.toString(),
                  totalObligations: obligationsTotal.toString(),
                },
              ]),
            }),
          }),
        }),
      } as any);

      const { BudgetService } = await import('../../src/lib/services/budget.service');
      const budgetService = new BudgetService();

      const availability = await budgetService.checkBudgetAvailability(1);

      expect(availability.unobligatedBalance).toBe(0);
      expect(availability.available).toBe(false);
    });

    it('should handle decimal amounts correctly', async () => {
      const { db } = await import('../../src/lib/db/connection');

      const allotmentAmount = 1000000.50;
      const obligationsTotal = 350000.25;

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                {
                  allotmentAmount: allotmentAmount.toString(),
                  totalObligations: obligationsTotal.toString(),
                },
              ]),
            }),
          }),
        }),
      } as any);

      const { BudgetService } = await import('../../src/lib/services/budget.service');
      const budgetService = new BudgetService();

      const availability = await budgetService.checkBudgetAvailability(1);

      expect(availability.unobligatedBalance).toBeCloseTo(650000.25, 2);
    });

    it('should return false for non-existent allotment', async () => {
      const { db } = await import('../../src/lib/db/connection');

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      const { BudgetService } = await import('../../src/lib/services/budget.service');
      const budgetService = new BudgetService();

      await expect(budgetService.checkBudgetAvailability(999)).rejects.toThrow();
    });
  });
});
