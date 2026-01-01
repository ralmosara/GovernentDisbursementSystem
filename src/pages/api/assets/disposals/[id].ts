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
      return new Response(JSON.stringify({ error: 'Invalid disposal ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const disposal = await assetService.getDisposalById(id);

    if (!disposal) {
      return new Response(JSON.stringify({ error: 'Disposal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(disposal), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching disposal:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch disposal' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
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
      return new Response(JSON.stringify({ error: 'Invalid disposal ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await request.json();

    await assetService.updateDisposal(id, {
      disposalDate: data.disposalDate,
      disposalMethod: data.disposalMethod,
      disposalValue: data.disposalValue,
      buyerRecipient: data.buyerRecipient,
      approvedBy: data.approvedBy,
      remarks: data.remarks,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating disposal:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update disposal' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
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
      return new Response(JSON.stringify({ error: 'Invalid disposal ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await assetService.deleteDisposal(id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error deleting disposal:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to delete disposal' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
