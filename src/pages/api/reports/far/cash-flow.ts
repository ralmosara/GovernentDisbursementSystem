import type { APIRoute } from 'astro';
import { reportService } from '../../../../lib/services/report.service';
import { createFARCashFlowWorkbook } from '../../../../lib/utils/excel-templates';

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
    const fromDateStr = url.searchParams.get('fromDate');
    const toDateStr = url.searchParams.get('toDate');
    const fundClusterId = url.searchParams.get('fundClusterId');
    const format = url.searchParams.get('format') || 'json'; // json, excel, pdf

    if (!fromDateStr || !toDateStr) {
      return new Response(
        JSON.stringify({ message: 'From date and to date are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);

    // Generate FAR No. 3 report
    const reportData = await reportService.getFARCashFlow(
      fromDate,
      toDate,
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
      const workbook = await createFARCashFlowWorkbook(reportData);
      const buffer = await workbook.xlsx.writeBuffer();

      const filename = `FAR_No3_CashFlow_${fromDate.toISOString().split('T')[0]}_to_${toDate.toISOString().split('T')[0]}${
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
    console.error('Error generating FAR No. 3 report:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
