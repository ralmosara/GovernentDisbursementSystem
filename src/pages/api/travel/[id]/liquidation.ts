import type { APIRoute } from 'astro';
import { TravelService } from '../../../../lib/services/travel.service';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const iotId = parseInt(params.id as string);
    const liquidation = await TravelService.getLiquidationByIoTId(iotId);

    return new Response(JSON.stringify({ liquidation }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching liquidation:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch liquidation' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const iotId = parseInt(params.id as string);
    const body = await request.json();

    // Get IoT to retrieve cash advance amount
    const iot = await TravelService.getIoTById(iotId);
    if (!iot) {
      return new Response(JSON.stringify({ error: 'IoT not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await TravelService.createLiquidation({
      iotId,
      ctcId: body.ctcId || null,
      fundClusterId: body.fundClusterId,
      cashAdvanceAmount: parseFloat(iot.iot.cashAdvanceAmount || '0'),
      cashAdvanceDvId: body.cashAdvanceDvId || null,
      expenseItems: body.expenseItems.map((item: any) => ({
        expenseDate: new Date(item.expenseDate),
        expenseCategory: item.expenseCategory,
        description: item.description,
        amount: item.amount,
        orInvoiceNo: item.orInvoiceNo || null,
        orInvoiceDate: item.orInvoiceDate ? new Date(item.orInvoiceDate) : null,
      })),
      submittedBy: user.id,
    });

    // If submitForReview is true, submit it immediately
    if (body.submitForReview && result.lrId) {
      await TravelService.submitLiquidation(result.lrId, user.id);
    }

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error creating liquidation:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to create liquidation' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
