import ExcelJS from 'exceljs';
import type { BARReportData, FARBalanceSheetData, FARCashFlowData } from '../services/report.service';

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

/**
 * Create COA-compliant Excel workbook for FAR No. 1
 * Fund Accountability Report - Statement of Assets, Liabilities & Net Worth
 */
export async function createFARBalanceSheetWorkbook(
  data: FARBalanceSheetData
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Government Financial Management System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('FAR No. 1', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
    },
  });

  // Set column widths
  sheet.columns = [
    { width: 40 }, // A - Account Name
    { width: 20 }, // B - Amount
  ];

  let currentRow = 1;

  // Title
  const titleCell = sheet.getCell(`A${currentRow}`);
  titleCell.value = 'FAR No. 1 - STATEMENT OF ASSETS, LIABILITIES & NET WORTH';
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells(`A${currentRow}:B${currentRow}`);
  currentRow++;

  // As Of Date
  const dateCell = sheet.getCell(`A${currentRow}`);
  dateCell.value = `As of: ${data.asOfDate.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`;
  dateCell.font = { bold: true, size: 12 };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells(`A${currentRow}:B${currentRow}`);
  currentRow++;

  // Fund Cluster
  if (data.fundCluster) {
    const fcCell = sheet.getCell(`A${currentRow}`);
    fcCell.value = `Fund Cluster: ${data.fundCluster.code} - ${data.fundCluster.name}`;
    fcCell.font = { bold: true, size: 11 };
    fcCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.mergeCells(`A${currentRow}:B${currentRow}`);
    currentRow++;
  }

  currentRow += 2;

  // ASSETS Section
  const addSection = (title: string, items: { label: string; value: number }[], isSubsection = false) => {
    const titleRow = sheet.getRow(currentRow);
    titleRow.getCell(1).value = title;
    titleRow.getCell(1).font = { bold: true, size: isSubsection ? 11 : 12 };
    titleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isSubsection ? 'FFF2F2F2' : 'FFD9D9D9' },
    };
    sheet.mergeCells(`A${currentRow}:B${currentRow}`);
    currentRow++;

    items.forEach(({ label, value }) => {
      const row = sheet.getRow(currentRow);
      row.getCell(1).value = `  ${label}`;
      row.getCell(2).value = value;
      row.getCell(2).numFmt = '₱#,##0.00';
      row.getCell(2).alignment = { horizontal: 'right' };
      currentRow++;
    });
  };

  // Current Assets
  const currentAssets: { label: string; value: number }[] = [];
  Object.entries(data.assets.currentAssets.cash).forEach(([fundCode, amount]) => {
    currentAssets.push({ label: `Cash - Fund ${fundCode}`, value: amount });
  });
  currentAssets.push({ label: 'Accounts Receivable', value: data.assets.currentAssets.accountsReceivable });
  currentAssets.push({ label: 'Total Current Assets', value: data.assets.currentAssets.total });

  addSection('CURRENT ASSETS', currentAssets, true);

  // Non-Current Assets
  const nonCurrentAssets = [
    { label: 'Land', value: data.assets.nonCurrentAssets.land },
    { label: 'Buildings', value: data.assets.nonCurrentAssets.buildings },
    { label: 'Equipment', value: data.assets.nonCurrentAssets.equipment },
    { label: 'Total Non-Current Assets', value: data.assets.nonCurrentAssets.total },
  ];

  addSection('NON-CURRENT ASSETS', nonCurrentAssets, true);

  // Total Assets
  const totalAssetsRow = sheet.getRow(currentRow);
  totalAssetsRow.getCell(1).value = 'TOTAL ASSETS';
  totalAssetsRow.getCell(1).font = { bold: true, size: 12 };
  totalAssetsRow.getCell(2).value = data.assets.total;
  totalAssetsRow.getCell(2).numFmt = '₱#,##0.00';
  totalAssetsRow.getCell(2).font = { bold: true };
  totalAssetsRow.getCell(2).alignment = { horizontal: 'right' };
  totalAssetsRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFCC00' },
  };
  currentRow += 2;

  // LIABILITIES Section
  const currentLiabilities = [
    { label: 'Accounts Payable', value: data.liabilities.currentLiabilities.accountsPayable },
    { label: 'Due to Other Funds', value: data.liabilities.currentLiabilities.dueToOtherFunds },
    { label: 'Total Current Liabilities', value: data.liabilities.currentLiabilities.total },
  ];

  addSection('CURRENT LIABILITIES', currentLiabilities, true);

  // Total Liabilities
  const totalLiabilitiesRow = sheet.getRow(currentRow);
  totalLiabilitiesRow.getCell(1).value = 'TOTAL LIABILITIES';
  totalLiabilitiesRow.getCell(1).font = { bold: true, size: 12 };
  totalLiabilitiesRow.getCell(2).value = data.liabilities.total;
  totalLiabilitiesRow.getCell(2).numFmt = '₱#,##0.00';
  totalLiabilitiesRow.getCell(2).font = { bold: true };
  totalLiabilitiesRow.getCell(2).alignment = { horizontal: 'right' };
  totalLiabilitiesRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFCC00' },
  };
  currentRow += 2;

  // NET WORTH
  const netWorthRow = sheet.getRow(currentRow);
  netWorthRow.getCell(1).value = 'NET WORTH';
  netWorthRow.getCell(1).font = { bold: true, size: 12 };
  netWorthRow.getCell(2).value = data.netWorth;
  netWorthRow.getCell(2).numFmt = '₱#,##0.00';
  netWorthRow.getCell(2).font = { bold: true };
  netWorthRow.getCell(2).alignment = { horizontal: 'right' };
  netWorthRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF92D050' },
  };
  currentRow += 3;

  // Certification
  sheet.getCell(`A${currentRow}`).value = 'Certified Correct:';
  currentRow += 4;
  sheet.getCell(`A${currentRow}`).value = '_______________________';
  currentRow++;
  sheet.getCell(`A${currentRow}`).value = 'Chief Accountant';
  sheet.getCell(`A${currentRow}`).font = { bold: true };

  return workbook;
}

