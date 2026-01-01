/**
 * Depreciation Calculator Utility
 * Implements straight-line and declining balance methods
 * Following Philippine COA accounting standards
 */

export interface DepreciationParams {
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  acquisitionDate: Date;
  method: 'straight_line' | 'declining_balance';
}

export interface MonthlyDepreciation {
  month: number;
  year: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

/**
 * Calculate straight-line depreciation
 * Formula: (Cost - Salvage Value) / Useful Life / 12 months
 */
export function calculateStraightLineDepreciation(params: DepreciationParams): number {
  const { acquisitionCost, salvageValue, usefulLifeYears } = params;
  const depreciableAmount = acquisitionCost - salvageValue;
  const annualDepreciation = depreciableAmount / usefulLifeYears;
  const monthlyDepreciation = annualDepreciation / 12;
  return monthlyDepreciation;
}

/**
 * Calculate declining balance depreciation
 * Formula: Book Value × (2 / Useful Life) × (1/12)
 */
export function calculateDecliningBalanceDepreciation(
  bookValue: number,
  usefulLifeYears: number
): number {
  const rate = 2 / usefulLifeYears;
  const monthlyDepreciation = (bookValue * rate) / 12;
  return monthlyDepreciation;
}

/**
 * Generate complete depreciation schedule for an asset
 */
export function generateDepreciationSchedule(params: DepreciationParams): MonthlyDepreciation[] {
  const { acquisitionCost, salvageValue, usefulLifeYears, acquisitionDate, method } = params;

  const schedule: MonthlyDepreciation[] = [];
  let accumulatedDepreciation = 0;
  let bookValue = acquisitionCost;

  const startDate = new Date(acquisitionDate);
  const totalMonths = usefulLifeYears * 12;

  for (let i = 0; i < totalMonths; i++) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + i);

    let monthlyDepreciation = 0;

    if (method === 'straight_line') {
      monthlyDepreciation = calculateStraightLineDepreciation(params);
    } else {
      monthlyDepreciation = calculateDecliningBalanceDepreciation(bookValue, usefulLifeYears);
    }

    // Don't depreciate below salvage value
    if (bookValue - monthlyDepreciation < salvageValue) {
      monthlyDepreciation = bookValue - salvageValue;
    }

    accumulatedDepreciation += monthlyDepreciation;
    bookValue -= monthlyDepreciation;

    schedule.push({
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      depreciationAmount: Math.round(monthlyDepreciation * 100) / 100,
      accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
      bookValue: Math.round(bookValue * 100) / 100,
    });

    // Stop if fully depreciated
    if (bookValue <= salvageValue) break;
  }

  return schedule;
}

/**
 * Calculate depreciation for a specific month
 */
export function calculateMonthlyDepreciation(
  params: DepreciationParams,
  currentAccumulatedDepreciation: number
): number {
  const { acquisitionCost, salvageValue, usefulLifeYears, method } = params;
  const currentBookValue = acquisitionCost - currentAccumulatedDepreciation;

  // Already fully depreciated
  if (currentBookValue <= salvageValue) return 0;

  let monthlyDepreciation = 0;

  if (method === 'straight_line') {
    monthlyDepreciation = calculateStraightLineDepreciation(params);
  } else {
    monthlyDepreciation = calculateDecliningBalanceDepreciation(currentBookValue, usefulLifeYears);
  }

  // Cap at remaining depreciable amount
  const remainingDepreciable = currentBookValue - salvageValue;
  if (monthlyDepreciation > remainingDepreciable) {
    monthlyDepreciation = remainingDepreciable;
  }

  return Math.round(monthlyDepreciation * 100) / 100;
}
