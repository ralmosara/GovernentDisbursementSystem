import type { APIRoute } from 'astro';
import { propertyService } from '../../../../lib/services/property.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Issue property to an accountable officer (PAR or ICS by cost) */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, 401);
  try {
    const data = await request.json();
    const issueDate = new Date(data.issueDate);
    if (Number.isNaN(issueDate.getTime())) return json({ message: 'Enter the issue date' }, 400);
    const result = await propertyService.issue(
      { assetId: parseInt(data.assetId), issuedTo: String(data.issuedTo ?? ''), position: data.position, office: data.office, issueDate, remarks: data.remarks },
      user.id
    );
    return json(result, 201);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Could not issue the property' }, 400);
  }
};
