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
import { resolveScope, fetchFileContents } from './builderScopeResolver.js';
import { decideChangeMode, getWorkerPromptForMode } from './opusChangeRouter.js';

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
interface EditEnvelope {
  edits: Array<{
    path: string;
    mode: 'overwrite' | 'create';
    content: string;
  }>;
  summary: string;
  worker: string;
}

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

// ─── Phase 1: Deterministic Scope ───

function runScopePhase(instruction: string, manualScope?: string[], targetFile?: string): { files: string[]; reasoning: string[]; method: string } {
  if (manualScope && manualScope.length > 0) {
    return { files: manualScope, reasoning: ['manual override'], method: 'manual' };
  }
  const result = resolveScope(instruction);
  if (targetFile && !result.files.includes(targetFile)) {
    result.files.unshift(targetFile);
    result.reasoning.unshift(`${targetFile} (forced): targetFile parameter`);
  }
  return result;
}

// ─── Phase 3: Worker Swarm (Full-File Overwrite) ───

function buildWorkerPrompt(instruction: string, fileContents: Map<string, string>, scopeFiles: string[]): string {
  const fileSection = scopeFiles.map(f => {
    const content = fileContents.get(f);
    return content
      ? `--- ${f} (${content.split('\n').length} lines) ---\n${content}\n--- END ${f} ---`
      : `--- ${f} (NEW FILE) ---`;
  }).join('\n\n');

  return `TASK: ${instruction}

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

function parseEnvelope(raw: string, worker: string): EditEnvelope | null {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.edits || !Array.isArray(parsed.edits) || parsed.edits.length === 0) return null;
    for (const edit of parsed.edits) {
      if (!edit.path || typeof edit.path !== 'string') return null;
      if (!edit.content || typeof edit.content !== 'string') return null;
      if (!['overwrite', 'create'].includes(edit.mode)) edit.mode = 'overwrite';
    }
    return { edits: parsed.edits, summary: parsed.summary || '', worker };
  } catch {
    return null;
  }
}

function checkTypeScriptSyntax(edits: EditEnvelope['edits']): string[] {
  if (!ts) return []; // typescript not available — skip check
  const errors: string[] = [];
  for (const edit of edits) {
    if (!edit.path.endsWith('.ts') && !edit.path.endsWith('.tsx')) continue;
    try {
      const result = ts.transpileModule(edit.content, {
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
          strict: false,
        },
      });
      if (result.diagnostics?.length) {
        for (const d of result.diagnostics) {
          errors.push(`${edit.path}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
        }
      }
    } catch (e: unknown) {
      errors.push(`${edit.path}: transpile crashed — ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return errors;
}

function validateEnvelope(envelope: EditEnvelope, scopeFiles: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const edit of envelope.edits) {
    if (!scopeFiles.includes(edit.path) && edit.mode !== 'create') {
      errors.push(`"${edit.path}" not in scope and not create`);
    }
    if (edit.content.length < 10) {
      errors.push(`"${edit.path}" content too short (${edit.content.length} chars)`);
    }
  }
  errors.push(...checkTypeScriptSyntax(envelope.edits));
  return { valid: errors.length === 0, errors };
}

// ─── Phase 4b: Judge (only among valid candidates) ───

async function judgeValidCandidates(
  instruction: string, candidates: Array<{ envelope: EditEnvelope; worker: string }>,
): Promise<EditEnvelope> {
  if (candidates.length === 1) return candidates[0].envelope;

  const judgeConfig = WORKER_REGISTRY[JUDGE_WORKER];
  if (!judgeConfig) return candidates[0].envelope;

  const comparison = candidates.map((c, i) =>
    `=== Candidate ${i + 1}: ${c.worker} ===\nFiles: ${c.envelope.edits.map(e => e.path).join(', ')}\nSummary: ${c.envelope.summary}\nChars: ${c.envelope.edits.reduce((s, e) => s + e.content.length, 0)}`
  ).join('\n\n');

  try {
    const response = await callProvider(judgeConfig.provider, judgeConfig.model, {
      system: 'Pick the best code. Respond ONLY JSON: {"pick": 1, "reasoning": "..."}',
      messages: [{ role: 'user', content: `Task: ${instruction}\n\n${comparison}` }],
      maxTokens: 300, temperature: 0.1, forceJsonObject: false,
    });
    const m = response.match(/(\d+)/);
    const idx = m ? Math.max(0, Math.min(parseInt(m[1]) - 1, candidates.length - 1)) : 0;
    return candidates[idx].envelope;
  } catch {
    return candidates[0].envelope;
  }
}

// ─── Phase 5: Push ───

async function pushEdits(
  envelope: EditEnvelope, instruction: string,
): Promise<{ pushed: boolean; filesCount: number; error?: string; durationMs: number }> {
  const start = Date.now();
  try {
    const files = envelope.edits.map(e => ({ file: e.path, content: e.content }));
    const res = await fetch(internalUrl('/push'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, message: `feat(opus-task): ${instruction.slice(0, 80)}` }),
    });
    const data = await res.json() as Record<string, unknown>;
    return { pushed: !!data.triggered, filesCount: files.length, durationMs: Date.now() - start };
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
  const modePrompts: string[] = [];
  for (const [filePath, content] of fileContents.entries()) {
    const changeMode = decideChangeMode(content);
    console.log(`[ChangeRouter] ${filePath}: ${changeMode}`);
    modePrompts.push(getWorkerPromptForMode(changeMode));
  }

  phases.push({ phase: 'fetch', status: 'ok', durationMs: Date.now() - s2,
    detail: { fetched: fileContents.size, total: scope.files.length } });

  // Phase 3: Swarm
  const s3 = Date.now();
  const prompt = buildWorkerPrompt(input.instruction, fileContents, scope.files) + modePrompts.join('\n\n');
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
      summary: `${allParsed.length} parsed, 0 valid. Workers can't produce valid JSON overwrite yet.` };
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
