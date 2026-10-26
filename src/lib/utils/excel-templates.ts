import ExcelJS from 'exceljs';
import type { BARReportData } from '../services/report.service';

/**
 * Create COA-compliant Excel workbook for BAR No. 1
 * Budget Accountability Report - Budget Utilization Report
 */
export async function createBARWorkbook(data: BARReportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Government Financial Management System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('BAR No. 1', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Set column widths
  sheet.columns = [
    { width: 15 }, // A - Object Code
    { width: 35 }, // B - Object Name
    { width: 20 }, // C - Category
    { width: 18 }, // D - Appropriation
    { width: 18 }, // E - Allotment
    { width: 18 }, // F - Obligations
    { width: 18 }, // G - Disbursements
    { width: 18 }, // H - Unobligated
    { width: 18 }, // I - Available
    { width: 12 }, // J - Utilization %
  ];

  // Header Section
  let currentRow = 1;

  // Title
  const titleCell = sheet.getCell(`A${currentRow}`);
  titleCell.value = 'BAR No. 1 - BUDGET UTILIZATION REPORT';
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells(`A${currentRow}:J${currentRow}`);
  currentRow++;

  // Fiscal Year
  const yearCell = sheet.getCell(`A${currentRow}`);
  yearCell.value = `Fiscal Year: ${data.fiscalYear}`;
  yearCell.font = { bold: true, size: 12 };
  yearCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells(`A${currentRow}:J${currentRow}`);
  currentRow++;

  // Fund Cluster
  if (data.fundCluster) {
    const fcCell = sheet.getCell(`A${currentRow}`);
    fcCell.value = `Fund Cluster: ${data.fundCluster.code} - ${data.fundCluster.name}`;
    fcCell.font = { bold: true, size: 11 };
    fcCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.mergeCells(`A${currentRow}:J${currentRow}`);
    currentRow++;
  }

  // Report Date
  const reportDateCell = sheet.getCell(`A${currentRow}`);
  reportDateCell.value = `Report Generated: ${data.reportDate.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`;
  reportDateCell.font = { size: 10 };
  reportDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells(`A${currentRow}:J${currentRow}`);
  currentRow += 2;

  // Table Headers
  const headerRow = sheet.getRow(currentRow);
  headerRow.values = [
    'Object Code',
    'Object of Expenditure',
    'Category',
    'Appropriation',
    'Allotment',
    'Obligations',
    'Disbursements',
    'Unobligated Balance',
    'Available Balance',
    'Utilization %',
  ];

  // Style header row
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4788' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.height = 30;

  // Apply borders to header
  for (let col = 1; col <= 10; col++) {
    const cell = headerRow.getCell(col);
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  currentRow++;

  // Data Rows
  const dataStartRow = currentRow;
  data.items.forEach((item) => {
    const row = sheet.getRow(currentRow);
    row.values = [
      item.objectCode,
      item.objectName,
      item.category,
      item.appropriation,
      item.allotment,
      item.obligations,
      item.disbursements,
      item.unobligated,
      item.available,
      item.utilizationRate / 100, // Convert to decimal for percentage format
    ];

    // Style data row
    row.alignment = { vertical: 'middle' };

    // Format currency columns (D-I)
    for (let col = 4; col <= 9; col++) {
      const cell = row.getCell(col);
      cell.numFmt = '₱#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }

    // Format percentage column (J)
    const percentCell = row.getCell(10);
    percentCell.numFmt = '0.00%';
    percentCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Apply borders
    for (let col = 1; col <= 10; col++) {
      const cell = row.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    currentRow++;
  });

  // Total Row
  const totalRow = sheet.getRow(currentRow);
  totalRow.values = [
    '',
    'TOTAL',
    '',
    data.totals.appropriation,
    data.totals.allotment,
    data.totals.obligations,
    data.totals.disbursements,
    data.totals.unobligated,
    data.totals.available,
    data.totals.utilizationRate / 100,
  ];

  // Style total row
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE7E6E6' },
  };

  // Format currency columns
  for (let col = 4; col <= 9; col++) {
    const cell = totalRow.getCell(col);
    cell.numFmt = '₱#,##0.00';
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  }

  // Format percentage
  const totalPercentCell = totalRow.getCell(10);
  totalPercentCell.numFmt = '0.00%';
  totalPercentCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Apply borders to total row
  for (let col = 1; col <= 10; col++) {
    const cell = totalRow.getCell(col);
    cell.border = {
      top: { style: 'double' },
      left: { style: 'thin' },
      bottom: { style: 'double' },
      right: { style: 'thin' },
    };
  }

  currentRow += 3;

  // Certification Section
  const certRow = currentRow;
  sheet.getCell(`A${certRow}`).value = 'Prepared by:';
  sheet.getCell(`E${certRow}`).value = 'Reviewed by:';
  sheet.getCell(`H${certRow}`).value = 'Approved by:';

  currentRow += 4;

  sheet.getCell(`A${currentRow}`).value = '_______________________';
  sheet.getCell(`E${currentRow}`).value = '_______________________';
  sheet.getCell(`H${currentRow}`).value = '_______________________';

  currentRow++;

  sheet.getCell(`A${currentRow}`).value = 'Budget Officer';
  sheet.getCell(`A${currentRow}`).font = { bold: true };
  sheet.getCell(`E${currentRow}`).value = 'Chief Accountant';
  sheet.getCell(`E${currentRow}`).font = { bold: true };
  sheet.getCell(`H${currentRow}`).value = 'Regional Director';
  sheet.getCell(`H${currentRow}`).font = { bold: true };

  return workbook;
}
