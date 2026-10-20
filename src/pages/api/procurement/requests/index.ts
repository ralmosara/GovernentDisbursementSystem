import type { APIRoute } from 'astro';
import { procurementService } from '../../../../lib/services/procurement.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Submit a purchase request */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  try {
    const data = await request.json();
    const prDate = new Date(data.prDate);
    if (Number.isNaN(prDate.getTime())) return json({ message: 'Enter the request date' }, 400);

    const result = await procurementService.createPr(
      {
        prDate,
        fundClusterId: parseInt(data.fundClusterId),
        office: data.office,
        purpose: String(data.purpose ?? ''),
        items: (Array.isArray(data.items) ? data.items : []).map((item: any) => ({
          unit: String(item.unit ?? ''),
          description: String(item.description ?? ''),
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
          objectExpenditureId: item.objectExpenditureId ? parseInt(item.objectExpenditureId) : null,
        })),
      },
      user.id
    );
    return json(result, 201);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not submit the request' }, 400);
  }
};
