import type { APIRoute } from 'astro';
import { procurementService } from '../../../lib/services/procurement.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const optionalDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Issue a purchase order against an approved purchase request */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  try {
    const data = await request.json();
    const poDate = optionalDate(data.poDate);
    if (!poDate) return json({ message: 'Enter the purchase order date' }, 400);

    const result = await procurementService.createPo(
      {
        prId: parseInt(data.prId),
        poDate,
        supplierName: String(data.supplierName ?? ''),
        supplierAddress: data.supplierAddress,
        supplierTin: data.supplierTin,
        modeOfProcurement: String(data.modeOfProcurement ?? ''),
        placeOfDelivery: data.placeOfDelivery,
        deliveryDate: optionalDate(data.deliveryDate),
        paymentTerm: data.paymentTerm,
        items: (Array.isArray(data.items) ? data.items : []).map((item: any) => ({
          prItemId: parseInt(item.prItemId),
          quantity: Number(item.quantity) || 0,
          unitCost: Number(item.unitCost),
        })),
      },
      user.id
    );
    return json(result, 201);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not issue the purchase order' }, 400);
  }
};
