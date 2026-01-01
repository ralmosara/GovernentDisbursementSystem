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
    const ctc = await TravelService.getCTCByIoTId(iotId);

    return new Response(JSON.stringify({ ctc }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching CTC:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch CTC' }), {
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

    const result = await TravelService.createCTC({
      iotId,
      travelCompleted: body.travelCompleted,
      actualDepartureDate: new Date(body.actualDepartureDate),
      actualReturnDate: new Date(body.actualReturnDate),
      completionRemarks: body.completionRemarks,
      certifiedBy: user.id,
      verifiedBy: body.verifiedBy || null,
    });

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error creating CTC:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to create CTC' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
