import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTableDefault, * as autoTableModule from 'jspdf-autotable';
import type { Cell, ReportColumn, ReportTable } from './coa-reports';

/** Excel and PDF renderings of a report table */

// jspdf-autotable is CommonJS: Node's ESM loader nests the function one level deeper than bundlers do
const autoTable: typeof autoTableDefault = (autoTableModule as any).default?.default ?? autoTableDefault;

const THIN = { style: 'thin' as const };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

export async function tableToWorkbook(table: ReportTable, agencyName = ''): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Government Financial Management System';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(table.filename.slice(0, 31), {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const width = table.columns.length;
  sheet.columns = table.columns.map(c => ({ width: c.width ?? (c.type === 'money' ? 18 : 14) }));

  const banner = (text: string, size: number, bold = true) => {
    const row = sheet.addRow([text]);
    sheet.mergeCells(row.number, 1, row.number, width);
    row.getCell(1).font = { bold, size };
    row.getCell(1).alignment = { horizontal: 'center' };
  };
  if (agencyName) banner(agencyName, 12);
  banner(table.title, 13);
  table.subtitle.forEach(line => banner(line, 11, false));
  sheet.addRow([]);

  const header = sheet.addRow(table.columns.map(c => c.header));
  header.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4788' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDER;
  });
  header.height = 32;

  const write = (values: Cell[], style?: 'section' | 'total') => {
    const row = sheet.addRow(values.map(v => v ?? ''));
    table.columns.forEach((column, i) => {
      const cell = row.getCell(i + 1);
      cell.border = BORDER;
      if (column.type === 'money') cell.numFmt = '#,##0.00;(#,##0.00);"-"';
      if (column.type === 'percent') cell.numFmt = '0.00%';
      if (column.type && column.type !== 'text') cell.alignment = { horizontal: 'right' };
      if (style) cell.font = { bold: true };
      if (style === 'total') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
    });
    if (style === 'section') sheet.mergeCells(row.number, 1, row.number, width);
  };

  for (const section of table.sections) {
    if (section.label) write([section.label], 'section');
    section.rows.forEach(r => write(r));
    if (section.total) write(section.total, 'total');
  }
  if (table.sections.every(s => s.rows.length === 0)) write(['No records for this period']);
  if (table.total) write(table.total, 'total');

  if (table.notes?.length) {
    sheet.addRow([]);
    table.notes.forEach(note => {
      const row = sheet.addRow([note]);
      sheet.mergeCells(row.number, 1, row.number, width);
      row.getCell(1).font = { italic: true, size: 9 };
    });
  }
  sheet.addRow([]);
  sheet.addRow([`Generated ${new Date().toLocaleString('en-PH')}`]).getCell(1).font = { size: 9 };
  return workbook;
}

const pdfValue = (value: Cell, column: ReportColumn) => {
  if (value === null || value === '') return '';
  if (typeof value !== 'number') return String(value);
  if (column.type === 'percent') return `${(value * 100).toFixed(2)}%`;
  if (column.type === 'money') {
    const text = Math.abs(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return value < 0 ? `(${text})` : value === 0 ? '-' : text;
  }
  return value.toLocaleString('en-PH');
};

export function tableToPdf(table: ReportTable, agencyName = ''): ArrayBuffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;
  const centered = (text: string, size: number, bold = true) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(text, pageWidth / 2, y, { align: 'center', maxWidth: pageWidth - 80 });
    y += size + 6;
  };
  if (agencyName) centered(agencyName, 12);
  centered(table.title, 12);
  table.subtitle.forEach(line => centered(line, 10, false));
  centered('(Amounts in Philippine pesos)', 8, false);

  const align = (column: ReportColumn) => (column.type && column.type !== 'text' ? 'right' : 'left');
  const body: any[] = [];
  for (const section of table.sections) {
    if (section.label) body.push([{ content: section.label, colSpan: table.columns.length, styles: { fontStyle: 'bold', fillColor: [243, 244, 246] } }]);
    section.rows.forEach(r => body.push(r.map((v, i) => ({ content: pdfValue(v, table.columns[i]), styles: { halign: align(table.columns[i]) } }))));
    if (section.total) body.push(section.total.map((v, i) => ({ content: pdfValue(v, table.columns[i]), styles: { halign: align(table.columns[i]), fontStyle: 'bold' } })));
  }
  if (table.sections.every(s => s.rows.length === 0)) body.push([{ content: 'No records for this period', colSpan: table.columns.length, styles: { halign: 'center' } }]);

  autoTable(doc, {
    startY: y + 4,
    head: [table.columns.map(c => ({ content: c.header, styles: { halign: align(c) } }))],
    body,
    foot: table.total ? [table.total.map((v, i) => ({ content: pdfValue(v, table.columns[i]), styles: { halign: align(table.columns[i]) } }))] : undefined,
    showFoot: 'lastPage',
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3 },
    headStyles: { fillColor: [31, 71, 136], textColor: 255 },
    footStyles: { fillColor: [231, 230, 230], textColor: 20, fontStyle: 'bold' },
    margin: { left: 30, right: 30 },
  });

  const lastY = (doc as any).lastAutoTable?.finalY ?? y;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  (table.notes ?? []).forEach((note, i) => doc.text(note, 30, lastY + 16 + i * 11, { maxWidth: pageWidth - 60 }));
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated ${new Date().toLocaleString('en-PH')}`, 30, doc.internal.pageSize.getHeight() - 20);
  return doc.output('arraybuffer');
}
