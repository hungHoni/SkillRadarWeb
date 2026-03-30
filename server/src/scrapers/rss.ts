import Parser from 'rss-parser';
import { processPosts } from '../clustering/engine.js';
import { query } from '../db/client.js';
import { broadcast } from '../sse/broadcast.js';

const parser = new Parser({ timeout: 10_000 });

const RSS_FEEDS = [
	'https://blog.openai.com/rss/',
	'https://ai.googleblog.com/feeds/posts/default?alt=rss',
	'https://engineering.fb.com/feed/',
	'https://netflixtechblog.com/feed',
	'https://blog.cloudflare.com/rss/',
	'https://aws.amazon.com/blogs/aws/feed/',
	'https://devblogs.microsoft.com/engineering-at-microsoft/feed/',
	'https://github.blog/feed/',
	'https://vercel.com/blog/rss.xml',
	'https://www.docker.com/blog/feed/',
	'https://kubernetes.io/feed.xml',
	'https://martinfowler.com/feed.atom',
	'https://overreacted.io/rss.xml',
	'https://kentcdodds.com/blog/rss.xml',
	'https://jvns.ca/atom.xml',
	'https://simonwillison.net/atom/everything/',
	'https://lilianweng.github.io/index.xml',
	'https://karpathy.github.io/feed.xml',
	'https://newsletter.pragmaticengineer.com/feed',
	'https://blog.bytebytego.com/feed',
];

async function updateSourceHealth(status: string): Promise<void> {
	await query(
		`INSERT INTO source_health (source, last_scrape, status, error_count)
		 VALUES ('rss', NOW(), $1, CASE WHEN $1 = 'healthy' THEN 0 ELSE 1 END)
		 ON CONFLICT (source) DO UPDATE SET
			last_scrape = NOW(), status = $1,
			error_count = CASE WHEN $1 = 'healthy' THEN 0
				ELSE source_health.error_count + 1 END`,
		[status],
	);

	broadcast({
		type: 'source:status',
		data: {
			source: 'rss',
			status: status as 'healthy' | 'degraded' | 'down',
			last_scrape: new Date().toISOString(),
		},
	});
}

export async function scrapeRSS(): Promise<void> {
	console.log('[RSS] Starting scrape...');
	let totalPosts = 0;
	let errorCount = 0;

	// Get high-water mark
	const hwResult = await query("SELECT last_scraped_at FROM source_health WHERE source = 'rss'");
	const lastScrapedAt = hwResult.rows[0]?.last_scraped_at
		? new Date(hwResult.rows[0].last_scraped_at)
		: new Date(0);

	for (const feedUrl of RSS_FEEDS) {
		try {
			const feed = await parser.parseURL(feedUrl);

			const posts = (feed.items || [])
				.filter((item) => {
					const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
					return pubDate > lastScrapedAt;
				})
				.slice(0, 10)
				.map((item) => ({
					id: 0,
					source: 'rss' as const,
					source_id: item.guid || item.link || item.title || '',
					title: item.title || 'Untitled',
					snippet: (item.contentSnippet || item.content || '').slice(0, 500) || null,
					url: item.link || null,
					author: item.creator || item['dc:creator'] || null,
					score: 0,
					comment_count: 0,
					subreddit: null,
					created_at: item.pubDate
						? new Date(item.pubDate).toISOString()
						: new Date().toISOString(),
				}));

			if (posts.length > 0) {
				await processPosts(posts);
				totalPosts += posts.length;
			}
		} catch (err) {
			errorCount++;
			console.error(`[RSS] Error fetching ${feedUrl}:`, err);
		}
	}

	if (errorCount >= RSS_FEEDS.length) {
		await updateSourceHealth('down');
	} else {
		await query(
			`INSERT INTO source_health (source, last_scrape, status, last_scraped_at, error_count)
			 VALUES ('rss', NOW(), 'healthy', NOW(), 0)
			 ON CONFLICT (source) DO UPDATE SET
				last_scrape = NOW(), status = 'healthy',
				last_scraped_at = NOW(), error_count = 0`,
		);
	}

	console.log(
		`[RSS] Scrape complete. ${totalPosts} posts from ${RSS_FEEDS.length - errorCount} feeds.`,
	);
}
