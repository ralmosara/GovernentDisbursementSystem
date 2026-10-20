import type { APIRoute } from 'astro';
import { db } from '../../../lib/db/connection';
import { chartOfAccounts } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { logAudit } from '../../../lib/middleware/audit-logger';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;
type AccountType = (typeof TYPES)[number];
const NORMAL_BALANCE: Record<AccountType, 'debit' | 'credit'> = {
  asset: 'debit',
  expense: 'debit',
  liability: 'credit',
  equity: 'credit',
  revenue: 'credit',
};

/** Add an account to the chart of accounts (RCA/UACS 10-digit code) */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  try {
    const data = await request.json();
    const code = String(data.code ?? '').trim();
    const title = String(data.title ?? '').trim();
    const accountType = data.accountType as AccountType;

    if (!/^\d{8,10}$/.test(code)) return json({ message: 'Use the 8- or 10-digit UACS account code' }, 400);
    if (!title) return json({ message: 'Enter the account title' }, 400);
    if (!TYPES.includes(accountType)) return json({ message: 'Choose the account type' }, 400);

    const [existing] = await db.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
    if (existing) return json({ message: `Account ${code} already exists` }, 409);

    const [result] = await db.insert(chartOfAccounts).values({ code, title, accountType, normalBalance: NORMAL_BALANCE[accountType] });
    await logAudit({ userId: user.id, action: 'CREATE', tableName: 'chart_of_accounts', recordId: Number(result.insertId), newValues: { code, title, accountType } });
    return json({ id: Number(result.insertId) }, 201);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not add the account' }, 400);
  }
};
