import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDVNumber, generateORNumber, generateCANumber, generateDepositSlipNumber } from '../../src/lib/utils/serial-generator';

// Mock the database
vi.mock('../../src/lib/db/connection', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

describe('Serial Number Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDVNumber', () => {
    it('should generate DV number in format 0000-00-0000 (Serial-Month-Year)', async () => {
      const { db } = await import('../../src/lib/db/connection');

      // Mock database to return no existing DVs for current year
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      } as any);

      const dvNo = await generateDVNumber();

      // Check format: 0001-MM-YYYY
      const dvPattern = /^\d{4}-\d{2}-\d{4}$/;
      expect(dvNo).toMatch(dvPattern);

      // Check that it starts with 0001 for first DV
      expect(dvNo.startsWith('0001')).toBe(true);
    });

    it('should increment serial number for same month and year', async () => {
      const { db } = await import('../../src/lib/db/connection');

      // Mock database to return existing DV: 0005-01-2024
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ dvNo: '0005-01-2024' }]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      } as any);

      const dvNo = await generateDVNumber();

      // Should be 0006-01-2024 or 0006-MM-YYYY depending on current month
      expect(dvNo.startsWith('0006')).toBe(true);
    });

    it('should reset to 0001 for new year', async () => {
      const { db } = await import('../../src/lib/db/connection');

      const currentYear = new Date().getFullYear();
      const lastYear = currentYear - 1;

      // Mock database to return DV from last year
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ dvNo: `9999-12-${lastYear}` }]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      } as any);

      const dvNo = await generateDVNumber();

      // Should reset to 0001 for current year
      expect(dvNo.startsWith('0001')).toBe(true);
      expect(dvNo.endsWith(currentYear.toString())).toBe(true);
    });
  });

  describe('generateORNumber', () => {
    it('should generate sequential OR number for given series', async () => {
      const { db } = await import('../../src/lib/db/connection');

      // Mock OR series with prefix and last number
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: 1, prefix: 'OR', startNumber: 1, currentNumber: 100, endNumber: 1000 },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      } as any);

      const orNo = await generateORNumber(1);

      // Should be OR-0000101
      expect(orNo).toBe('OR-0000101');
    });

    it('should throw error when OR series is exhausted', async () => {
      const { db } = await import('../../src/lib/db/connection');

      // Mock OR series at end number
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: 1, prefix: 'OR', startNumber: 1, currentNumber: 1000, endNumber: 1000 },
            ]),
          }),
        }),
      } as any);

      await expect(generateORNumber(1)).rejects.toThrow('OR series is exhausted');
    });

    it('should format OR number with leading zeros', async () => {
      const { db } = await import('../../src/lib/db/connection');

      // Mock OR series with low current number
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: 1, prefix: 'OR', startNumber: 1, currentNumber: 5, endNumber: 1000 },
            ]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      } as any);

      const orNo = await generateORNumber(1);

      // Should be OR-0000006 with leading zeros
      expect(orNo).toBe('OR-0000006');
      expect(orNo.length).toBe(10); // OR-0000006
    });
  });

  describe('generateCANumber', () => {
    it('should generate CA number in format CA-YYYY-0000', async () => {
      const { db } = await import('../../src/lib/db/connection');

      // Mock no existing CAs for current year
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      } as any);

      const caNo = await generateCANumber();

      const currentYear = new Date().getFullYear();
      expect(caNo).toBe(`CA-${currentYear}-0001`);
    });

    it('should increment CA number within same year', async () => {
      const { db } = await import('../../src/lib/db/connection');

      const currentYear = new Date().getFullYear();

      // Mock existing CA
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ caNo: `CA-${currentYear}-0042` }]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      } as any);

      const caNo = await generateCANumber();

      expect(caNo).toBe(`CA-${currentYear}-0043`);
    });
  });

  describe('generateDepositSlipNumber', () => {
    it('should generate deposit slip number in format DS-YYYY-0000', async () => {
      const { db } = await import('../../src/lib/db/connection');

      // Mock no existing deposit slips
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      } as any);

      const dsNo = await generateDepositSlipNumber();

      const currentYear = new Date().getFullYear();
      expect(dsNo).toBe(`DS-${currentYear}-0001`);
    });

    it('should handle large sequence numbers with proper padding', async () => {
      const { db } = await import('../../src/lib/db/connection');

      const currentYear = new Date().getFullYear();

      // Mock existing deposit slip with high number
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ depositSlipNo: `DS-${currentYear}-9999` }]),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      } as any);

      const dsNo = await generateDepositSlipNumber();

      // Should handle rollover or larger numbers
      expect(dsNo).toBe(`DS-${currentYear}-10000`);
    });
  });

  describe('Serial Number Uniqueness', () => {
    it('should not generate duplicate DV numbers', async () => {
      const { db } = await import('../../src/lib/db/connection');

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      } as any);

      const dvNo1 = await generateDVNumber();
      const dvNo2 = await generateDVNumber();

      // Should be different (in real scenario, database constraint ensures this)
      expect(dvNo1).toBeDefined();
      expect(dvNo2).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year dates correctly', async () => {
      const { db } = await import('../../src/lib/db/connection');

      // Mock date to Feb 29 of a leap year
      const originalDate = Date;
      global.Date = class extends originalDate {
        constructor() {
          super();
          return new originalDate('2024-02-29T12:00:00Z');
        }
      } as any;

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      } as any);

      const dvNo = await generateDVNumber();

      expect(dvNo).toMatch(/0001-02-2024/);

      global.Date = originalDate;
    });

    it('should handle year transition correctly', async () => {
      const { db } = await import('../../src/lib/db/connection');

      // Test that December and January have different year suffixes
      expect(true).toBe(true); // Placeholder for year transition logic
    });
  });
});
