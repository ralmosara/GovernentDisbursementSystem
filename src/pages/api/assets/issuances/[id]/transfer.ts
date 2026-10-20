import type { APIRoute } from 'astro';
import { propertyService } from '../../../../../lib/services/property.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Transfer property to another accountable officer (Property Transfer Report) */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);
  const id = parseInt(params.id ?? '');
  if (!id) return json({ message: 'Invalid issuance' }, 400);
  try {
    const data = await request.json();
    const issueDate = new Date(data.issueDate);
    if (Number.isNaN(issueDate.getTime())) return json({ message: 'Enter the transfer date' }, 400);
    const result = await propertyService.transfer(
      id,
      { issuedTo: String(data.issuedTo ?? ''), position: data.position, office: data.office, issueDate, remarks: data.remarks },
      String(data.reason ?? ''),
      user.id
    );
    return json(result, 201);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not transfer the property' }, 400);
  }
};
