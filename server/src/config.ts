import 'dotenv/config';

export const config = {
	port: Number(process.env.PORT) || 3000,
	nodeEnv: process.env.NODE_ENV || 'development',

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
