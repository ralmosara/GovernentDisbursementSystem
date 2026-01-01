import type { APIRoute } from 'astro';
import { revenueService } from '../../../../lib/services/revenue.service';

// POST - Create new revenue source
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
    if (!data.code || !data.name || !data.category) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: code, name, category' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await revenueService.createRevenueSource(data);

    return new Response(
      JSON.stringify({
        message: 'Revenue source created successfully',
        ...result,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating revenue source:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create revenue source',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET - List revenue sources with filters
export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const isActiveParam = url.searchParams.get('isActive');
    const isActive = isActiveParam ? isActiveParam === 'true' : undefined;

    const sources = await revenueService.getRevenueSources(isActive);

    return new Response(JSON.stringify(sources), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching revenue sources:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch revenue sources',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
