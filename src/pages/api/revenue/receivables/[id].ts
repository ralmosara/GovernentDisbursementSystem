import type { APIRoute } from 'astro';
import { revenueService } from '../../../../lib/services/revenue.service';

// GET - Get AR by ID with collection history
export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const id = parseInt(params.id!);

    if (isNaN(id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ar = await revenueService.getARById(id);

    return new Response(JSON.stringify(ar), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching AR:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch accounts receivable',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
