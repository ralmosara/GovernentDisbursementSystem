import type { APIRoute } from 'astro';
import { cashService } from '../../../../../lib/services/cash.service';

// POST - Complete bank reconciliation
export const POST: APIRoute = async ({ params, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid reconciliation ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await cashService.completeBankReconciliation(id, user.id);

    return new Response(
      JSON.stringify({
        message: 'Bank reconciliation completed successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error completing bank reconciliation:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to complete bank reconciliation',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
