import type { HeatLevel } from '@skillradar/shared';
import { motion } from 'framer-motion';

interface HeatBarProps {
	level: HeatLevel;
	pulse?: boolean;
}

const HEAT_COLORS: Record<HeatLevel, string> = {
	1: 'var(--color-heat-1)',
	2: 'var(--color-heat-2)',
	3: 'var(--color-heat-3)',
	4: 'var(--color-heat-4)',
	5: 'var(--color-heat-5)',
};

export function HeatBar({ level, pulse = false }: HeatBarProps) {
	const widthPercent = (level / 5) * 100;

	return (
		<div className="flex items-center gap-2">
			<div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-heat-1)]">
				<motion.div
					className="absolute inset-y-0 left-0 rounded-full"
					style={{ backgroundColor: HEAT_COLORS[level] }}
					initial={{ width: 0 }}
					animate={{ width: `${widthPercent}%` }}
					transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
				/>
				{pulse && (
					<motion.div
						className="absolute inset-y-0 left-0 rounded-full"
						style={{
							backgroundColor: HEAT_COLORS[level],
							width: `${widthPercent}%`,
						}}
						animate={{ opacity: [0.6, 0, 0.6] }}
						transition={{ duration: 1.5, repeat: 1 }}
					/>
				)}
			</div>
			<span className="shrink-0 font-[var(--font-mono)] text-xs text-[var(--color-text-muted)]">
				{level}/5
			</span>
		</div>
	);
}
