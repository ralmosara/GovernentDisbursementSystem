import type { APIRoute } from 'astro';
import { assetService } from '../../../../lib/services/asset.service';

// GET - Get asset category by ID
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

    const category = await assetService.getAssetCategoryById(id);

    return new Response(JSON.stringify(category), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching asset category:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch asset category',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT - Update asset category
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

    const updated = await assetService.updateAssetCategory(id, data);

    return new Response(
      JSON.stringify({
        message: 'Asset category updated successfully',
        category: updated,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating asset category:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update asset category',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE - Deactivate asset category
export const DELETE: APIRoute = async ({ params, locals }) => {
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

    await assetService.toggleAssetCategoryStatus(id, false);

    return new Response(
      JSON.stringify({ message: 'Asset category deactivated successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deactivating asset category:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to deactivate asset category',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
