import type { APIRoute } from 'astro';
import { auditService } from '../../../lib/services/audit.service';
import { canViewAuditLogs } from '../../../lib/utils/permissions';

export const GET: APIRoute = async ({ params, locals }) => {
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
    const id = parseInt(params.id || '0');
    const log = await auditService.getAuditLogById(id);

    if (!log) {
      return new Response(JSON.stringify({ error: 'Audit log not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(log), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching audit log:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch audit log' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
