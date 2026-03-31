import type { FastifyPluginAsync } from 'fastify';
import { scrapeHN } from '../scrapers/hn.js';
import { scrapeRSS } from '../scrapers/rss.js';
import { scrapeReddit } from '../scrapers/reddit.js';

interface ScrapeResult {
	source: string;
	status: 'success' | 'failed';
	error?: string;
}

export const scrapeRoutes: FastifyPluginAsync = async (app) => {
	app.post('/scrape', async (_request, reply) => {
		const scrapers = [
			{ name: 'hn', fn: scrapeHN },
			{ name: 'rss', fn: scrapeRSS },
			{ name: 'reddit', fn: scrapeReddit },
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
