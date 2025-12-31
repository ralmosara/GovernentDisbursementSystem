import type { APIRoute } from 'astro';
import { approvalService } from '../../../../lib/services/approval.service';

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return new Response(
        JSON.stringify({ message: 'Invalid DV ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();
    const comments = data.comments || undefined;

    // Approve the current workflow stage
    const result = await approvalService.approveStage(parseInt(id), user.id, comments);

    if (!result.success) {
      return new Response(
        JSON.stringify({ message: result.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        message: result.message,
        nextStage: result.nextStage,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error approving DV:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
