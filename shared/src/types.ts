// Domain tags for categorizing posts and clusters
export type DomainTag =
	| 'ai_ml'
	| 'backend'
	| 'frontend'
	| 'cloud_devops'
	| 'system_design'
	| 'breaking_news';

export const DOMAIN_LABELS: Record<DomainTag | 'all', string> = {
	all: 'All',
	ai_ml: 'AI/ML',
	backend: 'Backend',
	frontend: 'Frontend',
	cloud_devops: 'Cloud/DevOps',
	system_design: 'System Design',
	breaking_news: 'Breaking News',
};

// Source types
export type Source = 'hn' | 'rss';

export type SourceStatus = 'healthy' | 'degraded' | 'down';

// Heat levels 1-5
export type HeatLevel = 1 | 2 | 3 | 4 | 5;

// --- API Response Types ---

export interface SourceInfo {
	name: Source;
	count: number;
	active: boolean;
}

export interface ClusterSummary {
	id: number;
	title: string;
	heat_score: number;
	heat_level: HeatLevel;
	domain_tag: DomainTag;
	source_count: number;
	mention_count: number;
	sources: SourceInfo[];
	snippet: string | null;
	first_seen: string;
	trending_duration: string;
}

export interface PostDetail {
	id: number;
	title: string;
	url: string | null;
	source: Source;
	score: number;
	comment_count: number;
	author: string | null;
	created_at: string;
}

export interface ClusterDetail extends ClusterSummary {
	posts: PostDetail[];
}

export interface RisingTopic {
	cluster_id: number;
	title: string;
	domain_tag: DomainTag;
	heat_score: number;
	pct_change: number;
}

export interface SourceHealth {
	name: Source;
	status: SourceStatus;
	last_scrape: string | null;
}

// --- API Responses ---

export interface TrendsResponse {
	clusters: ClusterSummary[];
}

export interface ClusterResponse {
	cluster: ClusterDetail;
}

export interface RisingResponse {
	rising: RisingTopic[];
}

export interface SourcesHealthResponse {
	sources: SourceHealth[];
}

// --- SSE Event Types ---

export interface SSEClusterNew {
	cluster_id: number;
	title: string;
	domain_tag: DomainTag;
	heat_score: number;
	sources: SourceInfo[];
}

export interface SSEClusterUpdated {
	cluster_id: number;
	heat_score: number;
	heat_level: HeatLevel;
	mention_count: number;
	source_count: number;
}

export interface SSESourceStatus {
	source: Source;
	status: SourceStatus;
	last_scrape: string;
}

export type SSEEvent =
	| { type: 'cluster:new'; data: SSEClusterNew }
	| { type: 'cluster:updated'; data: SSEClusterUpdated }
	| { type: 'source:status'; data: SSESourceStatus };
