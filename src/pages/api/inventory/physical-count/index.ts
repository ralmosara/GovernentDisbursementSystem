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

    const url = new URL(request.url);
    const itemId = url.searchParams.get('itemId');
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');

    const filters: any = {};
    if (itemId) filters.itemId = parseInt(itemId);
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;

    const counts = await assetService.getPhysicalCounts(filters);

    return new Response(JSON.stringify(counts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching physical counts:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch physical counts' }),
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

    if (!data.itemId || !data.countDate || data.physicalQuantity === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await assetService.createPhysicalCount(
      {
        itemId: data.itemId,
        countDate: new Date(data.countDate),
        systemQuantity: data.systemQuantity,
        physicalQuantity: data.physicalQuantity,
        countedBy: data.countedBy,
        verifiedBy: data.verifiedBy,
        remarks: data.remarks,
      },
      user.id
    );

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating physical count:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create physical count' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
