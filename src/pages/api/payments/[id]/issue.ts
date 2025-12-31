import type { APIRoute } from 'astro';
import { paymentService } from '../../../../lib/services/payment.service';

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return new Response(
        JSON.stringify({ message: 'Invalid payment ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.receivedBy || !data.receivedDate) {
      return new Response(
        JSON.stringify({ message: 'Missing required fields: receivedBy, receivedDate' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Issue payment
    const result = await paymentService.issuePayment(parseInt(id), user.id, {
      receivedBy: data.receivedBy,
      receivedDate: new Date(data.receivedDate),
      orNo: data.orNo,
      orDate: data.orDate ? new Date(data.orDate) : undefined,
      remarks: data.remarks,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({ message: result.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: result.message }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error issuing payment:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
