import type { APIRoute } from 'astro';
import { cashService } from '../../../../lib/services/cash.service';

// POST - Create petty cash fund OR disburse/replenish
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
    const action = data.action; // 'create', 'disburse', or 'replenish'

    if (action === 'create') {
      // Create new petty cash fund
      if (!data.fundCode || !data.fundName || !data.custodian || !data.fundAmount || !data.fundClusterId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields for creating fund' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await cashService.createPettyCashFund({
        fundCode: data.fundCode,
        fundName: data.fundName,
        custodian: data.custodian,
        custodianEmployeeId: data.custodianEmployeeId,
        fundAmount: Number(data.fundAmount),
        replenishmentThreshold: data.replenishmentThreshold ? Number(data.replenishmentThreshold) : undefined,
        fundClusterId: Number(data.fundClusterId),
      }, user.id);

      return new Response(
        JSON.stringify({
          message: 'Petty cash fund created successfully',
          id: result.id,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (action === 'disburse') {
      // Disburse from petty cash
      if (!data.fundId || !data.amount || !data.purpose || !data.payee) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields for disbursement' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await cashService.disbursePettyCash(
        Number(data.fundId),
        {
          transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
          amount: Number(data.amount),
          purpose: data.purpose,
          orNo: data.orNo,
          payee: data.payee,
        },
        user.id
      );

      return new Response(
        JSON.stringify({
          message: 'Petty cash disbursed successfully',
          id: result.id,
          needsReplenishment: result.needsReplenishment,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (action === 'replenish') {
      // Replenish petty cash
      if (!data.fundId || !data.dvId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields for replenishment' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await cashService.replenishPettyCash(
        Number(data.fundId),
        Number(data.dvId),
        user.id
      );

      return new Response(
        JSON.stringify({
          message: 'Petty cash replenished successfully',
          id: result.id,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "create", "disburse", or "replenish"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error processing petty cash request:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process petty cash request',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET - List petty cash funds
export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const fundClusterId = url.searchParams.get('fundClusterId') ? parseInt(url.searchParams.get('fundClusterId')!) : undefined;

    const funds = await cashService.getPettyCashFunds(fundClusterId);

    return new Response(JSON.stringify(funds), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching petty cash funds:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch petty cash funds',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
