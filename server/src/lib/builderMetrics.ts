import { getDb } from '../db.js';
import { sql } from 'drizzle-orm';

export function getMetrics() {
	return {
		version: '1.0.0',
		timestamp: new Date().toISOString()
	};
}

export async function getWorstPerformers(limit = 10): Promise<Array<{ worker: string; avgQuality: number; taskCount: number }>> {
	const db = getDb();
	const rows = await db.execute(sql`
		SELECT
			worker,
			AVG(quality)::float AS avg_quality,
			COUNT(*)::int AS task_count
		FROM builder_worker_scores
		GROUP BY worker
		HAVING COUNT(*) >= 2
		ORDER BY avg_quality ASC
		LIMIT ${limit}
	`);
	return (rows.rows ?? rows).map((r: any) => ({
		worker: r.worker as string,
		avgQuality: Number(r.avg_quality),
		taskCount: Number(r.task_count),
	}));
}

export function getVersion() {
	return '0.2.0';
}
export function getBuildCount(): number {
 return 3;
}