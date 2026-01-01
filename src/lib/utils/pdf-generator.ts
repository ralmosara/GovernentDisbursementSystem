import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
 * Format date to format: December 31, 2025
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
 * Convert number to words (Philippine Peso)
 */
function numberToWords(num: number): string {
  if (num === 0) return 'Zero Pesos';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  }

  let pesos = Math.floor(num);
  const centavos = Math.round((num - pesos) * 100);
  let result = '';

  if (pesos >= 1000000000) {
    result += convertLessThanThousand(Math.floor(pesos / 1000000000)) + ' Billion ';
    pesos %= 1000000000;
  }
  if (pesos >= 1000000) {
    result += convertLessThanThousand(Math.floor(pesos / 1000000)) + ' Million ';
    pesos %= 1000000;
  }
  if (pesos >= 1000) {
    result += convertLessThanThousand(Math.floor(pesos / 1000)) + ' Thousand ';
    pesos %= 1000;
  }
  if (pesos > 0) {
    result += convertLessThanThousand(pesos);
  }

  result += ' Pesos';
  if (centavos > 0) {
    result += ' and ' + centavos.toString().padStart(2, '0') + '/100';
  }

  return result.trim();
}

/**
 * Helper to draw a rectangle cell with text
 */
function drawCell(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  options: {
    align?: 'left' | 'center' | 'right';
    fontSize?: number;
    bold?: boolean;
    padding?: number;
    lineWidth?: number;
  } = {}
) {
  const {
    align = 'left',
    fontSize = 9,
    bold = false,
    padding = 1,
    lineWidth = 0.3
  } = options;

  // Draw border
  doc.setLineWidth(lineWidth);
  doc.rect(x, y, width, height);

  // Draw text
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(fontSize);

  const textY = y + height / 2 + fontSize / 3;

  if (align === 'center') {
    doc.text(text, x + width / 2, textY, { align: 'center' });
  } else if (align === 'right') {
    doc.text(text, x + width - padding, textY, { align: 'right' });
  } else {
    doc.text(text, x + padding, textY);
  }
}

/**
 * Generate DV PDF - Exact match to reference
 */
