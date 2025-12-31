import type { APIRoute } from 'astro';
import { paymentService } from '../../../lib/services/payment.service';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pendingPayments = await paymentService.getPendingPayments();

    return new Response(
      JSON.stringify(pendingPayments),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
