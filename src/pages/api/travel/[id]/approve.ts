import type { APIRoute } from 'astro';
import { TravelService } from '../../../../lib/services/travel.service';

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const iotId = parseInt(params.id as string);
    const result = await TravelService.approveIoT(iotId, user.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error approving IoT:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to approve IoT' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
