import type { APIRoute } from 'astro';
import { assetService } from '../../../../../lib/services/asset.service';

// PUT - Update asset status
export const PUT: APIRoute = async ({ params, request, locals }) => {
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

    const { status } = await request.json();

    if (!status || !['active', 'disposed', 'written_off'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be: active, disposed, or written_off' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await assetService.updateAssetStatus(id, status);

    return new Response(
      JSON.stringify({ message: 'Asset status updated successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating asset status:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update asset status',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
