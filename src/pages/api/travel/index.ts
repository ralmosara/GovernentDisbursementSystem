import type { APIRoute } from 'astro';
import { TravelService } from '../../../lib/services/travel.service';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const employeeId = url.searchParams.get('employeeId');
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const filters: any = {};
    if (status) filters.status = status;
    if (employeeId) filters.employeeId = parseInt(employeeId);
    if (fromDate) filters.fromDate = new Date(fromDate);
    if (toDate) filters.toDate = new Date(toDate);
    filters.limit = limit;
    filters.offset = offset;

    const iots = await TravelService.listIoTs(filters);

    return new Response(JSON.stringify({ iots }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching IoTs:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch travel records' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();

    const result = await TravelService.createIoT({
      fundClusterId: body.fundClusterId,
      employeeId: body.employeeId,
      purpose: body.purpose,
      departureDate: new Date(body.departureDate),
      returnDate: new Date(body.returnDate),
      destination: body.destination,
      itineraryBefore: body.itineraryBefore || [],
      estimatedCost: body.estimatedCost,
      cashAdvanceAmount: body.cashAdvanceAmount || 0,
      createdBy: user.id,
    });

    // If submitForApproval is true, submit it immediately
    if (body.submitForApproval && result.iotId) {
      await TravelService.submitIoTForApproval(result.iotId, user.id);
    }

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error creating IoT:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to create IoT' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
