import type { APIRoute } from 'astro';
import { cashService } from '../../../../lib/services/cash.service';

// POST - Create new bank deposit
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
    if (!data.bankAccountId || !data.depositDate || !data.receiptIds || !Array.isArray(data.receiptIds) || data.receiptIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields or invalid receipt IDs' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const depositData = {
      bankAccountId: Number(data.bankAccountId),
      depositDate: new Date(data.depositDate),
      receiptIds: data.receiptIds.map((id: any) => Number(id)),
      depositedBy: data.depositedBy || `${user.firstName} ${user.lastName}`,
    };

    const result = await cashService.createBankDeposit(depositData, user.id);

    return new Response(
      JSON.stringify({
        message: 'Bank deposit created successfully',
        id: result.id,
        depositSlipNo: result.depositSlipNo,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating bank deposit:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create bank deposit',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET - List bank deposits with filters
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
      status: url.searchParams.get('status') || undefined,
      bankAccountId: url.searchParams.get('bankAccountId') ? parseInt(url.searchParams.get('bankAccountId')!) : undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
    };

    const deposits = await cashService.getBankDeposits(filters);

    return new Response(JSON.stringify(deposits), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching bank deposits:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch bank deposits',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
