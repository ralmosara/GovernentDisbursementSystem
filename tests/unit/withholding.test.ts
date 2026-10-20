import { describe, it, expect } from 'vitest';
import { computeWithholding, isTaxTreatment } from '../../src/lib/utils/withholding';

describe('withholding on payments to suppliers', () => {
  it('withholds 5% final VAT and 1% EWT on goods from a VAT-registered supplier', () => {
    // ₱112,000 VAT-inclusive → ₱100,000 VAT-exclusive base
    const result = computeWithholding(112000, 'vat_goods', 'corporate');
    expect(result.lines).toEqual([
      expect.objectContaining({ taxType: 'final_vat', atc: 'WV010', taxBase: 100000, amount: 5000 }),
      expect.objectContaining({ taxType: 'ewt', atc: 'WC158', taxBase: 100000, amount: 1000 }),
    ]);
    expect(result.totalTax).toBe(6000);
    expect(result.netAmount).toBe(106000);
  });

  it('withholds 2% EWT on services and uses the individual ATC for individual payees', () => {
    const result = computeWithholding(56000, 'vat_services', 'individual');
    expect(result.lines.map(l => [l.atc, l.amount])).toEqual([
      ['WV020', 2500],
      ['WI160', 1000],
    ]);
    expect(result.netAmount).toBe(52500);
  });

  it('withholds 3% percentage tax and EWT on the gross for non-VAT suppliers', () => {
    const result = computeWithholding(10000, 'nonvat_goods');
    expect(result.lines.map(l => [l.taxType, l.taxBase, l.amount])).toEqual([
      ['percentage_tax', 10000, 300],
      ['ewt', 10000, 100],
    ]);
    expect(result.netAmount).toBe(9600);
  });

  it('rounds each tax to the centavo and keeps net + tax equal to gross', () => {
    const result = computeWithholding(48250.5, 'vat_goods');
    expect(result.totalTax + result.netAmount).toBeCloseTo(48250.5, 2);
    for (const line of result.lines) {
      expect(Number.isInteger(Math.round(line.amount * 100))).toBe(true);
    }
  });

  it('withholds nothing when the payment is not subject to withholding', () => {
    expect(computeWithholding(5000, 'none')).toEqual({ lines: [], totalTax: 0, netAmount: 5000 });
  });

  it('recognises valid treatments only', () => {
    expect(isTaxTreatment('vat_goods')).toBe(true);
    expect(isTaxTreatment('vat')).toBe(false);
  });
});
