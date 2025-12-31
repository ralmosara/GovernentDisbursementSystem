import type { APIRoute } from 'astro';
import { paymentService } from '../../../lib/services/payment.service';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.dvId || !data.paymentType || !data.amount) {
      return new Response(
        JSON.stringify({ message: 'Missing required fields: dvId, paymentType, amount' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create payment
    const result = await paymentService.createPayment({
      dvId: parseInt(data.dvId),
      paymentType: data.paymentType,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      amount: data.amount.toString(),
      bankName: data.bankName,
      bankAccountNo: data.bankAccountNo,
      adaReference: data.adaReference,
      adaIssuedDate: data.adaIssuedDate ? new Date(data.adaIssuedDate) : undefined,
      createdBy: user.id,
    });

    return new Response(
      JSON.stringify({
        message: 'Payment created successfully',
        id: result.id,
        checkNo: result.checkNo,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get query parameters
    const status = url.searchParams.get('status') as any;
    const paymentType = url.searchParams.get('paymentType') as any;
    const fiscalYear = url.searchParams.get('fiscalYear');
    const search = url.searchParams.get('search');

    const payments = await paymentService.getPayments({
      status,
      paymentType,
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
      search: search || undefined,
    });

    return new Response(
      JSON.stringify(payments),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching payments:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
