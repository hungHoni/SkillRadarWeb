import OpenAI from 'openai';
import { config } from '../config.js';

const client = new OpenAI({ apiKey: config.openai.apiKey });

const BATCH_SIZE = 100;

/**
 * Generate embeddings for a batch of texts using OpenAI text-embedding-3-small.
 * Handles batching (up to 100 per API call) automatically.
 * Returns null for any text that fails.
 */
export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
	if (texts.length === 0) return [];

	const results: (number[] | null)[] = new Array(texts.length).fill(null);

	for (let i = 0; i < texts.length; i += BATCH_SIZE) {
		const batch = texts.slice(i, i + BATCH_SIZE);
		try {
			const response = await client.embeddings.create({
				model: 'text-embedding-3-small',
				input: batch,
			});

			for (const item of response.data) {
				results[i + item.index] = item.embedding;
			}
		} catch (err) {
			console.error(`Embedding batch failed (offset ${i}):`, err);
			// Leave nulls for this batch — posts will be stored without embeddings
		}
	}

	return results;
}

/**
 * Generate a single embedding. Convenience wrapper.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
	const results = await generateEmbeddings([text]);
	return results[0];
}
