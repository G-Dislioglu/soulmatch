// opusBuildPipeline.ts — All-in-One Builder Proxy
// Claude sends 1x POST /build → Builder does everything internally

import { executeTask, type ExecuteInput, type ExecuteResult } from './opusBridgeController.js';
import { getDeployStatus, type DeployInfo } from './opusRenderBridge.js';
import { selfVerify, type SelfTestCheck, type SelfTestResult } from './opusSelfTest.js';
import { generateErrorCard } from './opusErrorLearning.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const OPUS_TOKEN = 'opus-bridge-2026-geheim';

// Internal call to auto-approve a review_needed task (triggers GitHub commit)
async function autoApproveTask(taskId: string): Promise<{ approved: boolean; error?: string }> {
  try {
    const res = await fetch(
      `http://localhost:${PORT}/api/builder/opus-bridge/override/${taskId}?opus_token=${OPUS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', reason: 'auto-approved by /build pipeline' }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    const data = await res.json() as Record<string, unknown>;
    return { approved: res.ok && data.newStatus !== 'error', error: res.ok ? undefined : String(data.error) };
  } catch (err) {
    return { approved: false, error: err instanceof Error ? err.message : String(err) };
  }
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
  status: 'success' | 'deployed' | 'deploy_timeout' | 'verify_failed' | 'build_failed' | 'retry_failed';
  taskId: string;
  title: string;
  totalTokens: number;
  patchCount: number;
  files: string[];
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

  // --- Phase 1: Execute Task (Scout → Decompose/Roundtable → Swarm → GitHub) ---
  const deployStartedAt = new Date().toISOString(); // record BEFORE execute — any deploy after this is ours
  let execResult: ExecuteResult;
  try {
    const execInput: ExecuteInput = {
      instruction: input.instruction,
      scope: input.scope,
      risk: input.risk ?? 'low',
      useDecomposer: input.useDecomposer ?? true,
      codeWriter: input.codeWriter,
    };
    execResult = await executeTask(execInput);
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

  const files = execResult.patches.map((p) => p.file);
  const base: Omit<BuildResult, 'status' | 'durationMs'> = {
    taskId: execResult.taskId,
    title: execResult.title,
    totalTokens: execResult.totalTokens,
    patchCount: execResult.patches.length,
    files,
  };

  // Check if execute itself failed (no patches, blocked, etc.)
  if (execResult.status === 'blocked' || execResult.patches.length === 0) {
    return {
      ...base,
      status: 'build_failed',
      error: `Task ${execResult.status}: ${execResult.blocks?.join(', ') || 'no patches produced'}`,
      durationMs: duration(),
    };
  }

  // Auto-approve if task ended in review_needed (patches exist but weren't auto-committed)
  if (execResult.status === 'review_needed') {
    const approval = await autoApproveTask(execResult.taskId);
    if (!approval.approved) {
      return {
        ...base,
        status: 'build_failed',
        error: `Auto-approve failed: ${approval.error}`,
        durationMs: duration(),
      };
    }
  }

  // --- Phase 2: Wait for Deploy ---
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
  _prevResult: ExecuteResult,
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
      affectedFiles: _prevResult.patches.map((p) => p.file),
    });

    // Retry with a fix instruction
    const fixInput: BuildInput = {
      ...input,
      instruction: `FIX: The previous change caused a deploy failure (${_deployResult.status}). ` +
        `Original instruction: "${input.instruction}". ` +
        `Files changed: ${_prevResult.patches.map((p) => p.file).join(', ')}. ` +
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
