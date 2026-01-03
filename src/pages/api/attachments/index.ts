import type { APIRoute } from 'astro';
import { attachmentService } from '../../../lib/services/attachment.service';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const attachableType = url.searchParams.get('attachableType');
    const attachableId = url.searchParams.get('attachableId');

    if (!attachableType || !attachableId) {
      return new Response(
        JSON.stringify({ error: 'attachableType and attachableId are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const attachments = await attachmentService.getAttachments(
      attachableType,
      parseInt(attachableId)
    );

    return new Response(JSON.stringify(attachments), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching attachments:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch attachments' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const attachableType = formData.get('attachableType') as string;
    const attachableId = formData.get('attachableId') as string;
    const documentType = formData.get('documentType') as string | null;
    const description = formData.get('description') as string | null;

    if (!file || !attachableType || !attachableId) {
      return new Response(
        JSON.stringify({ error: 'file, attachableType, and attachableId are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const attachment = await attachmentService.createAttachment(
      {
        attachableType,
        attachableId: parseInt(attachableId),
        file,
        documentType: documentType || undefined,
        description: description || undefined,
      },
      user.id
    );

    return new Response(JSON.stringify(attachment), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error uploading attachment:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to upload attachment' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
