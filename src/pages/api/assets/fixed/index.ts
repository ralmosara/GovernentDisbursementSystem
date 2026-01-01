import type { APIRoute } from 'astro';
import { assetService } from '../../../../lib/services/asset.service';

// POST - Create new fixed asset
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json();

    // Validate required fields
    if (!data.description || !data.assetCategoryId || !data.acquisitionDate || !data.acquisitionCost || !data.usefulLife) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: description, assetCategoryId, acquisitionDate, acquisitionCost, usefulLife' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert date string to Date object
    data.acquisitionDate = new Date(data.acquisitionDate);

    const result = await assetService.createFixedAsset(data, user.id);

    return new Response(
      JSON.stringify({
        message: 'Fixed asset created successfully',
        ...result,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating fixed asset:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create fixed asset',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET - List fixed assets with filters
export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const categoryId = url.searchParams.get('categoryId');
    const status = url.searchParams.get('status') as 'active' | 'disposed' | 'written_off' | null;
    const location = url.searchParams.get('location');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const filters: any = {};

    if (categoryId) {
      filters.categoryId = parseInt(categoryId);
    }

    if (status) {
      filters.status = status;
    }

    if (location) {
      filters.location = location;
    }

    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    const assets = await assetService.getFixedAssets(filters);

    return new Response(JSON.stringify(assets), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching fixed assets:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch fixed assets',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
