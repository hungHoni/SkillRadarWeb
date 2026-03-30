import type {
	ClusterResponse,
	ClusterSummary,
	PostDetail,
	RisingResponse,
	SourcesHealthResponse,
	TrendsResponse,
} from '@skillradar/shared';

const MOCK_CLUSTERS: ClusterSummary[] = [
	{
		id: 1,
		title: 'Claude 4 Opus Release — Reasoning Benchmarks Surpass GPT-5',
		heat_score: 92,
		heat_level: 5,
		domain_tag: 'ai_ml',
		source_count: 3,
		mention_count: 347,
		sources: [
			{ name: 'reddit', count: 189, active: true },
			{ name: 'hn', count: 142, active: true },
			{ name: 'rss', count: 16, active: true },
		],
		snippet:
			'Anthropic releases Claude 4 Opus with significant improvements in multi-step reasoning, code generation, and long-context understanding. Early benchmarks show 12% improvement over GPT-5 on MMLU-Pro.',
		first_seen: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
		trending_duration: '4h',
	},
	{
		id: 2,
		title: 'Rust 2024 Edition — Async Closures and Gen Blocks Stabilized',
		heat_score: 67,
		heat_level: 4,
		domain_tag: 'backend',
		source_count: 2,
		mention_count: 128,
		sources: [
			{ name: 'reddit', count: 85, active: true },
			{ name: 'hn', count: 43, active: true },
		],
		snippet:
			'The Rust 2024 edition stabilizes async closures, gen blocks, and the new borrow checker. Community response overwhelmingly positive — "finally makes async Rust ergonomic."',
		first_seen: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
		trending_duration: '8h',
	},
	{
		id: 3,
		title: 'React 20 Server Actions — Full-Stack Components Without API Routes',
		heat_score: 54,
		heat_level: 3,
		domain_tag: 'frontend',
		source_count: 3,
		mention_count: 96,
		sources: [
			{ name: 'reddit', count: 41, active: true },
			{ name: 'hn', count: 32, active: true },
			{ name: 'rss', count: 23, active: true },
		],
		snippet:
			'React 20 introduces composable server actions that eliminate the need for separate API route files. Dan Abramov demos a full CRUD app in a single component file.',
		first_seen: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
		trending_duration: '12h',
	},
	{
		id: 4,
		title: 'Kubernetes 1.32 — Sidecar Containers GA and Pod Lifecycle Improvements',
		heat_score: 45,
		heat_level: 3,
		domain_tag: 'cloud_devops',
		source_count: 2,
		mention_count: 73,
		sources: [
			{ name: 'hn', count: 48, active: true },
			{ name: 'rss', count: 25, active: true },
		],
		snippet:
			'Native sidecar containers move to GA in K8s 1.32, solving the long-standing issue of container ordering in pods. Also introduces pod lifecycle hooks for graceful migration.',
		first_seen: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
		trending_duration: '18h',
	},
	{
		id: 5,
		title: 'PostgreSQL 17 — Incremental Backup and JSON_TABLE Support',
		heat_score: 41,
		heat_level: 3,
		domain_tag: 'backend',
		source_count: 2,
		mention_count: 62,
		sources: [
			{ name: 'hn', count: 38, active: true },
			{ name: 'rss', count: 24, active: true },
		],
		snippet:
			'PostgreSQL 17 ships with incremental backup support, JSON_TABLE for SQL/JSON compliance, and significant vacuum performance improvements for large databases.',
		first_seen: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
		trending_duration: '20h',
	},
	{
		id: 6,
		title: 'Distributed Systems: CRDTs vs Operational Transform — The 2026 Landscape',
		heat_score: 33,
		heat_level: 2,
		domain_tag: 'system_design',
		source_count: 2,
		mention_count: 47,
		sources: [
			{ name: 'hn', count: 29, active: true },
			{ name: 'rss', count: 18, active: true },
		],
		snippet:
			'Martin Kleppmann publishes updated analysis comparing CRDTs and OT for real-time collaboration. Conclusion: CRDTs win for offline-first, OT still better for low-latency centralized systems.',
		first_seen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
		trending_duration: '1d',
	},
	{
		id: 7,
		title: 'Bun 1.3 — Native S3 Client and 2x Faster npm Install',
		heat_score: 38,
		heat_level: 2,
		domain_tag: 'backend',
		source_count: 3,
		mention_count: 55,
		sources: [
			{ name: 'reddit', count: 22, active: true },
			{ name: 'hn', count: 21, active: true },
			{ name: 'rss', count: 12, active: true },
		],
		snippet:
			'Bun 1.3 adds a native S3 client, doubles npm install speed, and introduces built-in SQLite migrations. Jarred Sumner: "We want Bun to be the only tool you need."',
		first_seen: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
		trending_duration: '6h',
	},
	{
		id: 8,
		title: 'Tailwind CSS v4 — Zero-Config, Rust Engine, 10x Faster Builds',
		heat_score: 29,
		heat_level: 2,
		domain_tag: 'frontend',
		source_count: 2,
		mention_count: 41,
		sources: [
			{ name: 'reddit', count: 27, active: true },
			{ name: 'rss', count: 14, active: true },
		],
		snippet:
			'Tailwind v4 ships with Oxide engine (Rust-based), zero-config detection, and native CSS cascade layers. Build times drop from 300ms to 30ms on large projects.',
		first_seen: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
		trending_duration: '1d',
	},
	{
		id: 9,
		title: 'AWS Lambda SnapStart for Node.js — Cold Starts Under 200ms',
		heat_score: 22,
		heat_level: 2,
		domain_tag: 'cloud_devops',
		source_count: 2,
		mention_count: 34,
		sources: [
			{ name: 'hn', count: 19, active: true },
			{ name: 'rss', count: 15, active: true },
		],
		snippet:
			'AWS announces SnapStart support for Node.js Lambda functions. Snapshot-based init reduces cold starts from 1-3s to under 200ms. Previously Java-only.',
		first_seen: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
		trending_duration: '14h',
	},
	{
		id: 10,
		title: 'Local-First Software: Ink & Switch Releases Automerge 3.0',
		heat_score: 18,
		heat_level: 1,
		domain_tag: 'system_design',
		source_count: 1,
		mention_count: 23,
		sources: [{ name: 'hn', count: 23, active: true }],
		snippet:
			'Automerge 3.0 drops with 5x memory reduction and native sync protocol. Ink & Switch demo shows seamless offline-to-online sync for document editing.',
		first_seen: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
		trending_duration: '1d',
	},
];

