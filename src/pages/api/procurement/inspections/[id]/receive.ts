import type { APIRoute } from 'astro';
import { procurementService } from '../../../../../lib/services/procurement.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Receive an accepted delivery's supplies into inventory, one receipt per IAR line */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);
  const id = parseInt(params.id ?? '');
  if (!id) return json({ message: 'Invalid IAR' }, 400);
  try {
    const data = await request.json();
    const lines = (Array.isArray(data.lines) ? data.lines : []).map((l: any) => ({
      poItemId: parseInt(l.poItemId),
      inventoryItemId: parseInt(l.inventoryItemId) || 0,
    }));
    const receipts = await procurementService.receiveIntoStock(id, lines, user.id);
    return json({ receipts }, 201);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not receive into stock' }, 400);
  }
};
