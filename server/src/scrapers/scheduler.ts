import cron from 'node-cron';
import { deactivateStale, mergeClusters, recalculateCentroids } from '../clustering/engine.js';
import { scrapeHN } from './hn.js';
import { scrapeRSS } from './rss.js';

export function startScheduler(): void {
	// Run an immediate scrape on startup (after 10s delay to let DB settle)
	setTimeout(async () => {
		console.log('[Scheduler] Running initial scrape on startup...');
		try {
			await Promise.allSettled([scrapeHN(), scrapeRSS()]);
			console.log('[Scheduler] Initial scrape complete');
		} catch (err) {
			console.error('[Scheduler] Initial scrape failed:', err);
		}
	}, 10_000);

	// HN: every 10 minutes
	cron.schedule('*/10 * * * *', async () => {
		try {
			await scrapeHN();
		} catch (err) {
			console.error('[Scheduler] HN scrape failed:', err);
		}
	});

	// RSS: every 15 minutes (more feeds now, run more frequently)
	cron.schedule('*/15 * * * *', async () => {
		try {
			await scrapeRSS();
		} catch (err) {
			console.error('[Scheduler] RSS scrape failed:', err);
		}
	});

	// Cluster merge pass: every 30 minutes
	cron.schedule('15,45 * * * *', async () => {
		try {
			await mergeClusters();
		} catch (err) {
			console.error('[Scheduler] Cluster merge failed:', err);
		}
	});

	// Deactivate stale clusters: every hour
	cron.schedule('0 * * * *', async () => {
		try {
			await deactivateStale();
		} catch (err) {
			console.error('[Scheduler] Stale deactivation failed:', err);
		}
	});

	// Recalculate centroids: nightly at 3 AM
	cron.schedule('0 3 * * *', async () => {
		try {
			await recalculateCentroids();
		} catch (err) {
			console.error('[Scheduler] Centroid recalculation failed:', err);
		}
	});

	console.log('[Scheduler] All cron jobs scheduled');
}
