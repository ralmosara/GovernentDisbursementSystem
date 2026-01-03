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
    const employeeIdParam = url.searchParams.get('employeeId');

    if (employeeIdParam) {
      // Get deductions for specific employee
      const employeeId = parseInt(employeeIdParam);
      const deductions = await payrollService.getEmployeeDeductions(employeeId);

      return new Response(JSON.stringify(deductions), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Get all deductions
      const filters: any = {};
      const deductionType = url.searchParams.get('deductionType');
      const isActiveParam = url.searchParams.get('isActive');

      if (deductionType) filters.deductionType = deductionType;
      if (isActiveParam) filters.isActive = isActiveParam === 'true';

      const deductions = await payrollService.getAllDeductions(filters);

      return new Response(JSON.stringify(deductions), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('Error fetching deductions:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch deductions' }),
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

    // Convert date string to Date object
    if (data.startDate) data.startDate = new Date(data.startDate);

    const result = await payrollService.createEmployeeDeduction(data, user.id);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating deduction:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create deduction' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
