import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateDVNumber,
  generateORNumber,
  generateCANumber,
  generateDepositSlipNumber,
  generateSerialNumber,
  generateJEVNumber,
  validateDVNumber,
  parseDVNumber,
} from '../../src/lib/utils/serial-generator';

// Each db query consumes the next queued result. Builders are chainable and awaitable.
const queuedResults: unknown[][] = [];
const updates: unknown[] = [];

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
        if (prop === 'set') {
          return (values: unknown) => {
            updates.push(values);
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
    update: vi.fn(() => queryBuilder()),
  };
  db.transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(db));
  return { db };
});

const currentYear = new Date().getFullYear();
const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

describe('Serial Number Generation', () => {
  beforeEach(() => {
    queuedResults.length = 0;
    updates.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateDVNumber', () => {
    it('should generate DV number in format 0000-00-0000 (Serial-Month-Year)', async () => {
      queuedResults.push([]);

      const dvNo = await generateDVNumber();

      expect(dvNo).toMatch(/^\d{4}-\d{2}-\d{4}$/);
      expect(dvNo).toBe(`0001-${currentMonth}-${currentYear}`);
    });

    it('should increment serial number within the fiscal year', async () => {
      queuedResults.push([{ dvNo: `0005-01-${currentYear}` }]);

      const dvNo = await generateDVNumber(currentYear);

      expect(dvNo.startsWith('0006')).toBe(true);
    });

    it('should use the given fiscal year as the suffix', async () => {
      queuedResults.push([]);

      const dvNo = await generateDVNumber(2027);

      expect(dvNo.startsWith('0001')).toBe(true);
      expect(dvNo.endsWith('2027')).toBe(true);
    });

    it('should handle leap year dates correctly', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-02-29T12:00:00'));
      queuedResults.push([]);

      const dvNo = await generateDVNumber();

      expect(dvNo).toBe('0001-02-2024');
    });
  });

  describe('DV number validation', () => {
    it('should validate and parse DV numbers', () => {
      expect(validateDVNumber('0042-03-2026')).toBe(true);
      expect(validateDVNumber('42-03-2026')).toBe(false);
      expect(parseDVNumber('0042-03-2026')).toEqual({ serial: 42, month: 3, year: 2026 });
      expect(parseDVNumber('bad')).toBeNull();
    });
  });

  describe('generateORNumber', () => {
    const series = (overrides: Record<string, unknown>) => ({
      id: 1,
      seriesCode: 'OR',
      startNumber: 1,
      currentNumber: 100,
      endNumber: 1000,
      isActive: true,
      ...overrides,
    });

    it('should generate the next sequential OR number and advance the series', async () => {
      queuedResults.push([series({ currentNumber: 100 })]);

      const orNo = await generateORNumber(1);

      expect(orNo).toBe('OR-000101');
      expect(updates).toContainEqual({ currentNumber: 101 });
    });

    it('should format OR number with leading zeros', async () => {
      queuedResults.push([series({ currentNumber: 5 })]);

      expect(await generateORNumber(1)).toBe('OR-000006');
    });

    it('should run inside a transaction so the series row can be locked', async () => {
      const { db } = await import('../../src/lib/db/connection');
      queuedResults.push([series({})]);

      await generateORNumber(1);

      expect((db as any).transaction).toHaveBeenCalledTimes(1);
    });

    it('should reuse the caller transaction when one is given', async () => {
      const { db } = await import('../../src/lib/db/connection');
      queuedResults.push([series({})]);

      await generateORNumber(1, db as any);

      expect((db as any).transaction).not.toHaveBeenCalled();
    });

    it('should throw error when OR series is exhausted', async () => {
      queuedResults.push([series({ currentNumber: 1000, endNumber: 1000 })]);

      await expect(generateORNumber(1)).rejects.toThrow('OR series is exhausted');
      expect(updates).toHaveLength(0);
    });

    it('should throw error when OR series is inactive', async () => {
      queuedResults.push([series({ isActive: false })]);

      await expect(generateORNumber(1)).rejects.toThrow('OR series is inactive');
    });

    it('should throw error when OR series does not exist', async () => {
      queuedResults.push([]);

      await expect(generateORNumber(99)).rejects.toThrow('OR series not found');
    });
  });

  describe('generateCANumber', () => {
    it('should generate CA number in format CA-YYYY-0000', async () => {
      queuedResults.push([]);

      expect(await generateCANumber()).toBe(`CA-${currentYear}-0001`);
    });

    it('should increment CA number within same year', async () => {
      queuedResults.push([{ caNo: `CA-${currentYear}-0042` }]);

      expect(await generateCANumber()).toBe(`CA-${currentYear}-0043`);
    });
  });

  describe('generateDepositSlipNumber', () => {
    it('should generate deposit slip number in format DS-YYYY-0000', async () => {
      queuedResults.push([]);

      expect(await generateDepositSlipNumber()).toBe(`DS-${currentYear}-0001`);
    });

    it('should handle large sequence numbers without truncating', async () => {
      queuedResults.push([{ depositSlipNo: `DS-${currentYear}-9999` }]);

      expect(await generateDepositSlipNumber()).toBe(`DS-${currentYear}-10000`);
    });
  });

  describe('generateSerialNumber (travel documents)', () => {
    it.each(['IOT', 'CTC', 'LR'] as const)('should start %s numbering at 0001', async (type) => {
      queuedResults.push([]);

      expect(await generateSerialNumber(type)).toBe(`${type}-${currentYear}-0001`);
    });

    it('should increment from the latest document of the year', async () => {
      queuedResults.push([{ docNo: `IOT-${currentYear}-0019` }]);

      expect(await generateSerialNumber('IOT')).toBe(`IOT-${currentYear}-0020`);
    });
  });

  describe('generateJEVNumber', () => {
    it('should start a month at 0001', async () => {
      queuedResults.push([]);

      expect(await generateJEVNumber(2026, 3)).toBe('2026-03-0001');
    });

    it('should continue the month sequence', async () => {
      queuedResults.push([{ jevNo: '2026-03-0007' }]);

      expect(await generateJEVNumber(2026, 3)).toBe('2026-03-0008');
    });
  });
});
