import { describe, expect, it } from 'vitest';
import { computeHeat, getHeatLevel } from '../heat';

describe('computeHeat', () => {
	it('returns 0 for zero mentions', () => {
		expect(computeHeat(1, 0, 0)).toBe(0);
	});

	it('increases with more mentions', () => {
		const low = computeHeat(1, 5, 1);
		const high = computeHeat(1, 50, 1);
		expect(high).toBeGreaterThan(low);
	});

	it('increases with source diversity', () => {
		const single = computeHeat(1, 10, 1);
		const multi = computeHeat(3, 10, 1);
		expect(multi).toBeGreaterThan(single);
	});

	it('decays over time', () => {
		const fresh = computeHeat(2, 10, 0);
		const stale = computeHeat(2, 10, 24);
		expect(fresh).toBeGreaterThan(stale);
	});

	it('diversity uses sqrt not linear (rebalanced formula)', () => {
		const twoSources = computeHeat(2, 10, 1);
		const fourSources = computeHeat(4, 10, 1);
		// 4 sources should be less than 2x of 2 sources (sqrt growth)
		expect(fourSources / twoSources).toBeLessThan(2);
	});
});

describe('getHeatLevel', () => {
	it('returns 1 for low scores', () => {
		expect(getHeatLevel(0)).toBe(1);
		expect(getHeatLevel(4)).toBe(1);
	});

	it('returns 2 for medium-low scores', () => {
		expect(getHeatLevel(5)).toBe(2);
		expect(getHeatLevel(14)).toBe(2);
	});

	it('returns 3 for medium scores', () => {
		expect(getHeatLevel(15)).toBe(3);
		expect(getHeatLevel(39)).toBe(3);
	});

	it('returns 4 for high scores', () => {
		expect(getHeatLevel(40)).toBe(4);
		expect(getHeatLevel(79)).toBe(4);
	});

	it('returns 5 for very high scores', () => {
		expect(getHeatLevel(80)).toBe(5);
		expect(getHeatLevel(200)).toBe(5);
	});
});
