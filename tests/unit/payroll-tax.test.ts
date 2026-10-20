import { describe, it, expect } from 'vitest';
import {
  calculateWithholdingTax,
  calculateAnnualWithholdingTax,
  calculate13thMonthTax,
} from '../../src/lib/utils/tax-calculator';
import {
  calculatePagIBIGContribution,
  calculatePhilHealthContribution,
  calculateGSISContribution,
  calculatePayroll,
  calculateNet13thMonthPay,
} from '../../src/lib/utils/payroll-calculator';

// Worked examples follow the BIR withholding table effective January 1, 2023 (RR 11-2018
// as amended), HDMF Circular No. 460 and PhilHealth's 2024–2025 premium schedule.

describe('monthly withholding tax (TRAIN, 2023 onwards)', () => {
  it.each([
    [20833, 0],
    [25000, 625.05], // 15% of excess over 20,833
    [33333, 1875], // continuous at the bracket boundary
    [50000, 5208.4], // 1,875 + 20% of excess over 33,333
    [100000, 16875.05], // 8,541.80 + 25% of excess over 66,667
    [200000, 43541.7], // 33,541.80 + 30% of excess over 166,667
    [700000, 195208.35], // 183,541.80 + 35% of excess over 666,667
  ])('taxable %d → %d', (taxable, tax) => {
    expect(calculateWithholdingTax(taxable)).toBeCloseTo(tax, 2);
  });

  it('taxes amounts with centavos that used to fall between brackets', () => {
    // 33,332.50 previously matched no bracket and returned ₱0
    expect(calculateWithholdingTax(33332.5)).toBeCloseTo(1874.93, 2);
    expect(calculateWithholdingTax(20833.5)).toBeCloseTo(0.08, 2);
  });

  it('ignores civil status and dependents, which TRAIN abolished', () => {
    expect(calculateWithholdingTax(50000, 'ME4', 4)).toBe(calculateWithholdingTax(50000, 'S', 0));
  });

  it('withholds nothing for zero-withholding employees', () => {
    expect(calculateWithholdingTax(50000, 'Z')).toBe(0);
  });
});

describe('annual income tax', () => {
  it.each([
    [250000, 0],
    [500000, 42500], // 22,500 + 20% of excess over 400,000
    [1200000, 202500], // 102,500 + 25% of excess over 800,000
  ])('taxable %d → %d', (taxable, tax) => {
    expect(calculateAnnualWithholdingTax(taxable)).toBeCloseTo(tax, 2);
  });
});

describe('13th month pay and other benefits', () => {
  it('is exempt up to ₱90,000', () => {
    expect(calculate13thMonthTax(60000, 30000, 1_200_000)).toBe(0);
  });

  it("taxes the excess at the employee's graduated rate, not a flat 15%", () => {
    // ₱10,000 excess on top of ₱1.2M taxable compensation falls in the 25% bracket
    expect(calculate13thMonthTax(100000, 0, 1_200_000)).toBeCloseTo(2500, 2);
    // and in the 0% bracket for a low earner
    expect(calculate13thMonthTax(100000, 0, 100_000)).toBe(0);
  });

  it('computes net 13th month pay from the annual basic salary', () => {
    const result = calculateNet13thMonthPay(1_200_000, 12);
    expect(result.gross13thMonth).toBe(100000);
    expect(result.taxable13thMonth).toBe(10000);
    expect(result.tax).toBeCloseTo(2500, 2);
    expect(result.net13thMonth).toBeCloseTo(97500, 2);
  });
});

describe('statutory contributions', () => {
  it('caps Pag-IBIG at the ₱10,000 maximum fund salary (₱200 each)', () => {
    expect(calculatePagIBIGContribution(30000)).toEqual({ employeeShare: 200, employerShare: 200, total: 400 });
  });

  it('uses 1% for the employee at ₱1,500 and below', () => {
    expect(calculatePagIBIGContribution(1000)).toEqual({ employeeShare: 10, employerShare: 20, total: 30 });
  });

  it('splits the 5% PhilHealth premium equally within the ₱10,000–₱100,000 range', () => {
    expect(calculatePhilHealthContribution(30000).employeeShare).toBe(750);
    expect(calculatePhilHealthContribution(150000).employeeShare).toBe(2500);
    expect(calculatePhilHealthContribution(8000).employeeShare).toBe(250);
  });

  it('charges GSIS at 9% employee and 12% employer', () => {
    expect(calculateGSISContribution(30000)).toEqual(expect.objectContaining({ employeeShare: 2700, employerShare: 3600 }));
  });
});

describe('full payroll computation', () => {
  it('excludes PERA from taxable pay and nets out contributions before tax', () => {
    const result = calculatePayroll({ basicSalary: 30000, pera: 2000 });
    expect(result.grossPay).toBe(32000);
    expect(result.gsisContribution).toBe(2700);
    expect(result.philhealthContribution).toBe(750);
    expect(result.pagibigContribution).toBe(200);
    // Taxable = 32,000 − 2,000 PERA − 2,700 − 750 − 200 = 26,350 → 15% of excess over 20,833
    expect(result.withholdingTax).toBeCloseTo(827.55, 2);
    expect(result.netPay).toBeCloseTo(32000 - 2700 - 750 - 200 - 827.55, 2);
  });
});
