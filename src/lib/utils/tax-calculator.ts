/**
 * Philippine BIR Withholding Tax Calculator
 * Based on TRAIN Law (Tax Reform for Acceleration and Inclusion)
 * Updated tax tables effective January 1, 2023
 */

// Tax Exemption Status Codes
export type TaxExemptionCode =
  | 'S' // Single
  | 'S1' // Single with 1 dependent
  | 'S2' // Single with 2 dependents
  | 'S3' // Single with 3 dependents
  | 'S4' // Single with 4 dependents
  | 'ME' // Married Employee
  | 'ME1' // Married Employee with 1 dependent
  | 'ME2' // Married Employee with 2 dependents
  | 'ME3' // Married Employee with 3 dependents
  | 'ME4' // Married Employee with 4 dependents
  | 'Z'; // Zero withholding

// Monthly personal exemption per dependent (₱25,000 annually = ₱2,083.33 monthly)
const MONTHLY_DEPENDENT_EXEMPTION = 2083.33;

// Maximum number of dependents for tax exemption
const MAX_DEPENDENTS = 4;

/**
 * 2023 Philippine Income Tax Table (Monthly)
 * Based on TRAIN Law graduated tax rates
 */
const TAX_BRACKETS_MONTHLY = [
  { min: 0, max: 20833, rate: 0, baseAmount: 0 }, // 0% for ₱250,000/year and below
  { min: 20834, max: 33332, rate: 0.15, baseAmount: 0 }, // 15% of excess over ₱250,000
  { min: 33333, max: 66666, rate: 0.2, baseAmount: 1875 }, // 20% of excess over ₱400,000 + ₱1,875
  { min: 66667, max: 166666, rate: 0.25, baseAmount: 8541.8 }, // 25% of excess over ₱800,000 + ₱8,541.80
  { min: 166667, max: 666666, rate: 0.3, baseAmount: 33541.8 }, // 30% of excess over ₱2,000,000 + ₱33,541.80
  { min: 666667, max: Infinity, rate: 0.35, baseAmount: 183541.8 }, // 35% of excess over ₱8,000,000 + ₱183,541.80
];

/**
 * Calculate monthly withholding tax based on taxable income
 * @param grossMonthlyIncome - Total monthly gross income
 * @param taxExemptionCode - Tax exemption status (S, S1, ME, ME1, etc.)
 * @param additionalExemptions - Additional dependents beyond code (optional)
 * @returns Monthly withholding tax amount
 */
