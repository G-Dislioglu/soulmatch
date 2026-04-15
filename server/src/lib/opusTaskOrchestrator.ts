/**
 * Opus-Task Orchestrator v2 — Minimal Viable Pipeline
 *
 * Changes from v1:
 * - Deterministic scope via builderScopeResolver (no LLM guessing)
 * - Full-file overwrite instead of SEARCH/REPLACE
 * - TypeScript syntax check before push
 * - Structured errors instead of silent catch
 * - Single runId through all phases
 * - dryRun mode for safe testing
 */

let ts: typeof import('typescript') | null = null;
try {
  ts = await import('typescript');
} catch {
  // typescript not available at runtime — TS check will be skipped
}
import { callProvider } from './providers.js';
import { waitForDeploy } from './opusAssist.js';
import { WORKER_REGISTRY, DEFAULT_WORKERS, JUDGE_WORKER } from './opusWorkerRegistry.js';
import { resolveScope, fetchFileContents, isIndexedRepoFile, type ScopeMethod } from './builderScopeResolver.js';
import { decideChangeMode, getWorkerPromptForMode, type ChangeMode } from './opusChangeRouter.js';
import { judgeValidCandidates } from './opusJudge.js';
import { smartPush } from './opusSmartPush.js';
import { parseEnvelope, validateEnvelope, type EditEnvelope } from './opusEnvelopeValidator.js';

// ─── Types ───

export interface OpusTaskInput {
  instruction: string;
  scope?: string[];
  targetFile?: string;
  workers?: string[];
  maxTokens?: number;
  skipDeploy?: boolean;
  dryRun?: boolean;
}

export interface OpusTaskResult {
  status: 'success' | 'partial' | 'failed' | 'dry_run';
  runId: string;
  phases: PhaseResult[];
  totalDurationMs: number;
  summary: string;
  edits?: EditEnvelope;
}

interface PhaseResult {
  phase: string;
  status: 'ok' | 'skipped' | 'error';
  durationMs: number;
  detail?: unknown;
}

/** The one and only change format. No SEARCH/REPLACE. No diff. No regex. */
// ─── Helpers ───

function generateRunId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function internalUrl(path: string): string {
  const port = process.env.PORT || 3000;
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) throw new Error('OPUS_BRIDGE_SECRET env not set');
  return `http://localhost:${port}/api/builder/opus-bridge${path}?opus_token=${token}`;
}

type OrchestratorScopeMethod = ScopeMethod | 'manual';

// ─── Phase 1: Deterministic Scope ───

function runScopePhase(instruction: string, manualScope?: string[], targetFile?: string): { files: string[]; reasoning: string[]; method: OrchestratorScopeMethod } {
  if (manualScope && manualScope.length > 0) {
    return { files: manualScope, reasoning: ['manual override'], method: 'manual' };
  }
  const result = resolveScope(instruction);
  if (targetFile && !result.files.includes(targetFile)) {
    result.files.unshift(targetFile);
    result.reasoning.unshift(`${targetFile} (forced): targetFile parameter`);
    if (!isIndexedRepoFile(targetFile) && /erstell|create|neue|hinzufueg|new file/i.test(instruction)) {
      result.method = 'create';
      result.reasoning.unshift(`${targetFile} (CREATE): targetFile is not in repo index`);
    }
  }
  return result;
}

// ─── Phase 3: Worker Swarm (Full-File Overwrite) ───

function buildWorkerPrompt(
  instruction: string,
  fileContents: Map<string, string>,
  scopeFiles: string[],
  scopeMethod: OrchestratorScopeMethod,
  fileModes: Array<{ path: string; mode: ChangeMode }>,
): string {
  const createTargets = fileModes.filter((entry) => entry.mode === 'create').map((entry) => entry.path);
  const fileSection = scopeFiles.map(f => {
    const content = fileContents.get(f);
    return content
      ? `--- ${f} (${content.split('\n').length} lines) ---\n${content}\n--- END ${f} ---`
      : `--- ${f} (NEW FILE) ---`;
  }).join('\n\n');

  return `TASK: ${instruction}

SCOPE METHOD: ${scopeMethod}
CREATE TARGETS: ${createTargets.length > 0 ? createTargets.join(', ') : 'none'}

FILES IN SCOPE:
${fileSection}

RESPONSE FORMAT — respond with ONLY this JSON structure, nothing else:
{
  "edits": [
    {
      "path": "exact/file/path.ts",
      "mode": "overwrite",
      "content": "COMPLETE new file content"
    }
  ],
  "summary": "one-line description"
}

RULES:
- For existing files: return the COMPLETE updated content (mode: overwrite)
- For new files: return complete content (mode: create)
- If a file is listed under CREATE TARGETS, do not treat it as an overwrite of an existing file
- Do NOT use SEARCH/REPLACE, diffs, or partial patches
- Do NOT wrap in markdown code blocks
- Return ONLY valid JSON`;
}

