interface KeyboardBarProps {
	visible: boolean;
}

const SHORTCUTS = [
	{ key: 'F', action: 'Filter' },
	{ key: 'J/K', action: 'Navigate' },
	{ key: 'Enter', action: 'Expand' },
	{ key: 'R', action: 'Refresh' },
];

export function KeyboardBar({ visible }: KeyboardBarProps) {
	if (!visible) return null;

	return (
		<footer className="fixed inset-x-0 bottom-0 z-10 hidden border-t border-[var(--color-border)] bg-[var(--color-bg-card)] md:block">
			<div className="mx-auto flex max-w-[1400px] items-center justify-center gap-6 px-6 py-2">
				{SHORTCUTS.map(({ key, action }) => (
					<span
						key={key}
						className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]"
					>
						<kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg-sidebar)] px-1.5 py-0.5 font-[var(--font-mono)] text-[10px] font-medium text-[var(--color-text-secondary)]">
							{key}
						</kbd>
						{action}
					</span>
				))}
			</div>
		</footer>
	);
}
