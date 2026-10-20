import type { APIRoute } from 'astro';
import { attachmentService } from '../../../../lib/services/attachment.service';
import { getFileFullPath } from '../../../../lib/utils/file-handler';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// Only these types may be rendered inline (e.g. thumbnails); everything else is forced to download
const INLINE_SAFE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

export const GET: APIRoute = async ({ params, locals, url }) => {
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

    const inline = url.searchParams.get('inline') === '1' && INLINE_SAFE_TYPES.includes(downloadInfo.mimeType);
    const disposition = inline ? 'inline' : 'attachment';

    // Return file with appropriate headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': downloadInfo.mimeType,
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(downloadInfo.originalName)}"`,
        'Content-Length': fileBuffer.length.toString(),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: any) {
    console.error('Error downloading attachment:', error);
    return new Response('Failed to download attachment', { status: 500 });
  }
};
