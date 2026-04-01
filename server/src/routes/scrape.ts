import type { FastifyPluginAsync } from 'fastify';
import { query } from '../db/client.js';
import { scrapeHN } from '../scrapers/hn.js';
import { scrapeRSS } from '../scrapers/rss.js';

interface ScrapeResult {
	source: string;
	status: 'success' | 'failed';
	error?: string;
}

export const scrapeRoutes: FastifyPluginAsync = async (app) => {
	app.post('/scrape', async (request, reply) => {
		const { reset } = (request.query as { reset?: string }) || {};

		// Reset high-water marks so scrapers re-fetch everything
		if (reset === 'true') {
			console.log('[Scrape] Resetting high-water marks...');
			await query(
				"UPDATE source_health SET last_scraped_id = NULL, last_scraped_at = NULL WHERE source IN ('hn', 'rss')",
			);
		}

		const scrapers = [
			{ name: 'hn', fn: scrapeHN },
			{ name: 'rss', fn: scrapeRSS },
		];

		const settled = await Promise.allSettled(scrapers.map((s) => s.fn()));

		const results: ScrapeResult[] = settled.map((result, i) => {
			if (result.status === 'fulfilled') {
				return { source: scrapers[i].name, status: 'success' };
			}
			return {
				source: scrapers[i].name,
				status: 'failed',
				error: result.reason instanceof Error ? result.reason.message : String(result.reason),
			};
		});

		const allSucceeded = results.every((r) => r.status === 'success');

		return reply.status(allSucceeded ? 200 : 207).send({ results });
	});
};
