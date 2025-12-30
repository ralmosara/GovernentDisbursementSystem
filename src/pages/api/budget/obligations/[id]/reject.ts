import type { APIRoute } from 'astro';
import { budgetService } from '../../../../../lib/services/budget.service';

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return new Response(
        JSON.stringify({ message: 'Invalid obligation ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    if (!data.remarks) {
      return new Response(
        JSON.stringify({ message: 'Remarks are required for rejection' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reject the obligation
    await budgetService.rejectObligation(parseInt(id), user.id, data.remarks);

    return new Response(
      JSON.stringify({ message: 'Obligation rejected successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error rejecting obligation:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
