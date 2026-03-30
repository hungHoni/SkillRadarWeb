import { formatDistanceToNow } from '../utils/time';

interface HeaderProps {
	connected: boolean;
	lastUpdated: Date | null;
}

export function Header({ connected, lastUpdated }: HeaderProps) {
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
