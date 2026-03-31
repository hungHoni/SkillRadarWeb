import 'dotenv/config';

function parseCorsOrigin(): boolean | string | string[] {
	const env = process.env.CORS_ORIGIN;
	if (!env) return process.env.NODE_ENV === 'development';
	if (env === 'true') return true;
	if (env === 'false') return false;
	return env.includes(',') ? env.split(',').map((s) => s.trim()) : env;
}

export const config = {
	port: Number(process.env.PORT) || 3000,
	nodeEnv: process.env.NODE_ENV || 'development',
	corsOrigin: parseCorsOrigin(),

	database: {
		url: process.env.DATABASE_URL || 'postgresql://localhost:5432/skillradar',
	},

	openai: {
		apiKey: process.env.OPENAI_API_KEY || '',
	},

	reddit: {
		clientId: process.env.REDDIT_CLIENT_ID || '',
		clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
		userAgent: process.env.REDDIT_USER_AGENT || 'SkillRadar/0.1.0',
	},
} as const;
