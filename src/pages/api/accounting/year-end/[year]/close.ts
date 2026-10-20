import type { APIRoute } from 'astro';
import { ledgerService } from '../../../../../lib/services/ledger.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Close a fiscal year: post closing entries per fund and lock the year (accountants) */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);
  const year = parseInt(params.year ?? '');
  if (!year) return json({ message: 'Invalid fiscal year' }, 400);

  try {
    const { remarks } = await request.json().catch(() => ({}));
    const result = await ledgerService.closeYear(year, user.id, remarks);
    return json({ closingEntries: result.closingEntries.map(e => ({ id: e.id, jevNo: e.jevNo })) });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not close the year' }, 400);
  }
};
