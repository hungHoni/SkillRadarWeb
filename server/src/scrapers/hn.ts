import { processPosts } from '../clustering/engine.js';
import { query } from '../db/client.js';
import { broadcast } from '../sse/broadcast.js';

const HN_API = 'https://hacker-news.firebaseio.com/v0';
const MAX_STORIES = 50;
const TIMEOUT = 10_000;

interface HNItem {
	id: number;
	title: string;
	text?: string;
	url?: string;
	by?: string;
	score?: number;
	descendants?: number;
	time: number;
	type: string;
}

async function fetchWithTimeout(url: string): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT);
	try {
		return await fetch(url, { signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

async function fetchItem(id: number): Promise<HNItem | null> {
	try {
		const response = await fetchWithTimeout(`${HN_API}/item/${id}.json`);
		if (!response.ok) return null;
		return (await response.json()) as HNItem;
	} catch {
		return null;
	}
}

async function updateSourceHealth(status: string): Promise<void> {
	await query(
		`INSERT INTO source_health (source, last_scrape, status, error_count)
		 VALUES ('hn', NOW(), $1, CASE WHEN $1 = 'healthy' THEN 0 ELSE 1 END)
		 ON CONFLICT (source) DO UPDATE SET
			last_scrape = NOW(), status = $1,
			error_count = CASE WHEN $1 = 'healthy' THEN 0
				ELSE source_health.error_count + 1 END`,
		[status],
	);

	broadcast({
		type: 'source:status',
		data: {
			source: 'hn',
			status: status as 'healthy' | 'degraded' | 'down',
			last_scrape: new Date().toISOString(),
		},
	});
}

export async function scrapeHN(): Promise<void> {
	console.log('[HN] Starting scrape...');

	let retries = 3;
	let topStoryIds: number[] = [];

	while (retries > 0) {
		try {
			const response = await fetchWithTimeout(`${HN_API}/topstories.json`);
			if (!response.ok) throw new Error(`HN API error: ${response.status}`);
			topStoryIds = (await response.json()) as number[];
			break;
		} catch (err) {
			retries--;
			if (retries === 0) {
				console.error('[HN] Failed after 3 retries:', err);
				await updateSourceHealth('down');
				return;
			}
			console.warn(`[HN] Retry ${3 - retries}/3...`);
			await new Promise((r) => setTimeout(r, 30_000));
		}
	}

	// Get high-water mark
	const hwResult = await query("SELECT last_scraped_id FROM source_health WHERE source = 'hn'");
	const lastScrapedId = Number(hwResult.rows[0]?.last_scraped_id) || 0;

	// Only fetch stories newer than high-water mark
	const idsToFetch = topStoryIds.slice(0, MAX_STORIES).filter((id) => id > lastScrapedId);

	const items: HNItem[] = [];
	// Fetch in parallel batches of 10
	for (let i = 0; i < idsToFetch.length; i += 10) {
		const batch = idsToFetch.slice(i, i + 10);
		const results = await Promise.all(batch.map(fetchItem));
		for (const item of results) {
			if (item && item.type === 'story' && item.title) {
				items.push(item);
			}
		}
	}

	const posts = items.map((item) => ({
		id: 0,
		source: 'hn' as const,
		source_id: String(item.id),
		title: item.title,
		snippet: item.text?.slice(0, 500) || null,
		url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
		author: item.by || null,
		score: item.score || 0,
		comment_count: item.descendants || 0,
		created_at: new Date(item.time * 1000).toISOString(),
	}));

	if (posts.length > 0) {
		const inserted = await processPosts(posts);
		console.log(`[HN] ${inserted}/${posts.length} posts actually inserted into DB`);

		// Only advance high-water mark if posts were actually inserted
		if (inserted > 0) {
			const maxId = Math.max(...items.map((i) => i.id));
			await query(
				`INSERT INTO source_health (source, last_scrape, status, last_scraped_id, error_count)
				 VALUES ('hn', NOW(), 'healthy', $1, 0)
				 ON CONFLICT (source) DO UPDATE SET
					last_scrape = NOW(), status = 'healthy',
					last_scraped_id = $1, error_count = 0`,
				[String(maxId)],
			);
		} else {
			console.warn('[HN] 0 posts inserted — NOT advancing high-water mark. Check OpenAI API key.');
			await updateSourceHealth('degraded');
			return;
		}
	}

	await updateSourceHealth('healthy');
	console.log(`[HN] Scrape complete. ${posts.length} stories fetched.`);
}
