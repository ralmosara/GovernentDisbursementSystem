import type { APIRoute } from 'astro';
import { buildCoaReport, isCoaReport } from '../../../lib/reports/coa-reports';
import { tableToPdf, tableToWorkbook } from '../../../lib/reports/table-export';
import { getSetting } from '../../../lib/services/settings.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Download a COA report as Excel or PDF: /api/reports/export?report=far-1&format=excel&year=2025 */
export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) return json({ message: 'Unauthorized' }, 401);
  const report = url.searchParams.get('report');
  const format = url.searchParams.get('format') ?? 'excel';
  if (!isCoaReport(report)) return json({ message: 'Unknown report' }, 400);
  if (format !== 'excel' && format !== 'pdf') return json({ message: 'Use format=excel or format=pdf' }, 400);

  try {
    const [table, agencyName] = await Promise.all([buildCoaReport(report, url.searchParams), getSetting('agency_name').catch(() => '')]);
    if (format === 'pdf') {
      return new Response(tableToPdf(table, agencyName ?? ''), {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${table.filename}.pdf"` },
      });
    }
    const buffer = await (await tableToWorkbook(table, agencyName ?? '')).xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${table.filename}.xlsx"`,
      },
    });
  } catch (error) {
    console.error(`Error exporting ${report}:`, error);
    return json({ message: error instanceof Error ? error.message : 'The report could not be exported' }, 500);
  }
};
