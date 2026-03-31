import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, initDb } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findMigrationsDir(): string {
	// Works both in dev (src/db/) and compiled (dist/db/) contexts
	const candidates = [
		path.join(__dirname, 'migrations'),
		path.resolve(__dirname, '../../src/db/migrations'),
	];
	for (const dir of candidates) {
		if (fs.existsSync(dir)) return dir;
	}
	throw new Error(`Migrations directory not found. Searched: ${candidates.join(', ')}`);
}

async function migrate() {
	await initDb();
	const pool = getPool();

	const migrationsDir = findMigrationsDir();
	console.log(`Using migrations from: ${migrationsDir}`);
	const files = fs
		.readdirSync(migrationsDir)
		.filter((f) => f.endsWith('.sql'))
		.sort();

	for (const file of files) {
		console.log(`Running migration: ${file}`);
		const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
		await pool.query(sql);
		console.log(`Completed: ${file}`);
	}

	console.log('All migrations complete.');
	await pool.end();
}

migrate().catch((err) => {
	console.error('Migration failed:', err);
	process.exit(1);
});
