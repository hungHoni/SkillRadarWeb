import { DOMAIN_LABELS } from '@skillradar/shared';
import type { DomainTag } from '@skillradar/shared';

interface DomainTabsProps {
	activeDomain: DomainTag | 'all';
	counts: Record<DomainTag | 'all', number>;
	onSelect: (domain: DomainTag | 'all') => void;
}

const DOMAINS: (DomainTag | 'all')[] = [
	'all',
	'ai_ml',
	'backend',
	'frontend',
	'cloud_devops',
	'system_design',
];

export function DomainTabs({ activeDomain, counts, onSelect }: DomainTabsProps) {
	return (
		<nav aria-label="Domain filter" className="border-b border-[var(--color-border)]">
			<div className="mx-auto max-w-[1400px] px-6">
				<div className="-mb-px flex gap-1 overflow-x-auto py-2 scrollbar-none">
					{DOMAINS.map((domain) => {
						const isActive = activeDomain === domain;
						return (
							<button
								key={domain}
								type="button"
								onClick={() => onSelect(domain)}
								aria-pressed={isActive}
								className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
									isActive
										? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
										: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sidebar)] hover:text-[var(--color-text-primary)]'
								}`}
							>
								{DOMAIN_LABELS[domain]}
								<span
									className={`font-[var(--font-mono)] text-xs ${
										isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
									}`}
								>
									{counts[domain] ?? 0}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</nav>
	);
}
