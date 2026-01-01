import type { APIRoute } from 'astro';
import { assetService } from '../../../../lib/services/asset.service';

export const GET: APIRoute = async ({ params, locals }) => {
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
      return new Response(JSON.stringify({ error: 'Invalid transaction ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const transaction = await assetService.getInventoryTransactionById(id);

    if (!transaction) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(transaction), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching inventory transaction:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch inventory transaction' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
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
      return new Response(JSON.stringify({ error: 'Invalid transaction ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await assetService.deleteInventoryTransaction(id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error deleting inventory transaction:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to delete inventory transaction' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
