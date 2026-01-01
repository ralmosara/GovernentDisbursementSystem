import type { APIRoute } from 'astro';
import { cashService } from '../../../../lib/services/cash.service';

// POST - Create new bank reconciliation
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
    if (!data.bankAccountId || !data.reconciliationDate || !data.periodMonth || !data.periodYear || data.bankBalance === undefined || data.bookBalance === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const reconData = {
      bankAccountId: Number(data.bankAccountId),
      reconciliationDate: new Date(data.reconciliationDate),
      periodMonth: Number(data.periodMonth),
      periodYear: Number(data.periodYear),
      bankBalance: Number(data.bankBalance),
      bookBalance: Number(data.bookBalance),
      outstandingChecks: data.outstandingChecks || [],
      depositsInTransit: data.depositsInTransit || [],
      bankCharges: data.bankCharges ? Number(data.bankCharges) : undefined,
      bankInterest: data.bankInterest ? Number(data.bankInterest) : undefined,
    };

    const result = await cashService.createBankReconciliation(reconData, user.id);

    return new Response(
      JSON.stringify({
        message: 'Bank reconciliation created successfully',
        id: result.id,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating bank reconciliation:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create bank reconciliation',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET - List bank reconciliations with filters
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
      bankAccountId: url.searchParams.get('bankAccountId') ? parseInt(url.searchParams.get('bankAccountId')!) : undefined,
      month: url.searchParams.get('month') ? parseInt(url.searchParams.get('month')!) : undefined,
      year: url.searchParams.get('year') ? parseInt(url.searchParams.get('year')!) : undefined,
    };

    const reconciliations = await cashService.getBankReconciliations(filters);

    return new Response(JSON.stringify(reconciliations), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching bank reconciliations:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch bank reconciliations',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
