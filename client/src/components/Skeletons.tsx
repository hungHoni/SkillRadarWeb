export function ClusterCardSkeleton() {
	return (
		<div className="animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
			<div className="mb-3 flex items-start justify-between">
				<div className="h-5 w-3/4 rounded bg-[var(--color-border)]" />
				<div className="flex gap-1">
					<div className="h-5 w-8 rounded-sm bg-[var(--color-border)]" />
					<div className="h-5 w-8 rounded-sm bg-[var(--color-border)]" />
				</div>
			</div>
			<div className="mb-3 space-y-2">
				<div className="h-4 w-full rounded bg-[var(--color-border)]" />
				<div className="h-4 w-2/3 rounded bg-[var(--color-border)]" />
			</div>
			<div className="mb-3 flex gap-3">
				<div className="h-3 w-16 rounded bg-[var(--color-border)]" />
				<div className="h-3 w-20 rounded bg-[var(--color-border)]" />
				<div className="h-3 w-14 rounded bg-[var(--color-border)]" />
			</div>
			<div className="h-1.5 w-full rounded-full bg-[var(--color-border)]" />
		</div>
	);
}

export function RisingSkeleton() {
	return (
		<div className="animate-pulse space-y-2">
			{[1, 2, 3].map((i) => (
				<div key={i} className="flex items-center gap-2 px-2 py-1.5">
					<div className="h-4 flex-1 rounded bg-[var(--color-border)]" />
					<div className="h-4 w-10 rounded bg-[var(--color-border)]" />
				</div>
			))}
		</div>
	);
}

export function SourceSkeleton() {
	return (
		<div className="animate-pulse space-y-2">
			{[1, 2, 3].map((i) => (
				<div key={i} className="flex items-center gap-2">
					<div className="h-2 w-2 rounded-full bg-[var(--color-border)]" />
					<div className="h-4 flex-1 rounded bg-[var(--color-border)]" />
					<div className="h-3 w-10 rounded bg-[var(--color-border)]" />
				</div>
			))}
		</div>
	);
}
