import type {
	ClusterSummary,
	DomainTag,
	RisingTopic,
	SSEEvent,
	SourceHealth,
} from '@skillradar/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRising, fetchSourcesHealth, fetchTrends, triggerScrape } from './api/client';
import { ClusterCard } from './components/ClusterCard';
import { DomainTabs } from './components/DomainTabs';
import { Header } from './components/Header';
import { KeyboardBar } from './components/KeyboardBar';
import { RisingSidebar } from './components/RisingSidebar';
import { ClusterCardSkeleton, RisingSkeleton, SourceSkeleton } from './components/Skeletons';
import { SourceHealthPanel } from './components/SourceHealth';
import { useSSE } from './hooks/useSSE';

type LoadState = 'loading' | 'loaded' | 'error';

export function App() {
	// Data state
	const [clusters, setClusters] = useState<ClusterSummary[]>([]);
	const [rising, setRising] = useState<RisingTopic[]>([]);
	const [sources, setSources] = useState<SourceHealth[]>([]);
	const [trendsState, setTrendsState] = useState<LoadState>('loading');
	const [risingState, setRisingState] = useState<LoadState>('loading');
	const [sourcesState, setSourcesState] = useState<LoadState>('loading');

	// UI state
	const [activeDomain, setActiveDomain] = useState<DomainTag | 'all'>('all');
	const [focusIndex, setFocusIndex] = useState(-1);
	const [highlightedId, setHighlightedId] = useState<number | null>(null);
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
	const [heatPulseIds, setHeatPulseIds] = useState<Set<number>>(new Set());

	const mainRef = useRef<HTMLElement>(null);
	const isInitialLoad = useRef(true);

	// URL state sync
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const domain = params.get('domain');
		if (domain && domain !== 'all') {
			setActiveDomain(domain as DomainTag);
		}
	}, []);

	const handleDomainSelect = useCallback((domain: DomainTag | 'all') => {
		setActiveDomain(domain);
		setFocusIndex(-1);
		const url = new URL(window.location.href);
		if (domain === 'all') {
			url.searchParams.delete('domain');
		} else {
			url.searchParams.set('domain', domain);
		}
		window.history.replaceState({}, '', url.toString());
	}, []);

	// Data fetching
	const loadData = useCallback(async () => {
		try {
			const [trendsRes, risingRes, sourcesRes] = await Promise.all([
				fetchTrends('all', 200),
				fetchRising(10),
				fetchSourcesHealth(),
			]);
			setClusters(trendsRes.clusters);
			setRising(risingRes.rising);
			setSources(sourcesRes.sources);
			setTrendsState('loaded');
			setRisingState('loaded');
			setSourcesState('loaded');
			setLastUpdated(new Date());
			isInitialLoad.current = false;
		} catch {
			setTrendsState((s) => (s === 'loading' ? 'error' : s));
			setRisingState((s) => (s === 'loading' ? 'error' : s));
			setSourcesState((s) => (s === 'loading' ? 'error' : s));
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	// Auto-refresh when user returns to the tab (if data is older than 2 min)
	useEffect(() => {
		const handleVisibility = () => {
			if (document.visibilityState === 'visible' && lastUpdated) {
				const staleMs = Date.now() - lastUpdated.getTime();
				if (staleMs > 2 * 60 * 1000) {
					console.log('[App] Tab visible, data stale — refreshing');
					loadData();
				}
			}
		};
		document.addEventListener('visibilitychange', handleVisibility);
		return () => document.removeEventListener('visibilitychange', handleVisibility);
	}, [loadData, lastUpdated]);

	const handleRefresh = useCallback(async () => {
		await triggerScrape();
		await loadData();
	}, [loadData]);

	// SSE handler
	const handleSSEEvent = useCallback((event: SSEEvent) => {
		setLastUpdated(new Date());

		switch (event.type) {
			case 'cluster:new': {
				const { data } = event;
				setClusters((prev) => {
					const newCluster: ClusterSummary = {
						id: data.cluster_id,
						title: data.title,
						heat_score: data.heat_score,
						heat_level: 1,
						domain_tag: data.domain_tag,
						source_count: data.sources.length,
						mention_count: data.sources.reduce((sum, s) => sum + s.count, 0),
						sources: data.sources,
						snippet: null,
						first_seen: new Date().toISOString(),
						trending_duration: '<1h',
					};
					return [newCluster, ...prev];
				});
				break;
			}
			case 'cluster:updated': {
				const { data } = event;
				setClusters((prev) =>
					prev.map((c) =>
						c.id === data.cluster_id
							? {
									...c,
									heat_score: data.heat_score,
									heat_level: data.heat_level,
									mention_count: data.mention_count,
									source_count: data.source_count,
								}
							: c,
					),
				);
				setHeatPulseIds((prev) => new Set(prev).add(data.cluster_id));
				setTimeout(() => {
					setHeatPulseIds((prev) => {
						const next = new Set(prev);
						next.delete(data.cluster_id);
						return next;
					});
				}, 1500);
				break;
			}
			case 'source:status': {
				const { data } = event;
				setSources((prev) =>
					prev.map((s) =>
						s.name === data.source
							? { ...s, status: data.status, last_scrape: data.last_scrape }
							: s,
					),
				);
				break;
			}
		}
	}, []);

	const { connected } = useSSE({ onEvent: handleSSEEvent });

	// Filtered clusters
	const filteredClusters =
		activeDomain === 'all' ? clusters : clusters.filter((c) => c.domain_tag === activeDomain);

	// Domain counts
	const domainCounts = clusters.reduce(
		(acc, c) => {
			acc.all++;
			acc[c.domain_tag] = (acc[c.domain_tag] || 0) + 1;
			return acc;
		},
		{
			all: 0,
			breaking_news: 0,
			ai_ml: 0,
			backend: 0,
			frontend: 0,
			cloud_devops: 0,
			system_design: 0,
		} as Record<DomainTag | 'all', number>,
	);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

			switch (e.key) {
				case 'j': {
					e.preventDefault();
					setFocusIndex((prev) => Math.min(prev + 1, filteredClusters.length - 1));
					break;
				}
				case 'k': {
					e.preventDefault();
					setFocusIndex((prev) => Math.max(prev - 1, 0));
					break;
				}
				case 'r': {
					e.preventDefault();
					loadData();
					break;
				}
				case 'f': {
					e.preventDefault();
					// Cycle domains
					const domains: (DomainTag | 'all')[] = [
						'all',
						'breaking_news',
						'ai_ml',
						'backend',
						'frontend',
						'cloud_devops',
						'system_design',
					];
					const currentIdx = domains.indexOf(activeDomain);
					handleDomainSelect(domains[(currentIdx + 1) % domains.length]);
					break;
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [filteredClusters.length, activeDomain, loadData, handleDomainSelect]);

	// Scroll focused card into view
	useEffect(() => {
		if (focusIndex < 0 || !mainRef.current) return;
		const cards = mainRef.current.querySelectorAll('[data-cluster-id]');
		const card = cards[focusIndex] as HTMLElement | undefined;
		card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		card?.focus();
	}, [focusIndex]);

	// Rising topic click → scroll to cluster
	const handleRisingClick = useCallback((clusterId: number) => {
		const el = document.querySelector(`[data-cluster-id="${clusterId}"]`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			setHighlightedId(clusterId);
			setTimeout(() => setHighlightedId(null), 2000);
		}
	}, []);

	// Degraded sources check
	const allSourcesDown = sources.length > 0 && sources.every((s) => s.status === 'down');

	return (
		<div className="flex min-h-[100dvh] flex-col bg-[var(--color-bg-page)]">
			<Header connected={connected} lastUpdated={lastUpdated} onRefresh={handleRefresh} />

			{allSourcesDown && (
				<div className="border-b border-[var(--color-heat-2)] bg-[var(--color-heat-2)]/10 px-6 py-2 text-center text-sm font-medium text-[var(--color-heat-3)]">
					Sources degraded — showing last known data
				</div>
			)}

			<DomainTabs activeDomain={activeDomain} counts={domainCounts} onSelect={handleDomainSelect} />

			<div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-6 px-6 py-6">
				{/* Main Feed */}
				<main ref={mainRef} className="min-w-0 flex-1">
					{trendsState === 'loading' && (
						<div className="space-y-4">
							{[1, 2, 3].map((i) => (
								<ClusterCardSkeleton key={i} />
							))}
						</div>
					)}

					{trendsState === 'error' && (
						<div className="rounded-lg border border-[var(--color-heat-4)]/20 bg-[var(--color-heat-4)]/5 p-8 text-center">
							<p className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
								Couldn't load trends.
							</p>
							<button
								type="button"
								onClick={loadData}
								className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 active:scale-[0.98]"
							>
								Retry
							</button>
						</div>
					)}

					{trendsState === 'loaded' && filteredClusters.length === 0 && (
						<div className="py-16 text-center">
							<div className="mb-4 text-4xl text-[var(--color-text-muted)]">
								<svg
									width="48"
									height="48"
									viewBox="0 0 48 48"
									fill="none"
									className="mx-auto"
									aria-hidden="true"
								>
									<circle
										cx="24"
										cy="24"
										r="20"
										stroke="currentColor"
										strokeWidth="2"
										strokeDasharray="4 4"
									/>
									<circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.3" />
									<line
										x1="24"
										y1="24"
										x2="36"
										y2="12"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
									>
										<animateTransform
											attributeName="transform"
											type="rotate"
											from="0 24 24"
											to="360 24 24"
											dur="4s"
											repeatCount="indefinite"
										/>
									</line>
								</svg>
							</div>
							<p className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">
								No trends yet.
							</p>
							<p className="text-sm text-[var(--color-text-muted)]">
								Scrapers are gathering data — check back in ~10 min.
							</p>
						</div>
					)}

					{trendsState === 'loaded' && filteredClusters.length > 0 && (
						<div className="space-y-4">
							{filteredClusters.map((cluster, i) => (
								<ClusterCard
									key={cluster.id}
									cluster={cluster}
									index={i}
									isFocused={focusIndex === i}
									isHighlighted={highlightedId === cluster.id}
									heatPulse={heatPulseIds.has(cluster.id)}
									animateEntrance={isInitialLoad.current}
								/>
							))}
						</div>
					)}
				</main>

				{/* Sidebar */}
				<aside className="hidden w-72 shrink-0 lg:block xl:w-80">
					<div className="sticky top-6 space-y-8">
						{/* Rising */}
						{risingState === 'loading' ? (
							<div>
								<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
									Rising Fast
								</h3>
								<RisingSkeleton />
							</div>
						) : risingState === 'loaded' ? (
							<RisingSidebar topics={rising} onTopicClick={handleRisingClick} />
						) : null}

						{/* Sources */}
						{sourcesState === 'loading' ? (
							<div>
								<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
									Sources
								</h3>
								<SourceSkeleton />
							</div>
						) : sourcesState === 'loaded' ? (
							<SourceHealthPanel sources={sources} />
						) : null}
					</div>
				</aside>
			</div>

			{/* Mobile sidebar (below main on md) */}
			<div className="border-t border-[var(--color-border)] bg-[var(--color-bg-sidebar)] px-6 py-6 lg:hidden">
				<div className="mx-auto flex max-w-[1400px] gap-8">
					<div className="flex-1">
						{risingState === 'loaded' && (
							<RisingSidebar topics={rising.slice(0, 3)} onTopicClick={handleRisingClick} />
						)}
					</div>
					<div className="flex-1">
						{sourcesState === 'loaded' && <SourceHealthPanel sources={sources} />}
					</div>
				</div>
			</div>

			<KeyboardBar visible={true} />

			{/* Bottom padding for keyboard bar */}
			<div className="hidden h-10 md:block" />
		</div>
	);
}
