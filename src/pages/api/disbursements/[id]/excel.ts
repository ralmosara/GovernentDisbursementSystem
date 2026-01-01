import type { APIRoute } from 'astro';
import { disbursementService } from '../../../../lib/services/disbursement.service';
import { generateDVExcel } from '../../../../lib/utils/excel-generator';

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id || '0');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Invalid disbursement ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch the disbursement details
    const disbursement = await disbursementService.getDVById(id);

    if (!disbursement) {
      return new Response(JSON.stringify({ error: 'Disbursement not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare data for Excel generation
    const dvData = {
      dvNo: disbursement.dvNo,
      dvDate: disbursement.dvDate,
      fiscalYear: disbursement.fiscalYear,
      payeeName: disbursement.payeeName,
      payeeTin: disbursement.payeeTin || undefined,
      payeeAddress: disbursement.payeeAddress || undefined,
      particulars: disbursement.particulars,
      amount: parseFloat(disbursement.amount),
      orsBursNo: disbursement.orsBursNo,
      fundCluster: {
        code: disbursement.fundCluster?.code || '',
        name: disbursement.fundCluster?.name || ''
      },
      objectOfExpenditure: {
        code: disbursement.objectOfExpenditure?.code || '',
        name: disbursement.objectOfExpenditure?.name || ''
      },
      responsibilityCenter: disbursement.responsibilityCenter || undefined,
      mfoPap: disbursement.mfoPap ? {
        code: disbursement.mfoPap.code,
        description: disbursement.mfoPap.description
      } : undefined,
      paymentMode: disbursement.paymentMode
    };

    // Generate Excel workbook
    const workbook = await generateDVExcel(dvData);

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return as downloadable file
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="DV-${disbursement.dvNo}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Excel generation error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate Excel file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
