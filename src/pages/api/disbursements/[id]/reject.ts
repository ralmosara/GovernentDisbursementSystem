import type { APIRoute } from 'astro';
import { approvalService } from '../../../../lib/services/approval.service';
import { workQueueService } from '../../../../lib/services/work-queue.service';

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

    if (!data.comments) {
      return new Response(
        JSON.stringify({ message: 'Rejection comments are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reject the current workflow stage
    const result = await approvalService.rejectStage(parseInt(id), user.id, data.comments);

    if (!result.success) {
      return new Response(
        JSON.stringify({ message: result.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Offer the approver the next voucher waiting for them
    const { next, remaining } = await workQueueService
      .getNextDv({ id: user.id, roles: user.roles ?? [] }, parseInt(id))
      .catch(() => ({ next: null, remaining: 0 }));

    return new Response(
      JSON.stringify({
        message: result.message,
        nextInQueue: next ? { id: next.dvId, dvNo: next.dvNo } : null,
        remainingInQueue: remaining,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error rejecting DV:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
