import type { APIRoute } from 'astro';
import { assetService } from '../../../../../lib/services/asset.service';

// GET - Get depreciation schedule for an asset
export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const assetId = parseInt(params.assetId!);

    if (isNaN(assetId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid asset ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const schedule = await assetService.getDepreciationSchedule(assetId);

    return new Response(JSON.stringify(schedule), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching depreciation schedule:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch depreciation schedule',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
