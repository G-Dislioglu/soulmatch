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
import { findRelatedFiles, loadBuilderFileIndex, type RelatedFile } from './builderRelatedFiles.js';
import { decideChangeMode, getWorkerPromptForMode, type ChangeMode } from './opusChangeRouter.js';
import { judgeValidCandidates } from './opusJudge.js';
import { evaluateCandidateClaims, resolveGateMode } from './opusClaimGate.js';
import { smartPush } from './opusSmartPush.js';
import { parseEnvelope, validateEnvelope, type EditEnvelope } from './opusEnvelopeValidator.js';
import { devLogger } from '../devLogger.js';

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
  /** True only if dispatches landed on main (verified by pushResultWaiter). Undefined for synchronous direct-patch path where landing equals success. */
  landed?: boolean;
  /** Verified commit SHA from GitHub Actions execution-result callback, if available. */
  verifiedCommit?: string;
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
const CREATE_SIGNAL_RE = /erstell|create|neue|hinzufueg|new file/i;

interface ScopePhaseResult {
  files: string[];
  reasoning: string[];
  method: OrchestratorScopeMethod;
  rejectedPaths?: string[];
}

// ─── Phase 1: Deterministic Scope ───

function runScopePhase(instruction: string, manualScope?: string[], targetFile?: string): ScopePhaseResult {
  if (manualScope && manualScope.length > 0) {
    const uniqueManualScope = [...new Set(manualScope)];
    const indexed = uniqueManualScope.filter((path) => isIndexedRepoFile(path));
    const unindexed = uniqueManualScope.filter((path) => !isIndexedRepoFile(path));

    if (unindexed.length > 0 && !CREATE_SIGNAL_RE.test(instruction)) {
      return {
        files: [],
        reasoning: unindexed.map((path) => `manual scope path not in repo index and no create signal in instruction: ${path}`),
        method: 'deterministic',
        rejectedPaths: unindexed,
      };
    }

    const reasoning = ['manual override'];
    if (indexed.length > 0) {
      reasoning.push(`manual scope indexed: ${indexed.join(', ')}`);
    }
    if (unindexed.length > 0) {
      reasoning.push(...unindexed.map((path) => `${path} (CREATE): manual scope path not in repo index, create signal present`));
    }

    return {
      files: [...indexed, ...unindexed],
      reasoning,
      method: unindexed.length > 0 ? 'create' : 'manual',
    };
  }
  const result = resolveScope(instruction);
  if (targetFile && !result.files.includes(targetFile)) {
    result.files.unshift(targetFile);
    result.reasoning.unshift(`${targetFile} (forced): targetFile parameter`);
    if (!isIndexedRepoFile(targetFile) && CREATE_SIGNAL_RE.test(instruction)) {
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
  relatedFiles: RelatedFile[],
): string {
  const createTargets = fileModes.filter((entry) => entry.mode === 'create').map((entry) => entry.path);
  const fileSection = scopeFiles.map(f => {
    const content = fileContents.get(f);
    return content
      ? `--- ${f} (${content.split('\n').length} lines) ---\n${content}\n--- END ${f} ---`
      : `--- ${f} (NEW FILE) ---`;
  }).join('\n\n');
  const relatedSection = relatedFiles.length > 0
    ? `\n\n## KONTEXT (nur lesen, nicht editieren)\n${relatedFiles.map((file) => `### ${file.path} (${file.source})\n${file.preview}`).join('\n\n')}`
    : '';

  return `TASK: ${instruction}

SCOPE METHOD: ${scopeMethod}
CREATE TARGETS: ${createTargets.length > 0 ? createTargets.join(', ') : 'none'}

FILES IN SCOPE:
${fileSection}
${relatedSection}

RESPONSE FORMAT — respond with ONLY this JSON structure, nothing else:
{
  "edits": [
    {
      "path": "exact/file/path.ts",
      "mode": "overwrite",
      "content": "COMPLETE new file content"
    }
  ],
  "summary": "one-line description",
  "claims": [
    {
      "text": "short concrete change claim",
      "evidence_refs": [
        { "type": "edit_path", "ref": "exact/file/path.ts" }
      ]
    }
  ]
}

RULES:
- For existing files: return the COMPLETE updated content (mode: overwrite)
- For new files: return complete content (mode: create)
- If a file is listed under CREATE TARGETS, do not treat it as an overwrite of an existing file
- Include 1-3 short claims with concrete evidence_refs when possible
- Allowed evidence_ref.type values: edit_path, scope_path, explicit_path, other
- Do NOT invent anchor_status, impact_class, risk_class, or any other governance fields
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
): Promise<{
  pushed: boolean;
  filesCount: number;
  asyncDispatch: boolean;
  error?: string;
  durationMs: number;
  landed?: boolean;
  verifiedCommit?: string;
}> {
  const start = Date.now();
  try {
    const files = envelope.edits.map((edit) =>
      edit.mode === 'patch'
        ? { file: edit.path, patches: edit.patches }
        : { file: edit.path, mode: edit.mode, content: edit.content ?? '' },
    );
    const result = await smartPush(files, `feat(opus-task): ${instruction.slice(0, 80)}`);
    return {
      pushed: result.pushed,
      filesCount: files.length,
      asyncDispatch: result.asyncDispatch,
      error: result.error,
      durationMs: Date.now() - start,
      landed: result.landed,
      verifiedCommit: result.commitHash,
    };
  } catch (e: unknown) {
    return { pushed: false, filesCount: 0, asyncDispatch: false, error: e instanceof Error ? e.message : String(e), durationMs: Date.now() - start };
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
  const indexedFiles = scope.files.filter((path) => isIndexedRepoFile(path));
  const createTargets = scope.method === 'create'
    ? scope.files.filter((path) => !isIndexedRepoFile(path))
    : [];
  phases.push({
    phase: 'scope', status: scope.files.length > 0 ? 'ok' : 'error',
    durationMs: Date.now() - s1,
    detail: {
      files: scope.files,
      method: scope.method,
      reasoning: scope.reasoning.slice(0, 5),
      indexedFiles,
      createTargets,
      rejectedPaths: scope.rejectedPaths ?? [],
    },
  });
  if (scope.files.length === 0) {
    return {
      status: 'failed',
      runId,
      phases,
      totalDurationMs: Date.now() - totalStart,
      summary: scope.rejectedPaths && scope.rejectedPaths.length > 0
        ? `Scope rejected ${scope.rejectedPaths.length} hallucinated path(s): ${scope.rejectedPaths.join(', ')}. Include exact paths in instruction or provide explicit create signal.`
        : 'Scope resolver found 0 files. Include exact paths in instruction.',
    };
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
  let relatedFiles: RelatedFile[] = [];
  try {
    const fileIndex = loadBuilderFileIndex();
    const seen = new Set(scope.files);
    for (const scopeFile of scope.files) {
      const related = await findRelatedFiles(scopeFile, fileIndex, 5);
      for (const candidate of related) {
        if (seen.has(candidate.path)) continue;
        seen.add(candidate.path);
        relatedFiles.push(candidate);
        if (relatedFiles.length >= 5) break;
      }
      if (relatedFiles.length >= 5) break;
    }
  } catch (err) {
    console.error('[related-files] failed to load deterministic context:', err);
  }
  const ambiguousTargets = fileModes.filter((entry) => entry.mode === 'ambiguous').map((entry) => entry.path);
  if (ambiguousTargets.length > 0) {
    phases.push({ phase: 'fetch', status: 'error', durationMs: Date.now() - s2,
      detail: { fetched: fileContents.size, total: scope.files.length, ambiguousTargets } });
    return { status: 'failed', runId, phases, totalDurationMs: Date.now() - totalStart,
      summary: `Ambiguous file state for: ${ambiguousTargets.join(', ')}` };
  }
  const modePrompts = [...new Set(fileModes.map((entry) => getWorkerPromptForMode(entry.mode)))];

  phases.push({ phase: 'fetch', status: 'ok', durationMs: Date.now() - s2,
    detail: { fetched: fileContents.size, total: scope.files.length, createTargets: fileModes.filter((entry) => entry.mode === 'create').map((entry) => entry.path), relatedFiles: relatedFiles.map((file) => ({ path: file.path, source: file.source })) } });

  // Phase 3: Swarm
  const s3 = Date.now();
  const prompt = `${buildWorkerPrompt(input.instruction, fileContents, scope.files, scope.method, fileModes, relatedFiles)}\n\n${modePrompts.join('\n\n')}`;
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

  // Phase 4a: Claim Gate
  const s4a = Date.now();
  const gateMode = resolveGateMode();
  const gateResults = valid.map(({ envelope, worker }) => ({
    worker,
    result: evaluateCandidateClaims({
      instruction: input.instruction,
      scopeFiles: scope.files,
      envelope,
      mode: gateMode,
    }),
  }));
  const gatedCandidates = gateMode === 'hard'
    ? valid.filter((candidate) => !gateResults.find((entry) => entry.worker === candidate.worker)?.result.blocked)
    : valid;

  devLogger.info('system', 'F13 claim gate evaluated candidates', {
    mode: gateMode,
    runId,
    candidates: gateResults.map((entry) => ({
      worker: entry.worker,
      impactClass: entry.result.impactClass,
      blocked: entry.result.blocked,
      rejectCodes: entry.result.rejectCodes,
      claims: entry.result.claims.map((claim) => ({
        text: claim.text,
        anchorStatus: claim.anchorStatus,
        matchedRefs: claim.matchedRefs,
      })),
    })),
  });

  phases.push({
    phase: 'claim-gate',
    status: gatedCandidates.length > 0 ? 'ok' : 'error',
    durationMs: Date.now() - s4a,
    detail: {
      mode: gateMode,
      candidates: gateResults.map((entry) => ({
        worker: entry.worker,
        impactClass: entry.result.impactClass,
        blocked: entry.result.blocked,
        rejectCodes: entry.result.rejectCodes,
        claims: entry.result.claims,
      })),
    },
  });

  if (gatedCandidates.length === 0) {
    const rejectCodes = [...new Set(gateResults.flatMap((entry) => entry.result.rejectCodes))];
    return {
      status: 'failed',
      runId,
      phases,
      totalDurationMs: Date.now() - totalStart,
      summary: `F13 hard gate rejected all candidates: ${rejectCodes.join(', ') || 'unknown_reason'}`,
    };
  }

  // Phase 4b: Judge
  const s4b = Date.now();
  const judge = await judgeValidCandidates(input.instruction, gatedCandidates, {
    scopeFiles: scope.files,
    createTargets: fileModes.filter((entry) => entry.mode === 'create').map((entry) => entry.path),
  });
  phases.push({ phase: 'judge', status: judge.approved && judge.winner ? 'ok' : 'error', durationMs: Date.now() - s4b,
    detail: judge.approved && judge.winner
      ? { winner: judge.worker, files: judge.winner.edits.map(e => e.path), summary: judge.winner.summary, reason: judge.reason }
      : { reason: judge.reason, rejectedWorkers: judge.rejectedWorkers } });
  if (!judge.approved || !judge.winner) {
    return { status: 'failed', runId, phases, totalDurationMs: Date.now() - totalStart,
      summary: `Judge rejected all candidates: ${judge.reason}` };
  }
  const best = judge.winner;

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
        totalDurationMs: Date.now() - totalStart,
        summary: `Push failed: ${push.error}`,
        landed: push.landed,
        verifiedCommit: push.verifiedCommit,
      };
    }
  }

  // Phase 6: Deploy-Wait
  if (!input.skipDeploy) {
    const s6 = Date.now();
    const pushPhase = phases.find((phase) => phase.phase === 'push');
    const pushDetail = pushPhase?.detail as { asyncDispatch?: boolean } | undefined;
    if (pushDetail?.asyncDispatch) {
      phases.push({
        phase: 'deploy-wait',
        status: 'skipped',
        durationMs: Date.now() - s6,
        detail: { reason: 'async_push_dispatch', note: 'GitHub executor performs commit and deploy later; inline wait would be stale.' },
      });
    } else {
      const sid = process.env.RENDER_SERVICE_ID || '';
      const key = process.env.RENDER_API_KEY || '';
      if (sid && key) {
      const dep = await waitForDeploy(sid, key);
      phases.push({ phase: 'deploy-wait', status: dep.deployed ? 'ok' : 'error', durationMs: Date.now() - s6, detail: dep });
      } else {
        phases.push({ phase: 'deploy-wait', status: 'skipped', durationMs: 0 });
      }
    }
  }

  // Phase 7: Self-Test
  if (!input.skipDeploy) {
    const pushPhase = phases.find((phase) => phase.phase === 'push');
    const pushDetail = pushPhase?.detail as { asyncDispatch?: boolean } | undefined;
    if (pushDetail?.asyncDispatch) {
      phases.push({ phase: 'self-test', status: 'skipped', durationMs: 0, detail: { reason: 'async_push_dispatch' } });
    } else {
      const t = await runSelfTest();
      phases.push({ phase: 'self-test', status: t.passed ? 'ok' : 'error', durationMs: t.durationMs });
    }
  }

  const allOk = phases.every(p => p.status === 'ok' || p.status === 'skipped');
  const pushPhase = phases.find((phase) => phase.phase === 'push');
  const pushDetail = pushPhase?.detail as { landed?: boolean; verifiedCommit?: string } | undefined;
  return {
    status: allOk ? 'success' : 'partial', runId, phases, edits: best,
    totalDurationMs: Date.now() - totalStart,
    summary: `${allOk ? '✅' : '⚠️'} ${Math.round((Date.now() - totalStart) / 1000)}s | ${best.worker} | ${best.edits.map(e => e.path).join(', ')}`,
    landed: pushDetail?.landed,
    verifiedCommit: pushDetail?.verifiedCommit,
  };
}
