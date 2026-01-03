import type { APIRoute } from 'astro';
import { auditService } from '../../../lib/services/audit.service';
import { canViewAuditLogs } from '../../../lib/utils/permissions';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only Admin and Accounting can view audit logs
  const hasPermission = await canViewAuditLogs(user.id);
  if (!hasPermission) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const action = url.searchParams.get('action');
    const tableName = url.searchParams.get('tableName');
    const recordId = url.searchParams.get('recordId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    const filters = {
      userId: userId ? parseInt(userId) : undefined,
      action: action || undefined,
      tableName: tableName || undefined,
      recordId: recordId ? parseInt(recordId) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    };

    const logs = await auditService.getAuditLogs(filters);

    return new Response(JSON.stringify(logs), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch audit logs' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
