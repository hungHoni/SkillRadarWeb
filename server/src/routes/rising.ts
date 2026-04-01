import type { DomainTag, RisingResponse, RisingTopic } from '@skillradar/shared';
import type { FastifyPluginAsync } from 'fastify';
import { query } from '../db/client.js';

export const risingRoutes: FastifyPluginAsync = async (app) => {
	app.get<{ Querystring: { limit?: string } }>('/rising', async (request) => {
		const limit = Math.min(Number(request.query.limit) || 10, 50);

		// Rising = clusters whose heat increased most in the last 2 hours
		// We approximate by looking at recently updated clusters with high heat
		// that were first seen recently (strong recency signal)
		const result = await query(
			`SELECT id as cluster_id, title, domain_tag, heat_score, mention_count, source_count,
				CASE
					WHEN first_seen > NOW() - INTERVAL '2 hours' THEN -1
					ELSE LEAST(ROUND((heat_score / GREATEST(
						(SELECT heat_score FROM clusters c2
						 WHERE c2.id = clusters.id), 0.01
					) - 1) * 100), 500)
				END as pct_change
			 FROM clusters
			 WHERE is_active = TRUE
				AND last_updated > NOW() - INTERVAL '4 hours'
			 ORDER BY
				CASE WHEN mention_count > 1 THEN 0 ELSE 1 END,
				heat_score DESC
			 LIMIT $1`,
			[limit],
		);

		const rising: RisingTopic[] = result.rows.map((row) => ({
			cluster_id: row.cluster_id,
			title: row.title,
			domain_tag: row.domain_tag as DomainTag,
			heat_score: row.heat_score,
			pct_change: Number(row.pct_change) || 0,
		}));

		return { rising } satisfies RisingResponse;
	});
};
