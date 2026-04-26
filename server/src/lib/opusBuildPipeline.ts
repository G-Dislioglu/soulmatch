// opusBuildPipeline.ts — All-in-One Builder Proxy
// Claude sends 1x POST /build → Builder does everything internally

import { orchestrateTask, type OpusTaskResult } from './opusTaskOrchestrator.js';
import type { BuilderTaskClass, ExecutionPolicy } from './builderSafetyPolicy.js';
import { getDeployStatus, type DeployInfo } from './opusRenderBridge.js';
import { selfVerify, type SelfTestCheck, type SelfTestResult } from './opusSelfTest.js';
import { generateErrorCard } from './opusErrorLearning.js';

interface PipelineExecutionSnapshot {
  taskId: string;
  title: string;
  status: OpusTaskResult['status'];
  summary: string;
  totalTokens: number;
  files: string[];
  taskClass?: BuilderTaskClass;
  executionPolicy?: ExecutionPolicy;
  pushAllowed?: boolean;
  requiredExternalApproval?: boolean;
  approvalReason?: string;
  pushBlockedReason?: string;
  protectedPathsTouched?: string[];
}

function mapOrchestratorToSnapshot(input: BuildInput, result: OpusTaskResult): PipelineExecutionSnapshot {
  const files = [...new Set((result.edits?.edits ?? []).map((edit) => edit.path))];
  return {
    taskId: result.runId,
    title: input.instruction.slice(0, 100),
    status: result.status,
    summary: result.summary,
    // Legacy field from executeTask; orchestrateTask does not expose token totals.
    totalTokens: 0,
    files,
    taskClass: result.taskClass,
    executionPolicy: result.executionPolicy,
    pushAllowed: result.pushAllowed,
    requiredExternalApproval: result.requiredExternalApproval,
    approvalReason: result.approvalReason,
    pushBlockedReason: result.pushBlockedReason,
    protectedPathsTouched: result.protectedPathsTouched,
  };
}

// ==================== Types ====================

export interface BuildInput {
  instruction: string;
  scope?: string[];
  risk?: 'low' | 'medium' | 'high';
  useDecomposer?: boolean;        // default: true
  codeWriter?: string;
  verify?: {
    endpoint: string;             // e.g. '/api/builder/opus-bridge/pipeline-info'
    expect?: string;              // substring match
    method?: 'GET' | 'POST';
  };
  autoRetry?: boolean;            // retry on failure, default: true
  skipDeploy?: boolean;           // skip deploy-polling (for non-code tasks)
}

export interface BuildResult {
  status: 'success' | 'deployed' | 'deploy_timeout' | 'verify_failed' | 'build_failed' | 'retry_failed' | 'review_needed';
  taskId: string;
  title: string;
  totalTokens: number;
  patchCount: number;
  files: string[];
  taskClass?: BuilderTaskClass;
  executionPolicy?: ExecutionPolicy;
  pushAllowed?: boolean;
  pushBlockedReason?: string;
  protectedPathsTouched?: string[];
  deploy?: {
    status: string;
    commitId?: string;
    waitedMs: number;
  };
  verification?: {
    allPassed: boolean;
    results: SelfTestResult[];
  };
  retried?: boolean;
  retryResult?: Partial<BuildResult>;
  error?: string;
  durationMs: number;
}

// ==================== Deploy Polling ====================