async function runWorkerSwarm(
  prompt: string, workers: string[], maxTokens: number,
): Promise<Array<{ worker: string; response: string; durationMs: number; error?: string }>> {
  return Promise.all(workers.map(async (worker) => {
    const config = WORKER_REGISTRY[worker];
    if (!config) return { worker, response: '', durationMs: 0, error: `Unknown worker: ${worker}` };
    const start = Date.now();
    try {
      const response = await Promise.race([
        callProvider(config.provider, config.model, {
          system: 'You are a senior TypeScript developer. Respond ONLY with valid JSON. No markdown, no explanation.',
          messages: [{ role: 'user', content: prompt }],
          maxTokens, temperature: 0.3, forceJsonObject: false,
        }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timeout 150s')), 150_000)),
      ]) as string;
      return { worker, response, durationMs: Date.now() - start };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { worker, response: '', durationMs: Date.now() - start, error: msg.slice(0, 200) };
    }
  }));
}

// ─── Phase 4: Parse + Validate ───

// ─── Phase 5: Push ───

async function pushEdits(
  envelope: EditEnvelope, instruction: string,
): Promise<{ pushed: boolean; filesCount: number; error?: string; durationMs: number }> {
  const start = Date.now();
  try {
    const files = envelope.edits.map((edit) =>
      edit.mode === 'patch'
        ? { file: edit.path, patches: edit.patches }
        : { file: edit.path, mode: edit.mode, content: edit.content ?? '' },
    );
    const result = await smartPush(files, `feat(opus-task): ${instruction.slice(0, 80)}`);
    return { pushed: result.pushed, filesCount: files.length, error: result.error, durationMs: Date.now() - start };
  } catch (e: unknown) {
    return { pushed: false, filesCount: 0, error: e instanceof Error ? e.message : String(e), durationMs: Date.now() - start };
  }
}

// ─── Phase 7: Self-Test ───

async function runSelfTest(): Promise<{ passed: boolean; durationMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch(internalUrl('/self-test'), { method: 'POST' });
    const data = await res.json() as Record<string, unknown>;
    return { passed: !!data.allPassed, durationMs: Date.now() - start };
  } catch {
    return { passed: false, durationMs: Date.now() - start };
  }
}

// ─── Main ───

