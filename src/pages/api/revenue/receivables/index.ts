import type { APIRoute } from 'astro';
import { revenueService } from '../../../../lib/services/revenue.service';

// POST - Create new accounts receivable
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
    if (!data.revenueSourceId || !data.debtorName || !data.invoiceDate || !data.dueDate || !data.amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert string dates to Date objects
    const arData = {
      ...data,
      invoiceDate: new Date(data.invoiceDate),
      dueDate: new Date(data.dueDate),
      revenueSourceId: Number(data.revenueSourceId),
    };

    const result = await revenueService.createAccountsReceivable(arData, user.id);

    return new Response(
      JSON.stringify({
        message: 'Accounts receivable created successfully',
        ...result,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating accounts receivable:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create accounts receivable',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET - List accounts receivable with filters
export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const filters: any = {
      status: url.searchParams.get('status') as any || undefined,
      debtorName: url.searchParams.get('debtorName') || undefined,
      revenueSourceId: url.searchParams.get('revenueSourceId') ? parseInt(url.searchParams.get('revenueSourceId')!) : undefined,
      overdue: url.searchParams.get('overdue') === 'true',
    };

    const ars = await revenueService.getAccountsReceivable(filters);

    return new Response(JSON.stringify(ars), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching accounts receivable:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch accounts receivable',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
