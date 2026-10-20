import type { APIRoute } from 'astro';
import { ledgerService } from '../../../lib/services/ledger.service';
import { logAudit } from '../../../lib/middleware/audit-logger';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Post every transaction that should be in the books but is not. Idempotent. */
export const POST: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  try {
    const result = await ledgerService.postAllUnposted(user.id);
    await logAudit({ userId: user.id, action: 'PROCESS', tableName: 'journal_entries', recordId: 0, newValues: result });
    return json(result);
  } catch (error) {
    console.error('Posting unposted transactions failed:', error);
    return json({ message: 'Posting failed. Check the server log.' }, 500);
  }
};
