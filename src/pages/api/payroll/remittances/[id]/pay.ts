import type { APIRoute } from 'astro';
import { payrollService } from '../../../../../lib/services/payroll.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Record payment of a GSIS, PhilHealth, Pag-IBIG or BIR remittance (posts the JEV) */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  const remittanceId = parseInt(params.id ?? '');
  if (!remittanceId) return json({ message: 'Invalid remittance' }, 400);

  try {
    const data = await request.json();
    const paymentDate = new Date(data.paymentDate);
    if (Number.isNaN(paymentDate.getTime())) return json({ message: 'Enter the payment date' }, 400);
    await payrollService.recordRemittancePayment(remittanceId, { paymentDate, referenceNo: String(data.referenceNo ?? '') }, user.id);
    return json({ message: 'Remittance recorded as paid' });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not record the remittance' }, 400);
  }
};
