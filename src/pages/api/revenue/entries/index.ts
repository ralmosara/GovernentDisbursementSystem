import type { APIRoute } from 'astro';
import { revenueService } from '../../../../lib/services/revenue.service';

// POST - Create new revenue entry
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
    if (!data.revenueSourceId || !data.fundClusterId || !data.amount || !data.fiscalYear) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert string dates to Date objects
    const entryData = {
      ...data,
      entryDate: data.entryDate ? new Date(data.entryDate) : new Date(),
      revenueSourceId: Number(data.revenueSourceId),
      fundClusterId: Number(data.fundClusterId),
      fiscalYear: Number(data.fiscalYear),
    };

    const result = await revenueService.createRevenueEntry(entryData, user.id);

    return new Response(
      JSON.stringify({
        message: 'Revenue entry created successfully',
        ...result,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating revenue entry:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create revenue entry',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET - List revenue entries with filters
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
      startDate: url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')!) : undefined,
      endDate: url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')!) : undefined,
      revenueSourceId: url.searchParams.get('revenueSourceId') ? parseInt(url.searchParams.get('revenueSourceId')!) : undefined,
      fundClusterId: url.searchParams.get('fundClusterId') ? parseInt(url.searchParams.get('fundClusterId')!) : undefined,
      fiscalYear: url.searchParams.get('fiscalYear') ? parseInt(url.searchParams.get('fiscalYear')!) : undefined,
    };

    const entries = await revenueService.getRevenueEntries(filters);

    return new Response(JSON.stringify(entries), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching revenue entries:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch revenue entries',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
