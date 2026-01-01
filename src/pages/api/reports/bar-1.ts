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
    const quarter = parseInt(url.searchParams.get('quarter') || '1') as 1 | 2 | 3 | 4;
    const fundClusterId = url.searchParams.get('fundClusterId')
      ? parseInt(url.searchParams.get('fundClusterId')!)
      : undefined;

    // Validate quarter
    if (![1, 2, 3, 4].includes(quarter)) {
      return new Response(JSON.stringify({ error: 'Invalid quarter. Must be 1, 2, 3, or 4' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const report = await reportService.generateBARNo1Quarterly({
      year,
      quarter,
      fundClusterId,
    });

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error generating BAR No. 1:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to generate report' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
