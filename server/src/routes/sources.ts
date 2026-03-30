import type { Source, SourceHealth, SourceStatus, SourcesHealthResponse } from '@skillradar/shared';
import type { FastifyPluginAsync } from 'fastify';
import { query } from '../db/client.js';

export const sourcesRoutes: FastifyPluginAsync = async (app) => {
	app.get('/sources/health', async () => {
		const result = await query(
			'SELECT source, status, last_scrape FROM source_health ORDER BY source',
		);

		const sources: SourceHealth[] = result.rows.map((row) => ({
			name: row.source as Source,
			status: row.status as SourceStatus,
			last_scrape: row.last_scrape,
		}));

		return { sources } satisfies SourcesHealthResponse;
	});
};
