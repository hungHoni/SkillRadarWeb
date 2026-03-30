'use client';

import type { ClusterSummary, PostDetail } from '@skillradar/shared';
import { DOMAIN_LABELS } from '@skillradar/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { fetchCluster } from '../api/client';
import { formatCount, formatDuration } from '../utils/time';
import { HeatBar } from './HeatBar';
import { SourceBadge } from './SourceBadge';

interface ClusterCardProps {
	cluster: ClusterSummary;
	index: number;
	isFocused: boolean;
	isHighlighted: boolean;
	heatPulse: boolean;
}

export function ClusterCard({
	cluster,
	index,
	isFocused,
	isHighlighted,
	heatPulse,
}: ClusterCardProps) {
	const [expanded, setExpanded] = useState(false);
	const [posts, setPosts] = useState<PostDetail[] | null>(null);
	const [loading, setLoading] = useState(false);
	const cardRef = useRef<HTMLDivElement>(null);

	const toggle = async () => {
		if (!expanded && !posts) {
			setLoading(true);
			try {
				const res = await fetchCluster(cluster.id);
				setPosts(res.cluster.posts);
			} catch {
				setPosts([]);
			} finally {
				setLoading(false);
			}
		}
		setExpanded(!expanded);
	};

	return (
		<motion.article
			ref={cardRef}
			aria-label={`${cluster.title}, heat level ${cluster.heat_level} of 5, ${cluster.mention_count} mentions across ${cluster.source_count} sources`}
			aria-expanded={expanded}
			tabIndex={-1}
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.08 }}
			data-cluster-id={cluster.id}
			className={`rounded-lg border bg-[var(--color-bg-card)] p-5 transition-shadow ${
				isFocused ? 'ring-2 ring-[var(--color-accent)]/50' : 'border-[var(--color-border)]'
			} ${isHighlighted ? 'ring-2 ring-[var(--color-accent)] ring-offset-2' : ''}`}
			onClick={toggle}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					toggle();
				}
			}}
			style={{ cursor: 'pointer' }}
		>
			<div className="mb-3 flex items-start justify-between gap-3">
				<h2 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--color-text-primary)]">
					{cluster.title}
				</h2>
				<div className="flex shrink-0 gap-1">
					{cluster.sources
						.filter((s) => s.count > 0)
						.map((s) => (
							<SourceBadge key={s.name} source={s.name} count={s.count} />
						))}
				</div>
			</div>

			{cluster.snippet && (
				<p className="mb-3 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
					{cluster.snippet}
				</p>
			)}

			<div className="mb-3 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
				<span className="font-medium text-[var(--color-text-secondary)]">
					{DOMAIN_LABELS[cluster.domain_tag]}
				</span>
				<span aria-hidden="true">·</span>
				<span className="font-[var(--font-mono)]">
					{formatCount(cluster.mention_count)} mentions
				</span>
				<span aria-hidden="true">·</span>
				<span>{formatDuration(cluster.first_seen)} trending</span>
			</div>

			<HeatBar level={cluster.heat_level} pulse={heatPulse} />

			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 200, damping: 25 }}
						className="overflow-hidden"
					>
						<div className="mt-4 border-t border-[var(--color-border)] pt-4">
							{loading ? (
								<div className="flex items-center gap-2 py-3 text-sm text-[var(--color-text-muted)]">
									<span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
									Loading posts...
								</div>
							) : posts && posts.length > 0 ? (
								<ul className="space-y-3">
									{posts.map((post) => (
										<li key={post.id} className="text-sm">
											<div className="flex items-start gap-2">
												<SourceBadge source={post.source} count={0} />
												<div className="min-w-0 flex-1">
													{post.url ? (
														<a
															href={post.url}
															target="_blank"
															rel="noopener noreferrer"
															className="font-medium text-[var(--color-text-primary)] underline decoration-[var(--color-border)] underline-offset-2 hover:decoration-[var(--color-accent)]"
															onClick={(e) => e.stopPropagation()}
														>
															{post.title}
														</a>
													) : (
														<span className="font-medium text-[var(--color-text-primary)]">
															{post.title}
														</span>
													)}
													<div className="mt-0.5 flex gap-2 font-[var(--font-mono)] text-xs text-[var(--color-text-muted)]">
														{post.score > 0 && <span>{post.score} pts</span>}
														{post.comment_count > 0 && <span>{post.comment_count} comments</span>}
														{post.author && <span>by {post.author}</span>}
													</div>
												</div>
											</div>
										</li>
									))}
								</ul>
							) : (
								<p className="py-2 text-sm text-[var(--color-text-muted)]">No posts in cluster</p>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.article>
	);
}
