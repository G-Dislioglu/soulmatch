// S23: patrol internals active —
/**
 * Nachdenker Phase — Opus-Bridge v4
 *
 * Runs AFTER successful deploy (async, not blocking).
 * Evaluates quality, updates worker scores, extracts patterns,
 * logs issues, and updates the repo index.
 */

import { callProvider } from './providers.js';
import type { BuildOrder } from './opusVordenker.js';
import type { BuildPlan } from './opusMeisterPlan.js';

// ─── Interfaces ───

export interface WorkerResult {
  worker: string;
  file: string;
  durationMs: number;
  valid: boolean;
  retries: number;
}

export interface NachdenkerReport {
  taskQuality: number; // 1-5
  workerScores: Record<string, { score: number; note: string }>;
  newPatterns: Array<{ name: string; description: string; files: number }>;
  issues: Array<{ severity: 'low' | 'medium' | 'high'; issue: string; fix: string }>;
  promptImprovements: string[];
  indexUpdates: string[];
  durationMs: number;
}

// ─── Constants ───

const NACHDENKER_MODEL = 'glm-5-turbo';
const NACHDENKER_PROVIDER = 'zhipu';

// ─── Implementation ───

function buildNachdenkerPrompt(
  buildOrder: BuildOrder,
  plan: BuildPlan,
  workerResults: WorkerResult[],
): string {
  return `You are the Nachdenker (Post-Reviewer). A feature was just deployed. Evaluate the results.

BUILD ORDER:
- Intent: ${buildOrder.intent}
- Requirements: ${buildOrder.requirements.join(', ')}

BUILD PLAN:
- Strategy: ${plan.strategy}
- Files planned: ${plan.totalFiles}
- Tasks: ${plan.tasks.map(t => `${t.worker} → ${t.file}`).join(', ')}

WORKER RESULTS:
${workerResults.map(w => `- ${w.worker}: ${w.file} | ${w.durationMs}ms | valid: ${w.valid} | retries: ${w.retries}`).join('\n')}

EVALUATE:
1. Task Quality (1-5): Did the pipeline deliver what was ordered?
2. Worker Scores (0-100 per worker): Speed, validity, retries
3. New Patterns: Any reusable patterns discovered?
4. Issues: What went wrong? How to prevent it?
5. Prompt Improvements: What should change in worker prompts?
6. Index Updates: Were new files created that need indexing?

Respond ONLY with JSON:
{
  "taskQuality": 4,
  "workerScores": {"deepseek": {"score": 85, "note": "fast and correct"}},
  "newPatterns": [{"name": "pattern-name", "description": "what it does", "files": 2}],
  "issues": [{"severity": "low", "issue": "description", "fix": "how to fix"}],
  "promptImprovements": ["suggestion for worker prompts"],
  "indexUpdates": ["new-file.ts added"]
}`;
}

function parseReport(raw: string): Omit<NachdenkerReport, 'durationMs'> {
  const fallback: Omit<NachdenkerReport, 'durationMs'> = {
    taskQuality: 0,
    workerScores: {},
    newPatterns: [],
    issues: [{ severity: 'high', issue: 'Failed to parse Nachdenker response', fix: 'Check GLM output' }],
    promptImprovements: [],
    indexUpdates: [],
  };

  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const parsed = JSON.parse(cleaned);
    return {
      taskQuality: typeof parsed.taskQuality === 'number' ? parsed.taskQuality : 0,
      workerScores: typeof parsed.workerScores === 'object' ? parsed.workerScores : {},
      newPatterns: Array.isArray(parsed.newPatterns) ? parsed.newPatterns : [],
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      promptImprovements: Array.isArray(parsed.promptImprovements) ? parsed.promptImprovements : [],
      indexUpdates: Array.isArray(parsed.indexUpdates) ? parsed.indexUpdates : [],
    };
  } catch {
    return fallback;
  }
}

/**
 * Runs the Nachdenker phase after a successful deploy.
 * Evaluates quality, scores workers, extracts learnings.
 * This is async and non-blocking — it doesn't affect the deploy.
 *
 * @param buildOrder - Original build order from CoThinker
 * @param plan - Build plan from Meister phase
 * @param workerResults - Results from the worker swarm
 * @returns NachdenkerReport with scores, patterns, and issues
 */
export async function runNachdenker(
  buildOrder: BuildOrder,
  plan: BuildPlan,
  workerResults: WorkerResult[],
): Promise<NachdenkerReport> {
  const start = Date.now();

  try {
    const prompt = buildNachdenkerPrompt(buildOrder, plan, workerResults);

    const raw = await callProvider(NACHDENKER_PROVIDER, NACHDENKER_MODEL, {
      system: 'You are a quality evaluator. Return ONLY valid JSON. Be honest and critical.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      maxTokens: 2000,
    });

    const report = parseReport(raw);
    return { ...report, durationMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      taskQuality: 0,
      workerScores: {},
      newPatterns: [],
      issues: [{ severity: 'high', issue: `Nachdenker error: ${msg}`, fix: 'Check GLM availability' }],
      promptImprovements: [],
      indexUpdates: [],
      durationMs: Date.now() - start,
    };
  }
}
