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
    const status = url.searchParams.get('status');

    if (year) filters.year = parseInt(year);
    if (month) filters.month = parseInt(month);
    if (status) filters.status = status;

    const periods = await payrollService.getPayrollPeriods(filters);

    return new Response(JSON.stringify(periods), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching payroll periods:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch payroll periods' }),
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

    // Convert date strings to Date objects
    if (data.periodStart) data.periodStart = new Date(data.periodStart);
    if (data.periodEnd) data.periodEnd = new Date(data.periodEnd);
    if (data.payDate) data.payDate = new Date(data.payDate);

    const result = await payrollService.createPayrollPeriod(data, user.id);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating payroll period:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create payroll period' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
