import type { APIRoute } from 'astro';
import { ledgerService } from '../../../../../lib/services/ledger.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Reverse a manual journal entry. Automatic entries are corrected at their source
 * (e.g. cancelling a check reverses its entry) so the books never drift from the records.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  const id = parseInt(params.id ?? '');
  if (!id) return json({ message: 'Invalid journal entry' }, 400);

  try {
    const { reason } = await request.json();
    if (!reason || !String(reason).trim()) return json({ message: 'Give a reason for the reversal' }, 400);

    const entry = await ledgerService.getEntry(id);
    if (!entry) return json({ message: 'Journal entry not found' }, 404);
    if (entry.sourceType !== 'manual') {
      return json({ message: 'Automatic entries are corrected at their source document, or with an adjusting entry.' }, 400);
    }

    const result = await ledgerService.reverse(id, user.id, String(reason).trim());
    return json({ id: result.id, jevNo: result.jevNo });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not reverse the entry' }, 400);
  }
};
