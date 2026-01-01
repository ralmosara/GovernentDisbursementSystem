import type { APIRoute } from 'astro';
import { assetService } from '../../../../lib/services/asset.service';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const isActive = url.searchParams.get('isActive');
    const lowStock = url.searchParams.get('lowStock') === 'true';

    const filters: any = {};
    if (search) filters.search = search;
    if (isActive !== null) filters.isActive = isActive === 'true';
    if (lowStock) filters.lowStock = true;

    const items = await assetService.getInventoryItems(filters);

    return new Response(JSON.stringify(items), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch inventory items' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.itemName || !data.unit || !data.unitCost) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await assetService.createInventoryItem(
      {
        itemName: data.itemName,
        description: data.description,
        unit: data.unit,
        unitCost: data.unitCost,
        quantityOnHand: data.quantityOnHand,
        minimumLevel: data.minimumLevel,
        maximumLevel: data.maximumLevel,
        isActive: data.isActive,
      },
      user.id
    );

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create inventory item' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
