import type { ClusterSummary, DomainTag, TrendsResponse } from '@skillradar/shared';
import type { FastifyPluginAsync } from 'fastify';
import { getHeatLevel } from '../clustering/heat.js';
import { query } from '../db/client.js';

export const trendsRoutes: FastifyPluginAsync = async (app) => {
	app.get<{
		Querystring: { domain?: string; limit?: string };
	}>('/trends', async (request) => {
		const domain = request.query.domain || 'all';
		const limit = Math.min(Number(request.query.limit) || 20, 100);

		let sql = `
			SELECT c.id, c.title, c.heat_score, c.domain_tag, c.source_count,
				c.mention_count, c.first_seen, c.last_updated,
				(SELECT snippet FROM posts p
				 JOIN cluster_posts cp ON cp.post_id = p.id
				 WHERE cp.cluster_id = c.id
				 ORDER BY p.score DESC LIMIT 1) as snippet
			FROM clusters c
			WHERE c.is_active = TRUE
		`;
		const params: unknown[] = [];

		if (domain !== 'all') {
			params.push(domain);
			sql += ` AND c.domain_tag = $${params.length}`;
		}

		params.push(limit);
		sql += ` ORDER BY c.heat_score DESC LIMIT $${params.length}`;

		const result = await query(sql, params);

		const clusters: ClusterSummary[] = result.rows.map((row) => {
			const hoursSinceFirstSeen =
				(Date.now() - new Date(row.first_seen).getTime()) / (1000 * 60 * 60);
			const duration =
				hoursSinceFirstSeen < 1
					? 'just now'
					: hoursSinceFirstSeen < 24
						? `${Math.round(hoursSinceFirstSeen)}h ago`
						: `${Math.round(hoursSinceFirstSeen / 24)}d ago`;

			return {
				id: row.id,
				title: row.title,
				heat_score: row.heat_score,
				heat_level: getHeatLevel(row.heat_score),
				domain_tag: row.domain_tag as DomainTag,
				source_count: row.source_count,
				mention_count: row.mention_count,
				sources: [],
				snippet: row.snippet,
				first_seen: row.first_seen,
				trending_duration: duration,
			};
		});

		// Fetch source breakdown for each cluster
		if (clusters.length > 0) {
			const clusterIds = clusters.map((c) => c.id);
			const sourcesResult = await query(
				`SELECT cp.cluster_id, p.source, COUNT(*)::int as count
				 FROM cluster_posts cp
				 JOIN posts p ON p.id = cp.post_id
				 WHERE cp.cluster_id = ANY($1)
				 GROUP BY cp.cluster_id, p.source`,
				[clusterIds],
			);

			const sourceMap = new Map<number, { name: string; count: number; active: boolean }[]>();
			for (const row of sourcesResult.rows) {
				if (!sourceMap.has(row.cluster_id)) {
					sourceMap.set(row.cluster_id, []);
				}
				sourceMap.get(row.cluster_id)?.push({
					name: row.source,
					count: row.count,
					active: true,
				});
			}

			for (const cluster of clusters) {
				cluster.sources = (sourceMap.get(cluster.id) || []) as ClusterSummary['sources'];
			}
		}

		return { clusters } satisfies TrendsResponse;
	});
};
