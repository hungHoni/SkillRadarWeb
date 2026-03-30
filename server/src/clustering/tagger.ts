import type { DomainTag } from '@skillradar/shared';

/**
 * Subreddit → domain tag mapping.
 */
const SUBREDDIT_MAP: Record<string, DomainTag> = {
	machinelearning: 'ai_ml',
	localllama: 'ai_ml',
	artificial: 'ai_ml',
	deeplearning: 'ai_ml',
	languagetechnology: 'ai_ml',
	javascript: 'frontend',
	reactjs: 'frontend',
	webdev: 'frontend',
	css: 'frontend',
	frontend: 'frontend',
	nextjs: 'frontend',
	sveltejs: 'frontend',
	vuejs: 'frontend',
	node: 'backend',
	golang: 'backend',
	rust: 'backend',
	python: 'backend',
	java: 'backend',
	programming: 'backend',
	softwaredevelopment: 'backend',
	devops: 'cloud_devops',
	kubernetes: 'cloud_devops',
	docker: 'cloud_devops',
	aws: 'cloud_devops',
	googlecloud: 'cloud_devops',
	terraform: 'cloud_devops',
	systemdesign: 'system_design',
	cscareerquestions: 'system_design',
	experienceddevs: 'system_design',
};

/**
 * Keyword sets for each domain (used for HN + RSS tagging).
 */
const KEYWORD_MAP: [DomainTag, RegExp][] = [
	[
		'ai_ml',
		/\b(machine learning|deep learning|neural net|llm|gpt|claude|gemini|transformer|fine.?tun|rag|retrieval augmented|embedding|diffusion|stable diffusion|midjourney|langchain|hugging ?face|training|inference|token|prompt|agent|rl(?:hf)?|lora|qlora|quantiz|bert|attention)\b/i,
	],
	[
		'backend',
		/\b(api|rest(?:ful)?|grpc|graphql|database|postgres|mysql|mongo|redis|microservice|server|scaling|queue|cache|auth(?:entication)?|oauth|jwt|middleware|orm|prisma|drizzle|sql|nosql)\b/i,
	],
	[
		'frontend',
		/\b(react|vue|svelte|angular|next\.?js|nuxt|css|tailwind|animation|component|responsive|accessibility|a11y|design system|webpack|vite|bundler|dom|browser|ui\/ux|figma)\b/i,
	],
	[
		'cloud_devops',
		/\b(kubernetes|k8s|docker|container|ci\/cd|deploy|aws|gcp|azure|infrastructure|monitoring|observability|terraform|helm|istio|service mesh|load balanc|cdn|cloudflare|vercel|railway|fly\.io)\b/i,
	],
	[
		'system_design',
		/\b(architecture|distributed|sharding|replication|cap theorem|consensus|raft|paxos|event.?driven|cqrs|event.?sourc|saga|circuit.?break|rate.?limit|system design|interview|leetcode|scalab)\b/i,
	],
];

/**
 * Tag a post by subreddit name (Reddit source).
 */
export function tagBySubreddit(subreddit: string): DomainTag | null {
	const normalized = subreddit.toLowerCase().replace(/^r\//, '');
	return SUBREDDIT_MAP[normalized] || null;
}

/**
 * Tag a post by keyword matching (HN / RSS source).
 */
export function tagByKeywords(title: string, snippet?: string | null): DomainTag | null {
	const text = `${title} ${snippet || ''}`;
	for (const [tag, regex] of KEYWORD_MAP) {
		if (regex.test(text)) return tag;
	}
	return null;
}

/**
 * Get the domain tag for a post.
 * Reddit posts use subreddit mapping first, then fall back to keywords.
 * HN/RSS posts use keyword matching.
 */
export function getDomainTag(
	source: string,
	subreddit: string | null,
	title: string,
	snippet?: string | null,
): DomainTag {
	if (source === 'reddit' && subreddit) {
		const tag = tagBySubreddit(subreddit);
		if (tag) return tag;
	}
	return tagByKeywords(title, snippet) || 'backend'; // fallback
}
