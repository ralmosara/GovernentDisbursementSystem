import type { APIRoute } from 'astro';
import { budgetService } from '../../../lib/services/budget.service';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();

    // Validate required fields
    if (
      !data.allotmentId ||
      !data.payee ||
      !data.particulars ||
      !data.amount ||
      !data.obligationDate
    ) {
      return new Response(
        JSON.stringify({ message: 'All required fields must be provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create obligation
    const result = await budgetService.createObligation({
      allotmentId: data.allotmentId,
      payee: data.payee,
      particulars: data.particulars,
      amount: data.amount,
      orsNumber: data.orsNumber,
      bursNumber: data.bursNumber,
      obligationDate: new Date(data.obligationDate),
      createdBy: user.id
    });

    return new Response(
      JSON.stringify({
        message: 'Obligation created successfully',
        id: result.insertId
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating obligation:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
