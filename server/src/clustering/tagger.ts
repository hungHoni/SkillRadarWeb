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
		/\b(machine learning|deep learning|neural net|llm|gpt|claude|gemini|openai|anthropic|transformer|fine.?tun|rag|retrieval augmented|embedding|diffusion|stable diffusion|midjourney|langchain|hugging ?face|training data|inference|token limit|prompt engineer|ai agent|rl(?:hf)?|lora|qlora|quantiz|bert|attention mechanism|chatbot|copilot|ai model|vision model|multimodal|generative ai)\b/i,
	],
	[
		'frontend',
		/\b(react|vue|svelte|angular|next\.?js|nuxt|css|tailwind|animation|ui component|responsive|accessibility|a11y|design system|webpack|vite|bundler|dom|browser api|ui\/ux|figma|web component)\b/i,
	],
	[
		'cloud_devops',
		/\b(kubernetes|k8s|docker|container|ci\/cd|deploy(?:ment)?|aws|gcp|azure|infrastructure|monitoring|observability|terraform|helm|istio|service mesh|load balanc|cdn|cloudflare|vercel|railway|fly\.io|devops|sre|incident)\b/i,
	],
	[
		'system_design',
		/\b(architecture|distributed system|sharding|replication|cap theorem|consensus|raft|paxos|event.?driven|cqrs|event.?sourc|saga pattern|circuit.?break|rate.?limit|system design|scalab|microservice|high availability)\b/i,
	],
	[
		'backend',
		/\b(api design|rest(?:ful) api|grpc|graphql|database|postgres|mysql|mongo|redis|server.?side|queue|caching layer|oauth|jwt|middleware|orm|prisma|drizzle|sql query|nosql|golang|rust lang|python|java|node\.?js|express|fastify|django|flask|spring boot)\b/i,
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
 * Returns the best matching tag based on number of keyword hits.
 */
export function tagByKeywords(title: string, snippet?: string | null): DomainTag | null {
	const text = `${title} ${snippet || ''}`;

	// Count matches per tag, pick the one with most hits
	let bestTag: DomainTag | null = null;
	let bestCount = 0;

	for (const [tag, regex] of KEYWORD_MAP) {
		const matches = text.match(new RegExp(regex.source, 'gi'));
		if (matches && matches.length > bestCount) {
			bestCount = matches.length;
			bestTag = tag;
		}
	}

	return bestTag;
}

/**
 * Get the domain tag for a post.
 * Reddit posts use subreddit mapping first, then fall back to keywords.
 * HN/RSS posts use keyword matching.
 * Falls back to 'backend' only as last resort — most untaggable HN posts are general tech.
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
	return tagByKeywords(title, snippet) || 'system_design'; // general tech fallback
}
