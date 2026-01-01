/**
 * Philippine Government Payroll Calculator
 * Calculates GSIS, PhilHealth, and Pag-IBIG contributions
 * Based on current 2024-2025 rates and regulations
 */

import { calculateWithholdingTax, type TaxExemptionCode } from './tax-calculator';

/**
 * GSIS (Government Service Insurance System) Contribution Rates
 * - Employee Share: 9% of monthly basic salary
 * - Employer Share: 12% of monthly basic salary
 */
const GSIS_EMPLOYEE_RATE = 0.09;
const GSIS_EMPLOYER_RATE = 0.12;

/**
 * PhilHealth Contribution Rates (2024)
 * - Premium Rate: 5% of monthly basic salary
 * - Employee Share: 2.5%
 * - Employer Share: 2.5%
 * - Minimum Monthly Salary: ₱10,000
 * - Maximum Monthly Salary: ₱100,000 (ceiling)
 */
const PHILHEALTH_PREMIUM_RATE = 0.05;
const PHILHEALTH_MIN_SALARY = 10000;
const PHILHEALTH_MAX_SALARY = 100000;

/**
 * Pag-IBIG (HDMF) Contribution Rates
 * - For monthly compensation ≤ ₱1,500: 1%
 * - For monthly compensation > ₱1,500: 2%
 * - Maximum employee contribution: ₱100
 * - Employer share: 2% of monthly compensation
 */
const PAGIBIG_RATE_LOW = 0.01;
const PAGIBIG_RATE_HIGH = 0.02;
const PAGIBIG_THRESHOLD = 1500;
const PAGIBIG_MAX_EMPLOYEE = 100;

export interface PayrollCalculationInput {
  basicSalary: number;
  pera?: number; // Personnel Economic Relief Allowance
  additionalAllowance?: number;
  overtime?: number;
  otherEarnings?: number;
  taxExemptionCode?: TaxExemptionCode;
  numberOfDependents?: number;

  // Loan deductions
  gsisLoan?: number;
  pagibigLoan?: number;
  salaryLoan?: number;
  otherDeductions?: number;
}

export interface PayrollCalculationResult {
  // Earnings
  basicSalary: number;
  pera: number;
  additionalAllowance: number;
  overtime: number;
  otherEarnings: number;
  grossPay: number;

  // Statutory Deductions
  gsisContribution: number;
  gsisEmployerShare: number;
  philhealthContribution: number;
  philhealthEmployerShare: number;
  pagibigContribution: number;
  pagibigEmployerShare: number;
  withholdingTax: number;

  // Other Deductions
  gsisLoan: number;
  pagibigLoan: number;
  salaryLoan: number;
  otherDeductions: number;

  // Totals
  totalStatutoryDeductions: number;
  totalLoanDeductions: number;
  totalDeductions: number;
  netPay: number;

  // Employer Costs
  totalEmployerContributions: number;
  totalCompensationCost: number;
}

/**
 * Calculate GSIS contribution
 * @param basicSalary - Monthly basic salary
 * @returns Object with employee and employer shares
 */
export function calculateGSISContribution(basicSalary: number): {
  employeeShare: number;
  employerShare: number;
  total: number;
} {
  const employeeShare = basicSalary * GSIS_EMPLOYEE_RATE;
  const employerShare = basicSalary * GSIS_EMPLOYER_RATE;

  return {
    employeeShare: Math.round(employeeShare * 100) / 100,
    employerShare: Math.round(employerShare * 100) / 100,
    total: Math.round((employeeShare + employerShare) * 100) / 100,
  };
}

/**
 * Calculate PhilHealth contribution
 * @param basicSalary - Monthly basic salary
 * @returns Object with employee and employer shares
 */
export function calculatePhilHealthContribution(basicSalary: number): {
  employeeShare: number;
  employerShare: number;
  total: number;
  baseSalary: number; // Actual salary used for calculation (after min/max adjustments)
} {
  // Apply minimum and maximum salary ceilings
  let baseSalary = basicSalary;
  if (baseSalary < PHILHEALTH_MIN_SALARY) {
    baseSalary = PHILHEALTH_MIN_SALARY;
  } else if (baseSalary > PHILHEALTH_MAX_SALARY) {
    baseSalary = PHILHEALTH_MAX_SALARY;
  }

  const totalPremium = baseSalary * PHILHEALTH_PREMIUM_RATE;
  const employeeShare = totalPremium / 2;
  const employerShare = totalPremium / 2;

  return {
    employeeShare: Math.round(employeeShare * 100) / 100,
    employerShare: Math.round(employerShare * 100) / 100,
    total: Math.round(totalPremium * 100) / 100,
    baseSalary,
  };
}

