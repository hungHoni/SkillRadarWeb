import type { Source } from '@skillradar/shared';

interface SourceBadgeProps {
	source: Source;
	count: number;
}

const SOURCE_CONFIG: Record<Source, { label: string; color: string }> = {
	reddit: { label: 'R', color: 'var(--color-source-reddit)' },
	hn: { label: 'HN', color: 'var(--color-source-hn)' },
	rss: { label: 'RSS', color: 'var(--color-source-rss)' },
};

export function SourceBadge({ source, count }: SourceBadgeProps) {
	const config = SOURCE_CONFIG[source];

	return (
		<span
			className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium text-white"
			style={{ backgroundColor: config.color }}
			title={`${count} ${source} posts`}
		>
			{config.label}
			{count > 1 && <span className="font-[var(--font-mono)] text-[10px] opacity-80">{count}</span>}
		</span>
	);
}
