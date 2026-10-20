import type { APIRoute } from 'astro';
import { procurementService } from '../../../lib/services/procurement.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const date = (value: unknown) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Record an inspection and acceptance report for a delivery */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  try {
    const data = await request.json();
    const iarDate = date(data.iarDate);
    const dateInspected = date(data.dateInspected);
    const dateReceived = date(data.dateReceived);
    if (!iarDate || !dateInspected || !dateReceived) return json({ message: 'Enter the IAR, inspection and receipt dates' }, 400);

    const result = await procurementService.createIar(
      {
        poId: parseInt(data.poId),
        iarDate,
        invoiceNo: data.invoiceNo,
        invoiceDate: date(data.invoiceDate),
        inspectedBy: String(data.inspectedBy ?? ''),
        dateInspected,
        receivedBy: String(data.receivedBy ?? ''),
        dateReceived,
        remarks: data.remarks,
        items: (Array.isArray(data.items) ? data.items : []).map((item: any) => ({
          poItemId: parseInt(item.poItemId),
          quantity: Number(item.quantity) || 0,
        })),
      },
      user.id
    );
    return json(result, 201);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not record the inspection' }, 400);
  }
};
