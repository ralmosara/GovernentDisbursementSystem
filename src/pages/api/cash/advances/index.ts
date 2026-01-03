import type { APIRoute } from 'astro';
import { cashService } from '../../../../lib/services/cash.service';
import { logCreate } from '../../../../lib/middleware/audit-logger';

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.employeeId || !data.fundClusterId || !data.amount || !data.purpose || !data.dateIssued) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create cash advance
    const result = await cashService.createCashAdvance(
      {
        employeeId: data.employeeId,
        fundClusterId: data.fundClusterId,
        amount: data.amount,
        purpose: data.purpose,
        dateIssued: new Date(data.dateIssued),
        dueDateReturn: data.dueDateReturn ? new Date(data.dueDateReturn) : undefined,
      },
      user.id
    );

    // Log the creation
    await logCreate(
      'cash_advances',
      result.id,
      {
        caNo: result.caNo,
        employeeId: data.employeeId,
        fundClusterId: data.fundClusterId,
        amount: data.amount,
        purpose: data.purpose,
        dateIssued: data.dateIssued,
        dueDateReturn: data.dueDateReturn,
        status: 'draft',
      },
      user.id,
      clientAddress,
      request.headers.get('user-agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        id: result.id,
        caNo: result.caNo,
        message: 'Cash advance created successfully',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating cash advance:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create cash advance',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
