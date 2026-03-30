import { describe, expect, it } from 'vitest';
import { getDomainTag } from '../tagger';

describe('getDomainTag', () => {
	it('maps known subreddits for reddit source', () => {
		expect(getDomainTag('reddit', 'MachineLearning', 'Some AI post')).toBe('ai_ml');
		expect(getDomainTag('reddit', 'LocalLLaMA', 'LLM stuff')).toBe('ai_ml');
		expect(getDomainTag('reddit', 'reactjs', 'React hooks')).toBe('frontend');
		expect(getDomainTag('reddit', 'golang', 'Go channels')).toBe('backend');
		expect(getDomainTag('reddit', 'kubernetes', 'K8s pods')).toBe('cloud_devops');
		expect(getDomainTag('reddit', 'systemdesign', 'CAP theorem')).toBe('system_design');
	});

	it('falls back to keyword matching for unknown subreddits', () => {
		expect(getDomainTag('reddit', 'unknownsub', 'machine learning transformer model')).toBe(
			'ai_ml',
		);
		expect(getDomainTag('reddit', 'unknownsub', 'react component hooks')).toBe('frontend');
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

	it('defaults to backend when no keywords match', () => {
		expect(getDomainTag('hn', null, 'Generic tech news about nothing specific')).toBe('backend');
	});
});