export function generateDVPDF(dvData: DVData, agencyName: string = 'BUREAU OF LOCAL GOVERNMENT FINANCE'): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Exact margins from reference
  const margin = 13;
  const contentWidth = pageWidth - (2 * margin);
  let y = margin;

  // Column widths from reference
  const col1 = 95;  // Particulars
  const col2 = 30;  // Responsibility Center
  const col3 = 30;  // MFO/PAP
  const col4 = 33;  // Amount

  // ===== OUTER BORDER =====
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, contentWidth, pageHeight - (2 * margin));

  // ===== HEADER SECTION (35mm height) =====
  const headerHeight = 35;
  const logoSize = 24;
  const logoX = margin + 5;
  const logoY = y + 5;

  // Draw BLGF logo circle placeholder
  doc.setLineWidth(0.3);
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('BLGF', logoX + logoSize / 2, logoY + logoSize / 2, { align: 'center' });
  doc.text('LOGO', logoX + logoSize / 2, logoY + logoSize / 2 + 3, { align: 'center' });

  // Center section: Agency name
  const centerX = margin + logoSize + 15;
  const centerWidth = contentWidth - logoSize - 20 - 55;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(agencyName.toUpperCase(), centerX + centerWidth / 2, y + 10, { align: 'center' });

  doc.setFontSize(9);
  doc.text('Entity Name', centerX + centerWidth / 2, y + 16, { align: 'center' });

  doc.setFontSize(12);
  doc.text('DISBURSEMENT VOUCHER', centerX + centerWidth / 2, y + 24, { align: 'center' });

  // Right section: Fund Cluster, Date, DV No boxes
  const rightBoxX = pageWidth - margin - 55;
  const rightBoxWidth = 55;
  let rightY = y + 3;

  doc.setLineWidth(0.3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  // Fund Cluster
  doc.rect(rightBoxX, rightY, rightBoxWidth, 7);
  doc.text('Fund Cluster:', rightBoxX + 1, rightY + 4.5);
  doc.text(dvData.fundCluster.code, rightBoxX + rightBoxWidth - 1, rightY + 4.5, { align: 'right' });
  rightY += 7;

  // Date
  doc.rect(rightBoxX, rightY, rightBoxWidth, 7);
  doc.text('Date:', rightBoxX + 1, rightY + 4.5);
  doc.text(formatDate(dvData.dvDate), rightBoxX + rightBoxWidth - 1, rightY + 4.5, { align: 'right' });
  rightY += 7;

  // DV No
  doc.rect(rightBoxX, rightY, rightBoxWidth, 7);
  doc.text('DV No.:', rightBoxX + 1, rightY + 4.5);
  doc.text(dvData.dvNo, rightBoxX + rightBoxWidth - 1, rightY + 4.5, { align: 'right' });
  rightY += 7;

  // Serial number boxes (year-month-serial)
  const serialBoxWidth = rightBoxWidth / 3;
  doc.rect(rightBoxX, rightY, serialBoxWidth, 7);
  doc.rect(rightBoxX + serialBoxWidth, rightY, serialBoxWidth, 7);
  doc.rect(rightBoxX + (2 * serialBoxWidth), rightY, serialBoxWidth, 7);

  const dvParts = dvData.dvNo.split('-');
  if (dvParts.length >= 3) {
    doc.text(dvParts[0], rightBoxX + serialBoxWidth / 2, rightY + 4.5, { align: 'center' });
    doc.text(dvParts[1], rightBoxX + serialBoxWidth + serialBoxWidth / 2, rightY + 4.5, { align: 'center' });
    doc.text(dvParts[2], rightBoxX + 2 * serialBoxWidth + serialBoxWidth / 2, rightY + 4.5, { align: 'center' });
  }

  y += headerHeight;

  // Horizontal line after header
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  // ===== MODE OF PAYMENT ROW (12mm) =====
  const modeRowHeight = 12;
  const modeY = y;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Mode of Payment:', margin + 2, modeY + 7);

  // Checkboxes
  const checkboxSize = 3;
  const checkboxY = modeY + 5;
  let checkboxX = margin + 40;

  const modes = [
    { label: 'MDS Check', value: 'check_mds' },
    { label: 'Commercial Check', value: 'check_commercial' },
    { label: 'LDDAP-ADA', value: 'ada' },
    { label: 'Others (Cash)', value: 'cash' }
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  modes.forEach(mode => {
    doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
    if (dvData.paymentMode === mode.value) {
      doc.text('X', checkboxX + 1.5, checkboxY + 2.5, { align: 'center' });
    }
    doc.text(mode.label, checkboxX + checkboxSize + 1, checkboxY + 2.5);
    checkboxX += 35;
  });

  y += modeRowHeight;
  doc.line(margin, y, pageWidth - margin, y);

  // ===== PAYEE ROW (12mm) - 3 columns =====
  const payeeRowHeight = 12;
  const payeeCol1 = contentWidth * 0.45;
  const payeeCol2 = contentWidth * 0.27;
  const payeeCol3 = contentWidth * 0.28;

  doc.setLineWidth(0.3);

  // Payee name cell
  doc.rect(margin, y, payeeCol1, payeeRowHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Payee:', margin + 1, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(dvData.payeeName, margin + 1, y + 9);

  // TIN/Employee No cell
  doc.rect(margin + payeeCol1, y, payeeCol2, payeeRowHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('TIN/Employee No.:', margin + payeeCol1 + 1, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(dvData.payeeTin || '', margin + payeeCol1 + 1, y + 9);

  // ORS/BURS No cell
  doc.rect(margin + payeeCol1 + payeeCol2, y, payeeCol3, payeeRowHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('ORS/BURS No.:', margin + payeeCol1 + payeeCol2 + 1, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(dvData.orsBursNo, margin + payeeCol1 + payeeCol2 + 1, y + 9);

  y += payeeRowHeight;

  // ===== ADDRESS ROW (12mm) =====
  const addressRowHeight = 12;
  doc.rect(margin, y, contentWidth, addressRowHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Address:', margin + 1, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const addressLines = doc.splitTextToSize(dvData.payeeAddress || '', contentWidth - 20);
  doc.text(addressLines, margin + 1, y + 9);

  y += addressRowHeight;

  // ===== COLUMN HEADERS ROW (12mm) =====
  const headerRowHeight = 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  drawCell(doc, margin, y, col1, headerRowHeight, 'Particulars', { bold: true, fontSize: 8, align: 'center' });
  drawCell(doc, margin + col1, y, col2, headerRowHeight, 'Responsibility Center', { bold: true, fontSize: 7, align: 'center' });
  drawCell(doc, margin + col1 + col2, y, col3, headerRowHeight, 'MFO/PAP', { bold: true, fontSize: 8, align: 'center' });
  drawCell(doc, margin + col1 + col2 + col3, y, col4, headerRowHeight, 'Amount', { bold: true, fontSize: 8, align: 'center' });

  y += headerRowHeight;

  // ===== CONTENT AREA (70mm) =====
  const contentAreaHeight = 70;

  // Draw the 4-column grid
  doc.setLineWidth(0.3);
  doc.rect(margin, y, col1, contentAreaHeight);
  doc.rect(margin + col1, y, col2, contentAreaHeight);
  doc.rect(margin + col1 + col2, y, col3, contentAreaHeight);
  doc.rect(margin + col1 + col2 + col3, y, col4, contentAreaHeight);

  // Fill in content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const particularLines = doc.splitTextToSize(dvData.particulars, col1 - 4);
  doc.text(particularLines, margin + 2, y + 5);

  doc.text(dvData.responsibilityCenter || '', margin + col1 + 2, y + 5);

  if (dvData.mfoPap) {
    doc.text(dvData.mfoPap.code, margin + col1 + col2 + 2, y + 5);
    const mfoLines = doc.splitTextToSize(dvData.mfoPap.description, col3 - 4);
    doc.text(mfoLines, margin + col1 + col2 + 2, y + 10);
  }

  const amountStr = dvData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`₱ ${amountStr}`, margin + col1 + col2 + col3 + col4 - 2, y + 8, { align: 'right' });

  y += contentAreaHeight;

  // ===== AMOUNT DUE ROW (8mm) =====
  const amountDueHeight = 8;
  doc.rect(margin, y, contentWidth, amountDueHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('AMOUNT DUE', margin + 2, y + 5.5);
  doc.setFontSize(11);
  doc.text(`₱ ${amountStr}`, pageWidth - margin - 2, y + 5.5, { align: 'right' });

  y += amountDueHeight;
  doc.line(margin, y, pageWidth - margin, y);

  // ===== BOX A: CERTIFIED (18mm) =====
  const boxAHeight = 18;
  doc.rect(margin, y, contentWidth, boxAHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('A. CERTIFIED:', margin + 2, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Expenses/Cash Advance necessary, lawful and incurred under my direct supervision.', margin + 3, y + 8);

  doc.setLineWidth(0.2);
  doc.line(margin + 50, y + 13, pageWidth - margin - 50, y + 13);
  doc.setFontSize(6);
  doc.text('Signature Over Printed Name/Position', pageWidth / 2, y + 15.5, { align: 'center' });

  y += boxAHeight;
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  // ===== BOX B: ACCOUNTING ENTRY (6mm header + 24mm table) =====
  const boxBHeaderHeight = 6;
  doc.rect(margin, y, contentWidth, boxBHeaderHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('B. ACCOUNTING ENTRY', margin + 2, y + 4.5);

  y += boxBHeaderHeight;

  // Accounting table (4 columns × 3 rows of 8mm each)
  const accColWidths = [80, 40, 34, 34];
  const accRowHeight = 8;

  // Header row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  drawCell(doc, margin, y, accColWidths[0], accRowHeight, 'Account Title', { bold: true, fontSize: 7, align: 'center' });
  drawCell(doc, margin + accColWidths[0], y, accColWidths[1], accRowHeight, 'UACS Code', { bold: true, fontSize: 7, align: 'center' });
  drawCell(doc, margin + accColWidths[0] + accColWidths[1], y, accColWidths[2], accRowHeight, 'Debit', { bold: true, fontSize: 7, align: 'center' });
  drawCell(doc, margin + accColWidths[0] + accColWidths[1] + accColWidths[2], y, accColWidths[3], accRowHeight, 'Credit', { bold: true, fontSize: 7, align: 'center' });

  y += accRowHeight;

  // Data row 1 (Debit)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  drawCell(doc, margin, y, accColWidths[0], accRowHeight, dvData.objectOfExpenditure.name, { fontSize: 8 });
  drawCell(doc, margin + accColWidths[0], y, accColWidths[1], accRowHeight, dvData.objectOfExpenditure.code, { fontSize: 8, align: 'center' });
  drawCell(doc, margin + accColWidths[0] + accColWidths[1], y, accColWidths[2], accRowHeight, `₱ ${amountStr}`, { fontSize: 8, align: 'right' });
  drawCell(doc, margin + accColWidths[0] + accColWidths[1] + accColWidths[2], y, accColWidths[3], accRowHeight, '', { fontSize: 8 });

  y += accRowHeight;

  // Data row 2 (Credit)
  drawCell(doc, margin, y, accColWidths[0], accRowHeight, '', { fontSize: 8 });
  drawCell(doc, margin + accColWidths[0], y, accColWidths[1], accRowHeight, '', { fontSize: 8 });
  drawCell(doc, margin + accColWidths[0] + accColWidths[1], y, accColWidths[2], accRowHeight, '', { fontSize: 8 });
  drawCell(doc, margin + accColWidths[0] + accColWidths[1] + accColWidths[2], y, accColWidths[3], accRowHeight, `₱ ${amountStr}`, { fontSize: 8, align: 'right' });

  y += accRowHeight;
  doc.line(margin, y, pageWidth - margin, y);

  // ===== BOXES C AND D SIDE BY SIDE (35mm height) =====
  const boxCDHeight = 35;
  const boxCWidth = contentWidth / 2;
  const boxDWidth = contentWidth / 2;

  // Box C (left)
  doc.rect(margin, y, boxCWidth, boxCDHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('C. CERTIFIED:', margin + 2, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let cY = y + 8;

  // Checkboxes
  const cCheckboxX = margin + 3;
  doc.rect(cCheckboxX, cY - 2, checkboxSize, checkboxSize);
  doc.text('Cash available', cCheckboxX + 5, cY);
  cY += 4;

  doc.rect(cCheckboxX, cY - 2, checkboxSize, checkboxSize);
  doc.text('Subject to Authority to Debit Account (ADA)', cCheckboxX + 5, cY);
  cY += 4;

  doc.rect(cCheckboxX, cY - 2, checkboxSize, checkboxSize);
  doc.text('Supporting documents complete and amount claimed proper', cCheckboxX + 5, cY);

  // Signature line for Box C
  cY = y + 24;
  doc.setLineWidth(0.2);
  doc.line(margin + 10, cY, margin + boxCWidth - 10, cY);
  doc.setFontSize(6);
  doc.text('Signature Over Printed Name', margin + boxCWidth / 2, cY + 2.5, { align: 'center' });
  doc.text('Head, Accounting Division/Unit', margin + boxCWidth / 2, cY + 5, { align: 'center' });
  doc.text('Date', margin + boxCWidth / 2, cY + 7.5, { align: 'center' });

  // Box D (right)
  const boxDX = margin + boxCWidth;
  doc.rect(boxDX, y, boxDWidth, boxCDHeight);

  // Vertical divider between C and D
  doc.setLineWidth(0.3);
  doc.line(boxDX, y, boxDX, y + boxCDHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('D. APPROVED FOR PAYMENT:', boxDX + 2, y + 4);

  // Signature line for Box D
  let dY = y + 20;
  doc.setLineWidth(0.2);
  doc.line(boxDX + 10, dY, pageWidth - margin - 10, dY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Signature Over Printed Name', boxDX + boxDWidth / 2, dY + 2.5, { align: 'center' });
  doc.text('Agency Head/Authorized Representative', boxDX + boxDWidth / 2, dY + 5, { align: 'center' });
  doc.text('Date', boxDX + boxDWidth / 2, dY + 7.5, { align: 'center' });

  y += boxCDHeight;
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  // ===== BOX E: RECEIPT OF PAYMENT (25mm) =====
  const boxEHeight = 25;
  doc.rect(margin, y, contentWidth, boxEHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('E. RECEIPT OF PAYMENT', margin + 2, y + 4);

  // JEV No. in top right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('JEV No.', pageWidth - margin - 25, y + 3);
  doc.setLineWidth(0.2);
  doc.line(pageWidth - margin - 25, y + 4, pageWidth - margin - 2, y + 4);

  // Internal cell structure
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let eY = y + 8;

  // Row 1: Check/ADA No, Date, Bank Name/Agency
  doc.text('Check/ADA No.:', margin + 2, eY);
  doc.line(margin + 25, eY + 0.5, margin + 65, eY + 0.5);

  doc.text('Date:', margin + 70, eY);
  doc.line(margin + 80, eY + 0.5, margin + 110, eY + 0.5);

  doc.text('Bank Name/Agency:', margin + 115, eY);
  doc.line(margin + 145, eY + 0.5, pageWidth - margin - 2, eY + 0.5);

  eY += 6;

  // Row 2: Signature
  doc.text('Signature:', margin + 2, eY);
  doc.line(margin + 18, eY + 0.5, margin + 80, eY + 0.5);

  doc.text('Official Receipt No.:', margin + 85, eY);
  doc.line(margin + 115, eY + 0.5, pageWidth - margin - 2, eY + 0.5);

  eY += 6;

  // Row 3: Printed Name
  doc.text('Printed Name:', margin + 2, eY);
  doc.line(margin + 22, eY + 0.5, margin + 80, eY + 0.5);

  doc.text('Date:', margin + 85, eY);
  doc.line(margin + 97, eY + 0.5, pageWidth - margin - 2, eY + 0.5);

  return doc;
}

/**
 * Download DV as PDF
 */
export function downloadDVPDF(dvData: DVData, agencyName?: string): void {
  const doc = generateDVPDF(dvData, agencyName);
  doc.save(`DV-${dvData.dvNo}.pdf`);
}

/**
 * Open DV PDF in new window
 */
export function printDVPDF(dvData: DVData, agencyName?: string): void {
  const doc = generateDVPDF(dvData, agencyName);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}
