import "../routes/patrolMount.js";
/**
 * Vordenker (Scout) Phase — Opus-Bridge v4
 *
 * Scans the repo index and identifies relevant files, patterns,
 * and reuse candidates before the Meister plan phase.
 * Uses GLM-5-Turbo via Zhipu API for analysis.
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { callProvider } from './providers.js';

// ─── Interfaces ───

export interface BuildOrder {
  intent: string;
  requirements: string[];
  constraints: string[];
  estimatedFiles: number;
}

export interface RelevantFile {
  path: string;
  lines: number;
  reason: string;
}

export interface ScoutReport {
  relevantFiles: RelevantFile[];
  patterns: string[];
  reuseCandidates: string[];
  importGraph: Record<string, string[]>;
  warnings: string[];
  durationMs: number;
}

// ─── Constants ───

const VORDENKER_MODEL = 'glm-5-turbo';
const VORDENKER_PROVIDER = 'zhipu';
const INDEX_PATH = 'data/builder-repo-index.json';

// ─── Implementation ───

async function loadRepoIndex(): Promise<unknown> {
  const fullPath = resolve(process.cwd(), INDEX_PATH);
  const content = await readFile(fullPath, 'utf-8');
  return JSON.parse(content);
}

function buildScoutPrompt(buildOrder: BuildOrder, repoIndex: unknown): string {
  return `You are the Vordenker (Scout). Analyze the build order and identify relevant files from the repository index.

BUILD ORDER:
- Intent: ${buildOrder.intent}
- Requirements: ${buildOrder.requirements.join('\n  - ')}
- Constraints: ${buildOrder.constraints.join('\n  - ')}
- Estimated files to change: ${buildOrder.estimatedFiles}

REPOSITORY INDEX:
${JSON.stringify(repoIndex, null, 2)}

RULES:
1. Identify files that need to be CHANGED or READ for context
2. Find existing patterns that should be REUSED (Reuse-First rule)
3. Map the import graph for affected files
4. Warn about potential risks or dependencies

Respond ONLY with a JSON object:
{
  "relevantFiles": [{"path": "server/src/...", "lines": 0, "reason": "why this file matters"}],
  "patterns": ["description of reusable pattern found in file:line"],
  "reuseCandidates": ["existing code that can be reused and where"],
  "importGraph": {"file.ts": ["imports from these files"]},
  "warnings": ["any risks or things to watch out for"]
}`;
}

function parseScoutResponse(raw: string): Omit<ScoutReport, 'durationMs'> {
  const fallback: Omit<ScoutReport, 'durationMs'> = {
    relevantFiles: [],
    patterns: [],
    reuseCandidates: [],
    importGraph: {},
    warnings: ['Failed to parse scout response'],
  };

  try {
    // Strip markdown fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const parsed = JSON.parse(cleaned);

    return {
      relevantFiles: Array.isArray(parsed.relevantFiles) ? parsed.relevantFiles : [],
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      reuseCandidates: Array.isArray(parsed.reuseCandidates) ? parsed.reuseCandidates : [],
      importGraph: typeof parsed.importGraph === 'object' ? parsed.importGraph : {},
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };
  } catch {
    return fallback;
  }
}

/**
 * Runs the Vordenker (Scout) phase.
 * Calls GLM-5-Turbo to analyze the build order against the repo index.
 *
 * @param buildOrder - Structured build order from the CoThinker
 * @returns ScoutReport with relevant files, patterns, and reuse candidates
 */
export async function runVordenker(buildOrder: BuildOrder): Promise<ScoutReport> {
  const start = Date.now();

  try {
    const repoIndex = await loadRepoIndex();
    const prompt = buildScoutPrompt(buildOrder, repoIndex);

    const raw = await callProvider(VORDENKER_PROVIDER, VORDENKER_MODEL, {
      system: 'You are a code scout. Return ONLY valid JSON. No explanations.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      maxTokens: 2000,
    });

    const report = parseScoutResponse(raw);

    return { ...report, durationMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      relevantFiles: [],
      patterns: [],
      reuseCandidates: [],
      importGraph: {},
      warnings: [`Vordenker error: ${msg}`],
      durationMs: Date.now() - start,
    };
  }
}
