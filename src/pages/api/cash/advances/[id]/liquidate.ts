import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db/connection';
import { cashAdvances } from '../../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { logUpdate } from '../../../../../lib/middleware/audit-logger';

export const POST: APIRoute = async ({ params, request, locals, clientAddress }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = parseInt(params.id || '0');
    const data = await request.json();

    // Validate required fields
    if (!data.dateLiquidated || !data.liquidationType || data.totalExpenses === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
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

    // Check if already liquidated
    if (currentCA[0].status === 'liquidated') {
      return new Response(
        JSON.stringify({ error: 'Cash advance already liquidated' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if status is released
    if (currentCA[0].status !== 'released') {
      return new Response(
        JSON.stringify({ error: 'Cash advance must be released before liquidation' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const oldValues = {
      status: currentCA[0].status,
      dateLiquidated: currentCA[0].dateLiquidated,
      remarks: currentCA[0].remarks,
    };

    // Build remarks with liquidation details
    let liquidationRemarks = `Liquidation processed on ${new Date(data.dateLiquidated).toLocaleDateString('en-PH')}\n`;
    liquidationRemarks += `Total Expenses: ₱${parseFloat(data.totalExpenses).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`;
    liquidationRemarks += `Liquidation Type: ${data.liquidationType}\n`;

    if (data.excessAmount > 0) {
      liquidationRemarks += `Excess Returned: ₱${parseFloat(data.excessAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`;
    }

    if (data.shortageAmount > 0) {
      liquidationRemarks += `Shortage (Employee Paid): ₱${parseFloat(data.shortageAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`;
    }

    liquidationRemarks += `\nSupporting Documents:\n${data.supportingDocs}`;

    if (data.remarks) {
      liquidationRemarks += `\n\nAdditional Remarks:\n${data.remarks}`;
    }

    // Update cash advance to liquidated
    await db
      .update(cashAdvances)
      .set({
        status: 'liquidated',
        dateLiquidated: new Date(data.dateLiquidated),
        remarks: liquidationRemarks,
      })
      .where(eq(cashAdvances.id, id));

    // Log the update
    await logUpdate(
      'cash_advances',
      id,
      oldValues,
      {
        status: 'liquidated',
        dateLiquidated: data.dateLiquidated,
        liquidationType: data.liquidationType,
        totalExpenses: data.totalExpenses,
        excessAmount: data.excessAmount,
        shortageAmount: data.shortageAmount,
      },
      user.id,
      clientAddress,
      request.headers.get('user-agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cash advance liquidated successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing liquidation:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process liquidation',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
