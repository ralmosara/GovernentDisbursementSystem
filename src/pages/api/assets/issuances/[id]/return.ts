import type { APIRoute } from 'astro';
import { propertyService } from '../../../../../lib/services/property.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Return property to the supply office */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);
  const id = parseInt(params.id ?? '');
  if (!id) return json({ message: 'Invalid issuance' }, 400);
  try {
    const data = await request.json();
    const returnDate = new Date(data.returnDate);
    if (Number.isNaN(returnDate.getTime())) return json({ message: 'Enter the return date' }, 400);
    await propertyService.returnProperty(id, returnDate, String(data.reason ?? ''), user.id);
    return json({ message: 'Property returned' });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not record the return' }, 400);
  }
};
