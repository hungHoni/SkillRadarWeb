import cors from '@fastify/cors';
import Fastify from 'fastify';
import { config } from './config.js';
import { initDb } from './db/client.js';
import { clustersRoutes } from './routes/clusters.js';
import { risingRoutes } from './routes/rising.js';
import { sourcesRoutes } from './routes/sources.js';
import { trendsRoutes } from './routes/trends.js';
import { startScheduler } from './scrapers/scheduler.js';
import { sseRoutes } from './sse/broadcast.js';

const app = Fastify({
	logger: {
		level: config.nodeEnv === 'development' ? 'info' : 'warn',
	},
});

await app.register(cors, {
	origin: config.corsOrigin,
});

// Routes
await app.register(trendsRoutes, { prefix: '/api' });
await app.register(clustersRoutes, { prefix: '/api' });
await app.register(risingRoutes, { prefix: '/api' });
await app.register(sourcesRoutes, { prefix: '/api' });
await app.register(sseRoutes, { prefix: '/api' });

// Health check
app.get('/health', async () => ({ status: 'ok' }));

async function start() {
	try {
		await initDb();
		app.log.info('Database connected');

		startScheduler();
		app.log.info('Scrapers scheduled');

		await app.listen({ port: config.port, host: '0.0.0.0' });
		app.log.info(`Server running on port ${config.port}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

start();
