import { db } from '../db/connection';
import {
  employees,
  payrollPeriods,
  payrollTransactions,
  employeeDeductions,
  payrollAdjustments,
  remittances,
  thirteenthMonthPay,
  users,
} from '../db/schema';
import { eq, and, gte, lte, desc, sql, or } from 'drizzle-orm';
import {
  calculatePayroll,
  calculate13thMonthPay,
  calculateNet13thMonthPay,
  type PayrollCalculationInput,
} from '../utils/payroll-calculator';
import { type TaxExemptionCode } from '../utils/tax-calculator';
import { logCreate, logUpdate, logDelete, logProcess, sanitizeData } from '../middleware/audit-logger';

// ============================================
// EMPLOYEE MANAGEMENT
// ============================================

interface CreateEmployeeData {
  userId: number;
  employeeNo: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  dateOfBirth?: Date;
  civilStatus?: 'Single' | 'Married' | 'Widowed' | 'Separated';
  gender?: 'Male' | 'Female';
  position: string;
  salaryGrade?: string;
  stepIncrement?: number;
  appointmentStatus?: 'Permanent' | 'Temporary' | 'Casual' | 'Contractual' | 'Co-terminus';
  dateHired: Date;
  dateRegularized?: Date;
  basicSalary: number;
  pera?: number;
  additionalAllowance?: number;
  tinNo?: string;
  gsisNo?: string;
  philhealthNo?: string;
  pagibigNo?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  mobileNo?: string;
  email?: string;
  address?: string;
  taxExemptionCode?: TaxExemptionCode;
  numberOfDependents?: number;
}

interface UpdateEmployeeData extends Partial<CreateEmployeeData> {
  employmentStatus?: 'Active' | 'Resigned' | 'Retired' | 'Terminated' | 'On Leave';
  dateResigned?: Date;
}

