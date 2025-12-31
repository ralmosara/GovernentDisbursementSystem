import type { APIRoute } from 'astro';
import { reportService } from '../../../../lib/services/report.service';
import { createFARBalanceSheetWorkbook } from '../../../../lib/utils/excel-templates';

export const GET: APIRoute = async ({ request, locals, url }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get query parameters
    const asOfDateStr = url.searchParams.get('asOfDate');
    const fundClusterId = url.searchParams.get('fundClusterId');
    const format = url.searchParams.get('format') || 'json'; // json, excel, pdf

    if (!asOfDateStr) {
      return new Response(
        JSON.stringify({ message: 'As-of date is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const asOfDate = new Date(asOfDateStr);

    // Generate FAR No. 1 report
    const reportData = await reportService.getFARBalanceSheet(
      asOfDate,
      fundClusterId ? parseInt(fundClusterId) : undefined
    );

    // Return based on format
    if (format === 'json') {
      return new Response(JSON.stringify(reportData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (format === 'excel') {
      const workbook = await createFARBalanceSheetWorkbook(reportData);
      const buffer = await workbook.xlsx.writeBuffer();

      const filename = `FAR_No1_BalanceSheet_${asOfDate.toISOString().split('T')[0]}${
        reportData.fundCluster ? `_FC${reportData.fundCluster.code}` : ''
      }_${new Date().toISOString().split('T')[0]}.xlsx`;

      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === 'pdf') {
      // PDF generation will be implemented in later phase
      return new Response(
        JSON.stringify({ message: 'PDF format not yet implemented. Please use Excel format.' }),
        { status: 501, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Invalid format. Use json, excel, or pdf' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating FAR No. 1 report:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
