import type { APIRoute } from 'astro';
import { ledgerService } from '../../../lib/services/ledger.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Post the opening balances of a fund cluster (accountants) */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  try {
    const data = await request.json();
    const fundClusterId = parseInt(data.fundClusterId);
    const [year, month, day] = String(data.date ?? '').split('-').map(Number);
    if (!fundClusterId || !year || !month || !day) return json({ message: 'Choose the fund cluster and opening date' }, 400);
    const lines = (Array.isArray(data.lines) ? data.lines : []).map((line: any) => ({
      accountCode: String(line.accountCode ?? ''),
      subsidiary: line.subsidiary ? String(line.subsidiary) : undefined,
      description: line.description ? String(line.description) : undefined,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
    }));
    const result = await ledgerService.postOpeningBalances({ fundClusterId, date: new Date(year, month - 1, day), lines }, user.id);
    return json({ id: result.id, jevNo: result.jevNo }, 201);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'The opening balances could not be posted' }, 400);
  }
};
