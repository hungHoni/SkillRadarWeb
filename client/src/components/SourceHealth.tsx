import type { SourceHealth as SourceHealthType } from '@skillradar/shared';
import { formatDistanceToNow } from '../utils/time';

interface SourceHealthProps {
	sources: SourceHealthType[];
}

const SOURCE_LABELS: Record<string, string> = {
	hn: 'Hacker News',
	rss: 'RSS Feeds',
};

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
	healthy: {
		dot: 'bg-[var(--color-accent)]',
		text: 'text-[var(--color-text-muted)]',
	},
	degraded: {
		dot: 'bg-[var(--color-heat-2)]',
		text: 'text-[var(--color-heat-2)]',
	},
	down: {
		dot: 'bg-[var(--color-heat-4)]',
		text: 'text-[var(--color-heat-4)]',
	},
};

export function SourceHealthPanel({ sources }: SourceHealthProps) {
	return (
		<section aria-label="Source health">
			<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
				Sources
			</h3>
			{sources.length === 0 ? (
				<p className="text-sm text-[var(--color-text-muted)]">No sources configured</p>
			) : (
				<ul className="space-y-2">
					{sources.map((source) => {
						const styles = STATUS_STYLES[source.status] ?? STATUS_STYLES.down;
						return (
							<li key={source.name} className="flex items-center gap-2">
								<span
									className={`h-2 w-2 rounded-full ${styles.dot} ${
										source.status === 'healthy' ? 'animate-pulse' : ''
									}`}
								/>
								<span className="flex-1 text-sm text-[var(--color-text-primary)]">
									{SOURCE_LABELS[source.name] ?? source.name}
								</span>
								<span className={`text-xs ${styles.text}`}>
									{source.last_scrape ? formatDistanceToNow(new Date(source.last_scrape)) : 'never'}
								</span>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
