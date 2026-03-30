import type {
	ClusterResponse,
	RisingResponse,
	SourcesHealthResponse,
	TrendsResponse,
} from '@skillradar/shared';

const API_BASE = '/api';

async function fetchJSON<T>(path: string): Promise<T> {
	const response = await fetch(`${API_BASE}${path}`);
	if (!response.ok) {
		throw new Error(`API error: ${response.status} ${response.statusText}`);
	}
	return response.json() as Promise<T>;
}

export function fetchTrends(domain = 'all', limit = 20): Promise<TrendsResponse> {
	return fetchJSON(`/trends?domain=${domain}&limit=${limit}`);
}

export function fetchCluster(id: number): Promise<ClusterResponse> {
	return fetchJSON(`/clusters/${id}`);
}

export function fetchRising(limit = 10): Promise<RisingResponse> {
	return fetchJSON(`/rising?limit=${limit}`);
}

export function fetchSourcesHealth(): Promise<SourcesHealthResponse> {
	return fetchJSON('/sources/health');
}
