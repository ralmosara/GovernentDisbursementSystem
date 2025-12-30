import type { APIRoute } from 'astro';
import { budgetService } from '../../../../../lib/services/budget.service';

export const POST: APIRoute = async ({ params, locals }) => {
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

    // Approve the obligation
    await budgetService.approveObligation(parseInt(id), user.id);

    return new Response(
      JSON.stringify({ message: 'Obligation approved successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error approving obligation:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
