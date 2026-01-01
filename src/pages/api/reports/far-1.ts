import type { APIRoute } from 'astro';
import { reportService } from '../../../lib/services/report.service';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get query parameters
    const fiscalYear = parseInt(url.searchParams.get('fiscalYear') || new Date().getFullYear().toString());
    const fundClusterId = url.searchParams.get('fundClusterId')
      ? parseInt(url.searchParams.get('fundClusterId')!)
      : undefined;

    const report = await reportService.generateFARNo1({
      fiscalYear,
      fundClusterId,
    });

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error generating FAR No. 1:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to generate report' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