const MOCK_POSTS: Record<number, PostDetail[]> = {
	1: [
		{
			id: 101,
			title: 'Claude 4 Opus: First impressions and benchmark results',
			url: 'https://example.com/claude-4-opus',
			source: 'reddit',
			score: 2847,
			comment_count: 892,
			author: 'ml_researcher_42',
			created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
		},
		{
			id: 102,
			title: 'Anthropic announces Claude 4 family',
			url: 'https://example.com/anthropic-claude4',
			source: 'hn',
			score: 1423,
			comment_count: 567,
			author: 'dang',
			created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
		},
		{
			id: 103,
			title: 'Deep dive: Claude 4 Opus architecture and training innovations',
			url: 'https://example.com/claude4-deep-dive',
			source: 'rss',
			score: 0,
			comment_count: 0,
			author: 'Anthropic Research Blog',
			created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
		},
	],
	2: [
		{
			id: 201,
			title: 'Rust 2024 Edition is here — async closures and gen blocks',
			url: 'https://example.com/rust-2024',
			source: 'reddit',
			score: 1892,
			comment_count: 445,
			author: 'rustacean_dev',
			created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
		},
		{
			id: 202,
			title: 'Rust 2024 Edition announcement',
			url: 'https://example.com/rust-announce',
			source: 'hn',
			score: 967,
			comment_count: 312,
			author: 'nrc',
			created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
		},
	],
};

export function mockFetchTrends(_domain = 'all', _limit = 20): Promise<TrendsResponse> {
	return delay({ clusters: MOCK_CLUSTERS });
}

export function mockFetchCluster(id: number): Promise<ClusterResponse> {
	const cluster = MOCK_CLUSTERS.find((c) => c.id === id);
	if (!cluster) throw new Error('Cluster not found');
	return delay({
		cluster: {
			...cluster,
			posts: MOCK_POSTS[id] ?? [],
		},
	});
}

export function mockFetchRising(_limit = 10): Promise<RisingResponse> {
	return delay({
		rising: [
			{
				cluster_id: 1,
				title: 'Claude 4 Opus Release',
				domain_tag: 'ai_ml',
				heat_score: 92,
				pct_change: 340,
			},
			{
				cluster_id: 7,
				title: 'Bun 1.3 Native S3',
				domain_tag: 'backend',
				heat_score: 38,
				pct_change: 180,
			},
			{
				cluster_id: 3,
				title: 'React 20 Server Actions',
				domain_tag: 'frontend',
				heat_score: 54,
				pct_change: 95,
			},
			{
				cluster_id: 9,
				title: 'Lambda SnapStart Node.js',
				domain_tag: 'cloud_devops',
				heat_score: 22,
				pct_change: 67,
			},
			{
				cluster_id: 4,
				title: 'K8s 1.32 Sidecar GA',
				domain_tag: 'cloud_devops',
				heat_score: 45,
				pct_change: 42,
			},
		],
	});
}

export function mockFetchSourcesHealth(): Promise<SourcesHealthResponse> {
	return delay({
		sources: [
			{
				name: 'reddit',
				status: 'healthy',
				last_scrape: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
			},
			{
				name: 'hn',
				status: 'healthy',
				last_scrape: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
			},
			{
				name: 'rss',
				status: 'healthy',
				last_scrape: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
			},
		],
	});
}

function delay<T>(data: T, ms = 300): Promise<T> {
	return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}
