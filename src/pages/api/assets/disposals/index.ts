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
    const assetId = url.searchParams.get('assetId');
    const disposalMethod = url.searchParams.get('disposalMethod');
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');

    const filters: any = {};
    if (assetId) filters.assetId = parseInt(assetId);
    if (disposalMethod) filters.disposalMethod = disposalMethod;
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;

    const disposals = await assetService.getDisposals(filters);

    return new Response(JSON.stringify(disposals), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching disposals:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch disposals' }),
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
    if (!data.assetId || !data.disposalDate || !data.disposalMethod) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await assetService.createDisposal(
      {
        assetId: data.assetId,
        disposalDate: data.disposalDate,
        disposalMethod: data.disposalMethod,
        disposalValue: data.disposalValue,
        buyerRecipient: data.buyerRecipient,
        approvedBy: data.approvedBy,
        remarks: data.remarks,
      },
      user.id
    );

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating disposal:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create disposal' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
