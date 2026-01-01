import type { APIRoute } from 'astro';
import { assetService } from '../../../../lib/services/asset.service';

// GET - Get fixed asset by ID
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

    const asset = await assetService.getFixedAssetById(id);

    return new Response(JSON.stringify(asset), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching fixed asset:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch fixed asset',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT - Update fixed asset
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

    const data = await request.json();

    // Convert date string to Date object if provided
    if (data.acquisitionDate) {
      data.acquisitionDate = new Date(data.acquisitionDate);
    }

    const updated = await assetService.updateFixedAsset(id, data);

    return new Response(
      JSON.stringify({
        message: 'Fixed asset updated successfully',
        asset: updated,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating fixed asset:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update fixed asset',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
