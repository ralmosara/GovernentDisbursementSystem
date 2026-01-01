import type { APIRoute } from 'astro';
import { cashService } from '../../../../../lib/services/cash.service';

// POST - Confirm bank deposit
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
        JSON.stringify({ error: 'Invalid deposit ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await cashService.confirmBankDeposit(id, user.id);

    return new Response(
      JSON.stringify({
        message: 'Bank deposit confirmed successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error confirming bank deposit:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to confirm bank deposit',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
