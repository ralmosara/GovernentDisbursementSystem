import type { APIRoute } from 'astro';
import { budgetService } from '../../../../lib/services/budget.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);
  const id = parseInt(params.id ?? '');
  if (!id) return json({ message: 'Invalid target' }, 400);
  try {
    await budgetService.deleteRevenueTarget(id, user.id);
    return json({ message: 'Target removed' });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'The target could not be removed' }, 400);
  }
};
