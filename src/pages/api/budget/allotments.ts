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
      !data.appropriationId ||
      !data.objectOfExpenditureId ||
      !data.allotmentClass ||
      !data.amount ||
      !data.purpose
    ) {
      return new Response(
        JSON.stringify({ message: 'All required fields must be provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create allotment
    const result = await budgetService.createAllotment({
      appropriationId: data.appropriationId,
      objectOfExpenditureId: data.objectOfExpenditureId,
      mfoPapId: data.mfoPapId,
      allotmentClass: data.allotmentClass,
      amount: data.amount,
      purpose: data.purpose
    });

    return new Response(
      JSON.stringify({
        message: 'Allotment created successfully',
        id: result.insertId
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating allotment:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
