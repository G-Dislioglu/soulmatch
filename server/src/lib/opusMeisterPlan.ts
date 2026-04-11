/**
 * Meister-Plan Phase — Opus-Bridge v4
 *
 * Opus plans the decomposition, GPT-5.4 critiques it, Opus finalizes.
 * Produces a build plan with independent sub-tasks for parallel workers.
 */

import { callProvider } from './providers.js';
import type { BuildOrder, ScoutReport } from './opusVordenker.js';

// ─── Interfaces ───

export interface SubTask {
  id: string;
  file: string;
  instruction: string;
  worker: string;
  patterns: string[];
  interfaces: {
    provides?: string[];
    consumes?: string[];
  };
}

export interface BuildPlan {
  totalFiles: number;
  strategy: 'parallel-independent' | 'sequential' | 'single-file';
  interfaceDefinitions: Record<string, string>;
  tasks: SubTask[];
  durationMs: number;
  rounds: Array<{ role: string; durationMs: number }>;
}

// ─── Constants ───

const PLANNER = { provider: 'anthropic', model: 'claude-opus-4-6' };
const CRITIC  = { provider: 'openai',    model: 'gpt-5.4' };

const AVAILABLE_WORKERS = ['glm', 'minimax', 'qwen', 'kimi'];

// ─── Prompts ───

function plannerPrompt(buildOrder: BuildOrder, scout: ScoutReport): string {
  return `You are the Meister (Architect). Decompose this feature into independent sub-tasks for parallel workers.

BUILD ORDER:
- Intent: ${buildOrder.intent}
- Requirements: ${buildOrder.requirements.join('\n  - ')}
- Constraints: ${buildOrder.constraints.join('\n  - ')}

SCOUT REPORT:
- Relevant files: ${scout.relevantFiles.map(f => `${f.path} (${f.reason})`).join('\n  ')}
- Patterns found: ${scout.patterns.join('\n  ')}
- Reuse candidates: ${scout.reuseCandidates.join('\n  ')}
- Import graph: ${JSON.stringify(scout.importGraph)}
- Warnings: ${scout.warnings.join('\n  ')}

AVAILABLE WORKERS: ${AVAILABLE_WORKERS.join(', ')}
Worker strengths: glm=API/routing+business logic, minimax=frontend, qwen=complex functions, kimi=utilities

CRITICAL RULES:
1. Each sub-task MUST be independent — no worker waits for another
2. Define shared interfaces BEFORE assigning tasks (workers implement them)
3. Use patterns from the scout report (Reuse-First rule)
4. Assign workers based on their strengths
5. Max ${buildOrder.estimatedFiles} sub-tasks (one per file)

Respond ONLY with JSON:
{
  "totalFiles": number,
  "strategy": "parallel-independent",
  "interfaceDefinitions": {"functionName": "full TypeScript signature"},
  "tasks": [
    {
      "id": "task-1",
      "file": "server/src/...",
      "instruction": "Detailed instruction for the worker. Include patterns to follow.",
      "worker": "glm",
      "patterns": ["pattern references from scout"],
      "interfaces": {"provides": ["functionName"], "consumes": ["otherFunction"]}
    }
  ]
}`;
}

function criticPrompt(plan: string, buildOrder: BuildOrder): string {
  return `You are the Critic (Reviewer). Check this build plan for problems.

BUILD ORDER INTENT: ${buildOrder.intent}

PROPOSED PLAN:
${plan}

CHECK:
1. Are the sub-tasks truly independent? Can each run without waiting for another?
2. Are the interface definitions complete? Will imports work?
3. Are there missing files that should be changed?
4. Is complexity distributed fairly (no worker gets 80% of the work)?
5. Do the instructions reference the correct patterns?
6. Are the constraints from the build order respected?

Respond ONLY with JSON:
{
  "approved": true/false,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1"],
  "missingFiles": ["file that should be included"],
  "interfaceFixes": {"functionName": "corrected signature"}
}`;
}

function finalizerPrompt(originalPlan: string, critique: string): string {
  return `You are the Meister finalizing the build plan after critique.

ORIGINAL PLAN:
${originalPlan}

CRITIC FEEDBACK:
${critique}

Integrate valid criticism into the plan. Ignore nitpicks.
If the critic found real issues, fix them.
If the critic approved, return the original plan unchanged.

Respond ONLY with the final JSON plan (same format as original).`;
}

// ─── Implementation ───

async function callMeister(
  provider: string, model: string, system: string, prompt: string
): Promise<{ raw: string; ms: number }> {
  const start = Date.now();
  const raw = await callProvider(provider, model, {
    system,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    maxTokens: 3000,
  });
  return { raw, ms: Date.now() - start };
}

function parsePlan(raw: string): Omit<BuildPlan, 'durationMs' | 'rounds'> | null {
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.tasks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Runs the Meister-Plan phase (3 rounds: Plan → Critique → Finalize).
 *
 * @param buildOrder - From the CoThinker
 * @param scoutReport - From the Vordenker
 * @returns BuildPlan with independent sub-tasks
 */
export async function runMeisterPlan(
  buildOrder: BuildOrder,
  scoutReport: ScoutReport,
): Promise<BuildPlan> {
  const start = Date.now();
  const rounds: Array<{ role: string; durationMs: number }> = [];

  // Round 1: Opus plans
  const r1 = await callMeister(
    PLANNER.provider, PLANNER.model,
    'You are a senior software architect. Return ONLY valid JSON.',
    plannerPrompt(buildOrder, scoutReport),
  );
  rounds.push({ role: 'planner-opus', durationMs: r1.ms });

  // Round 2: GPT-5.4 critiques
  const r2 = await callMeister(
    CRITIC.provider, CRITIC.model,
    'You are a critical code reviewer. Return ONLY valid JSON.',
    criticPrompt(r1.raw, buildOrder),
  );
  rounds.push({ role: 'critic-gpt', durationMs: r2.ms });

  // Round 3: Opus finalizes
  const r3 = await callMeister(
    PLANNER.provider, PLANNER.model,
    'You are a senior software architect finalizing a plan. Return ONLY valid JSON.',
    finalizerPrompt(r1.raw, r2.raw),
  );
  rounds.push({ role: 'finalizer-opus', durationMs: r3.ms });

  // Parse final plan
  const plan = parsePlan(r3.raw) ?? parsePlan(r1.raw);

  if (!plan) {
    return {
      totalFiles: 0,
      strategy: 'single-file',
      interfaceDefinitions: {},
      tasks: [],
      durationMs: Date.now() - start,
      rounds,
    };
  }

  return {
    ...plan,
    durationMs: Date.now() - start,
    rounds,
  };
}