async function generateEmployeeNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EMP-${year}-`;

  const lastEmployee = await db
    .select()
    .from(employees)
    .where(sql`${employees.employeeNo} LIKE ${prefix + '%'}`)
    .orderBy(desc(employees.employeeNo))
    .limit(1);

  let nextNumber = 1;
  if (lastEmployee.length > 0) {
    const lastNumber = parseInt(lastEmployee[0].employeeNo.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

export async function createEmployee(
  data: CreateEmployeeData,
  createdBy: number
): Promise<{ id: number; employeeNo: string }> {
  const employeeNo = data.employeeNo || (await generateEmployeeNumber());

  const [newEmployee] = await db.insert(employees).values({
    ...data,
    employeeNo,
    createdBy,
  });

  return {
    id: Number(newEmployee.insertId),
    employeeNo,
  };
}

export async function getEmployees(filters?: {
  employmentStatus?: string;
  position?: string;
  search?: string;
  isActive?: boolean;
}) {
  let query = db.select().from(employees);

  const conditions = [];

  if (filters?.employmentStatus) {
    conditions.push(eq(employees.employmentStatus, filters.employmentStatus as any));
  }

  if (filters?.position) {
    conditions.push(eq(employees.position, filters.position));
  }

  if (filters?.search) {
    conditions.push(
      or(
        sql`${employees.firstName} LIKE ${`%${filters.search}%`}`,
        sql`${employees.lastName} LIKE ${`%${filters.search}%`}`,
        sql`${employees.employeeNo} LIKE ${`%${filters.search}%`}`
      )!
    );
  }

  if (filters?.isActive !== undefined) {
    conditions.push(eq(employees.isActive, filters.isActive));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)!) as any;
  }

  const result = await query.orderBy(desc(employees.createdAt));
  return result;
}

export async function getEmployeeById(id: number) {
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, id));

  return employee || null;
}

export async function updateEmployee(
  id: number,
  data: UpdateEmployeeData
): Promise<void> {
  await db.update(employees).set(data).where(eq(employees.id, id));
}

export async function deleteEmployee(id: number): Promise<void> {
  await db.update(employees).set({ isActive: false }).where(eq(employees.id, id));
}

// ============================================
// PAYROLL PERIOD MANAGEMENT
// ============================================

interface CreatePayrollPeriodData {
  month: number;
  year: number;
  periodType?: 'Regular' | 'Special' | '13th Month' | 'Mid-Year Bonus';
  periodStart: Date;
  periodEnd: Date;
  payDate: Date;
  remarks?: string;
}

async function generatePayrollPeriodNo(year: number, month: number): Promise<string> {
  return `PAY-${year}-${String(month).padStart(2, '0')}`;
}

export async function createPayrollPeriod(
  data: CreatePayrollPeriodData,
  createdBy: number
): Promise<{ id: number; periodNo: string }> {
  const periodNo = await generatePayrollPeriodNo(data.year, data.month);

  // Check if period already exists
  const [existing] = await db
    .select()
    .from(payrollPeriods)
    .where(eq(payrollPeriods.periodNo, periodNo));

  if (existing) {
    throw new Error(`Payroll period for ${data.month}/${data.year} already exists`);
  }

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const periodName = `${monthNames[data.month - 1]} ${data.year}`;

  const [newPeriod] = await db.insert(payrollPeriods).values({
    periodNo,
    periodName,
    periodType: data.periodType || 'Regular',
    month: data.month,
    year: data.year,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    payDate: data.payDate,
    status: 'Draft',
    remarks: data.remarks,
    createdBy,
  });

  return {
    id: Number(newPeriod.insertId),
    periodNo,
  };
}

export async function getPayrollPeriods(filters?: {
  year?: number;
  month?: number;
  status?: string;
}) {
  let query = db
    .select()
    .from(payrollPeriods)
    .orderBy(desc(payrollPeriods.year), desc(payrollPeriods.month));

  const conditions = [];

  if (filters?.year) {
    conditions.push(eq(payrollPeriods.year, filters.year));
  }

  if (filters?.month) {
    conditions.push(eq(payrollPeriods.month, filters.month));
  }

  if (filters?.status) {
    conditions.push(eq(payrollPeriods.status, filters.status as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)!) as any;
  }

  return await query;
}

export async function getPayrollPeriodById(id: number) {
  const [period] = await db
    .select()
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, id));

  return period || null;
}

// ============================================
// PAYROLL PROCESSING
// ============================================

export async function processPayroll(
  periodId: number,
  userId: number
): Promise<{ totalEmployees: number; totalNetPay: number }> {
  // Get payroll period
  const period = await getPayrollPeriodById(periodId);
  if (!period) {
    throw new Error('Payroll period not found');
  }

  if (period.status !== 'Draft') {
    throw new Error('Payroll period is not in Draft status');
  }

  // Update status to Processing
  await db
    .update(payrollPeriods)
    .set({ status: 'Processing' })
    .where(eq(payrollPeriods.id, periodId));

  // Get all active employees
  const activeEmployees = await db
    .select()
    .from(employees)
    .where(
      and(eq(employees.isActive, true), eq(employees.employmentStatus, 'Active'))
    );

  let totalEmployees = 0;
  let totalGrossPay = 0;
  let totalDeductions = 0;
  let totalNetPay = 0;

  // Process each employee
  for (const employee of activeEmployees) {
    // Get employee's recurring deductions
    const activeDeductions = await db
      .select()
      .from(employeeDeductions)
      .where(
        and(
          eq(employeeDeductions.employeeId, employee.id),
          eq(employeeDeductions.isActive, true)
        )
      );

    // Get pending adjustments for this period
    const pendingAdjustments = await db
      .select()
      .from(payrollAdjustments)
      .where(
        and(
          eq(payrollAdjustments.employeeId, employee.id),
          eq(payrollAdjustments.status, 'Pending'),
          lte(payrollAdjustments.effectiveDate, period.periodEnd)
        )
      );

    // Calculate total loan deductions
    let gsisLoan = 0;
    let pagibigLoan = 0;
    let salaryLoan = 0;
    let otherDeductions = 0;

    for (const deduction of activeDeductions) {
      const amount = parseFloat(deduction.amount);
      switch (deduction.deductionType) {
        case 'GSIS Loan':
          gsisLoan += amount;
          break;
        case 'Pag-IBIG Loan':
          pagibigLoan += amount;
          break;
        case 'Salary Loan':
          salaryLoan += amount;
          break;
        default:
          otherDeductions += amount;
      }
    }

    // Apply adjustments
    let additionalEarnings = 0;
    let additionalDeductions = 0;

    for (const adjustment of pendingAdjustments) {
      const amount = parseFloat(adjustment.amount);
      if (adjustment.isAddition) {
        additionalEarnings += amount;
      } else {
        additionalDeductions += amount;
      }

      // Mark adjustment as applied
      await db
        .update(payrollAdjustments)
        .set({
          status: 'Applied',
          appliedInPeriod: periodId,
        })
        .where(eq(payrollAdjustments.id, adjustment.id));
    }

    // Prepare payroll calculation input
    const input: PayrollCalculationInput = {
      basicSalary: parseFloat(employee.basicSalary),
      pera: parseFloat(employee.pera || '0'),
      additionalAllowance: parseFloat(employee.additionalAllowance || '0'),
      otherEarnings: additionalEarnings,
      taxExemptionCode: (employee.taxExemptionCode as TaxExemptionCode) || 'S',
      numberOfDependents: employee.numberOfDependents || 0,
      gsisLoan,
      pagibigLoan,
      salaryLoan,
      otherDeductions: otherDeductions + additionalDeductions,
    };

    // Calculate payroll
    const result = calculatePayroll(input);

    // Insert payroll transaction
    await db.insert(payrollTransactions).values({
      payrollPeriodId: periodId,
      employeeId: employee.id,
      basicSalary: result.basicSalary.toString(),
      pera: result.pera.toString(),
      additionalAllowance: result.additionalAllowance.toString(),
      overtime: result.overtime.toString(),
      otherEarnings: result.otherEarnings.toString(),
      grossPay: result.grossPay.toString(),
      gsisContribution: result.gsisContribution.toString(),
      philhealthContribution: result.philhealthContribution.toString(),
      pagibigContribution: result.pagibigContribution.toString(),
      withholdingTax: result.withholdingTax.toString(),
      gsisLoan: result.gsisLoan.toString(),
      pagibigLoan: result.pagibigLoan.toString(),
      salaryLoan: result.salaryLoan.toString(),
      otherDeductions: result.otherDeductions.toString(),
      totalDeductions: result.totalDeductions.toString(),
      netPay: result.netPay.toString(),
      createdBy: userId,
    });

    // Update deduction installment counters
    for (const deduction of activeDeductions) {
      const newInstallmentsPaid = (deduction.installmentsPaid || 0) + 1;
      const updates: any = {
        installmentsPaid: newInstallmentsPaid,
      };

      // Check if deduction is complete
      if (
        deduction.installments &&
        newInstallmentsPaid >= deduction.installments
      ) {
        updates.isActive = false;
      }

      await db
        .update(employeeDeductions)
        .set(updates)
        .where(eq(employeeDeductions.id, deduction.id));
    }

    totalEmployees++;
    totalGrossPay += result.grossPay;
    totalDeductions += result.totalDeductions;
    totalNetPay += result.netPay;
  }

  // Update payroll period totals
  await db
    .update(payrollPeriods)
    .set({
      status: 'Completed',
      totalEmployees,
      totalGrossPay: totalGrossPay.toString(),
      totalDeductions: totalDeductions.toString(),
      totalNetPay: totalNetPay.toString(),
      processedBy: userId,
      processedAt: new Date(),
    })
    .where(eq(payrollPeriods.id, periodId));

  // Log audit trail
  await logProcess(
    'payroll_periods',
    periodId,
    userId,
    {
      totalEmployees,
      totalGrossPay,
      totalDeductions,
      totalNetPay,
      status: 'Completed',
    }
  );

  return {
    totalEmployees,
    totalNetPay,
  };
}

export async function getPayrollTransactions(periodId: number) {
  const transactions = await db
    .select({
      transaction: payrollTransactions,
      employee: employees,
    })
    .from(payrollTransactions)
    .leftJoin(employees, eq(payrollTransactions.employeeId, employees.id))
    .where(eq(payrollTransactions.payrollPeriodId, periodId))
    .orderBy(employees.lastName, employees.firstName);

  return transactions;
}

// ============================================
// EMPLOYEE DEDUCTIONS
// ============================================

interface CreateDeductionData {
  employeeId: number;
  deductionType: 'GSIS Loan' | 'Pag-IBIG Loan' | 'Salary Loan' | 'Other';
  deductionName: string;
  amount: number;
  startDate: Date;
  endDate?: Date;
  installments?: number;
  remarks?: string;
}

export async function createEmployeeDeduction(
  data: CreateDeductionData,
  createdBy: number
): Promise<{ id: number }> {
  const balance = data.installments ? data.amount * data.installments : data.amount;

  const [newDeduction] = await db.insert(employeeDeductions).values({
    ...data,
    amount: data.amount.toString(),
    balance: balance.toString(),
    installmentsPaid: 0,
    isActive: true,
    createdBy,
  });

  return {
    id: Number(newDeduction.insertId),
  };
}

export async function getEmployeeDeductions(employeeId: number) {
  return await db
    .select()
    .from(employeeDeductions)
    .where(eq(employeeDeductions.employeeId, employeeId))
    .orderBy(desc(employeeDeductions.createdAt));
}

export async function getAllDeductions(filters?: {
  employeeId?: number;
  deductionType?: string;
  isActive?: boolean;
}) {
  const deductionsWithEmployees = await db
    .select({
      deduction: employeeDeductions,
      employee: employees,
    })
    .from(employeeDeductions)
    .leftJoin(employees, eq(employeeDeductions.employeeId, employees.id))
    .orderBy(desc(employeeDeductions.createdAt));

  let result = deductionsWithEmployees;

  // Apply filters
  if (filters?.employeeId) {
    result = result.filter(d => d.deduction.employeeId === filters.employeeId);
  }

  if (filters?.deductionType) {
    result = result.filter(d => d.deduction.deductionType === filters.deductionType);
  }

  if (filters?.isActive !== undefined) {
    result = result.filter(d => d.deduction.isActive === filters.isActive);
  }

  return result;
}

// ============================================
// PAYROLL ADJUSTMENTS
// ============================================

interface CreateAdjustmentData {
  employeeId: number;
  adjustmentType: 'Salary Increase' | 'Step Increment' | 'Retroactive Pay' | 'Correction' | 'Other';
  adjustmentName: string;
  amount: number;
  isAddition: boolean;
  effectiveDate: Date;
  remarks?: string;
}

export async function createPayrollAdjustment(
  data: CreateAdjustmentData,
  createdBy: number
): Promise<{ id: number }> {
  const [newAdjustment] = await db.insert(payrollAdjustments).values({
    ...data,
    amount: data.amount.toString(),
    status: 'Pending',
    createdBy,
  });

  return {
    id: Number(newAdjustment.insertId),
  };
}

export async function getPayrollAdjustments(filters?: {
  employeeId?: number;
  status?: string;
}) {
  let query = db
    .select({
      adjustment: payrollAdjustments,
      employee: employees,
    })
    .from(payrollAdjustments)
    .leftJoin(employees, eq(payrollAdjustments.employeeId, employees.id))
    .orderBy(desc(payrollAdjustments.createdAt));

  const conditions = [];

  if (filters?.employeeId) {
    conditions.push(eq(payrollAdjustments.employeeId, filters.employeeId));
  }

  if (filters?.status) {
    conditions.push(eq(payrollAdjustments.status, filters.status as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)!) as any;
  }

  return await query;
}

// ============================================
// 13TH MONTH PAY
// ============================================

export async function generate13thMonthPay(
  year: number,
  userId: number
): Promise<{ totalEmployees: number; totalAmount: number }> {
  // Get all active employees
  const activeEmployees = await db
    .select()
    .from(employees)
    .where(
      and(eq(employees.isActive, true), eq(employees.employmentStatus, 'Active'))
    );

  let totalEmployees = 0;
  let totalAmount = 0;

  for (const employee of activeEmployees) {
    // Get all payroll transactions for the year
    const yearTransactions = await db
      .select()
      .from(payrollTransactions)
      .leftJoin(
        payrollPeriods,
        eq(payrollTransactions.payrollPeriodId, payrollPeriods.id)
      )
      .where(
        and(
          eq(payrollTransactions.employeeId, employee.id),
          eq(payrollPeriods.year, year)
        )
      );

    // Calculate total basic salary for the year
    const totalBasicSalary = yearTransactions.reduce(
      (sum, t) => sum + parseFloat(t.payroll_transactions.basicSalary),
      0
    );

    if (totalBasicSalary === 0) continue;

    // Calculate months worked (pro-rated)
    const monthsWorked = yearTransactions.length;

    // Calculate 13th month pay
    const result = calculateNet13thMonthPay(totalBasicSalary, monthsWorked);

    // Insert 13th month pay record
    await db.insert(thirteenthMonthPay).values({
      year,
      employeeId: employee.id,
      totalBasicSalary: totalBasicSalary.toString(),
      monthsWorked: monthsWorked.toString(),
      thirteenthMonthAmount: result.gross13thMonth.toString(),
      withholdingTax: result.tax.toString(),
      netAmount: result.net13thMonth.toString(),
      paymentStatus: 'Pending',
      createdBy: userId,
    });

    totalEmployees++;
    totalAmount += result.net13thMonth;
  }

  return {
    totalEmployees,
    totalAmount,
  };
}

export async function get13thMonthPayRecords(year: number) {
  return await db
    .select({
      payment: thirteenthMonthPay,
      employee: employees,
    })
    .from(thirteenthMonthPay)
    .leftJoin(employees, eq(thirteenthMonthPay.employeeId, employees.id))
    .where(eq(thirteenthMonthPay.year, year))
    .orderBy(employees.lastName, employees.firstName);
}

// ============================================
// REMITTANCES
// ============================================

async function generateRemittanceNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REM-${year}-`;

  const lastRemittance = await db
    .select()
    .from(remittances)
    .where(sql`${remittances.remittanceNo} LIKE ${prefix + '%'}`)
    .orderBy(desc(remittances.remittanceNo))
    .limit(1);

  let nextNumber = 1;
  if (lastRemittance.length > 0) {
    const lastNumber = parseInt(lastRemittance[0].remittanceNo.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

export async function generateRemittances(
  periodId: number,
  userId: number
): Promise<void> {
  const period = await getPayrollPeriodById(periodId);
  if (!period) {
    throw new Error('Payroll period not found');
  }

  // Get all transactions for the period
  const transactions = await getPayrollTransactions(periodId);

  // Calculate totals for each remittance type
  const remittanceTypes = ['GSIS', 'PhilHealth', 'Pag-IBIG', 'BIR'] as const;

  for (const type of remittanceTypes) {
    let employeeShare = 0;
    let employerShare = 0;

    for (const { transaction } of transactions) {
      if (type === 'GSIS') {
        employeeShare += parseFloat(transaction.gsisContribution);
        // Employer share: 12% (assuming employee is 9%)
        employerShare += (parseFloat(transaction.gsisContribution) / 0.09) * 0.12;
      } else if (type === 'PhilHealth') {
        employeeShare += parseFloat(transaction.philhealthContribution);
        employerShare += parseFloat(transaction.philhealthContribution); // Equal sharing
      } else if (type === 'Pag-IBIG') {
        employeeShare += parseFloat(transaction.pagibigContribution);
        // Employer share: 2%
        employerShare += (parseFloat(transaction.basicSalary) + parseFloat(transaction.pera)) * 0.02;
      } else if (type === 'BIR') {
        employeeShare += parseFloat(transaction.withholdingTax);
        employerShare = 0; // No employer share for withholding tax
      }
    }

    if (employeeShare === 0 && employerShare === 0) continue;

    const remittanceNo = await generateRemittanceNo();
    const totalAmount = employeeShare + employerShare;

    // Calculate due date (typically 10th of following month)
    const dueDate = new Date(period.year, period.month, 10);

    await db.insert(remittances).values({
      remittanceNo,
      payrollPeriodId: periodId,
      remittanceType: type,
      month: period.month,
      year: period.year,
      employeeShare: employeeShare.toString(),
      employerShare: employerShare.toString(),
      totalAmount: totalAmount.toString(),
      dueDate,
      paymentStatus: 'Pending',
      createdBy: userId,
    });
  }
}

export async function getRemittances(filters?: {
  year?: number;
  month?: number;
  remittanceType?: string;
  paymentStatus?: string;
}) {
  let query = db
    .select({
      remittance: remittances,
      period: payrollPeriods,
    })
    .from(remittances)
    .leftJoin(payrollPeriods, eq(remittances.payrollPeriodId, payrollPeriods.id))
    .orderBy(desc(remittances.year), desc(remittances.month));

  const conditions = [];

  if (filters?.year) {
    conditions.push(eq(remittances.year, filters.year));
  }

  if (filters?.month) {
    conditions.push(eq(remittances.month, filters.month));
  }

  if (filters?.remittanceType) {
    conditions.push(eq(remittances.remittanceType, filters.remittanceType as any));
  }

  if (filters?.paymentStatus) {
    conditions.push(eq(remittances.paymentStatus, filters.paymentStatus as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)!) as any;
  }

  return await query;
}

export const payrollService = {
  // Employees
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,

  // Payroll Periods
  createPayrollPeriod,
  getPayrollPeriods,
  getPayrollPeriodById,

  // Payroll Processing
  processPayroll,
  getPayrollTransactions,

  // Deductions
  createEmployeeDeduction,
  getEmployeeDeductions,
  getAllDeductions,

  // Adjustments
  createPayrollAdjustment,
  getPayrollAdjustments,

  // 13th Month Pay
  generate13thMonthPay,
  get13thMonthPayRecords,

  // Remittances
  generateRemittances,
  getRemittances,
};
