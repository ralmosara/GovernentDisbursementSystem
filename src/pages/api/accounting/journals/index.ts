import type { APIRoute } from 'astro';
import { ledgerService, type JournalType } from '../../../../lib/services/ledger.service';
import { logAudit } from '../../../../lib/middleware/audit-logger';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const JOURNAL_TYPES: JournalType[] = ['general', 'cash_receipts', 'cash_disbursements', 'check_disbursements'];

/**
 * Post a manual journal entry voucher (adjusting, correcting or closing entries).
 * Access: accountants (see access-policy). The service rejects unbalanced entries.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  try {
    const data = await request.json();
    const date = new Date(data.date);
    const fundClusterId = parseInt(data.fundClusterId);
    const particulars = String(data.particulars ?? '').trim();

    if (Number.isNaN(date.getTime())) return json({ message: 'Enter a valid date' }, 400);
    if (!fundClusterId) return json({ message: 'Select a fund cluster' }, 400);
    if (!JOURNAL_TYPES.includes(data.journalType)) return json({ message: 'Select a journal' }, 400);
    if (!particulars) return json({ message: 'Particulars are required' }, 400);
    if (!Array.isArray(data.lines)) return json({ message: 'Add the accounting entries' }, 400);

    const lines = data.lines
      .map((line: any) => ({
        accountCode: String(line.accountCode ?? '').trim(),
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        description: line.description ? String(line.description) : undefined,
        subsidiary: line.subsidiary ? String(line.subsidiary) : undefined,
      }))
      .filter((line: { accountCode: string; debit: number; credit: number }) => line.accountCode || line.debit || line.credit);

    const result = await ledgerService.post({
      date,
      fundClusterId,
      journalType: data.journalType,
      particulars,
      sourceType: 'manual',
      sourceId: null,
      createdBy: user.id,
      lines,
    });

    await logAudit({ userId: user.id, action: 'CREATE', tableName: 'journal_entries', recordId: result.id, newValues: { jevNo: result.jevNo, particulars, lines } });
    return json({ id: result.id, jevNo: result.jevNo }, 201);
  } catch (error) {
    // Validation errors (unbalanced, unknown account) are the user's to fix
    return json({ message: error instanceof Error ? error.message : 'Could not post the entry' }, 400);
  }
};
