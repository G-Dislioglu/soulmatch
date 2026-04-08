/**
 * Opus Daily Standup v1.0
 *
 * Analysiert Worker-Performance aus der DB und generiert:
 * - Worker-Ranking mit Confidence
 * - Schwächen-Analyse (welche Worker versagen bei welchen Tasks)
 * - WORKER_COMPLEXITY_MAP Auto-Update Vorschläge
 * - Prompt-Optimierungs-Empfehlungen
 *
 * Kosten: $0 (reine DB-Analyse, kein LLM)
 */

import { desc, sql, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderWorkerScores, builderTasks } from '../schema/builder.js';

// ============================================================
// TYPES
// ============================================================

export interface StandupReport {
  timestamp: string;
  ranking: WorkerRankEntry[];
  insights: StandupInsight[];
  mapRecommendation: Record<string, string[]>;
  actionItems: string[];
}

interface WorkerRankEntry {
  worker: string;
  avgScore: number;
  recentAvg: number;
  taskCount: number;
  trend: 'improving' | 'declining' | 'stable' | 'new';
  bestAt: string;     // What kind of tasks they're best at (from notes)
  worstAt: string;    // What they struggle with
}

interface StandupInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'risk';
  worker: string;
  message: string;
  evidence: string;
}

// ============================================================
// MAIN
// ============================================================

export async function runDailyStandup(): Promise<StandupReport> {
  const db = getDb();

  // Load all scores with notes
  const allScores = await db
    .select({
      worker: builderWorkerScores.worker,
      quality: builderWorkerScores.quality,
      notes: builderWorkerScores.notes,
      createdAt: builderWorkerScores.createdAt,
    })
    .from(builderWorkerScores)
    .orderBy(desc(builderWorkerScores.createdAt));

  // Group by worker
  const grouped = new Map<string, Array<{ quality: number; notes: string | null; createdAt: Date }>>();
  for (const row of allScores) {
    const list = grouped.get(row.worker) ?? [];
    list.push({ quality: row.quality, notes: row.notes, createdAt: row.createdAt });
    grouped.set(row.worker, list);
  }

  // Build ranking
  const ranking: WorkerRankEntry[] = [];
  const insights: StandupInsight[] = [];

  for (const [worker, scores] of grouped) {
    const taskCount = scores.length;
    const avgScore = avg(scores.map((s) => s.quality));
    const recentScores = scores.slice(0, 10);
    const olderScores = scores.slice(10, 20);
    const recentAvg = avg(recentScores.map((s) => s.quality));
    const olderAvg = olderScores.length > 0 ? avg(olderScores.map((s) => s.quality)) : recentAvg;

    // Trend detection
    let trend: WorkerRankEntry['trend'] = 'stable';
    if (taskCount < 3) {
      trend = 'new';
    } else if (recentAvg - olderAvg > 10) {
      trend = 'improving';
    } else if (olderAvg - recentAvg > 10) {
      trend = 'declining';
    }

    // Best/worst analysis from notes
    const goodNotes = scores.filter((s) => s.quality >= 80 && s.notes).map((s) => s.notes!);
    const badNotes = scores.filter((s) => s.quality < 50 && s.notes).map((s) => s.notes!);
    const bestAt = extractPattern(goodNotes) || 'nicht genug Daten';
    const worstAt = extractPattern(badNotes) || 'nicht genug Daten';

    ranking.push({ worker, avgScore, recentAvg, taskCount, trend, bestAt, worstAt });

    // Generate insights
    if (trend === 'declining' && taskCount >= 5) {
      insights.push({
        type: 'risk',
        worker,
        message: `${worker} verschlechtert sich: ${olderAvg.toFixed(0)} → ${recentAvg.toFixed(0)}`,
        evidence: `Letzte ${recentScores.length} Tasks vs vorherige ${olderScores.length}`,
      });
    }

    if (trend === 'improving' && taskCount >= 5) {
      insights.push({
        type: 'opportunity',
        worker,
        message: `${worker} verbessert sich: ${olderAvg.toFixed(0)} → ${recentAvg.toFixed(0)}`,
        evidence: `Kann für komplexere Tasks eingesetzt werden`,
      });
    }

    if (avgScore >= 80 && taskCount >= 3) {
      insights.push({
        type: 'strength',
        worker,
        message: `${worker} ist zuverlässig (${avgScore.toFixed(0)} avg, ${taskCount} tasks)`,
        evidence: goodNotes[0] ?? 'konsistent gute Ergebnisse',
      });
    }

    if (avgScore < 40 && taskCount >= 3) {
      insights.push({
        type: 'weakness',
        worker,
        message: `${worker} hat Probleme (${avgScore.toFixed(0)} avg, ${taskCount} tasks)`,
        evidence: badNotes[0] ?? 'konsistent schlechte Ergebnisse',
      });
    }
  }

  // Sort ranking by recentAvg (most relevant for next task)
  ranking.sort((a, b) => b.recentAvg - a.recentAvg);

  // Generate optimized WORKER_COMPLEXITY_MAP
  const mapRecommendation = generateOptimizedMap(ranking);

  // Action items
  const actionItems = generateActionItems(ranking, insights);

  return {
    timestamp: new Date().toISOString(),
    ranking,
    insights,
    mapRecommendation,
    actionItems,
  };
}

