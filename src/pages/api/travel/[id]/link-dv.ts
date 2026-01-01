import type { APIRoute } from 'astro';
import { TravelService } from '../../../../lib/services/travel.service';

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
    const { dvId } = body;

    if (!dvId) {
      return new Response(JSON.stringify({ error: 'DV ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await TravelService.linkIoTToDV(iotId, parseInt(dvId), user.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error linking IoT to DV:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to link IoT to DV' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
