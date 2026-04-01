import Parser from 'rss-parser';
import { processPosts } from '../clustering/engine.js';
import { query } from '../db/client.js';
import { broadcast } from '../sse/broadcast.js';

const parser = new Parser({ timeout: 10_000 });

/** Tech engineering blogs and aggregators */
const TECH_FEEDS = [
	// AI / ML
	'https://openai.com/blog/rss.xml',
	'https://blog.google/technology/ai/rss/',
	'https://lilianweng.github.io/index.xml',

	// Big Tech Engineering
	'https://engineering.fb.com/feed/',
	'https://netflixtechblog.com/feed',
	'https://blog.cloudflare.com/rss/',
	'https://aws.amazon.com/blogs/aws/feed/',
	'https://github.blog/feed/',
	'https://engineering.atspotify.com/feed/',
	'https://eng.uber.com/feed/',
	'https://dropbox.tech/feed',
	'https://medium.com/feed/airbnb-engineering',
	'https://blog.twitter.com/engineering/en_us/blog.rss',
	'https://slack.engineering/feed/',
	'https://engineering.linkedin.com/blog.rss',
	'https://stripe.com/blog/feed.rss',

	// Platforms & Tools
	'https://vercel.com/blog/rss.xml',
	'https://kubernetes.io/feed.xml',
	'https://blog.rust-lang.org/feed.xml',
	'https://go.dev/blog/feed.atom',
	'https://devblogs.microsoft.com/typescript/feed/',
	'https://bun.sh/blog/rss.xml',
	'https://deno.com/feed',

	// Influential Individuals
	'https://martinfowler.com/feed.atom',
	'https://overreacted.io/rss.xml',
	'https://jvns.ca/atom.xml',
	'https://simonwillison.net/atom/everything/',
	'https://newsletter.pragmaticengineer.com/feed',
	'https://blog.bytebytego.com/feed',

	// Tech News & Aggregators
	'https://techcrunch.com/feed/',
	'https://www.theverge.com/rss/index.xml',
	'https://feeds.arstechnica.com/arstechnica/index',
	'https://www.wired.com/feed/rss',
	'https://thenewstack.io/feed/',
	'https://www.infoq.com/feed/',
];

/** World news feeds for breaking_news domain */
const NEWS_FEEDS = [
	'https://feeds.bbci.co.uk/news/world/rss.xml',
	'https://feeds.bbci.co.uk/news/technology/rss.xml',
	'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
	'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
	'https://feeds.reuters.com/reuters/topNews',
	'https://feeds.reuters.com/reuters/technologyNews',
	'https://www.aljazeera.com/xml/rss/all.xml',
	'https://www.theguardian.com/world/rss',
	'https://apnews.com/apf-topnews/feed',
	'https://www.cnbc.com/id/100003114/device/rss/rss.html',
	'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
];

const ALL_FEEDS = [...TECH_FEEDS, ...NEWS_FEEDS];

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

	for (const feedUrl of ALL_FEEDS) {
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
					created_at: item.pubDate
						? new Date(item.pubDate).toISOString()
						: new Date().toISOString(),
				}));

			if (posts.length > 0) {
				const inserted = await processPosts(posts);
				totalPosts += inserted;
			}
		} catch (err) {
			errorCount++;
			console.error(`[RSS] Error fetching ${feedUrl}:`, err);
		}
	}

	if (errorCount >= ALL_FEEDS.length) {
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
		`[RSS] Scrape complete. ${totalPosts} posts from ${ALL_FEEDS.length - errorCount} feeds.`,
	);
}
