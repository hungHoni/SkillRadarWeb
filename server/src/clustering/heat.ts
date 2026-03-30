import type { HeatLevel } from '@skillradar/shared';

/**
 * Compute heat score for a cluster.
 *
 * Formula: sqrt(source_diversity) * log(mention_count + 1) * e^(-hours/24)
 *
 * - sqrt() keeps diversity as signal without dominating
 * - log() dampens raw mention count
 * - exponential decay rewards freshness
 */
export function computeHeat(
	sourceDiversity: number,
	mentionCount: number,
	hoursSinceFirstSeen: number,
): number {
	const diversityFactor = Math.sqrt(Math.max(sourceDiversity, 1));
	const mentionFactor = Math.log(mentionCount + 1);
	const recencyWeight = Math.exp(-hoursSinceFirstSeen / 24);

	return diversityFactor * mentionFactor * recencyWeight;
}

/**
 * Map a heat score to a 1-5 level for display.
 */
export function getHeatLevel(score: number): HeatLevel {
	if (score >= 80) return 5;
	if (score >= 40) return 4;
	if (score >= 15) return 3;
	if (score >= 5) return 2;
	return 1;
}
