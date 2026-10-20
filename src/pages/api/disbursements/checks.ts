import type { APIRoute } from 'astro';
import { insightsService } from '../../../lib/services/insights.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Pre-submit checks for the DV form: possible duplicate payments, and the
 * obligation behind the ORS/BURS number with its remaining balance.
 * GET /api/disbursements/checks?payee=…&amount=…&ors=…&excludeId=…
 */
export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) return json({ message: 'Unauthorized' }, 401);

  try {
    const payee = url.searchParams.get('payee') ?? '';
    const amount = parseFloat(url.searchParams.get('amount') ?? '');
    const ors = url.searchParams.get('ors') ?? '';
    const excludeId = parseInt(url.searchParams.get('excludeId') ?? '') || undefined;

    const [duplicates, obligation] = await Promise.all([
      Number.isFinite(amount) ? insightsService.findPossibleDuplicates({ payeeName: payee, amount, orsBursNo: ors, excludeId }) : [],
      ors ? insightsService.getObligationByReference(ors) : null,
    ]);

    return json({ duplicates, obligation });
  } catch (error) {
    console.error('Error running DV checks:', error);
    return json({ message: 'Could not run checks' }, 500);
  }
};
