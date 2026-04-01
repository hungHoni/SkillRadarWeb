import type { DomainTag } from '@skillradar/shared';

/**
 * Keyword sets for each domain.
 * Order matters: first match with highest score wins.
 */
const KEYWORD_MAP: [DomainTag, RegExp][] = [
	[
		'breaking_news',
		/\b(breaking|election|president|congress|senate|parliament|war|conflict|ceasefire|earthquake|hurricane|flood|wildfire|tsunami|pandemic|vaccine|outbreak|economy|recession|inflation|stock market|fed rate|trade war|sanctions|protest|riot|coup|assassination|hostage|missile|nuclear|climate summit|G7|G20|NATO|UN resolution|evacuation|emergency|disaster|terror|explosion|supreme court|ruling|impeach|indictment|border|refugee|famine|government shutdown|executive order|mass shooting|crash landing|political|legislation|ballot|voter|geopolitical)\b/i,
	],
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
 * Tag a post by keyword matching.
 * Returns the best matching tag based on number of keyword hits.
 */
export function tagByKeywords(title: string, snippet?: string | null): DomainTag | null {
	const text = `${title} ${snippet || ''}`;

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
 * Uses keyword matching for all sources.
 * Falls back to 'system_design' as last resort — general tech fallback.
 */
export function getDomainTag(
	_source: string,
	_subreddit: string | null,
	title: string,
	snippet?: string | null,
): DomainTag {
	return tagByKeywords(title, snippet) || 'system_design';
}
