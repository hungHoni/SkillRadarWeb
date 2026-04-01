import type { SSEEvent } from '@skillradar/shared';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { config } from '../config.js';

interface SSEClient {
	id: string;
	reply: FastifyReply;
}

const clients: SSEClient[] = [];
const eventBuffer: { id: number; event: SSEEvent }[] = [];
let eventCounter = 0;
const MAX_BUFFER_SIZE = 100;

function getCorsOrigin(requestOrigin: string | undefined): string | null {
	const allowed = config.corsOrigin;
	if (allowed === true) return requestOrigin || '*';
	if (allowed === false || !allowed) return null;
	if (typeof allowed === 'string') return allowed;
	if (Array.isArray(allowed) && requestOrigin && allowed.includes(requestOrigin))
		return requestOrigin;
	return null;
}

export function broadcast(event: SSEEvent): void {
	eventCounter++;
	const entry = { id: eventCounter, event };

	// Add to replay buffer
	eventBuffer.push(entry);
	if (eventBuffer.length > MAX_BUFFER_SIZE) {
		eventBuffer.shift();
	}

	const data = `id: ${entry.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;

	for (let i = clients.length - 1; i >= 0; i--) {
		try {
			clients[i].reply.raw.write(data);
		} catch {
			clients.splice(i, 1);
		}
	}
}

export const sseRoutes: FastifyPluginAsync = async (app) => {
	app.get('/sse/stream', async (request, reply) => {
		const origin = request.headers.origin;
		const corsOrigin = getCorsOrigin(origin);

		const headers: Record<string, string> = {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		};

		if (corsOrigin) {
			headers['Access-Control-Allow-Origin'] = corsOrigin;
			headers['Access-Control-Allow-Credentials'] = 'true';
		}

		reply.raw.writeHead(200, headers);

		const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const client: SSEClient = { id: clientId, reply };
		clients.push(client);

		// Replay missed events if Last-Event-ID is provided
		const lastEventId = Number(request.headers['last-event-id']);
		if (lastEventId && !Number.isNaN(lastEventId)) {
			for (const entry of eventBuffer) {
				if (entry.id > lastEventId) {
					const data = `id: ${entry.id}\nevent: ${entry.event.type}\ndata: ${JSON.stringify(entry.event.data)}\n\n`;
					reply.raw.write(data);
				}
			}
		}

		// Send initial connection event
		reply.raw.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

		// Heartbeat every 30s
		const heartbeat = setInterval(() => {
			try {
				reply.raw.write(': heartbeat\n\n');
			} catch {
				clearInterval(heartbeat);
			}
		}, 30_000);

		// Clean up on disconnect
		request.raw.on('close', () => {
			clearInterval(heartbeat);
			const idx = clients.findIndex((c) => c.id === clientId);
			if (idx !== -1) clients.splice(idx, 1);
		});

		// Don't end the response — keep it open for SSE
		await new Promise(() => {});
	});
};
