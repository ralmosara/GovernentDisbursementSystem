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
    const iot = await TravelService.getIoTById(iotId);

    if (!iot) {
      return new Response(JSON.stringify({ error: 'IoT not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ iot }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching IoT:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch IoT' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
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

    if (body.action === 'submit') {
      const result = await TravelService.submitIoTForApproval(iotId, user.id);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error updating IoT:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to update IoT' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
