import type { APIRoute } from 'astro';
import { db } from '../../../lib/db/connection';
import { fundClusters } from '../../../lib/db/schema';
import { asc, eq } from 'drizzle-orm';

/**
 * Fund clusters for form pickers.
 *
 * Query: ?active=true limits the list to active clusters.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const activeOnly = url.searchParams.get('active') === 'true';

    const rows = await db
      .select({
        id: fundClusters.id,
        code: fundClusters.code,
        name: fundClusters.name,
        description: fundClusters.description,
        isActive: fundClusters.isActive,
      })
      .from(fundClusters)
      .where(activeOnly ? eq(fundClusters.isActive, true) : undefined)
      .orderBy(asc(fundClusters.code));

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching fund clusters:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch fund clusters' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
