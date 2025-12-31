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

    // Validate reason
    if (!data.reason || data.reason.trim() === '') {
      return new Response(
        JSON.stringify({ message: 'Cancellation reason is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Cancel payment
    const result = await paymentService.cancelPayment(parseInt(id), user.id, data.reason);

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
    console.error('Error cancelling payment:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
