import type { APIRoute } from 'astro';
import { auditService } from '../../../lib/services/audit.service';
import { canViewAuditLogs } from '../../../lib/utils/permissions';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Only Admin and Accounting can export audit logs
  const hasPermission = await canViewAuditLogs(user.id);
  if (!hasPermission) {
    return new Response('Permission denied', { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const action = url.searchParams.get('action');
    const tableName = url.searchParams.get('tableName');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const filters = {
      userId: userId ? parseInt(userId) : undefined,
      action: action || undefined,
      tableName: tableName || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const logs = await auditService.getAuditLogs(filters);
    const csv = auditService.exportAuditLogsToCSV(logs);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `audit-logs-${timestamp}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting audit logs:', error);
    return new Response('Failed to export audit logs', { status: 500 });
  }
};
