import type { APIRoute } from 'astro';
import { cashService } from '../../../../lib/services/cash.service';

// POST - Create new cash receipt
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
    if (!data.orSeriesId || !data.payorName || !data.amount || !data.paymentMode || !data.particulars || !data.fundClusterId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert string dates to Date objects
    const receiptData = {
      ...data,
      receiptDate: data.receiptDate ? new Date(data.receiptDate) : new Date(),
      checkDate: data.checkDate ? new Date(data.checkDate) : undefined,
      amount: Number(data.amount),
    };

    const result = await cashService.createCashReceipt(receiptData, user.id);

    return new Response(
      JSON.stringify({
        message: 'Cash receipt created successfully',
        id: result.id,
        orNo: result.orNo,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating cash receipt:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create cash receipt',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET - List cash receipts with filters
export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const filters = {
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      fundClusterId: url.searchParams.get('fundClusterId') ? parseInt(url.searchParams.get('fundClusterId')!) : undefined,
      paymentMode: url.searchParams.get('paymentMode') || undefined,
      search: url.searchParams.get('search') || undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
    };

    const receipts = await cashService.getCashReceipts(filters);

    return new Response(JSON.stringify(receipts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching cash receipts:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch cash receipts',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
