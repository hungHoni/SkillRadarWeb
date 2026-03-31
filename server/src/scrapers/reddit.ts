import { processPosts } from '../clustering/engine.js';
import { config } from '../config.js';
import { query } from '../db/client.js';
import { broadcast } from '../sse/broadcast.js';

const SUBREDDITS = [
	'MachineLearning',
	'LocalLLaMA',
	'artificial',
	'javascript',
	'reactjs',
	'node',
	'golang',
	'rust',
	'Python',
	'webdev',
	'devops',
	'kubernetes',
	'systemdesign',
	'cscareerquestions',
	'experienceddevs',
];

let accessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
	if (accessToken && Date.now() < tokenExpiresAt - 60_000) {
		return accessToken;
	}

	const credentials = Buffer.from(
		`${config.reddit.clientId}:${config.reddit.clientSecret}`,
	).toString('base64');

	const response = await fetch('https://www.reddit.com/api/v1/access_token', {
		method: 'POST',
		headers: {
			Authorization: `Basic ${credentials}`,
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': config.reddit.userAgent,
		},
		body: 'grant_type=client_credentials',
	});

	if (!response.ok) {
		throw new Error(`Reddit OAuth failed: ${response.status}`);
	}

	const data = (await response.json()) as { access_token: string; expires_in: number };
	accessToken = data.access_token;
	tokenExpiresAt = Date.now() + data.expires_in * 1000;
	return accessToken;
}

interface RedditPost {
	data: {
		id: string;
		title: string;
		selftext: string;
		url: string;
		author: string;
		score: number;
		num_comments: number;
		subreddit: string;
		created_utc: number;
	};
}

async function fetchSubreddit(subreddit: string): Promise<void> {
	const token = await getAccessToken();

	// Get high-water mark
	const hwResult = await query("SELECT last_scraped_id FROM source_health WHERE source = 'reddit'");
	const after = hwResult.rows[0]?.last_scraped_id || null;

	const url = `https://oauth.reddit.com/r/${subreddit}/hot?limit=25${after ? `&after=t3_${after}` : ''}`;

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
			'User-Agent': config.reddit.userAgent,
		},
	});

	if (response.status === 429) {
		console.warn(`Reddit rate limited on r/${subreddit}. Backing off.`);
		await updateSourceHealth('degraded');
		return;
	}

	if (!response.ok) {
		throw new Error(`Reddit API error: ${response.status}`);
	}

	const data = (await response.json()) as { data: { children: RedditPost[] } };

	const posts = data.data.children.map((child) => ({
		id: 0,
		source: 'reddit' as const,
		source_id: child.data.id,
		title: child.data.title,
		snippet: child.data.selftext?.slice(0, 500) || null,
		url: child.data.url || null,
		author: child.data.author,
		score: child.data.score,
		comment_count: child.data.num_comments,
		subreddit: child.data.subreddit,
		created_at: new Date(child.data.created_utc * 1000).toISOString(),
	}));

	if (posts.length > 0) {
		const inserted = await processPosts(posts);

		// Only advance high-water mark if posts were actually inserted
		if (inserted > 0) {
			await query(
				`INSERT INTO source_health (source, last_scrape, status, last_scraped_id)
				 VALUES ('reddit', NOW(), 'healthy', $1)
				 ON CONFLICT (source) DO UPDATE SET
					last_scrape = NOW(), status = 'healthy',
					last_scraped_id = $1, error_count = 0`,
				[posts[posts.length - 1].source_id],
			);
		} else {
			console.warn(`[Reddit] 0 posts inserted from r/${subreddit} — check OpenAI API key`);
		}
	}
}

async function updateSourceHealth(status: string): Promise<void> {
	await query(
		`INSERT INTO source_health (source, last_scrape, status, error_count)
		 VALUES ('reddit', NOW(), $1, 1)
		 ON CONFLICT (source) DO UPDATE SET
			status = $1, error_count = source_health.error_count + 1`,
		[status],
	);

	broadcast({
		type: 'source:status',
		data: {
			source: 'reddit',
			status: status as 'healthy' | 'degraded' | 'down',
			last_scrape: new Date().toISOString(),
		},
	});
}

export async function scrapeReddit(): Promise<void> {
	console.log('[Reddit] Starting scrape...');
	let errorCount = 0;

	for (const subreddit of SUBREDDITS) {
		try {
			await fetchSubreddit(subreddit);
		} catch (err) {
			errorCount++;
			console.error(`[Reddit] Error on r/${subreddit}:`, err);
		}
	}

	if (errorCount >= SUBREDDITS.length) {
		await updateSourceHealth('down');
	} else if (errorCount > 0) {
		await updateSourceHealth('degraded');
	}

	console.log(`[Reddit] Scrape complete. Errors: ${errorCount}/${SUBREDDITS.length}`);
}
