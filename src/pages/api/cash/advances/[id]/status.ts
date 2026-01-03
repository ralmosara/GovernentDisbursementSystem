import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db/connection';
import { cashAdvances } from '../../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { logUpdate } from '../../../../../lib/middleware/audit-logger';

export const PUT: APIRoute = async ({ params, request, locals, clientAddress }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = parseInt(params.id || '0');
    const { status } = await request.json();

    // Validate status
    const validStatuses = ['draft', 'approved', 'released', 'liquidated', 'returned'];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get current cash advance
    const currentCA = await db
      .select()
      .from(cashAdvances)
      .where(eq(cashAdvances.id, id))
      .limit(1);

    if (!currentCA || currentCA.length === 0) {
      return new Response(JSON.stringify({ error: 'Cash advance not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const oldValues = {
      status: currentCA[0].status,
    };

    // Update status
    await db
      .update(cashAdvances)
      .set({ status: status as any })
      .where(eq(cashAdvances.id, id));

    // Log the update
    await logUpdate(
      'cash_advances',
      id,
      oldValues,
      { status },
      user.id,
      clientAddress,
      request.headers.get('user-agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cash advance status updated successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error updating cash advance status:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to update cash advance status',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
