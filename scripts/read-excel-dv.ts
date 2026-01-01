import ExcelJS from 'exceljs';

async function readDV() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('reference/Disbursement-Voucher-DV-1.xlsx');

  console.log('=== WORKBOOK INFO ===');
  console.log('Sheet Names:', workbook.worksheets.map(ws => ws.name));

  const worksheet = workbook.worksheets[0];
  console.log('\n=== WORKSHEET:', worksheet.name, '===');
  console.log('Row Count:', worksheet.rowCount);
  console.log('Column Count:', worksheet.columnCount);

  console.log('\n=== MERGED CELLS ===');
  if (worksheet.model.merges) {
    console.log(JSON.stringify(worksheet.model.merges, null, 2));
  }

  console.log('\n=== CELL CONTENT (First 50 rows) ===\n');

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 50) return;

    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const cellAddr = `${String.fromCharCode(64 + colNumber)}${rowNumber}`;
      let value = '';

      if (cell.value) {
        if (typeof cell.value === 'object' && 'richText' in cell.value) {
          value = cell.value.richText.map((rt: any) => rt.text).join('');
        } else if (typeof cell.value === 'object' && 'text' in cell.value) {
          value = cell.value.text;
        } else {
          value = String(cell.value);
        }
      }

      if (value) {
        const style = cell.style || {};
        const font = style.font || {};
        const alignment = style.alignment || {};
        const border = style.border ? 'bordered' : '';
        const bold = font.bold ? 'BOLD' : '';
        const fontSize = font.size || '';

        cells.push(`${cellAddr}:[${bold}${fontSize ? ` ${fontSize}pt` : ''}${border ? ` ${border}` : ''}] "${value}"`);
      }
    });

    if (cells.length > 0) {
      console.log(`Row ${rowNumber}: ${cells.join(' | ')}`);
    }
  });

  console.log('\n=== COLUMN WIDTHS ===');
  worksheet.columns.forEach((col, idx) => {
    if (col.width) {
      console.log(`Column ${String.fromCharCode(65 + idx)}: width=${col.width}`);
    }
  });

  console.log('\n=== ROW HEIGHTS ===');
  worksheet.eachRow((row, rowNumber) => {
    if (row.height && rowNumber <= 50) {
      console.log(`Row ${rowNumber}: height=${row.height}`);
    }
  });
}

readDV().catch(console.error);
