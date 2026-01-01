import type { APIRoute } from 'astro';
import { assetService } from '../../../../../lib/services/asset.service';

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = parseInt(params.id || '0');
    if (!id) {
      return new Response(JSON.stringify({ error: 'Invalid item ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.quantity || !data.operation) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (quantity, operation)' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!['add', 'subtract', 'set'].includes(data.operation)) {
      return new Response(
        JSON.stringify({ error: 'Invalid operation. Must be: add, subtract, or set' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    await assetService.adjustInventoryQuantity(
      id,
      parseInt(data.quantity),
      data.operation
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error adjusting inventory quantity:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to adjust inventory quantity' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