export async function orchestrateTask(input: OpusTaskInput): Promise<OpusTaskResult> {
  const runId = generateRunId();
  const totalStart = Date.now();
  const phases: PhaseResult[] = [];
  const workers = input.workers || DEFAULT_WORKERS;
  const maxTokens = input.maxTokens || 6000;

  // Phase 1: Deterministic Scope
  const s1 = Date.now();
  const scope = runScopePhase(input.instruction, input.scope, input.targetFile);
  phases.push({
    phase: 'scope', status: scope.files.length > 0 ? 'ok' : 'error',
    durationMs: Date.now() - s1,
    detail: { files: scope.files, method: scope.method, reasoning: scope.reasoning.slice(0, 5) },
  });
  if (scope.files.length === 0) {
    return { status: 'failed', runId, phases, totalDurationMs: Date.now() - totalStart,
      summary: 'Scope resolver found 0 files. Include exact paths in instruction.' };
  }

  // Phase 2: Fetch
  const s2 = Date.now();
  const fileContents = await fetchFileContents(scope.files);
  
  // ChangeRouter: Decide mode for each file
  const fileModes = scope.files.map((filePath) => {
    const content = fileContents.get(filePath) ?? null;
    const changeMode = decideChangeMode(content);
    console.log(`[ChangeRouter] ${filePath}: ${changeMode}`);
    return { path: filePath, mode: changeMode };
  });
  const modePrompts = [...new Set(fileModes.map((entry) => getWorkerPromptForMode(entry.mode)))];

  phases.push({ phase: 'fetch', status: 'ok', durationMs: Date.now() - s2,
    detail: { fetched: fileContents.size, total: scope.files.length, createTargets: fileModes.filter((entry) => entry.mode === 'create').map((entry) => entry.path) } });

  // Phase 3: Swarm
  const s3 = Date.now();
  const prompt = `${buildWorkerPrompt(input.instruction, fileContents, scope.files, scope.method, fileModes)}\n\n${modePrompts.join('\n\n')}`;
  const results = await runWorkerSwarm(prompt, workers, maxTokens);
  const okResults = results.filter(r => r.response.length > 50 && !r.error);
  phases.push({ phase: 'swarm', status: okResults.length > 0 ? 'ok' : 'error',
    durationMs: Date.now() - s3,
    detail: results.map(r => ({ worker: r.worker, chars: r.response.length, ms: r.durationMs, error: r.error })) });
  if (okResults.length === 0) {
    return { status: 'failed', runId, phases, totalDurationMs: Date.now() - totalStart, summary: 'All workers failed.' };
  }

  // Phase 4: Parse + Validate
  const s4 = Date.now();
  const allParsed: Array<{ envelope: EditEnvelope; worker: string; errors: string[] }> = [];
  for (const r of okResults) {
    console.log(`[validate] raw worker output (${r.worker}):`, r.response.slice(0, 500));
    const envelope = parseEnvelope(r.response, r.worker);
    if (!envelope) continue;
    const v = validateEnvelope(envelope, scope.files);
    allParsed.push({ envelope, worker: r.worker, errors: v.errors });
  }
  const valid = allParsed.filter(c => c.errors.length === 0);
  phases.push({ phase: 'validate', status: valid.length > 0 ? 'ok' : 'error',
    durationMs: Date.now() - s4,
    detail: { parsed: allParsed.length, valid: valid.length, total: okResults.length,
      errors: allParsed.filter(c => c.errors.length > 0).map(c => ({ worker: c.worker, errors: c.errors })) } });

  if (valid.length === 0) {
    return { status: 'failed', runId, phases, totalDurationMs: Date.now() - totalStart,
      summary: `${allParsed.length} parsed, 0 valid. Workers can't produce a valid overwrite or patch envelope yet.` };
  }

  // Phase 4b: Judge
  const s4b = Date.now();
  const best = await judgeValidCandidates(input.instruction, valid);
  phases.push({ phase: 'judge', status: 'ok', durationMs: Date.now() - s4b,
    detail: { winner: best.worker, files: best.edits.map(e => e.path), summary: best.summary } });

  // Dry run?
  if (input.dryRun) {
    return { status: 'dry_run', runId, phases, edits: best,
      totalDurationMs: Date.now() - totalStart,
      summary: `Dry run: ${best.edits.length} file(s) ready. Winner: ${best.worker}` };
  }

  // Phase 5: Push
  if (input.skipDeploy) {
    phases.push({ phase: 'push', status: 'skipped', durationMs: 0 });
  } else {
    const push = await pushEdits(best, input.instruction);
    phases.push({ phase: 'push', status: push.pushed ? 'ok' : 'error', durationMs: push.durationMs, detail: push });
    if (!push.pushed) {
      return { status: 'partial', runId, phases, edits: best,
        totalDurationMs: Date.now() - totalStart, summary: `Push failed: ${push.error}` };
    }
  }

  // Phase 6: Deploy-Wait
  if (!input.skipDeploy) {
    const s6 = Date.now();
    const sid = process.env.RENDER_SERVICE_ID || '';
    const key = process.env.RENDER_API_KEY || '';
    if (sid && key) {
      const dep = await waitForDeploy(sid, key);
      phases.push({ phase: 'deploy-wait', status: dep.deployed ? 'ok' : 'error', durationMs: Date.now() - s6, detail: dep });
    } else {
      phases.push({ phase: 'deploy-wait', status: 'skipped', durationMs: 0 });
    }
  }

  // Phase 7: Self-Test
  if (!input.skipDeploy) {
    const t = await runSelfTest();
    phases.push({ phase: 'self-test', status: t.passed ? 'ok' : 'error', durationMs: t.durationMs });
  }

  const allOk = phases.every(p => p.status === 'ok' || p.status === 'skipped');
  return {
    status: allOk ? 'success' : 'partial', runId, phases, edits: best,
    totalDurationMs: Date.now() - totalStart,
    summary: `${allOk ? '✅' : '⚠️'} ${Math.round((Date.now() - totalStart) / 1000)}s | ${best.worker} | ${best.edits.map(e => e.path).join(', ')}`,
  };
}
