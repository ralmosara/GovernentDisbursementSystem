import type { APIRoute } from 'astro';
import { TravelService } from '../../../lib/services/travel.service';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const fiscalYear = url.searchParams.get('fiscalYear');

    const [
      stats,
      pendingApprovals,
      outstandingCashAdvances,
      unliquidatedTravels
    ] = await Promise.all([
      TravelService.getTravelStats(fiscalYear ? parseInt(fiscalYear) : undefined),
      TravelService.getPendingApprovals(),
      TravelService.getOutstandingCashAdvances(),
      TravelService.getUnliquidatedTravels()
    ]);

    return new Response(JSON.stringify({
      stats,
      pendingApprovals,
      outstandingCashAdvances,
      unliquidatedTravels
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching travel dashboard:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch dashboard data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
