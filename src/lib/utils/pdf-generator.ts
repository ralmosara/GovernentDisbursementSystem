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
  } else {
    result += ' Only';
  }

  return result.trim();
}

/**
 * Format date to Philippine format
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Generate DV PDF
 */
export function generateDVPDF(dvData: DVData, agencyName: string = 'Philippine Government Agency'): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(agencyName.toUpperCase(), pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(14);
  doc.text('DISBURSEMENT VOUCHER', pageWidth / 2, 22, { align: 'center' });

  // DV Number and Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fund Cluster: ${dvData.fundCluster.code}`, margin, 30);
  doc.text(`Date: ${formatDate(dvData.dvDate)}`, pageWidth - margin - 50, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`DV No.: ${dvData.dvNo}`, margin, 36);

  // Payee Information Box
  let yPos = 42;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Payee:', margin, yPos);

  doc.setFont('helvetica', 'normal');
  doc.text(dvData.payeeName, margin + 15, yPos);

  if (dvData.payeeTin) {
    yPos += 5;
    doc.text(`TIN: ${dvData.payeeTin}`, margin + 15, yPos);
  }

  if (dvData.payeeAddress) {
    yPos += 5;
    doc.text(`Address: ${dvData.payeeAddress}`, margin + 15, yPos);
  }

  // ORS/BURS Number
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('ORS/BURS No.:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(dvData.orsBursNo, margin + 30, yPos);

  // Responsibility Center
  if (dvData.responsibilityCenter) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Responsibility Center:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(dvData.responsibilityCenter, margin + 45, yPos);
  }

  // Particulars Box
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('PARTICULARS', margin, yPos);
  yPos += 2;
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Split particulars into lines
  const particularLines = doc.splitTextToSize(dvData.particulars, pageWidth - (margin * 2));
  particularLines.forEach((line: string) => {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  // Amount Box
  yPos += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  const amountStr = `₱${dvData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  doc.text('Amount:', margin, yPos);
  doc.text(amountStr, pageWidth - margin - 40, yPos);

  yPos += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const amountWords = numberToWords(dvData.amount);
  const wordLines = doc.splitTextToSize(`(${amountWords})`, pageWidth - (margin * 2));
  wordLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 4;
  });

  // Accounting Entry Table
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ACCOUNTING ENTRY', margin, yPos);

  yPos += 2;
  (doc as any).autoTable({
    startY: yPos,
    head: [['Account Code', 'Account Title', 'Debit', 'Credit']],
    body: [
      [dvData.objectOfExpenditure.code, dvData.objectOfExpenditure.name, amountStr, ''],
      ['', '', '', amountStr],
    ],
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 80 },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Certification Boxes (Simplified)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  // Box A - Certified
  doc.rect(margin, yPos, (pageWidth - margin * 2) / 2 - 2, 25);
  doc.setFont('helvetica', 'bold');
  doc.text('A. CERTIFIED:', margin + 2, yPos + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('Expenses/Cash Advance necessary, lawful', margin + 2, yPos + 8);
  doc.text('and incurred under my direct supervision.', margin + 2, yPos + 11);

  doc.text('_______________________________', margin + 2, yPos + 18);
  doc.text('Signature over Printed Name', margin + 2, yPos + 21);
  doc.text('Position: _______________', margin + 2, yPos + 24);

  // Box B - Accounting Entry
  doc.rect(pageWidth / 2 + 1, yPos, (pageWidth - margin * 2) / 2 - 2, 25);
  doc.setFont('helvetica', 'bold');
  doc.text('B. ACCOUNTING ENTRY:', pageWidth / 2 + 3, yPos + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('Approved for payment.', pageWidth / 2 + 3, yPos + 8);

  doc.text('_______________________________', pageWidth / 2 + 3, yPos + 18);
  doc.text('Accountant', pageWidth / 2 + 3, yPos + 21);

  yPos += 27;

  // Box C - Certified Funds Available
  doc.rect(margin, yPos, (pageWidth - margin * 2) / 2 - 2, 25);
  doc.setFont('helvetica', 'bold');
  doc.text('C. CERTIFIED:', margin + 2, yPos + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('Funds Available', margin + 2, yPos + 8);

  doc.text('_______________________________', margin + 2, yPos + 18);
  doc.text('Chief Accountant/Budget Officer', margin + 2, yPos + 21);

  // Box D - Approved for Payment
  doc.rect(pageWidth / 2 + 1, yPos, (pageWidth - margin * 2) / 2 - 2, 25);
  doc.setFont('helvetica', 'bold');
  doc.text('D. APPROVED FOR PAYMENT:', pageWidth / 2 + 3, yPos + 4);

  doc.setFont('helvetica', 'normal');
  doc.text('_______________________________', pageWidth / 2 + 3, yPos + 12);
  doc.text('Agency Head/Authorized Representative', pageWidth / 2 + 3, yPos + 15);
  doc.text('Date: _______________', pageWidth / 2 + 3, yPos + 21);

  yPos += 27;

  // Box E - Receipt
  doc.rect(margin, yPos, pageWidth - margin * 2, 25);
  doc.setFont('helvetica', 'bold');
  doc.text('E. RECEIPT OF PAYMENT:', margin + 2, yPos + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('Check/ADA No.: ______________   Date: ______________   Amount: ______________', margin + 2, yPos + 8);

  doc.text('Signature: _______________________________   Date Received: ______________', margin + 2, yPos + 16);
  doc.text('Printed Name: ___________________________   Official Receipt No.: ______________', margin + 2, yPos + 21);

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on ${new Date().toLocaleString('en-PH')}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  doc.text(`Payment Mode: ${dvData.paymentMode.toUpperCase().replace('_', ' ')}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

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
