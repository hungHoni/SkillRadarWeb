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
 *
 * Reference points (freshly created, hours=0):
 *   1 source, 1 mention  → score ~0.69  → level 1
 *   1 source, 3 mentions → score ~1.39  → level 2
 *   2 sources, 5 mentions → score ~2.53 → level 3
 *   3 sources, 10 mentions → score ~4.15 → level 4
 *   3 sources, 30+ mentions → score ~5.9+ → level 5
 */
export function getHeatLevel(score: number): HeatLevel {
	if (score >= 5) return 5;
	if (score >= 3.5) return 4;
	if (score >= 2) return 3;
	if (score >= 1) return 2;
	return 1;
}
