import type { APIRoute } from 'astro';
import { disbursementService } from '../../../lib/services/disbursement.service';
import { insightsService } from '../../../lib/services/insights.service';

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

    // Possible duplicate payment: require the preparer to have seen and acknowledged
    // every match, so the warning can't be bypassed by calling the API directly
    const duplicates = await insightsService.findPossibleDuplicates({
      payeeName: data.payeeName,
      amount: Number(data.amount),
      orsBursNo: data.orsBursNo,
    });
    const acknowledged: string[] = Array.isArray(data.duplicateWarningAcknowledged)
      ? data.duplicateWarningAcknowledged.map(String)
      : [];
    const unacknowledged = duplicates.filter(d => !acknowledged.includes(d.dvNo));
    if (unacknowledged.length > 0) {
      return new Response(
        JSON.stringify({
          message: 'This voucher looks like one that already exists. Review the matches before creating it.',
          code: 'POSSIBLE_DUPLICATE',
          duplicates: unacknowledged,
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
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
      taxTreatment: data.taxTreatment,
      payeeType: data.payeeType,
      duplicateWarningAcknowledged: duplicates.length > 0 ? duplicates.map(d => d.dvNo) : undefined,
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
