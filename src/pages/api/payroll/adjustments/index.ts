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

    const status = url.searchParams.get('status');
    const employeeId = url.searchParams.get('employeeId');

    if (status) filters.status = status;
    if (employeeId) filters.employeeId = parseInt(employeeId);

    const adjustments = await payrollService.getPayrollAdjustments(filters);

    return new Response(JSON.stringify(adjustments), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching adjustments:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch adjustments' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json();

    if (data.effectiveDate) data.effectiveDate = new Date(data.effectiveDate);

    const result = await payrollService.createPayrollAdjustment(data, user.id);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating adjustment:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create adjustment' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
