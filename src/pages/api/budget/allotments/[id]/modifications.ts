import type { APIRoute } from 'astro';
import { budgetService } from '../../../../../lib/services/budget.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const TYPES = ['augmentation', 'reduction', 'realignment'] as const;

/** Augment, reduce or realign an allotment */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);
  const id = parseInt(params.id ?? '');
  if (!id) return json({ message: 'Invalid allotment' }, 400);

  try {
    const data = await request.json();
    const type = TYPES.find(t => t === data.type);
    if (!type) return json({ message: 'Choose augment, reduce or realign' }, 400);
    const [year, month, day] = String(data.date ?? '').split('-').map(Number);
    if (!year || !month || !day) return json({ message: 'Enter the date of the change' }, 400);

    await budgetService.modifyAllotment(
      id,
      {
        type,
        amount: Number(data.amount),
        targetAllotmentId: parseInt(data.targetAllotmentId) || undefined,
        reference: String(data.reference ?? ''),
        reason: data.reason ? String(data.reason) : undefined,
        date: new Date(year, month - 1, day),
      },
      user.id
    );
    return json({ message: 'Allotment modified' }, 201);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'The allotment could not be modified' }, 400);
  }
};
