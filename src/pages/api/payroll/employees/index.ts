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
    const search = url.searchParams.get('search') || undefined;
    const employmentStatus = url.searchParams.get('status') || undefined;
    const position = url.searchParams.get('position') || undefined;
    const isActive = url.searchParams.get('isActive');

    const filters: any = {};
    if (search) filters.search = search;
    if (employmentStatus) filters.employmentStatus = employmentStatus;
    if (position) filters.position = position;
    if (isActive !== null) filters.isActive = isActive === 'true';

    const employees = await payrollService.getEmployees(filters);

    return new Response(JSON.stringify(employees), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch employees' }),
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
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
    if (data.dateHired) data.dateHired = new Date(data.dateHired);
    if (data.dateRegularized) data.dateRegularized = new Date(data.dateRegularized);

    // Create employee (userId will be created or linked separately)
    // For now, we'll use the current user's ID as a placeholder
    // In production, you'd create a separate user account
    data.userId = user.id;

    const result = await payrollService.createEmployee(data, user.id);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create employee' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