/**
 * Calculate Pag-IBIG (HDMF) contribution
 * @param monthlyCompensation - Total monthly compensation (basic + allowances)
 * @returns Object with employee and employer shares
 */
export function calculatePagIBIGContribution(monthlyCompensation: number): {
  employeeShare: number;
  employerShare: number;
  total: number;
} {
  // Determine employee rate
  const employeeRate =
    monthlyCompensation <= PAGIBIG_THRESHOLD ? PAGIBIG_RATE_LOW : PAGIBIG_RATE_HIGH;

  // Calculate contributions
  let employeeShare = monthlyCompensation * employeeRate;

  // Cap employee share at maximum
  if (employeeShare > PAGIBIG_MAX_EMPLOYEE) {
    employeeShare = PAGIBIG_MAX_EMPLOYEE;
  }

  // Employer share is always 2%
  const employerShare = monthlyCompensation * PAGIBIG_RATE_HIGH;

  return {
    employeeShare: Math.round(employeeShare * 100) / 100,
    employerShare: Math.round(employerShare * 100) / 100,
    total: Math.round((employeeShare + employerShare) * 100) / 100,
  };
}

/**
 * Comprehensive payroll calculation for a single employee
 * @param input - Payroll calculation input parameters
 * @returns Complete payroll calculation result
 */
export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  // Extract input values with defaults
  const basicSalary = input.basicSalary;
  const pera = input.pera || 0;
  const additionalAllowance = input.additionalAllowance || 0;
  const overtime = input.overtime || 0;
  const otherEarnings = input.otherEarnings || 0;

  const taxExemptionCode = input.taxExemptionCode || 'S';
  const numberOfDependents = input.numberOfDependents || 0;

  const gsisLoan = input.gsisLoan || 0;
  const pagibigLoan = input.pagibigLoan || 0;
  const salaryLoan = input.salaryLoan || 0;
  const otherDeductions = input.otherDeductions || 0;

  // Calculate gross pay
  const grossPay = basicSalary + pera + additionalAllowance + overtime + otherEarnings;

  // Calculate statutory contributions
  const gsis = calculateGSISContribution(basicSalary);
  const philhealth = calculatePhilHealthContribution(basicSalary);
  const pagibig = calculatePagIBIGContribution(basicSalary + pera);

  // Calculate taxable income (gross - non-taxable items - mandatory contributions)
  const taxableIncome =
    grossPay -
    gsis.employeeShare -
    philhealth.employeeShare -
    pagibig.employeeShare;

  // Calculate withholding tax
  const withholdingTax = calculateWithholdingTax(
    taxableIncome,
    taxExemptionCode,
    numberOfDependents
  );

  // Calculate totals
  const totalStatutoryDeductions =
    gsis.employeeShare +
    philhealth.employeeShare +
    pagibig.employeeShare +
    withholdingTax;

  const totalLoanDeductions = gsisLoan + pagibigLoan + salaryLoan + otherDeductions;
  const totalDeductions = totalStatutoryDeductions + totalLoanDeductions;
  const netPay = grossPay - totalDeductions;

  // Calculate employer costs
  const totalEmployerContributions =
    gsis.employerShare + philhealth.employerShare + pagibig.employerShare;
  const totalCompensationCost = grossPay + totalEmployerContributions;

  return {
    // Earnings
    basicSalary,
    pera,
    additionalAllowance,
    overtime,
    otherEarnings,
    grossPay: Math.round(grossPay * 100) / 100,

    // Statutory Deductions
    gsisContribution: gsis.employeeShare,
    gsisEmployerShare: gsis.employerShare,
    philhealthContribution: philhealth.employeeShare,
    philhealthEmployerShare: philhealth.employerShare,
    pagibigContribution: pagibig.employeeShare,
    pagibigEmployerShare: pagibig.employerShare,
    withholdingTax: Math.round(withholdingTax * 100) / 100,

    // Other Deductions
    gsisLoan,
    pagibigLoan,
    salaryLoan,
    otherDeductions,

    // Totals
    totalStatutoryDeductions: Math.round(totalStatutoryDeductions * 100) / 100,
    totalLoanDeductions: Math.round(totalLoanDeductions * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,

    // Employer Costs
    totalEmployerContributions: Math.round(totalEmployerContributions * 100) / 100,
    totalCompensationCost: Math.round(totalCompensationCost * 100) / 100,
  };
}

