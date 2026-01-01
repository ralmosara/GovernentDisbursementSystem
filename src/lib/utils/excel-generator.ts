import ExcelJS from 'exceljs';

interface DVData {
  dvNo: string;
  dvDate: Date | string;
  fiscalYear: number;
  payeeName: string;
  payeeTin?: string;
  payeeAddress?: string;
  particulars: string;
  amount: number;
  orsBursNo: string;
  fundCluster: {
    code: string;
    name: string;
  };
  objectOfExpenditure: {
    code: string;
    name: string;
  };
  responsibilityCenter?: string;
  mfoPap?: {
    code: string;
    description: string;
  };
  paymentMode: string;
}

/**
 * Format date to Excel format
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Apply border to a cell
 */
function applyBorder(cell: ExcelJS.Cell) {
  const borderStyle: Partial<ExcelJS.Border> = {
    style: 'thin',
    color: { argb: '00000000' }
  };

  cell.border = {
    top: borderStyle,
    left: borderStyle,
    bottom: borderStyle,
    right: borderStyle
  };
}

/**
 * Generate DV Excel - Simplified to avoid merge conflicts
 */
export async function generateDVExcel(dvData: DVData, agencyName: string = 'BUREAU OF LOCAL GOVERNMENT FINANCE'): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('DV');

  // Set column widths
  for (let i = 1; i <= 32; i++) {
    worksheet.getColumn(i).width = 2.5;
  }

  const formattedAmount = dvData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dvParts = dvData.dvNo.split('-');

  // ===== HEADER SECTION =====

  // Row 1: Appendix 32
  worksheet.mergeCells('AA1:AF1');
  const cell1 = worksheet.getCell('AA1');
  cell1.value = 'Appendix 32';
  cell1.font = { size: 14 };
  cell1.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell1);

  // Row 3: Agency Name + Fund Cluster
  worksheet.mergeCells('A3:Z3');
  const cell3 = worksheet.getCell('A3');
  cell3.value = agencyName.toUpperCase();
  cell3.font = { bold: true, size: 12 };
  cell3.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell3);

  worksheet.mergeCells('AA3:AF3');
  const cell3fc = worksheet.getCell('AA3');
  cell3fc.value = `Fund Cluster: ${dvData.fundCluster.code}`;
  cell3fc.font = { bold: true, size: 10 };
  cell3fc.alignment = { horizontal: 'left', vertical: 'middle' };
  applyBorder(cell3fc);

  // Row 4: Entity Name
  worksheet.mergeCells('A4:Z4');
  const cell4 = worksheet.getCell('A4');
  cell4.value = 'Entity Name';
  cell4.font = { bold: true, size: 11 };
  cell4.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell4);

  worksheet.mergeCells('AA4:AF4');
  const cell4fc = worksheet.getCell('AA4');
  cell4fc.value = dvData.fundCluster.name;
  cell4fc.font = { size: 10 };
  cell4fc.alignment = { horizontal: 'left', vertical: 'middle' };
  applyBorder(cell4fc);

  // Rows 5-7: DISBURSEMENT VOUCHER
  worksheet.mergeCells('A5:Z7');
  const cell5 = worksheet.getCell('A5');
  cell5.value = 'DISBURSEMENT  VOUCHER';
  cell5.font = { bold: true, size: 14 };
  cell5.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell5);

  // Date, DV No in right section
  worksheet.mergeCells('AA5:AF5');
  const cell5d = worksheet.getCell('AA5');
  cell5d.value = `Date: ${formatDate(dvData.dvDate)}`;
  cell5d.font = { bold: true, size: 10 };
  cell5d.alignment = { horizontal: 'left', vertical: 'middle' };
  applyBorder(cell5d);

  worksheet.mergeCells('AA6:AF6');
  const cell6dv = worksheet.getCell('AA6');
  cell6dv.value = `DV No.: ${dvData.dvNo}`;
  cell6dv.font = { bold: true, size: 10 };
  cell6dv.alignment = { horizontal: 'left', vertical: 'middle' };
  applyBorder(cell6dv);

  worksheet.mergeCells('AA7:AF7');
  const cell7dv = worksheet.getCell('AA7');
  cell7dv.value = dvParts.join(' - ');
  cell7dv.font = { bold: true, size: 10 };
  cell7dv.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell7dv);

  // ===== MODE OF PAYMENT =====
  worksheet.mergeCells('A8:C10');
  const cell8 = worksheet.getCell('A8');
  cell8.value = 'Mode of Payment';
  cell8.font = { bold: true, size: 10 };
  cell8.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  applyBorder(cell8);

  worksheet.mergeCells('D8:AF10');
  const cell8mode = worksheet.getCell('D8');
  const modeText = [
    dvData.paymentMode === 'check_mds' ? '☑ MDS Check' : '☐ MDS Check',
    dvData.paymentMode === 'check_commercial' ? '☑ Commercial Check' : '☐ Commercial Check',
    dvData.paymentMode === 'ada' ? '☑ LDDAP-ADA' : '☐ LDDAP-ADA',
    dvData.paymentMode === 'cash' ? '☑ Others (Cash)' : '☐ Others'
  ].join('    ');
  cell8mode.value = modeText;
  cell8mode.font = { size: 10 };
  cell8mode.alignment = { horizontal: 'left', vertical: 'middle' };
  applyBorder(cell8mode);

  // ===== PAYEE INFORMATION =====
  worksheet.mergeCells('A11:C12');
  const cell11 = worksheet.getCell('A11');
  cell11.value = 'Payee';
  cell11.font = { bold: true, size: 10 };
  cell11.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell11);

  worksheet.mergeCells('D11:Q12');
  const cell11payee = worksheet.getCell('D11');
  cell11payee.value = dvData.payeeName;
  cell11payee.font = { size: 10 };
  cell11payee.alignment = { horizontal: 'left', vertical: 'middle' };
  applyBorder(cell11payee);

  worksheet.mergeCells('R11:Z12');
  const cell11tin = worksheet.getCell('R11');
  cell11tin.value = `TIN: ${dvData.payeeTin || ''}`;
  cell11tin.font = { size: 10 };
  cell11tin.alignment = { horizontal: 'left', vertical: 'middle' };
  applyBorder(cell11tin);

  worksheet.mergeCells('AA11:AF12');
  const cell11ors = worksheet.getCell('AA11');
  cell11ors.value = `ORS/BURS No.: ${dvData.orsBursNo}`;
  cell11ors.font = { size: 10 };
  cell11ors.alignment = { horizontal: 'left', vertical: 'middle' };
  applyBorder(cell11ors);

  // Address
  worksheet.mergeCells('A13:C14');
  const cell13 = worksheet.getCell('A13');
  cell13.value = 'Address';
  cell13.font = { bold: true, size: 10 };
  cell13.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell13);

  worksheet.mergeCells('D13:AF14');
  const cell13addr = worksheet.getCell('D13');
  cell13addr.value = dvData.payeeAddress || '';
  cell13addr.font = { size: 10 };
  cell13addr.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  applyBorder(cell13addr);

  // ===== COLUMN HEADERS =====
  worksheet.mergeCells('A15:P15');
  const cell15a = worksheet.getCell('A15');
  cell15a.value = 'Particulars';
  cell15a.font = { bold: true, size: 10 };
  cell15a.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell15a);

  worksheet.mergeCells('Q15:U15');
  const cell15b = worksheet.getCell('Q15');
  cell15b.value = 'Responsibility Center';
  cell15b.font = { bold: true, size: 10 };
  cell15b.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell15b);

  worksheet.mergeCells('V15:Z15');
  const cell15c = worksheet.getCell('V15');
  cell15c.value = 'MFO/PAP';
  cell15c.font = { bold: true, size: 10 };
  cell15c.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell15c);

  worksheet.mergeCells('AA15:AF15');
  const cell15d = worksheet.getCell('AA15');
  cell15d.value = 'Amount';
  cell15d.font = { bold: true, size: 10 };
  cell15d.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell15d);

  // ===== CONTENT AREA =====
  worksheet.mergeCells('A16:P24');
  const cell16a = worksheet.getCell('A16');
  cell16a.value = dvData.particulars;
  cell16a.font = { size: 10 };
  cell16a.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  applyBorder(cell16a);

  worksheet.mergeCells('Q16:U24');
  const cell16b = worksheet.getCell('Q16');
  cell16b.value = dvData.responsibilityCenter || '';
  cell16b.font = { size: 10 };
  cell16b.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  applyBorder(cell16b);

  worksheet.mergeCells('V16:Z24');
  const cell16c = worksheet.getCell('V16');
  if (dvData.mfoPap) {
    cell16c.value = `${dvData.mfoPap.code}\n${dvData.mfoPap.description}`;
  }
  cell16c.font = { size: 10 };
  cell16c.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  applyBorder(cell16c);

  worksheet.mergeCells('AA16:AF24');
  const cell16d = worksheet.getCell('AA16');
  cell16d.value = `₱ ${formattedAmount}`;
  cell16d.font = { bold: true, size: 11 };
  cell16d.alignment = { horizontal: 'right', vertical: 'top' };
  applyBorder(cell16d);

  // ===== BOX A: CERTIFIED =====
  worksheet.mergeCells('A25:AF25');
  const cell25 = worksheet.getCell('A25');
  cell25.value = 'A. Certified: Expenses/Cash Advance necessary, lawful and incurred under my direct supervision.';
  cell25.font = { size: 10 };
  cell25.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  applyBorder(cell25);

  worksheet.mergeCells('A26:AF27');
  const cell26 = worksheet.getCell('A26');
  cell26.value = '\n\n___________________________________________\nSignature Over Printed Name / Position / Date';
  cell26.font = { size: 9 };
  cell26.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  applyBorder(cell26);

  // ===== BOX B: ACCOUNTING ENTRY =====
  worksheet.mergeCells('A29:AF29');
  const cell29 = worksheet.getCell('A29');
  cell29.value = 'B. Accounting Entry';
  cell29.font = { bold: true, size: 10 };
  cell29.alignment = { horizontal: 'left', vertical: 'middle' };
  applyBorder(cell29);

  // Table headers
  worksheet.mergeCells('A30:Q30');
  const cell30a = worksheet.getCell('A30');
  cell30a.value = 'Account Title';
  cell30a.font = { bold: true, size: 10 };
  cell30a.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell30a);

  worksheet.mergeCells('R30:V30');
  const cell30b = worksheet.getCell('R30');
  cell30b.value = 'UACS Code';
  cell30b.font = { bold: true, size: 10 };
  cell30b.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell30b);

  worksheet.mergeCells('W30:AA30');
  const cell30c = worksheet.getCell('W30');
  cell30c.value = 'Debit';
  cell30c.font = { bold: true, size: 10 };
  cell30c.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell30c);

  worksheet.mergeCells('AB30:AF30');
  const cell30d = worksheet.getCell('AB30');
  cell30d.value = 'Credit';
  cell30d.font = { bold: true, size: 10 };
  cell30d.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell30d);

  // Data rows
  worksheet.mergeCells('A31:Q31');
  const cell31a = worksheet.getCell('A31');
  cell31a.value = dvData.objectOfExpenditure.name;
  cell31a.font = { size: 10 };
  cell31a.alignment = { horizontal: 'left', vertical: 'middle' };
  applyBorder(cell31a);

  worksheet.mergeCells('R31:V31');
  const cell31b = worksheet.getCell('R31');
  cell31b.value = dvData.objectOfExpenditure.code;
  cell31b.font = { size: 10 };
  cell31b.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorder(cell31b);

  worksheet.mergeCells('W31:AA31');
  const cell31c = worksheet.getCell('W31');
  cell31c.value = `₱ ${formattedAmount}`;
  cell31c.font = { size: 10 };
  cell31c.alignment = { horizontal: 'right', vertical: 'middle' };
  applyBorder(cell31c);

  worksheet.mergeCells('AB31:AF31');
  const cell31d = worksheet.getCell('AB31');
  cell31d.value = '';
  applyBorder(cell31d);

  // Credit row
  worksheet.mergeCells('A32:Q32');
  const cell32a = worksheet.getCell('A32');
  cell32a.value = '';
  applyBorder(cell32a);

  worksheet.mergeCells('R32:V32');
  const cell32b = worksheet.getCell('R32');
  cell32b.value = '';
  applyBorder(cell32b);

  worksheet.mergeCells('W32:AA32');
  const cell32c = worksheet.getCell('W32');
  cell32c.value = '';
  applyBorder(cell32c);

  worksheet.mergeCells('AB32:AF32');
  const cell32d = worksheet.getCell('AB32');
  cell32d.value = `₱ ${formattedAmount}`;
  cell32d.font = { size: 10 };
  cell32d.alignment = { horizontal: 'right', vertical: 'middle' };
  applyBorder(cell32d);

  // ===== BOXES C & D =====
  worksheet.mergeCells('A34:Q38');
  const cell34c = worksheet.getCell('A34');
  cell34c.value = 'C. CERTIFIED:\n☐ Cash available\n☐ Subject to ADA\n☐ Supporting docs complete\n\n___________________________\nHead, Accounting Division';
  cell34c.font = { size: 9 };
  cell34c.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  applyBorder(cell34c);

  worksheet.mergeCells('R34:AF38');
  const cell34d = worksheet.getCell('R34');
  cell34d.value = 'D. APPROVED FOR PAYMENT:\n\n\n___________________________\nAgency Head / Authorized Representative\nDate: _______________';
  cell34d.font = { size: 9 };
  cell34d.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  applyBorder(cell34d);

  // ===== BOX E: RECEIPT OF PAYMENT =====
  worksheet.mergeCells('A40:AF40');
  const cell40 = worksheet.getCell('A40');
  cell40.value = 'E. RECEIPT OF PAYMENT                                                                                                 JEV No.: ___________';
  cell40.font = { bold: true, size: 10 };
  cell40.alignment = { horizontal: 'left', vertical: 'middle' };
  applyBorder(cell40);

  worksheet.mergeCells('A41:AF43');
  const cell41 = worksheet.getCell('A41');
  cell41.value = 'Check/ADA No.: ___________     Date: ___________     Bank Name/Agency: ___________________\n\nSignature: _______________________     Printed Name: _______________________     OR No.: ___________';
  cell41.font = { size: 9 };
  cell41.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  applyBorder(cell41);

  return workbook;
}

/**
 * Generate and download DV Excel file
 */
export async function downloadDVExcel(dvData: DVData, agencyName?: string): Promise<void> {
  const workbook = await generateDVExcel(dvData, agencyName);
  const buffer = await workbook.xlsx.writeBuffer();

  // Create blob and download
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `DV-${dvData.dvNo}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}