export function calculateWithholdingTax(
  grossMonthlyIncome: number,
  taxExemptionCode: TaxExemptionCode = 'S',
  additionalExemptions: number = 0
): number {
  // Handle zero withholding
  if (taxExemptionCode === 'Z') {
    return 0;
  }

  // Calculate total exemptions
  const dependentsFromCode = getDependentsFromCode(taxExemptionCode);
  const totalDependents = Math.min(dependentsFromCode + additionalExemptions, MAX_DEPENDENTS);

  // Calculate taxable income
  const totalExemption = totalDependents * MONTHLY_DEPENDENT_EXEMPTION;
  const taxableIncome = Math.max(grossMonthlyIncome - totalExemption, 0);

  // Find applicable tax bracket
  const bracket = TAX_BRACKETS_MONTHLY.find(
    (b) => taxableIncome >= b.min && taxableIncome <= b.max
  );

  if (!bracket) {
    return 0;
  }

  // Calculate tax
  if (bracket.rate === 0) {
    return 0;
  }

  const excessIncome = taxableIncome - bracket.min;
  const tax = bracket.baseAmount + excessIncome * bracket.rate;

  return Math.round(tax * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate annual withholding tax
 * @param grossAnnualIncome - Total annual gross income
 * @param taxExemptionCode - Tax exemption status
 * @param additionalExemptions - Additional dependents
 * @returns Annual withholding tax amount
 */
export function calculateAnnualWithholdingTax(
  grossAnnualIncome: number,
  taxExemptionCode: TaxExemptionCode = 'S',
  additionalExemptions: number = 0
): number {
  // Handle zero withholding
  if (taxExemptionCode === 'Z') {
    return 0;
  }

  // Calculate total exemptions (₱25,000 per dependent annually)
  const dependentsFromCode = getDependentsFromCode(taxExemptionCode);
  const totalDependents = Math.min(dependentsFromCode + additionalExemptions, MAX_DEPENDENTS);
  const totalExemption = totalDependents * 25000;

  // Calculate taxable income
  const taxableIncome = Math.max(grossAnnualIncome - totalExemption, 0);

  // Annual tax brackets
  const annualBrackets = [
    { min: 0, max: 250000, rate: 0, baseAmount: 0 },
    { min: 250001, max: 400000, rate: 0.15, baseAmount: 0 },
    { min: 400001, max: 800000, rate: 0.2, baseAmount: 22500 },
    { min: 800001, max: 2000000, rate: 0.25, baseAmount: 102500 },
    { min: 2000001, max: 8000000, rate: 0.3, baseAmount: 402500 },
    { min: 8000001, max: Infinity, rate: 0.35, baseAmount: 2202500 },
  ];

  // Find applicable bracket
  const bracket = annualBrackets.find(
    (b) => taxableIncome >= b.min && taxableIncome <= b.max
  );

  if (!bracket || bracket.rate === 0) {
    return 0;
  }

  const excessIncome = taxableIncome - bracket.min;
  const tax = bracket.baseAmount + excessIncome * bracket.rate;

  return Math.round(tax * 100) / 100;
}

/**
 * Calculate 13th month pay tax (only excess over ₱90,000 is taxable)
 * @param thirteenthMonthAmount - 13th month pay amount
 * @param otherBenefits - Other de minimis benefits received
 * @returns Taxable 13th month pay amount
 */
export function calculate13thMonthTax(
  thirteenthMonthAmount: number,
  otherBenefits: number = 0
): number {
  const EXEMPTION_LIMIT = 90000; // ₱90,000 tax-free ceiling
  const totalBenefits = thirteenthMonthAmount + otherBenefits;

  // Only excess over ₱90,000 is taxable
  if (totalBenefits <= EXEMPTION_LIMIT) {
    return 0;
  }

  const taxableAmount = totalBenefits - EXEMPTION_LIMIT;

  // Apply lowest tax bracket (15%) for the excess
  const tax = taxableAmount * 0.15;

  return Math.round(tax * 100) / 100;
}

/**
 * Get number of dependents from tax exemption code
 * @param code - Tax exemption code
 * @returns Number of dependents
 */
function getDependentsFromCode(code: TaxExemptionCode): number {
  const mapping: Record<TaxExemptionCode, number> = {
    'S': 0,
    'S1': 1,
    'S2': 2,
    'S3': 3,
    'S4': 4,
    'ME': 0,
    'ME1': 1,
    'ME2': 2,
    'ME3': 3,
    'ME4': 4,
    'Z': 0,
  };
  return mapping[code] || 0;
}

/**
 * Format tax exemption code to readable string
 * @param code - Tax exemption code
 * @returns Formatted string
 */
export function formatTaxExemptionCode(code: TaxExemptionCode): string {
  const mapping: Record<TaxExemptionCode, string> = {
    'S': 'Single',
    'S1': 'Single with 1 Dependent',
    'S2': 'Single with 2 Dependents',
    'S3': 'Single with 3 Dependents',
    'S4': 'Single with 4 Dependents',
    'ME': 'Married Employee',
    'ME1': 'Married Employee with 1 Dependent',
    'ME2': 'Married Employee with 2 Dependents',
    'ME3': 'Married Employee with 3 Dependents',
    'ME4': 'Married Employee with 4 Dependents',
    'Z': 'Zero Withholding',
  };
  return mapping[code] || code;
}

/**
 * Get tax bracket description for a given monthly income
 * @param monthlyIncome - Monthly gross income
 * @returns Tax bracket information
 */
export function getTaxBracket(monthlyIncome: number): {
  bracket: string;
  rate: number;
  annualEquivalent: string;
} {
  const bracket = TAX_BRACKETS_MONTHLY.find(
    (b) => monthlyIncome >= b.min && monthlyIncome <= b.max
  );

  if (!bracket) {
    return {
      bracket: 'Unknown',
      rate: 0,
      annualEquivalent: 'Unknown',
    };
  }

  const annualMin = bracket.min * 12;
  const annualMax = bracket.max === Infinity ? 'above' : bracket.max * 12;

  return {
    bracket: `₱${bracket.min.toLocaleString()} - ₱${bracket.max === Infinity ? 'above' : bracket.max.toLocaleString()}`,
    rate: bracket.rate * 100, // Convert to percentage
    annualEquivalent: `₱${annualMin.toLocaleString()} - ${typeof annualMax === 'number' ? '₱' + annualMax.toLocaleString() : annualMax}`,
  };
}