/**
 * Calculate 13th month pay
 * @param totalBasicSalary - Sum of basic salary for the year
 * @param monthsWorked - Number of months worked (for pro-rating)
 * @returns 13th month pay amount
 */
export function calculate13thMonthPay(
  totalBasicSalary: number,
  monthsWorked: number = 12
): number {
  // 13th month pay = total basic salary / 12
  // Pro-rated for employees who worked less than 12 months
  const thirteenthMonth = (totalBasicSalary / 12) * (monthsWorked / 12);
  return Math.round(thirteenthMonth * 100) / 100;
}

/**
 * Calculate net 13th month pay after tax
 * @param totalBasicSalary - Sum of basic salary for the year
 * @param monthsWorked - Number of months worked
 * @param otherBenefits - Other de minimis benefits
 * @returns Object with gross, tax, and net 13th month pay
 */
export function calculateNet13thMonthPay(
  totalBasicSalary: number,
  monthsWorked: number = 12,
  otherBenefits: number = 0
): {
  gross13thMonth: number;
  taxable13thMonth: number;
  tax: number;
  net13thMonth: number;
} {
  const EXEMPTION_LIMIT = 90000;

  const gross13thMonth = calculate13thMonthPay(totalBasicSalary, monthsWorked);
  const totalBenefits = gross13thMonth + otherBenefits;

  // Only excess over ₱90,000 is taxable
  const taxable13thMonth = Math.max(totalBenefits - EXEMPTION_LIMIT, 0);
  const tax = taxable13thMonth * 0.15; // 15% tax rate on excess

  const net13thMonth = gross13thMonth - tax;

  return {
    gross13thMonth: Math.round(gross13thMonth * 100) / 100,
    taxable13thMonth: Math.round(taxable13thMonth * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    net13thMonth: Math.round(net13thMonth * 100) / 100,
  };
}

/**
 * Calculate salary for partial month (pro-rated)
 * @param monthlySalary - Regular monthly salary
 * @param daysWorked - Number of days worked
 * @param totalDaysInMonth - Total working days in the month
 * @returns Pro-rated salary
 */
export function calculateProRatedSalary(
  monthlySalary: number,
  daysWorked: number,
  totalDaysInMonth: number
): number {
  const dailyRate = monthlySalary / totalDaysInMonth;
  const proRatedSalary = dailyRate * daysWorked;
  return Math.round(proRatedSalary * 100) / 100;
}

/**
 * Calculate overtime pay
 * @param hourlyRate - Hourly rate
 * @param overtimeHours - Number of overtime hours
 * @param multiplier - Overtime multiplier (1.25 for regular OT, 1.5 for holidays, etc.)
 * @returns Overtime pay amount
 */
export function calculateOvertimePay(
  hourlyRate: number,
  overtimeHours: number,
  multiplier: number = 1.25
): number {
  const overtimePay = hourlyRate * overtimeHours * multiplier;
  return Math.round(overtimePay * 100) / 100;
}

/**
 * Get hourly rate from monthly salary
 * @param monthlySalary - Monthly salary
 * @param workingDaysPerMonth - Average working days per month (default: 22)
 * @param hoursPerDay - Hours per working day (default: 8)
 * @returns Hourly rate
 */
export function getHourlyRate(
  monthlySalary: number,
  workingDaysPerMonth: number = 22,
  hoursPerDay: number = 8
): number {
  const totalHours = workingDaysPerMonth * hoursPerDay;
  const hourlyRate = monthlySalary / totalHours;
  return Math.round(hourlyRate * 100) / 100;
}