// ============================================================
// HELPERS
// ============================================================

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function extractPattern(notes: string[]): string {
  if (notes.length === 0) return '';
  // Find most common words across notes (simple frequency analysis)
  const words = new Map<string, number>();
  for (const note of notes) {
    for (const word of note.toLowerCase().split(/\s+/)) {
      if (word.length > 3) {
        words.set(word, (words.get(word) ?? 0) + 1);
      }
    }
  }
  const sorted = [...words.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 3).map(([w]) => w).join(', ') || notes[0]?.slice(0, 50) || '';
}

function generateOptimizedMap(ranking: WorkerRankEntry[]): Record<string, string[]> {
  // Workers sorted by effective performance for each complexity level
  const reliable = ranking.filter((w) => w.taskCount >= 3 && w.recentAvg >= 60);
  const budget = ranking.filter((w) => w.taskCount >= 2 && w.recentAvg >= 40);
  const top = ranking.filter((w) => w.recentAvg >= 75);

  return {
    trivial: budget.length >= 2
      ? budget.slice(0, 4).map((w) => w.worker)
      : ['deepseek', 'qwen', 'kimi', 'minimax'],
    simple: budget.length >= 2
      ? budget.slice(0, 4).map((w) => w.worker)
      : ['deepseek', 'minimax', 'kimi', 'sonnet'],
    medium: reliable.length >= 2
      ? reliable.slice(0, 4).map((w) => w.worker)
      : ['minimax', 'sonnet', 'deepseek', 'gpt'],
    complex: top.length >= 1
      ? [...top.slice(0, 2).map((w) => w.worker), 'opus']
      : ['minimax', 'sonnet', 'opus'],
  };
}

function generateActionItems(ranking: WorkerRankEntry[], insights: StandupInsight[]): string[] {
  const items: string[] = [];

  // Recommend removing bad workers
  const badWorkers = ranking.filter((w) => w.taskCount >= 5 && w.recentAvg < 30);
  for (const w of badWorkers) {
    items.push(`${w.worker} aus Medium/Complex entfernen (avg ${w.recentAvg.toFixed(0)})`);
  }

  // Recommend promoting good workers
  const goodWorkers = ranking.filter((w) => w.trend === 'improving' && w.recentAvg >= 70);
  for (const w of goodWorkers) {
    items.push(`${w.worker} für Complex-Tasks testen (Trend: ↑, recent ${w.recentAvg.toFixed(0)})`);
  }

  // Recommend testing new workers more
  const newWorkers = ranking.filter((w) => w.trend === 'new');
  for (const w of newWorkers) {
    items.push(`${w.worker} braucht mehr Tasks (nur ${w.taskCount}) für zuverlässige Bewertung`);
  }

  // Risk: declining workers
  const declining = insights.filter((i) => i.type === 'risk');
  for (const i of declining) {
    items.push(`⚠️ ${i.message}`);
  }

  if (items.length === 0) {
    items.push('Keine Optimierungen nötig — System läuft stabil');
  }

  return items;
}

// ============================================================
// CLEANUP
// ============================================================

const KNOWN_WORKERS = new Set([
  'deepseek', 'sonnet', 'gpt', 'glm', 'glm-flash', 'grok',
  'opus', 'minimax', 'qwen', 'kimi',
]);

export async function cleanupInvalidScores(): Promise<{
  deleted: number;
  invalidWorkers: string[];
}> {
  const db = getDb();

  const allWorkers = await db
    .selectDistinct({ worker: builderWorkerScores.worker })
    .from(builderWorkerScores);

  const invalidWorkers = allWorkers
    .map((r) => r.worker)
    .filter((w) => !KNOWN_WORKERS.has(w));

  let deleted = 0;
  for (const worker of invalidWorkers) {
    await db
      .delete(builderWorkerScores)
      .where(eq(builderWorkerScores.worker, worker));
    deleted += 1;
  }

  return { deleted, invalidWorkers };
}
