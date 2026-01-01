import type { APIRoute } from 'astro';
import { TravelService } from '../../../../lib/services/travel.service';
import ExcelJS from 'exceljs';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const iotId = parseInt(params.id as string);
    const iot = await TravelService.getIoTById(iotId);

    if (!iot) {
      return new Response(JSON.stringify({ error: 'IoT not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Itinerary of Travel');

    // Helper function for borders
    const applyBorder = (cell: ExcelJS.Cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    };

    // Format date helper
    const formatDate = (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Format currency helper
    const formatCurrency = (amount: string | number) => {
      return parseFloat(amount.toString()).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Set column widths
    worksheet.columns = [
      { width: 3 },
      { width: 20 },
      { width: 3 },
      { width: 30 }
    ];

    let currentRow = 1;

    // Header
    worksheet.mergeCells(currentRow, 1, currentRow, 4);
    const headerCell = worksheet.getCell(currentRow, 1);
    headerCell.value = 'Republic of the Philippines';
    headerCell.font = { bold: true, size: 12 };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    worksheet.mergeCells(currentRow, 1, currentRow, 4);
    const agencyCell = worksheet.getCell(currentRow, 1);
    agencyCell.value = '[OFFICE NAME]';
    agencyCell.font = { bold: true, size: 11 };
    agencyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    worksheet.mergeCells(currentRow, 1, currentRow, 4);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = 'ITINERARY OF TRAVEL';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow += 2;

    // IoT Number
    worksheet.mergeCells(currentRow, 1, currentRow, 4);
    const iotNoCell = worksheet.getCell(currentRow, 1);
    iotNoCell.value = `IoT No: ${iot.iot.iotNo}`;
    iotNoCell.font = { bold: true, size: 11 };
    iotNoCell.alignment = { horizontal: 'right' };
    currentRow += 2;

    // Employee Information
    const addField = (label: string, value: string) => {
      const labelCell = worksheet.getCell(currentRow, 2);
      labelCell.value = label;
      labelCell.font = { bold: true };
      applyBorder(labelCell);

      worksheet.mergeCells(currentRow, 4, currentRow, 4);
      const valueCell = worksheet.getCell(currentRow, 4);
      valueCell.value = value;
      applyBorder(valueCell);
      currentRow++;
    };

    addField('Name of Employee:', `${iot.employee.firstName} ${iot.employee.lastName}`);
    addField('Position:', iot.employee.position || 'N/A');
    addField('Division/Office:', iot.employee.division || 'N/A');
    addField('Employee No:', iot.employee.employeeNo);
    currentRow++;

    // Travel Information
    addField('Destination:', iot.iot.destination);
    addField('Purpose of Travel:', iot.iot.purpose);
    addField('Departure Date:', formatDate(iot.iot.departureDate));
    addField('Return Date:', formatDate(iot.iot.returnDate));
    addField('Fund Cluster:', iot.fundCluster.name);
    currentRow += 2;

    // Itinerary Details
    worksheet.mergeCells(currentRow, 1, currentRow, 4);
    const itineraryHeader = worksheet.getCell(currentRow, 1);
    itineraryHeader.value = 'PLANNED ITINERARY';
    itineraryHeader.font = { bold: true, size: 12 };
    itineraryHeader.alignment = { horizontal: 'center' };
    applyBorder(itineraryHeader);
    currentRow++;

    // Itinerary Table Headers
    const headers = ['Date', 'Location', 'Activity', 'Transportation'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      applyBorder(cell);
    });
    currentRow++;

    // Itinerary Items
    if (iot.iot.itineraryBefore && Array.isArray(iot.iot.itineraryBefore) && iot.iot.itineraryBefore.length > 0) {
      iot.iot.itineraryBefore.forEach((item: any) => {
        const row = [
          formatDate(item.date),
          item.location || 'N/A',
          item.activity || 'N/A',
          item.transportation || 'N/A'
        ];

        row.forEach((value, index) => {
          const cell = worksheet.getCell(currentRow, index + 1);
          cell.value = value;
          applyBorder(cell);
        });
        currentRow++;
      });
    } else {
      worksheet.mergeCells(currentRow, 1, currentRow, 4);
      const emptyCell = worksheet.getCell(currentRow, 1);
      emptyCell.value = 'No itinerary details provided';
      emptyCell.font = { italic: true };
      emptyCell.alignment = { horizontal: 'center' };
      applyBorder(emptyCell);
      currentRow++;
    }

    currentRow += 2;

    // Cost Breakdown
    worksheet.mergeCells(currentRow, 1, currentRow, 4);
    const costHeader = worksheet.getCell(currentRow, 1);
    costHeader.value = 'COST BREAKDOWN';
    costHeader.font = { bold: true, size: 12 };
    costHeader.alignment = { horizontal: 'center' };
    applyBorder(costHeader);
    currentRow++;

    const addCostRow = (label: string, value: string) => {
      const labelCell = worksheet.getCell(currentRow, 2);
      labelCell.value = label;
      labelCell.font = { bold: true };
      applyBorder(labelCell);

      const valueCell = worksheet.getCell(currentRow, 4);
      valueCell.value = value;
      valueCell.alignment = { horizontal: 'right' };
      applyBorder(valueCell);
      currentRow++;
    };

    addCostRow('Estimated Cost:', `₱ ${formatCurrency(iot.iot.estimatedCost || 0)}`);
    addCostRow('Cash Advance:', `₱ ${formatCurrency(iot.iot.cashAdvanceAmount || 0)}`);

    if (iot.iot.dvId) {
      addCostRow('Cash Advance DV:', 'See attached DV');
    }

    currentRow += 2;

    // Signatures
    worksheet.mergeCells(currentRow, 1, currentRow + 3, 2);
    const travelerSig = worksheet.getCell(currentRow, 1);
    travelerSig.value = `\n\n_______________________________\n${iot.employee.firstName} ${iot.employee.lastName}\nTraveler's Signature\nDate: ______________`;
    travelerSig.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyBorder(travelerSig);

    worksheet.mergeCells(currentRow, 3, currentRow + 3, 4);
    const approverSig = worksheet.getCell(currentRow, 3);
    approverSig.value = '\n\n_______________________________\n[AUTHORIZED OFFICIAL]\nApproved by\nDate: ______________';
    approverSig.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyBorder(approverSig);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return as downloadable file
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="IoT-${iot.iot.iotNo}.xlsx"`
      }
    });
  } catch (error: any) {
    console.error('Error generating Excel:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to generate Excel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
