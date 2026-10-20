import type { APIRoute } from 'astro';
import { procurementService } from '../../../../../lib/services/procurement.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Approve or reject a purchase request (head of office; see access-policy) */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  const id = parseInt(params.id ?? '');
  if (!id) return json({ message: 'Invalid purchase request' }, 400);

  try {
    const { decision, remarks } = await request.json();
    if (decision !== 'approved' && decision !== 'rejected') return json({ message: 'Choose approve or reject' }, 400);
    await procurementService.decidePr(id, user.id, decision, remarks);
    return json({ message: decision === 'approved' ? 'Purchase request approved' : 'Purchase request rejected' });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not record the decision' }, 400);
  }
};
