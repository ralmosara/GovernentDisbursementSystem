import type { APIRoute } from 'astro';
import { cashService } from '../../../lib/services/cash.service';

// GET - Get cash position for a date range
export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    const fundClusterIdParam = url.searchParams.get('fundClusterId');

    // Default to today if no dates provided
    const today = new Date();
    const startDate = startDateParam ? new Date(startDateParam) : today;
    const endDate = endDateParam ? new Date(endDateParam) : today;
    const fundClusterId = fundClusterIdParam ? parseInt(fundClusterIdParam) : undefined;

    const position = await cashService.getCashPosition(
      startDate,
      endDate,
      fundClusterId
    );

    return new Response(JSON.stringify(position), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching cash position:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch cash position',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST - Save/Calculate daily cash position
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

    if (!data.date || !data.fundClusterId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: date and fundClusterId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const date = new Date(data.date);
    const fundClusterId = Number(data.fundClusterId);

    // Calculate cash position for the date
    const positionData = await cashService.calculateDailyCashPosition(date, fundClusterId);

    // Save to database
    const result = await cashService.saveDailyCashPosition(positionData, user.id);

    return new Response(
      JSON.stringify({
        message: 'Cash position saved successfully',
        id: result.id,
        data: positionData,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error saving cash position:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to save cash position',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
