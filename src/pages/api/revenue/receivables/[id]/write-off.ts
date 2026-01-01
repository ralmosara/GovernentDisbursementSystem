import type { APIRoute } from 'astro';
import { revenueService } from '../../../../../lib/services/revenue.service';

// POST - Write off accounts receivable
export const POST: APIRoute = async ({ params, request, locals }) => {
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

    const data = await request.json();

    if (!data.reason) {
      return new Response(
        JSON.stringify({ error: 'Write-off reason is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await revenueService.writeOffAR(id, user.id, data.reason);

    return new Response(
      JSON.stringify({ message: 'AR written off successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error writing off AR:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to write off AR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
