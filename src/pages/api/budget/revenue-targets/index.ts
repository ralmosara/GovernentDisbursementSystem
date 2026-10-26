import type { APIRoute } from 'astro';
import { budgetService } from '../../../../lib/services/budget.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Set the budgeted receipts for a revenue source, fund cluster and fiscal year */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);
  try {
    const data = await request.json();
    const fiscalYear = parseInt(data.fiscalYear);
    const fundClusterId = parseInt(data.fundClusterId);
    const revenueSourceId = parseInt(data.revenueSourceId);
    if (!fiscalYear || !fundClusterId || !revenueSourceId) return json({ message: 'Choose the year, fund cluster and revenue source' }, 400);
    await budgetService.setRevenueTarget(
      { fiscalYear, fundClusterId, revenueSourceId, amount: Number(data.amount), remarks: data.remarks ? String(data.remarks) : undefined },
      user.id
    );
    return json({ message: 'Target saved' }, 201);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'The target could not be saved' }, 400);
  }
};
