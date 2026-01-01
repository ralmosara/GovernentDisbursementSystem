import type { APIRoute } from 'astro';
import { assetService } from '../../../../lib/services/asset.service';

// POST - Create new asset category
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
    if (!data.code || !data.name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: code, name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await assetService.createAssetCategory(data);

    return new Response(
      JSON.stringify({
        message: 'Asset category created successfully',
        ...result,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating asset category:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create asset category',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET - List asset categories with filters
export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const isActiveParam = url.searchParams.get('isActive');
    const isActive = isActiveParam ? isActiveParam === 'true' : undefined;

    const categories = await assetService.getAssetCategories(isActive);

    return new Response(JSON.stringify(categories), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching asset categories:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch asset categories',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