async function waitForDeploy(opts: {
  maxWaitMs?: number;
  pollIntervalMs?: number;
  notBefore?: string;  // ISO timestamp — ignore deploys created before this
}): Promise<{ status: string; deploy?: DeployInfo; waitedMs: number }> {
  const maxWait = opts.maxWaitMs ?? 300_000;    // 5 min (Render free tier is slow)
  const interval = opts.pollIntervalMs ?? 12_000; // 12s
  const start = Date.now();
  const notBeforeMs = opts.notBefore ? new Date(opts.notBefore).getTime() : 0;

  // Initial delay: GitHub Action needs ~20-30s to commit, Render needs time to detect
  await new Promise((r) => setTimeout(r, 30_000));

  while (Date.now() - start < maxWait) {
    const result = await getDeployStatus();
    const latest = result.latest;

    if (latest) {
      const createdMs = new Date(latest.createdAt).getTime();
      const isNewDeploy = !notBeforeMs || createdMs > notBeforeMs;

      if (!isNewDeploy) {
        // Still showing old deploy — keep waiting for new one
      } else if (latest.status === 'live') {
        return { status: 'live', deploy: latest, waitedMs: Date.now() - start };
      } else if (latest.status === 'build_failed' || latest.status === 'update_failed') {
        return { status: latest.status, deploy: latest, waitedMs: Date.now() - start };
      }
      // else: build_in_progress — keep polling
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  return { status: 'timeout', waitedMs: Date.now() - start };
}

// ==================== Main Pipeline ====================

export async function runBuildPipeline(input: BuildInput): Promise<BuildResult> {
  const start = Date.now();
  const duration = () => Date.now() - start;

  // --- Phase 1: Canonical execution (orchestrateTask) ---
  const deployStartedAt = new Date().toISOString(); // record BEFORE execute — any deploy after this is ours
  let execResult: PipelineExecutionSnapshot;
  try {
    const orchestratorResult = await orchestrateTask({
      instruction: input.instruction,
      scope: input.scope,
      skipDeploy: input.skipDeploy,
      // /build owns deploy polling + self-verify (+ retries), so skip orchestrator's inline post-push checks.
      skipInlinePostPushChecks: input.skipDeploy ? undefined : true,
      assumptions: [
        `Build pipeline mode: ${input.useDecomposer === false ? 'roundtable-preferred' : 'decomposer-preferred'}`,
        `Requested risk: ${input.risk ?? 'low'}`,
        input.codeWriter ? `Preferred code writer: ${input.codeWriter}` : '',
      ].filter(Boolean),
    });
    execResult = mapOrchestratorToSnapshot(input, orchestratorResult);
  } catch (err) {
    return {
      status: 'build_failed',
      taskId: 'none',
      title: 'Execute failed',
      totalTokens: 0,
      patchCount: 0,
      files: [],
      error: err instanceof Error ? err.message : String(err),
      durationMs: duration(),
    };
  }

  const base: Omit<BuildResult, 'status' | 'durationMs'> = {
    taskId: execResult.taskId,
    title: execResult.title,
    totalTokens: execResult.totalTokens,
    patchCount: execResult.files.length,
    files: execResult.files,
    taskClass: execResult.taskClass,
    executionPolicy: execResult.executionPolicy,
    pushAllowed: execResult.pushAllowed,
    pushBlockedReason: execResult.pushBlockedReason,
    protectedPathsTouched: execResult.protectedPathsTouched,
  };

  // Governance-first mapping: safety/approval gating must not be flattened into build_failed.
  if (execResult.requiredExternalApproval || execResult.pushAllowed === false || execResult.status === 'dry_run') {
    return {
      ...base,
      status: 'review_needed',
      error: execResult.pushBlockedReason ?? execResult.approvalReason ?? execResult.summary,
      durationMs: duration(),
    };
  }

  if (execResult.status === 'failed') {
    return {
      ...base,
      status: 'build_failed',
      error: execResult.summary || 'Canonical execution failed.',
      durationMs: duration(),
    };
  }

  // Check if execute itself failed to produce concrete edits.
  if (execResult.files.length === 0) {
    return {
      ...base,
      status: 'build_failed',
      error: `Task ${execResult.status}: no patches produced`,
      durationMs: duration(),
    };
  }

  // --- skipDeploy: return immediately without GitHub push or deploy polling ---
  if (input.skipDeploy) {
    return { ...base, status: 'success', durationMs: duration() };
  }

  const deployResult = await waitForDeploy({ maxWaitMs: 300_000, notBefore: deployStartedAt });
  const deployInfo = {
    status: deployResult.status,
    commitId: deployResult.deploy?.commit?.id,
    waitedMs: deployResult.waitedMs,
  };

  if (deployResult.status === 'build_failed' || deployResult.status === 'update_failed') {
    // Deploy failed — possibly tsc error → auto-retry
    if (input.autoRetry !== false) {
      const retryResult = await retryOnFailure(input, execResult, deployResult);
      return {
        ...base,
        status: retryResult ? 'deployed' : 'retry_failed',
        deploy: deployInfo,
        retried: true,
        retryResult: retryResult ?? undefined,
        durationMs: duration(),
      };
    }
    return { ...base, status: 'build_failed', deploy: deployInfo, error: 'Deploy failed', durationMs: duration() };
  }

  if (deployResult.status === 'timeout') {
    return { ...base, status: 'deploy_timeout', deploy: deployInfo, durationMs: duration() };
  }

  // --- Phase 3: Self-Verify ---
  if (input.verify) {
    const checks: SelfTestCheck[] = [{
      method: input.verify.method ?? 'GET',
      path: input.verify.endpoint,
      expectBodyContains: input.verify.expect,
    }];
    const verification = await selfVerify(checks);

    if (!verification.allPassed && input.autoRetry !== false) {
      // Verification failed — try once more
      const retryResult = await retryOnVerifyFailure(input, verification);
      return {
        ...base,
        status: retryResult ? 'deployed' : 'verify_failed',
        deploy: deployInfo,
        verification,
        retried: true,
        retryResult: retryResult ?? undefined,
        durationMs: duration(),
      };
    }

    return {
      ...base,
      status: verification.allPassed ? 'deployed' : 'verify_failed',
      deploy: deployInfo,
      verification,
      durationMs: duration(),
    };
  }

  return { ...base, status: 'deployed', deploy: deployInfo, durationMs: duration() };
}

// ==================== Auto-Retry Helpers ====================

async function retryOnFailure(
  input: BuildInput,
  _prevResult: PipelineExecutionSnapshot,
  _deployResult: { status: string },
): Promise<Partial<BuildResult> | null> {
  try {
    // Generate error card for learning
    await generateErrorCard({
      taskId: _prevResult.taskId,
      taskTitle: _prevResult.title,
      taskGoal: input.instruction,
      blockReason: `Deploy ${_deployResult.status} after task ${_prevResult.taskId}`,
      chatPoolSummary: '',
      affectedFiles: _prevResult.files,
    });

    // Retry with a fix instruction
    const fixInput: BuildInput = {
      ...input,
      instruction: `FIX: The previous change caused a deploy failure (${_deployResult.status}). ` +
        `Original instruction: "${input.instruction}". ` +
        `Files changed: ${_prevResult.files.join(', ')}. ` +
        `Please fix any TypeScript or build errors.`,
      autoRetry: false, // don't recurse
    };
    const result = await runBuildPipeline(fixInput);
    return result.status === 'deployed' || result.status === 'success' ? result : null;
  } catch {
    return null;
  }
}

async function retryOnVerifyFailure(
  input: BuildInput,
  verification: { results: SelfTestResult[] },
): Promise<Partial<BuildResult> | null> {
  const failedChecks = verification.results.filter((r) => !r.passed);
  try {
    const fixInput: BuildInput = {
      ...input,
      instruction: `FIX: Verification failed after deploy. ` +
        `Original: "${input.instruction}". ` +
        `Failed checks: ${failedChecks.map((c) => `${c.path}: ${c.error}`).join('; ')}. ` +
        `Fix the endpoint or logic so verification passes.`,
      autoRetry: false,
    };
    const result = await runBuildPipeline(fixInput);
    return result.status === 'deployed' || result.status === 'success' ? result : null;
  } catch {
    return null;
  }
}
