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

let dbReady = false;

const app = Fastify({
	logger: {
		level: 'info',
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

// Health check — responds even if DB isn't ready yet
app.get('/health', async () => ({ status: 'ok', db: dbReady }));

async function start() {
	// Start listening FIRST so healthcheck passes
	await app.listen({ port: config.port, host: '0.0.0.0' });
	console.log(`Server listening on port ${config.port}`);

	// Then connect DB and start scrapers
	try {
		await initDb();
		dbReady = true;
		console.log('Database connected');

		startScheduler();
		console.log('Scrapers scheduled');
	} catch (err) {
		console.error('Database/scheduler init failed:', err);
		// Don't exit — server stays up for healthcheck, can retry DB later
	}
}

start().catch((err) => {
	console.error('Server failed to start:', err);
	process.exit(1);
});
