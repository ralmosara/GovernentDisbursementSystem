import type { APIRoute } from 'astro';
import { disbursementService } from '../../../lib/services/disbursement.service';

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
    if (
      !data.fundClusterId ||
      !data.orsBursNo ||
      !data.fiscalYear ||
      !data.payeeName ||
      !data.particulars ||
      !data.objectExpenditureId ||
      !data.amount ||
      !data.paymentMode
    ) {
      return new Response(
        JSON.stringify({ message: 'All required fields must be provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create DV
    const result = await disbursementService.createDV({
      fundClusterId: data.fundClusterId,
      orsBursNo: data.orsBursNo,
      fiscalYear: data.fiscalYear,
      payeeName: data.payeeName,
      payeeTin: data.payeeTin,
      payeeAddress: data.payeeAddress,
      particulars: data.particulars,
      responsibilityCenter: data.responsibilityCenter,
      mfoPapId: data.mfoPapId,
      objectExpenditureId: data.objectExpenditureId,
      amount: data.amount,
      paymentMode: data.paymentMode,
      createdBy: user.id,
    });

    return new Response(
      JSON.stringify({
        message: 'Disbursement voucher created successfully',
        id: result.id,
        dvNo: result.dvNo,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating DV:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const status = url.searchParams.get('status') || undefined;
    const fiscalYear = url.searchParams.get('fiscalYear')
      ? parseInt(url.searchParams.get('fiscalYear')!)
      : undefined;
    const search = url.searchParams.get('search') || undefined;

    const dvs = await disbursementService.getDVs({
      status,
      fiscalYear,
      search,
    });

    return new Response(JSON.stringify(dvs), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching DVs:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
