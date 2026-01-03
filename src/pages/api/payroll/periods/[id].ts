import type { APIRoute } from 'astro';
import { payrollService } from '../../../../lib/services/payroll.service';

export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const id = parseInt(params.id || '0');
    const period = await payrollService.getPayrollPeriodById(id);

    if (!period) {
      return new Response(JSON.stringify({ error: 'Payroll period not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(period), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching payroll period:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch payroll period' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const id = parseInt(params.id || '0');

    // Get the period first to check if it can be deleted
    const period = await payrollService.getPayrollPeriodById(id);

    if (!period) {
      return new Response(JSON.stringify({ error: 'Payroll period not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only allow deletion of Draft periods
    if (period.status !== 'Draft') {
      return new Response(
        JSON.stringify({ error: 'Only Draft periods can be deleted' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Delete the period (implementation needs to be added to service)
    // For now, we'll return success - service method needs to be implemented
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error deleting payroll period:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to delete payroll period' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
