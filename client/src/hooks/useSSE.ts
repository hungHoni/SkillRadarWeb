import type { SSEEvent } from '@skillradar/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSSEOptions {
	onEvent: (event: SSEEvent) => void;
}

export function useSSE({ onEvent }: UseSSEOptions) {
	const [connected, setConnected] = useState(false);
	const eventSourceRef = useRef<EventSource | null>(null);
	const lastEventIdRef = useRef<string | null>(null);
	const retryDelayRef = useRef(1000);
	const onEventRef = useRef(onEvent);
	onEventRef.current = onEvent;

	const connect = useCallback(() => {
		const base = import.meta.env.VITE_API_URL || window.location.origin;
		const url = `${base}/api/sse/stream`;
		const es = new EventSource(url);
		eventSourceRef.current = es;

		es.addEventListener('connected', () => {
			setConnected(true);
			retryDelayRef.current = 1000; // Reset backoff on success
		});

		const handleEvent = (type: SSEEvent['type']) => (e: MessageEvent) => {
			lastEventIdRef.current = e.lastEventId;
			try {
				const data = JSON.parse(e.data);
				onEventRef.current({ type, data } as SSEEvent);
			} catch {
				console.error('[SSE] Failed to parse event:', e.data);
			}
		};

		es.addEventListener('cluster:new', handleEvent('cluster:new'));
		es.addEventListener('cluster:updated', handleEvent('cluster:updated'));
		es.addEventListener('source:status', handleEvent('source:status'));

		es.onerror = () => {
			setConnected(false);
			es.close();

			// Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
			const delay = Math.min(retryDelayRef.current, 30_000);
			retryDelayRef.current *= 2;

			setTimeout(() => {
				connect();
			}, delay);
		};
	}, []);

	useEffect(() => {
		connect();
		return () => {
			eventSourceRef.current?.close();
		};
	}, [connect]);

	return { connected };
}
