/**
 * Taxes a government agency withholds when it pays a supplier.
 *
 * Basis:
 *  - Final VAT: NIRC Sec. 114(C) as amended by TRAIN — 5% of the VAT-exclusive amount on
 *    payments to VAT-registered suppliers (ATC WV010 goods, WV020 services).
 *  - Expanded withholding tax: RR 11-2018 — government offices withhold 1% on goods and
 *    2% on services (ATC WI158/WC158 goods, WI160/WC160 services; WI = individual payee,
 *    WC = corporate payee).
 *  - Percentage tax: NIRC Sec. 116 — 3% of gross receipts of non-VAT suppliers (the 1%
 *    rate under CREATE applied only until June 30, 2023).
 *
 * Amounts are computed here, on the server, and stored per DV; the client only previews.
 */

export type TaxTreatment = 'none' | 'vat_goods' | 'vat_services' | 'nonvat_goods' | 'nonvat_services';
export type PayeeType = 'individual' | 'corporate';

export interface WithholdingLine {
  taxType: 'ewt' | 'final_vat' | 'percentage_tax';
  atc: string | null;
  description: string;
  taxBase: number;
  rate: number;
  amount: number;
}

export interface WithholdingResult {
  lines: WithholdingLine[];
  totalTax: number;
  netAmount: number;
}

export const TAX_TREATMENTS: { value: TaxTreatment; label: string; help: string }[] = [
  { value: 'none', label: 'Not subject to withholding', help: 'Payroll, refunds, reimbursements, payments to government entities' },
  { value: 'vat_goods', label: 'VAT-registered supplier — goods', help: '5% final VAT and 1% EWT on the VAT-exclusive amount' },
  { value: 'vat_services', label: 'VAT-registered supplier — services', help: '5% final VAT and 2% EWT on the VAT-exclusive amount' },
  { value: 'nonvat_goods', label: 'Non-VAT supplier — goods', help: '3% percentage tax and 1% EWT on the gross amount' },
  { value: 'nonvat_services', label: 'Non-VAT supplier — services', help: '3% percentage tax and 2% EWT on the gross amount' },
];

const VAT_RATE = 0.12;
const FINAL_VAT_RATE = 0.05;
const PERCENTAGE_TAX_RATE = 0.03;
const EWT_GOODS = 0.01;
const EWT_SERVICES = 0.02;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function isTaxTreatment(value: unknown): value is TaxTreatment {
  return TAX_TREATMENTS.some(t => t.value === value);
}

export function computeWithholding(
  grossAmount: number,
  treatment: TaxTreatment,
  payeeType: PayeeType = 'corporate'
): WithholdingResult {
  const gross = round2(grossAmount);
  if (!(gross > 0) || treatment === 'none') {
    return { lines: [], totalTax: 0, netAmount: gross > 0 ? gross : 0 };
  }

  const services = treatment === 'vat_services' || treatment === 'nonvat_services';
  const ewtRate = services ? EWT_SERVICES : EWT_GOODS;
  const ewtAtc = `${payeeType === 'individual' ? 'WI' : 'WC'}${services ? '160' : '158'}`;
  const kind = services ? 'services' : 'goods';
  const lines: WithholdingLine[] = [];

  if (treatment === 'vat_goods' || treatment === 'vat_services') {
    // Tax bases are the VAT-exclusive amount
    const base = round2(gross / (1 + VAT_RATE));
    lines.push({
      taxType: 'final_vat',
      atc: services ? 'WV020' : 'WV010',
      description: `Final VAT on ${kind} (5%)`,
      taxBase: base,
      rate: FINAL_VAT_RATE,
      amount: round2(base * FINAL_VAT_RATE),
    });
    lines.push({
      taxType: 'ewt',
      atc: ewtAtc,
      description: `Expanded withholding tax on ${kind} (${ewtRate * 100}%)`,
      taxBase: base,
      rate: ewtRate,
      amount: round2(base * ewtRate),
    });
  } else {
    lines.push({
      taxType: 'percentage_tax',
      atc: null,
      description: 'Percentage tax (3%)',
      taxBase: gross,
      rate: PERCENTAGE_TAX_RATE,
      amount: round2(gross * PERCENTAGE_TAX_RATE),
    });
    lines.push({
      taxType: 'ewt',
      atc: ewtAtc,
      description: `Expanded withholding tax on ${kind} (${ewtRate * 100}%)`,
      taxBase: gross,
      rate: ewtRate,
      amount: round2(gross * ewtRate),
    });
  }

  const totalTax = round2(lines.reduce((sum, line) => sum + line.amount, 0));
  return { lines, totalTax, netAmount: round2(gross - totalTax) };
}
