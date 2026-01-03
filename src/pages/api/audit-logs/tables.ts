import type { APIRoute } from 'astro';
import { auditService } from '../../../lib/services/audit.service';
import { canViewAuditLogs } from '../../../lib/utils/permissions';

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only Admin and Accounting can view audit data
  const hasPermission = await canViewAuditLogs(user.id);
  if (!hasPermission) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const tables = await auditService.getAuditedTables();

    return new Response(JSON.stringify(tables), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching audited tables:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch audited tables' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
