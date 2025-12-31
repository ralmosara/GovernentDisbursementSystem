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

    // Clear payment
    const clearDate = data.clearDate ? new Date(data.clearDate) : new Date();
    const result = await paymentService.clearPayment(parseInt(id), user.id, clearDate);

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
    console.error('Error clearing payment:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
