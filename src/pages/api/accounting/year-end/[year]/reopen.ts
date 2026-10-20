import type { APIRoute } from 'astro';
import { ledgerService } from '../../../../../lib/services/ledger.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Reopen a closed fiscal year, reversing its closing entries (administrators only) */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);
  const year = parseInt(params.year ?? '');
  if (!year) return json({ message: 'Invalid fiscal year' }, 400);

  try {
    const { reason } = await request.json().catch(() => ({}));
    const result = await ledgerService.reopenYear(year, user.id, String(reason ?? ''));
    return json({ reversals: result.reversals.map(r => ({ id: r.id, jevNo: r.jevNo })) });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not reopen the year' }, 400);
  }
};
