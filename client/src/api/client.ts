import type {
	ClusterResponse,
	RisingResponse,
	SourcesHealthResponse,
	TrendsResponse,
} from '@skillradar/shared';
import { mockFetchCluster, mockFetchRising, mockFetchSourcesHealth, mockFetchTrends } from './mock';

const API_BASE = '/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

async function fetchJSON<T>(path: string): Promise<T> {
	const response = await fetch(`${API_BASE}${path}`);
	if (!response.ok) {
		throw new Error(`API error: ${response.status} ${response.statusText}`);
	}
	return response.json() as Promise<T>;
}

export function fetchTrends(domain = 'all', limit = 20): Promise<TrendsResponse> {
	if (USE_MOCK) return mockFetchTrends(domain, limit);
	return fetchJSON(`/trends?domain=${domain}&limit=${limit}`);
}

export function fetchCluster(id: number): Promise<ClusterResponse> {
	if (USE_MOCK) return mockFetchCluster(id);
	return fetchJSON(`/clusters/${id}`);
}

export function fetchRising(limit = 10): Promise<RisingResponse> {
	if (USE_MOCK) return mockFetchRising(limit);
	return fetchJSON(`/rising?limit=${limit}`);
}

export function fetchSourcesHealth(): Promise<SourcesHealthResponse> {
	if (USE_MOCK) return mockFetchSourcesHealth();
	return fetchJSON('/sources/health');
}
