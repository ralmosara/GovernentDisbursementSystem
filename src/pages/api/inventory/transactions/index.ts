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
    const transactionType = url.searchParams.get('transactionType');
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');

    const filters: any = {};
    if (itemId) filters.itemId = parseInt(itemId);
    if (transactionType) filters.transactionType = transactionType;
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;

    const transactions = await assetService.getInventoryTransactions(filters);

    return new Response(JSON.stringify(transactions), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch inventory transactions' }),
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

    if (!data.itemId || !data.transactionDate || !data.transactionType || !data.quantity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await assetService.createInventoryTransaction(
      {
        itemId: data.itemId,
        transactionDate: new Date(data.transactionDate),
        transactionType: data.transactionType,
        quantity: data.quantity,
        unitCost: data.unitCost,
        reference: data.reference,
        requestedBy: data.requestedBy,
        remarks: data.remarks,
      },
      user.id
    );

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating inventory transaction:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create inventory transaction' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
