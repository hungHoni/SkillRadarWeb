import pg from 'pg';
import { config } from '../config.js';

let pool: pg.Pool;

export function getPool(): pg.Pool {
	if (!pool) {
		pool = new pg.Pool({ connectionString: config.database.url });
	}
	return pool;
}

export async function initDb(): Promise<void> {
	const client = await getPool().connect();
	try {
		await client.query('SELECT 1');
	} finally {
		client.release();
	}
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
	text: string,
	params?: unknown[],
): Promise<pg.QueryResult<T>> {
	return getPool().query<T>(text, params);
}
