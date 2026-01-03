import type { APIRoute } from 'astro';
import { payrollService } from '../../../../lib/services/payroll.service';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const filters: any = {};

    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    const remittanceType = url.searchParams.get('remittanceType');
    const paymentStatus = url.searchParams.get('paymentStatus');

    if (year) filters.year = parseInt(year);
    if (month) filters.month = parseInt(month);
    if (remittanceType) filters.remittanceType = remittanceType;
    if (paymentStatus) filters.paymentStatus = paymentStatus;

    const remittances = await payrollService.getRemittances(filters);

    return new Response(JSON.stringify(remittances), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching remittances:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch remittances' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
