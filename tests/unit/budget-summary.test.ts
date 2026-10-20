import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression test: budget totals used to be summed across a JOIN, which repeated each
// appropriation once per allotment and each allotment once per obligation.

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

const select = vi.fn(() => queryBuilder());
vi.mock('../../src/lib/db/connection', () => ({ db: { select } }));

const { budgetService } = await import('../../src/lib/services/budget.service');

beforeEach(() => {
  queuedResults.length = 0;
  select.mockClear();
});

describe('BudgetService.getOverallBudgetSummary', () => {
  it('sums each budget level in its own query', async () => {
    // One ₱1M appropriation, two allotments, three approved obligations
    queuedResults.push([{ total: 1_000_000 }], [{ total: 800_000 }], [{ total: 200_000 }]);

    const summary = await budgetService.getOverallBudgetSummary(2026);

    expect(select).toHaveBeenCalledTimes(3);
    expect(summary).toEqual({
      appropriation: 1_000_000,
      allotment: 800_000,
      obligation: 200_000,
      unobligatedBalance: 600_000,
      utilizationRate: 25,
    });
  });

  it('treats missing totals as zero', async () => {
    queuedResults.push([{ total: null }], [{ total: null }], [{ total: null }]);
    const summary = await budgetService.getOverallBudgetSummary(2026);
    expect(summary).toEqual({ appropriation: 0, allotment: 0, obligation: 0, unobligatedBalance: 0, utilizationRate: 0 });
  });
});

describe('BudgetService.getBudgetSummaryByFundCluster', () => {
  it('returns the cluster with independently summed totals', async () => {
    queuedResults.push([{ code: '01', name: 'Regular Agency Fund' }], [{ total: 500 }], [{ total: 400 }], [{ total: 100 }]);
    const [row] = await budgetService.getBudgetSummaryByFundCluster(1, 2026);
    expect(row).toEqual(
      expect.objectContaining({ fundClusterCode: '01', appropriation: 500, allotment: 400, obligation: 100, utilizationRate: 25 })
    );
  });

  it('returns no rows for an unknown cluster', async () => {
    queuedResults.push([]);
    expect(await budgetService.getBudgetSummaryByFundCluster(99, 2026)).toEqual([]);
  });
});
