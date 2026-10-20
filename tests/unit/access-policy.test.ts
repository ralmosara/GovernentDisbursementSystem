import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { ACCESS_RULES, findAccessRule, isRequestAllowed } from '../../src/lib/security/access-policy';

const allowed = (method: string, url: string, roles: string[]) => isRequestAllowed(method, url, roles).allowed;

describe('Access policy', () => {
  describe('reads', () => {
    it('should not restrict GET requests', () => {
      expect(findAccessRule('GET', '/api/payments/1/issue')).toBeNull();
      expect(allowed('GET', '/api/payroll/employees', ['division_staff'])).toBe(true);
    });
  });

  describe('administrators', () => {
    it('should allow administrators every action', () => {
      for (const url of ['/api/payments/5/issue', '/api/budget/obligations/3/approve', '/api/revenue/receivables/2/write-off']) {
        expect(allowed('POST', url, ['administrator'])).toBe(true);
      }
    });
  });

  describe('budget', () => {
    it('should let only budget officers certify obligations', () => {
      expect(allowed('POST', '/api/budget/obligations/7/approve', ['budget_officer'])).toBe(true);
      expect(allowed('POST', '/api/budget/obligations/7/approve', ['division_staff'])).toBe(false);
      expect(allowed('POST', '/api/budget/obligations/7/reject', ['accountant'])).toBe(false);
    });

    it('should let division staff prepare obligation requests', () => {
      expect(allowed('POST', '/api/budget/obligations', ['division_staff'])).toBe(true);
      expect(allowed('POST', '/api/budget/obligations', ['cashier'])).toBe(false);
    });

    it('should restrict appropriations and allotments to budget officers', () => {
      expect(allowed('POST', '/api/budget/appropriations', ['accountant'])).toBe(false);
      expect(allowed('POST', '/api/budget/allotments', ['budget_officer'])).toBe(true);
    });
  });

  describe('treasury', () => {
    it('should restrict payment actions to cashiers and accountants', () => {
      expect(allowed('POST', '/api/payments/9/issue', ['cashier'])).toBe(true);
      expect(allowed('POST', '/api/payments/9/clear', ['accountant'])).toBe(true);
      expect(allowed('POST', '/api/payments/9/cancel', ['division_staff'])).toBe(false);
      expect(allowed('POST', '/api/payments', ['budget_officer'])).toBe(false);
    });

    it('should let any staff role request a cash advance but not approve one', () => {
      expect(allowed('POST', '/api/cash/advances', ['division_staff'])).toBe(true);
      expect(allowed('PATCH', '/api/cash/advances/4/status', ['division_staff'])).toBe(false);
      expect(allowed('PATCH', '/api/cash/advances/4/status', ['director'])).toBe(true);
    });

    it('should apply the specific reconciliation rule before the general cash rule', () => {
      expect(allowed('POST', '/api/cash/reconciliations/2/complete', ['cashier'])).toBe(false);
      expect(allowed('POST', '/api/cash/reconciliations/2/complete', ['accountant'])).toBe(true);
      expect(allowed('POST', '/api/cash/receipts', ['cashier'])).toBe(true);
    });
  });

  describe('revenue, payroll, assets and travel', () => {
    it('should require the director to write off receivables', () => {
      expect(allowed('POST', '/api/revenue/receivables/1/write-off', ['accountant'])).toBe(false);
      expect(allowed('POST', '/api/revenue/receivables/1/write-off', ['director'])).toBe(true);
      expect(allowed('POST', '/api/revenue/collections', ['cashier'])).toBe(true);
    });

    it('should restrict payroll processing to accountants', () => {
      expect(allowed('POST', '/api/payroll/periods/3/process', ['accountant'])).toBe(true);
      expect(allowed('POST', '/api/payroll/periods/3/process', ['cashier'])).toBe(false);
      expect(allowed('PUT', '/api/payroll/employees/8', ['division_staff'])).toBe(false);
    });

    it('should leave traveler actions open but restrict approval', () => {
      expect(allowed('POST', '/api/travel', ['division_staff'])).toBe(true);
      expect(allowed('POST', '/api/travel/5/ctc', ['division_staff'])).toBe(true);
      expect(allowed('POST', '/api/travel/5/approve', ['division_staff'])).toBe(false);
      expect(allowed('POST', '/api/travel/5/approve', ['director'])).toBe(true);
    });

    it('should leave DV preparation open; stage approval is enforced by the workflow', () => {
      expect(allowed('POST', '/api/disbursements', ['division_staff'])).toBe(true);
      expect(findAccessRule('POST', '/api/disbursements/1/approve')).toBeNull();
    });
  });

  describe('a user with several roles', () => {
    it('should be allowed when any role matches', () => {
      expect(allowed('POST', '/api/payments/1/issue', ['division_staff', 'cashier'])).toBe(true);
    });
  });

  describe('policy integrity', () => {
    function walk(dir: string, out: string[] = []): string[] {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (entry.endsWith('.ts')) out.push(full);
      }
      return out;
    }

    const apiRoot = path.resolve(__dirname, '../../src/pages');
    const apiRoutes = walk(path.join(apiRoot, 'api')).map(file =>
      file
        .slice(apiRoot.length)
        .split(path.sep)
        .join('/')
        .replace(/\.ts$/, '')
        .replace(/\/index$/, '')
        .replace(/\[[^\]]+\]/g, '123')
    );

    it.each(ACCESS_RULES.map(rule => [rule.pattern]))('rule %s should match at least one API route', (pattern) => {
      const matches = apiRoutes.filter(route => findAccessRule('POST', route)?.pattern === pattern);
      // A rule shadowed by an earlier one, or with a typo, matches nothing
      expect(matches.length, `no API route is governed by ${pattern}`).toBeGreaterThan(0);
    });
  });
});
