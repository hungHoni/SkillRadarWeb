import { useState } from 'react';
import { formatDistanceToNow } from '../utils/time';

interface HeaderProps {
	connected: boolean;
	lastUpdated: Date | null;
	onRefresh?: () => Promise<void>;
}

export function Header({ connected, lastUpdated, onRefresh }: HeaderProps) {
	const [refreshing, setRefreshing] = useState(false);

	const handleRefresh = async () => {
		if (refreshing || !onRefresh) return;
		setRefreshing(true);
		try {
			await onRefresh();
		} finally {
			setRefreshing(false);
		}
	};

	return (
		<header className="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
			<div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
				<div className="flex items-baseline gap-3">
					<h1 className="font-[var(--font-display)] text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
						SkillRadar
					</h1>
					<span className="text-sm font-medium text-[var(--color-text-muted)]">/ Live</span>
				</div>
				<div className="flex items-center gap-4">
					{onRefresh && (
						<button
							type="button"
							onClick={handleRefresh}
							disabled={refreshing}
							title="Scrape all sources now"
							className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-page)] active:scale-[0.97] disabled:opacity-50"
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className={refreshing ? 'animate-spin' : ''}
								aria-hidden="true"
							>
								<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
								<path d="M21 3v5h-5" />
							</svg>
							{refreshing ? 'Scraping...' : 'Refresh'}
						</button>
					)}
					{connected ? (
						<span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)]">
							<span className="relative flex h-2 w-2">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-75" />
								<span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)]" />
							</span>
							Connected
						</span>
					) : (
						<span className="text-xs font-medium text-[var(--color-heat-3)]">Reconnecting...</span>
					)}
					{lastUpdated && (
						<span className="text-xs text-[var(--color-text-muted)]">
							Updated {formatDistanceToNow(lastUpdated)}
						</span>
					)}
				</div>
			</div>
		</header>
	);
}
