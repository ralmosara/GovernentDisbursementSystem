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
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(url.searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const fundClusterId = url.searchParams.get('fundClusterId')
      ? parseInt(url.searchParams.get('fundClusterId')!)
      : undefined;

    const report = await reportService.generateFARNo4({
      year,
      month,
      fundClusterId,
    });

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error generating FAR No. 4:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to generate report' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
