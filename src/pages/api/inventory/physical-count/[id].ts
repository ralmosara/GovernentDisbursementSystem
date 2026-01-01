import type { APIRoute } from 'astro';
import { assetService } from '../../../../lib/services/asset.service';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = parseInt(params.id || '0');
    if (!id) {
      return new Response(JSON.stringify({ error: 'Invalid count ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const count = await assetService.getPhysicalCountById(id);

    if (!count) {
      return new Response(JSON.stringify({ error: 'Physical count not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(count), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching physical count:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch physical count' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
