import { query } from '../db/client.js';
import { generateEmbeddings } from '../embedding/openai.js';
import { broadcast } from '../sse/broadcast.js';
import { computeHeat } from './heat.js';
import { getDomainTag } from './tagger.js';

const SIMILARITY_THRESHOLD = 0.82;
const MERGE_THRESHOLD = 0.88;

interface RawPost {
	id: number;
	source: string;
	source_id: string;
	title: string;
	snippet: string | null;
	url: string | null;
	author: string | null;
	score: number;
	comment_count: number;
	subreddit: string | null;
	created_at: string;
}

/**
 * Process a batch of new posts: check URL dedup, generate embeddings,
 * assign to clusters or create new ones, update heat scores.
 */
export async function processPosts(posts: RawPost[]): Promise<number> {
	if (posts.length === 0) return 0;

	// Step 1: URL dedup — skip posts whose URL already exists
	const postsToEmbed: RawPost[] = [];
	for (const post of posts) {
		if (post.url) {
			const existing = await query(
				'SELECT id FROM posts WHERE url = $1 AND url IS NOT NULL LIMIT 1',
				[post.url],
			);
			if (existing.rows.length > 0) {
				// URL already exists — update the existing post's source info if different source
				continue;
			}
		}
		postsToEmbed.push(post);
	}

	if (postsToEmbed.length === 0) return 0;

	// Step 2: Domain tagging
	const taggedPosts = postsToEmbed.map((post) => ({
		...post,
		domain_tag: getDomainTag(post.source, post.subreddit, post.title, post.snippet),
	}));

	// Step 3: Generate embeddings in batch
	const texts = taggedPosts.map((p) => `${p.title} ${p.snippet || ''}`);
	console.log(`[Engine] Generating embeddings for ${texts.length} posts...`);
	const embeddings = await generateEmbeddings(texts);
	const successCount = embeddings.filter((e) => e !== null).length;
	console.log(`[Engine] Embeddings: ${successCount}/${texts.length} succeeded`);

	// Step 4: Insert posts with embeddings and cluster them
	let inserted = 0;
	for (let i = 0; i < taggedPosts.length; i++) {
		const post = taggedPosts[i];
		const embedding = embeddings[i];
		if (!embedding) continue;

		const embeddingStr = `[${embedding.join(',')}]`;

		// Insert post
		const insertResult = await query(
			`INSERT INTO posts (source, source_id, title, snippet, url, author, score, comment_count, subreddit, domain_tag, embedding, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			 ON CONFLICT (source, source_id) DO NOTHING
			 RETURNING id`,
			[
				post.source,
				post.source_id,
				post.title,
				post.snippet,
				post.url,
				post.author,
				post.score,
				post.comment_count,
				post.subreddit,
				post.domain_tag,
				embeddingStr,
				post.created_at,
			],
		);

		if (insertResult.rows.length === 0) continue;
		inserted++;
		const postId = insertResult.rows[0].id;

		// Step 5: Find nearest cluster centroid
		const nearestResult = await query(
			`SELECT id, title, domain_tag, source_count, mention_count, first_seen,
				1 - (centroid <=> $1::vector) as similarity
			 FROM clusters
			 WHERE is_active = TRUE
			 ORDER BY centroid <=> $1::vector
			 LIMIT 5`,
			[embeddingStr],
		);

		const bestMatch = nearestResult.rows[0];

		if (bestMatch && bestMatch.similarity >= SIMILARITY_THRESHOLD) {
			// Assign to existing cluster
			const clusterId = bestMatch.id;
			const n = bestMatch.mention_count;

			// Update centroid incrementally: new = (old * n + new) / (n + 1)
			await query(
				`UPDATE clusters SET
					centroid = (centroid * $2 + $3::vector) / ($2 + 1),
					mention_count = mention_count + 1,
					source_count = (
						SELECT COUNT(DISTINCT p.source)
						FROM cluster_posts cp JOIN posts p ON p.id = cp.post_id
						WHERE cp.cluster_id = $1
					) + CASE WHEN NOT EXISTS (
						SELECT 1 FROM cluster_posts cp JOIN posts p ON p.id = cp.post_id
						WHERE cp.cluster_id = $1 AND p.source = $4
					) THEN 1 ELSE 0 END,
					last_updated = NOW()
				 WHERE id = $1`,
				[clusterId, n, embeddingStr, post.source],
			);

			await query(
				`INSERT INTO cluster_posts (cluster_id, post_id, similarity)
				 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
				[clusterId, postId, bestMatch.similarity],
			);

			// Recompute heat
			const clusterData = await query(
				'SELECT source_count, mention_count, first_seen FROM clusters WHERE id = $1',
				[clusterId],
			);
			if (clusterData.rows.length > 0) {
				const c = clusterData.rows[0];
				const hours = (Date.now() - new Date(c.first_seen).getTime()) / (1000 * 60 * 60);
				const heat = computeHeat(c.source_count, c.mention_count, hours);
				await query('UPDATE clusters SET heat_score = $2 WHERE id = $1', [clusterId, heat]);

				broadcast({
					type: 'cluster:updated',
					data: {
						cluster_id: clusterId,
						heat_score: heat,
						heat_level: heat >= 80 ? 5 : heat >= 40 ? 4 : heat >= 15 ? 3 : heat >= 5 ? 2 : 1,
						mention_count: c.mention_count,
						source_count: c.source_count,
					},
				});
			}
		} else {
			// Create new cluster
			const newCluster = await query(
				`INSERT INTO clusters (title, centroid, domain_tag, heat_score, source_count, mention_count)
				 VALUES ($1, $2, $3, $4, 1, 1)
				 RETURNING id`,
				[post.title, embeddingStr, post.domain_tag, computeHeat(1, 1, 0)],
			);

			const clusterId = newCluster.rows[0].id;
			await query(
				`INSERT INTO cluster_posts (cluster_id, post_id, similarity)
				 VALUES ($1, $2, 1.0)`,
				[clusterId, postId],
			);

			broadcast({
				type: 'cluster:new',
				data: {
					cluster_id: clusterId,
					title: post.title,
					domain_tag: post.domain_tag,
					heat_score: computeHeat(1, 1, 0),
					sources: [{ name: post.source as 'reddit' | 'hn' | 'rss', count: 1, active: true }],
				},
			});
		}
	}
	console.log(`[Engine] Inserted ${inserted}/${taggedPosts.length} posts`);
	return inserted;
}

/**
 * Merge clusters whose centroids are very similar (> MERGE_THRESHOLD).
 * Run every 30 minutes.
 */
export async function mergeClusters(): Promise<void> {
	const result = await query(
		`SELECT a.id as a_id, b.id as b_id,
			1 - (a.centroid <=> b.centroid) as similarity
		 FROM clusters a
		 CROSS JOIN LATERAL (
			SELECT id, centroid FROM clusters
			WHERE id > a.id AND is_active = TRUE
			ORDER BY centroid <=> a.centroid LIMIT 1
		 ) b
		 WHERE a.is_active = TRUE
		 HAVING 1 - (a.centroid <=> b.centroid) > $1`,
		[MERGE_THRESHOLD],
	);

	for (const row of result.rows) {
		// Merge b into a (keep the one with more mentions)
		const aData = await query('SELECT mention_count FROM clusters WHERE id = $1', [row.a_id]);
		const bData = await query('SELECT mention_count FROM clusters WHERE id = $1', [row.b_id]);
		const keepId = aData.rows[0].mention_count >= bData.rows[0].mention_count ? row.a_id : row.b_id;
		const mergeId = keepId === row.a_id ? row.b_id : row.a_id;

		// Move all posts to the kept cluster
		await query(
			`UPDATE cluster_posts SET cluster_id = $1
			 WHERE cluster_id = $2
			 AND post_id NOT IN (SELECT post_id FROM cluster_posts WHERE cluster_id = $1)`,
			[keepId, mergeId],
		);

		// Deactivate merged cluster
		await query('UPDATE clusters SET is_active = FALSE WHERE id = $1', [mergeId]);

		// Recompute stats for kept cluster
		await query(
			`UPDATE clusters SET
				mention_count = (SELECT COUNT(*) FROM cluster_posts WHERE cluster_id = $1),
				source_count = (
					SELECT COUNT(DISTINCT p.source)
					FROM cluster_posts cp JOIN posts p ON p.id = cp.post_id
					WHERE cp.cluster_id = $1
				),
				last_updated = NOW()
			 WHERE id = $1`,
			[keepId],
		);
	}
}

/**
 * Deactivate clusters with no new posts in 48 hours.
 */
export async function deactivateStale(): Promise<void> {
	await query(
		`UPDATE clusters SET is_active = FALSE
		 WHERE is_active = TRUE
		 AND last_updated < NOW() - INTERVAL '48 hours'`,
	);
}

/**
 * Recalculate centroids from actual member embeddings (nightly cron).
 * Fixes centroid drift from incremental updates.
 */
export async function recalculateCentroids(): Promise<void> {
	await query(
		`UPDATE clusters c SET centroid = sub.new_centroid
		 FROM (
			SELECT cp.cluster_id, AVG(p.embedding) as new_centroid
			FROM cluster_posts cp
			JOIN posts p ON p.id = cp.post_id
			WHERE p.embedding IS NOT NULL
			GROUP BY cp.cluster_id
		 ) sub
		 WHERE c.id = sub.cluster_id AND c.is_active = TRUE`,
	);
}
