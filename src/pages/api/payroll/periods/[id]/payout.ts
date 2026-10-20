import type { APIRoute } from 'astro';
import { payrollService } from '../../../../../lib/services/payroll.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Record the release of net pay for a processed payroll (marks payslips paid, posts the JEV) */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  const periodId = parseInt(params.id ?? '');
  if (!periodId) return json({ message: 'Invalid payroll period' }, 400);

  try {
    const data = await request.json();
    const paymentDate = new Date(data.paymentDate);
    if (Number.isNaN(paymentDate.getTime())) return json({ message: 'Enter the payment date' }, 400);
    await payrollService.recordPayrollPayout(periodId, { paymentDate, paymentReference: String(data.paymentReference ?? '') }, user.id);
    return json({ message: 'Payroll paid out' });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not record the payout' }, 400);
  }
};
