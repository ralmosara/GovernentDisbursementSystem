/**
 * Philippine BIR withholding tax on compensation.
 *
 * Basis: RA 10963 (TRAIN Law) and RR 11-2018 as amended — the graduated table that
 * took effect January 1, 2023.
 *
 * TRAIN abolished personal and additional (dependent) exemptions from 2018, so tax
 * depends only on taxable compensation. The old status codes (S, ME1, …) are kept as a
 * type because employee records still store them, but they no longer change the tax.
 * Only 'Z' (zero withholding, e.g. minimum-wage earners) is honoured.
 */

/** @deprecated Exemption status codes no longer affect tax under TRAIN; kept for stored records. */
export type TaxExemptionCode =
  | 'S'
  | 'S1'
  | 'S2'
  | 'S3'
  | 'S4'
  | 'ME'
  | 'ME1'
  | 'ME2'
  | 'ME3'
  | 'ME4'
  | 'Z'; // Zero withholding (exempt employees)

interface Bracket {
  /** Tax applies to the amount in excess of this */
  over: number;
  /** Fixed tax for income up to `over` */
  base: number;
  rate: number;
}

/** Monthly withholding table, January 1, 2023 onwards (RR 11-2018 Annex E) */
const MONTHLY_BRACKETS: Bracket[] = [
  { over: 0, base: 0, rate: 0 },
  { over: 20833, base: 0, rate: 0.15 },
  { over: 33333, base: 1875, rate: 0.2 },
  { over: 66667, base: 8541.8, rate: 0.25 },
  { over: 166667, base: 33541.8, rate: 0.3 },
  { over: 666667, base: 183541.8, rate: 0.35 },
];

/** Annual graduated rates, January 1, 2023 onwards (NIRC Sec. 24(A)(2) as amended by TRAIN) */
const ANNUAL_BRACKETS: Bracket[] = [
  { over: 0, base: 0, rate: 0 },
  { over: 250000, base: 0, rate: 0.15 },
  { over: 400000, base: 22500, rate: 0.2 },
  { over: 800000, base: 102500, rate: 0.25 },
  { over: 2000000, base: 402500, rate: 0.3 },
  { over: 8000000, base: 2202500, rate: 0.35 },
];

/** 13th month pay and other benefits exempt up to this amount per year (TRAIN) */
export const OTHER_BENEFITS_EXEMPTION = 90000;

const round2 = (value: number) => Math.round(value * 100) / 100;

function taxFromBrackets(taxable: number, brackets: Bracket[]): number {
  if (!(taxable > 0)) return 0;
  // Highest bracket whose threshold the income exceeds; continuous at every boundary,
  // so fractional amounts never fall between brackets
  const bracket = [...brackets].reverse().find(b => taxable > b.over) ?? brackets[0];
  return round2(bracket.base + (taxable - bracket.over) * bracket.rate);
}

/**
 * Monthly withholding tax on taxable compensation (gross taxable pay less the employee's
 * GSIS, PhilHealth and Pag-IBIG contributions).
 *
 * The second and third parameters are accepted for backward compatibility; dependents no
 * longer reduce tax under TRAIN.
 */
export function calculateWithholdingTax(
  monthlyTaxableCompensation: number,
  taxExemptionCode: TaxExemptionCode = 'S',
  _additionalExemptions: number = 0
): number {
  if (taxExemptionCode === 'Z') return 0;
  return taxFromBrackets(monthlyTaxableCompensation, MONTHLY_BRACKETS);
}

/** Annual income tax on taxable compensation, used for year-end annualization */
export function calculateAnnualWithholdingTax(
  annualTaxableCompensation: number,
  taxExemptionCode: TaxExemptionCode = 'S',
  _additionalExemptions: number = 0
): number {
  if (taxExemptionCode === 'Z') return 0;
  return taxFromBrackets(annualTaxableCompensation, ANNUAL_BRACKETS);
}

/**
 * Tax on 13th month pay and other benefits. Only the excess over ₱90,000 is taxable, and
 * that excess is added to the employee's other taxable compensation for the year — so the
 * tax is the increase in annual tax it causes, at the graduated rates (not a flat rate).
 */
export function calculate13thMonthTax(
  thirteenthMonthAmount: number,
  otherBenefits: number = 0,
  annualTaxableCompensation: number = 0
): number {
  const excess = Math.max(thirteenthMonthAmount + otherBenefits - OTHER_BENEFITS_EXEMPTION, 0);
  if (excess === 0) return 0;
  return round2(
    taxFromBrackets(annualTaxableCompensation + excess, ANNUAL_BRACKETS) -
      taxFromBrackets(annualTaxableCompensation, ANNUAL_BRACKETS)
  );
}

/** Format a stored exemption code for display */
export function formatTaxExemptionCode(code: TaxExemptionCode): string {
  return code === 'Z' ? 'Zero withholding (exempt)' : 'Regular (TRAIN — no personal exemptions)';
}

/** Describe the monthly bracket a taxable amount falls in */
export function getTaxBracket(monthlyTaxable: number): {
  bracket: string;
  rate: number;
  annualEquivalent: string;
} {
  const bracket = [...MONTHLY_BRACKETS].reverse().find(b => monthlyTaxable > b.over) ?? MONTHLY_BRACKETS[0];
  const next = MONTHLY_BRACKETS[MONTHLY_BRACKETS.indexOf(bracket) + 1];
  const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`;

  return {
    bracket: next ? `Over ${peso(bracket.over)} up to ${peso(next.over)}` : `Over ${peso(bracket.over)}`,
    rate: bracket.rate * 100,
    annualEquivalent: next ? `Over ${peso(bracket.over * 12)} up to ${peso(next.over * 12)}` : `Over ${peso(bracket.over * 12)}`,
  };
}
