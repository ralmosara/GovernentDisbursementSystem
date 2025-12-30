import type { APIRoute } from 'astro';
import { budgetService } from '../../../../lib/services/budget.service';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const allotmentId = parseInt(params.id as string);

    if (!allotmentId) {
      return new Response(
        JSON.stringify({ message: 'Invalid allotment ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get budget availability
    const availability = await budgetService.getBudgetAvailability(allotmentId);

    return new Response(
      JSON.stringify(availability),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting budget availability:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
