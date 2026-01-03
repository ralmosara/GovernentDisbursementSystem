import type { APIRoute } from 'astro';
import { attachmentService } from '../../../../lib/services/attachment.service';
import { getFileFullPath } from '../../../../lib/utils/file-handler';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const id = parseInt(params.id || '0');
    const downloadInfo = await attachmentService.getAttachmentDownloadInfo(id);

    if (!downloadInfo) {
      return new Response('Attachment not found', { status: 404 });
    }

    const fullPath = getFileFullPath(downloadInfo.filePath);

    if (!existsSync(fullPath)) {
      return new Response('File not found on server', { status: 404 });
    }

    // Read file from disk
    const fileBuffer = await readFile(fullPath);

    // Return file with appropriate headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': downloadInfo.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadInfo.originalName)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error downloading attachment:', error);
    return new Response('Failed to download attachment', { status: 500 });
  }
};
