import type { APIRoute } from 'astro';
import { cashService } from '../../../../lib/services/cash.service';

// GET - Get cash receipt by ID
export const GET: APIRoute = async ({ params, locals }) => {
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
        JSON.stringify({ error: 'Invalid receipt ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const receipt = await cashService.getCashReceiptById(id);

    if (!receipt) {
      return new Response(
        JSON.stringify({ error: 'Receipt not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(receipt), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching cash receipt:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch cash receipt',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
