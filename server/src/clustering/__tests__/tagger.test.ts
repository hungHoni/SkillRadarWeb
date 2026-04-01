import { describe, expect, it } from 'vitest';
import { getDomainTag } from '../tagger';

describe('getDomainTag', () => {
	it('tags breaking news keywords', () => {
		expect(getDomainTag('rss', null, 'Breaking: earthquake hits Turkey')).toBe('breaking_news');
		expect(getDomainTag('hn', null, 'President signs executive order on climate')).toBe(
			'breaking_news',
		);
		expect(getDomainTag('rss', null, 'NATO summit concludes with new sanctions')).toBe(
			'breaking_news',
		);
	});

	it('uses keyword matching for HN source', () => {
		expect(getDomainTag('hn', null, 'New GPT-4 model released with better reasoning')).toBe(
			'ai_ml',
		);
		expect(getDomainTag('hn', null, 'PostgreSQL database optimization tips')).toBe('backend');
		expect(getDomainTag('hn', null, 'Docker container orchestration with Kubernetes')).toBe(
			'cloud_devops',
		);
	});

	it('uses keyword matching for RSS source', () => {
		expect(getDomainTag('rss', null, 'CSS grid layout techniques for modern frontends')).toBe(
			'frontend',
		);
	});

	it('defaults to system_design when no keywords match', () => {
		expect(getDomainTag('hn', null, 'Generic tech news about nothing specific')).toBe(
			'system_design',
		);
	});
});
