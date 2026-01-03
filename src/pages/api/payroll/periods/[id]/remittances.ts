import type { APIRoute } from 'astro';
import { payrollService } from '../../../../../lib/services/payroll.service';

export const POST: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const periodId = parseInt(params.id || '0');

    // Get the period first to check status
    const period = await payrollService.getPayrollPeriodById(periodId);

    if (!period) {
      return new Response(JSON.stringify({ error: 'Payroll period not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only allow remittance generation for processed periods
    if (period.status === 'Draft' || period.status === 'Cancelled') {
      return new Response(
        JSON.stringify({ error: 'Cannot generate remittances for unprocessed or cancelled periods' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate remittances
    await payrollService.generateRemittances(periodId, user.id);

    return new Response(
      JSON.stringify({ success: true, message: 'Remittances generated successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error generating remittances:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate remittances' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
