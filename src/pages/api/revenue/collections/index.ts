import type { APIRoute } from 'astro';
import { revenueService } from '../../../../lib/services/revenue.service';

// POST - Record new collection
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
    if (!data.arId || !data.collectionDate || !data.amount || !data.paymentMode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert string dates to Date objects
    const collectionData = {
      ...data,
      collectionDate: new Date(data.collectionDate),
      checkDate: data.checkDate ? new Date(data.checkDate) : undefined,
      arId: Number(data.arId),
    };

    const result = await revenueService.recordCollection(collectionData, user.id);

    return new Response(
      JSON.stringify({
        message: 'Collection recorded successfully',
        ...result,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error recording collection:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to record collection',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET - List collections with filters
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
      arId: url.searchParams.get('arId') ? parseInt(url.searchParams.get('arId')!) : undefined,
      startDate: url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')!) : undefined,
      endDate: url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')!) : undefined,
    };

    const collections = await revenueService.getCollections(filters);

    return new Response(JSON.stringify(collections), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch collections',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
