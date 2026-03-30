import type { ClusterResponse, DomainTag, PostDetail, Source } from '@skillradar/shared';
import type { FastifyPluginAsync } from 'fastify';
import { getHeatLevel } from '../clustering/heat.js';
import { query } from '../db/client.js';

export const clustersRoutes: FastifyPluginAsync = async (app) => {
	app.get<{ Params: { id: string } }>('/clusters/:id', async (request, reply) => {
		const id = Number(request.params.id);

		const clusterResult = await query(
			`SELECT id, title, heat_score, domain_tag, source_count, mention_count, first_seen, last_updated
			 FROM clusters WHERE id = $1`,
			[id],
		);

		if (clusterResult.rows.length === 0) {
			return reply.status(404).send({ error: 'Cluster not found' });
		}

		const row = clusterResult.rows[0];

		const postsResult = await query(
			`SELECT p.id, p.title, p.url, p.source, p.score, p.comment_count, p.author, p.created_at
			 FROM posts p
			 JOIN cluster_posts cp ON cp.post_id = p.id
			 WHERE cp.cluster_id = $1
			 ORDER BY p.score DESC`,
			[id],
		);

		const posts: PostDetail[] = postsResult.rows.map((p) => ({
			id: p.id,
			title: p.title,
			url: p.url,
			source: p.source as Source,
			score: p.score,
			comment_count: p.comment_count,
			author: p.author,
			created_at: p.created_at,
		}));

		const hoursSinceFirstSeen =
			(Date.now() - new Date(row.first_seen).getTime()) / (1000 * 60 * 60);
		const duration =
			hoursSinceFirstSeen < 1
				? 'just now'
				: hoursSinceFirstSeen < 24
					? `${Math.round(hoursSinceFirstSeen)}h ago`
					: `${Math.round(hoursSinceFirstSeen / 24)}d ago`;

		return {
			cluster: {
				id: row.id,
				title: row.title,
				heat_score: row.heat_score,
				heat_level: getHeatLevel(row.heat_score),
				domain_tag: row.domain_tag as DomainTag,
				source_count: row.source_count,
				mention_count: row.mention_count,
				sources: [],
				snippet: posts[0]?.title || null,
				first_seen: row.first_seen,
				trending_duration: duration,
				posts,
			},
		} satisfies ClusterResponse;
	});
};
