import type { APIRoute } from 'astro';
import { ledgerService } from '../../../lib/services/ledger.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Post a month's depreciation of PPE to the general ledger (accountants) */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  try {
    const { year, month } = await request.json().catch(() => ({}));
    const result = await ledgerService.postDepreciation(parseInt(year), parseInt(month), user.id);
    return json({ id: result.id, jevNo: result.jevNo, created: result.created });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Depreciation could not be posted' }, 400);
  }
};
