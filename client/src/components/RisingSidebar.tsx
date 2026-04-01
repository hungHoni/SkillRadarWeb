import type { RisingTopic } from '@skillradar/shared';
import { motion } from 'framer-motion';

interface RisingSidebarProps {
	topics: RisingTopic[];
	onTopicClick: (clusterId: number) => void;
}

export function RisingSidebar({ topics, onTopicClick }: RisingSidebarProps) {
	if (topics.length === 0) {
		return (
			<section aria-label="Rising topics">
				<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
					Rising Fast
				</h3>
				<p className="text-sm text-[var(--color-text-muted)]">Nothing rising yet.</p>
			</section>
		);
	}

	return (
		<section aria-label="Rising topics">
			<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
				Rising Fast
			</h3>
			<ul className="space-y-2">
				{topics.map((topic, i) => (
					<li key={topic.cluster_id}>
						<button
							type="button"
							onClick={() => onTopicClick(topic.cluster_id)}
							className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-bg-card)]"
						>
							<span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
								{topic.title}
							</span>
							<motion.span
								className="shrink-0 font-[var(--font-mono)] text-xs font-semibold text-[var(--color-accent)]"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: i * 0.1 }}
							>
								{topic.pct_change < 0 ? 'NEW' : `+${Math.round(topic.pct_change)}%`}
							</motion.span>
						</button>
					</li>
				))}
			</ul>
		</section>
	);
}
