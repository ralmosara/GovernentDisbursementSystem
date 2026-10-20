import type { APIRoute } from 'astro';
import { insightsService } from '../../../lib/services/insights.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Payees from earlier vouchers, with their last TIN, address and recent particulars,
 * so the DV form can offer to reuse them. GET /api/disbursements/payees?q=…
 */
export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) return json({ message: 'Unauthorized' }, 401);

  try {
    return json({ payees: await insightsService.getPayeeSuggestions(url.searchParams.get('q') ?? '') });
  } catch (error) {
    console.error('Error loading payee suggestions:', error);
    return json({ message: 'Could not load suggestions' }, 500);
  }
};
