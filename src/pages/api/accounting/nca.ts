import type { APIRoute } from 'astro';
import { ncaService } from '../../../lib/services/nca.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Record a Notice of Cash Allocation received from DBM (also posts its JEV) */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);

  try {
    const data = await request.json();
    const ncaDate = new Date(data.ncaDate);
    if (Number.isNaN(ncaDate.getTime())) return json({ message: 'Enter the NCA date' }, 400);

    const result = await ncaService.createNca(
      {
        ncaNo: String(data.ncaNo ?? ''),
        ncaDate,
        fundClusterId: parseInt(data.fundClusterId),
        amount: Number(data.amount),
        mdsAccount: data.mdsAccount,
        purpose: data.purpose,
      },
      user.id
    );
    return json(result, 201);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not record the NCA' }, 400);
  }
};