/**
 * Create COA-compliant Excel workbook for FAR No. 3
 * Statement of Sources and Application of Funds
 */
export async function createFARCashFlowWorkbook(data: FARCashFlowData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Government Financial Management System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('FAR No. 3', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
    },
  });

  // Set column widths
  sheet.columns = [
    { width: 40 }, // A - Description
    { width: 20 }, // B - Amount
  ];

  let currentRow = 1;

  // Title
  const titleCell = sheet.getCell(`A${currentRow}`);
  titleCell.value = 'FAR No. 3 - STATEMENT OF SOURCES AND APPLICATION OF FUNDS';
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells(`A${currentRow}:B${currentRow}`);
  currentRow++;

  // Period
  const periodCell = sheet.getCell(`A${currentRow}`);
  periodCell.value = `Period: ${data.fromDate.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })} - ${data.toDate.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`;
  periodCell.font = { bold: true, size: 11 };
  periodCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells(`A${currentRow}:B${currentRow}`);
  currentRow++;

  // Fund Cluster
  if (data.fundCluster) {
    const fcCell = sheet.getCell(`A${currentRow}`);
    fcCell.value = `Fund Cluster: ${data.fundCluster.code} - ${data.fundCluster.name}`;
    fcCell.font = { bold: true, size: 11 };
    fcCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.mergeCells(`A${currentRow}:B${currentRow}`);
    currentRow++;
  }

  currentRow += 2;

  // Opening Balance
  const openingRow = sheet.getRow(currentRow);
  openingRow.getCell(1).value = 'BALANCE, Beginning';
  openingRow.getCell(1).font = { bold: true, size: 12 };
  openingRow.getCell(2).value = data.openingBalance;
  openingRow.getCell(2).numFmt = '₱#,##0.00';
  openingRow.getCell(2).font = { bold: true };
  openingRow.getCell(2).alignment = { horizontal: 'right' };
  openingRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE7E6E6' },
  };
  currentRow += 2;

  // Sources of Funds
  const sourcesHeader = sheet.getRow(currentRow);
  sourcesHeader.getCell(1).value = 'SOURCES OF FUNDS:';
  sourcesHeader.getCell(1).font = { bold: true, size: 12 };
  sourcesHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9D9D9' },
  };
  sheet.mergeCells(`A${currentRow}:B${currentRow}`);
  currentRow++;

  const sources = [
    { label: 'Revenue Collections', value: data.sources.revenueCollections },
    { label: 'Allotment Received', value: data.sources.allotmentsReceived },
    { label: 'Other Receipts', value: data.sources.otherReceipts },
  ];

  sources.forEach(({ label, value }) => {
    const row = sheet.getRow(currentRow);
    row.getCell(1).value = `  ${label}`;
    row.getCell(2).value = value;
    row.getCell(2).numFmt = '₱#,##0.00';
    row.getCell(2).alignment = { horizontal: 'right' };
    currentRow++;
  });

  // Total Sources
  const totalSourcesRow = sheet.getRow(currentRow);
  totalSourcesRow.getCell(1).value = 'Total Sources';
  totalSourcesRow.getCell(1).font = { bold: true };
  totalSourcesRow.getCell(2).value = data.sources.total;
  totalSourcesRow.getCell(2).numFmt = '₱#,##0.00';
  totalSourcesRow.getCell(2).font = { bold: true };
  totalSourcesRow.getCell(2).alignment = { horizontal: 'right' };
  totalSourcesRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F2F2' },
  };
  currentRow += 2;

  // Applications of Funds
  const applicationsHeader = sheet.getRow(currentRow);
  applicationsHeader.getCell(1).value = 'APPLICATION OF FUNDS:';
  applicationsHeader.getCell(1).font = { bold: true, size: 12 };
  applicationsHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9D9D9' },
  };
  sheet.mergeCells(`A${currentRow}:B${currentRow}`);
  currentRow++;

  const applications = [
    { label: 'Personnel Services', value: data.applications.personnelServices },
    { label: 'MOOE', value: data.applications.mooe },
    { label: 'Capital Outlay', value: data.applications.capitalOutlay },
  ];

  applications.forEach(({ label, value }) => {
    const row = sheet.getRow(currentRow);
    row.getCell(1).value = `  ${label}`;
    row.getCell(2).value = value;
    row.getCell(2).numFmt = '₱#,##0.00';
    row.getCell(2).alignment = { horizontal: 'right' };
    currentRow++;
  });

  // Total Applications
  const totalApplicationsRow = sheet.getRow(currentRow);
  totalApplicationsRow.getCell(1).value = 'Total Applications';
  totalApplicationsRow.getCell(1).font = { bold: true };
  totalApplicationsRow.getCell(2).value = data.applications.total;
  totalApplicationsRow.getCell(2).numFmt = '₱#,##0.00';
  totalApplicationsRow.getCell(2).font = { bold: true };
  totalApplicationsRow.getCell(2).alignment = { horizontal: 'right' };
  totalApplicationsRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F2F2' },
  };
  currentRow += 2;

  // Closing Balance
  const closingRow = sheet.getRow(currentRow);
  closingRow.getCell(1).value = 'BALANCE, Ending';
  closingRow.getCell(1).font = { bold: true, size: 12 };
  closingRow.getCell(2).value = data.closingBalance;
  closingRow.getCell(2).numFmt = '₱#,##0.00';
  closingRow.getCell(2).font = { bold: true };
  closingRow.getCell(2).alignment = { horizontal: 'right' };
  closingRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF92D050' },
  };
  currentRow += 3;

  // Certification
  sheet.getCell(`A${currentRow}`).value = 'Prepared by:';
  currentRow += 4;
  sheet.getCell(`A${currentRow}`).value = '_______________________';
  currentRow++;
  sheet.getCell(`A${currentRow}`).value = 'Budget Officer';
  sheet.getCell(`A${currentRow}`).font = { bold: true };

  return workbook;
}
