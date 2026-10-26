import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db/connection';
import { cashAdvances } from '../../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { logUpdate } from '../../../../../lib/middleware/audit-logger';
import { cashService } from '../../../../../lib/services/cash.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const id = parseInt(params.id || '0');
    const { status, dvId } = await request.json();

    // Liquidation records the expenses, so it has its own endpoint
    if (!['approved', 'released', 'returned'].includes(status)) {
      return json({ error: status === 'liquidated' ? 'Use Process Liquidation to liquidate a cash advance' : 'Invalid status' }, 400);
    }

    const [current] = await db.select().from(cashAdvances).where(eq(cashAdvances.id, id)).limit(1);
    if (!current) return json({ error: 'Cash advance not found' }, 404);

    if (status === 'approved') {
      if (current.status !== 'draft') return json({ error: `Only draft cash advances can be approved (this one is ${current.status})` }, 400);
      await db.update(cashAdvances).set({ status: 'approved' }).where(eq(cashAdvances.id, id));
    } else if (status === 'released') {
      // The advance is paid through a DV; linking it moves the amount into Advances to Officers
      await cashService.releaseCashAdvance(id, parseInt(dvId) || 0, user.id);
    } else {
      await cashService.returnCashAdvance(id, user.id);
    }

    await logUpdate(
      'cash_advances',
      id,
      { status: current.status, dvId: current.dvId },
      { status, ...(status === 'released' ? { dvId: parseInt(dvId) } : {}) },
      user.id,
      request
    );

    return json({ success: true, message: 'Cash advance status updated successfully' });
  } catch (error) {
    console.error('Error updating cash advance status:', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to update cash advance status' }, 400);
  }
};
