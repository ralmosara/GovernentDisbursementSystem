// Formatting shared by the financial statement pages.

/** Accounting format: 1,234.56, negatives in parentheses, zero as a dash */
export function statementAmount(value: number): string {
  if (Math.round(value * 100) === 0) return '–';
  const text = Math.abs(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `(${text})` : text;
}

export const longDate = (date: Date) => date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

/** yyyy-mm-dd query parameter as the start or end of that day; fallback when missing or invalid */
export function dateParam(value: string | null, fallback: Date, endOfDay: boolean): Date {
  const parsed = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : fallback;
}

/** The same period one year earlier, for comparative columns */
export function priorYear(date: Date): Date {
  const prior = new Date(date);
  prior.setFullYear(date.getFullYear() - 1);
  return prior;
}
