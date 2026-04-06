import { eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { executeTask, type ExecuteResult } from './opusBridgeController.js';
import { checkBudget } from './opusBudgetGate.js';
import { callProvider } from './providers.js';
import { builderChains, builderTasks } from '../schema/builder.js';

export interface ChainTask {
  instruction: string;
  scope?: string[];
  risk?: string;
  opusHints?: string;
  dependsOn?: number;
}

export interface ChainConfig {
  name: string;
  tasks: ChainTask[];
  stopOnBlock?: boolean;
  autoSkipIfUnanimous?: boolean;
}

export interface ChainTaskResult {
  index: number;
  taskId: string;
  status: string;
  commitHash?: string;
  controllerDecision?: {
    decision: 'continue' | 'adjust' | 'stop';
    reason: string;
    adjustedHints?: string;
  };
}

export interface ChainResult {
  chainId: string;
  name: string;
  chainStatus: 'done' | 'partial' | 'blocked' | 'error';
  tasks: ChainTaskResult[];
  totalTokens: number;
  durationMs: number;
}

interface ControllerDecision {
  decision: 'continue' | 'adjust' | 'stop';
  reason: string;
  adjustedHints?: string;
}

function isSuccessfulStatus(status: string): boolean {
  return status === 'consensus' || status === 'applying' || status === 'done';
}

async function decideNextStep(currentResult: ExecuteResult, nextTask?: ChainTask): Promise<ControllerDecision> {
  if (!nextTask) {
    return { decision: 'continue', reason: 'No next task.' };
  }

  try {
    const response = await callProvider('anthropic', 'claude-opus-4-6', {
      system: `Du bist der Chain-Controller für eine Task-Kette im Soulmatch Builder.
Entscheide ob die Kette weiterlaufen soll.

Antworte NUR mit JSON (kein Markdown, keine Backticks):
{"decision":"continue","reason":"..."}
oder {"decision":"adjust","reason":"...","adjustedHints":"..."}
oder {"decision":"stop","reason":"..."}`,
      messages: [{
        role: 'user',
        content: `Letzter Task: ${currentResult.title}
Status: ${currentResult.status}
Approvals: ${currentResult.approvals.join(', ')}
Blocks: ${currentResult.blocks.join(', ')}
Patches: ${currentResult.patches.length} Dateien

Nächster geplanter Task: ${nextTask.instruction}

Entscheide: continue, adjust oder stop?`,
      }],
      maxTokens: 500,
      temperature: 0.3,
      forceJsonObject: false,
    });

    const parsed = JSON.parse(response) as Record<string, unknown>;
    const decision = parsed.decision;
    const reason = parsed.reason;
    const adjustedHints = parsed.adjustedHints;

    if (
      (decision === 'continue' || decision === 'adjust' || decision === 'stop') &&
      typeof reason === 'string'
    ) {
      return {
        decision,
        reason,
        adjustedHints: typeof adjustedHints === 'string' ? adjustedHints : undefined,
      };
    }
  } catch (error) {
    console.error('[opusChainController] controller fallback:', error);
  }

  return { decision: 'continue', reason: 'Controller fallback continue.' };
}

export async function runChain(config: ChainConfig): Promise<ChainResult> {
  const budget = checkBudget();
  if (!budget.allowed) {
    throw new Error(`Budget-Gate: ${budget.reason}`);
  }

  const db = getDb();
  const startedAt = Date.now();
  const [chain] = await db
    .insert(builderChains)
    .values({
      name: config.name,
      config: config as unknown as Record<string, unknown>,
      status: 'queued',
    })
    .returning();

  await db
    .update(builderChains)
    .set({ status: 'running', updatedAt: new Date() })
    .where(eq(builderChains.id, chain.id));

  const tasks = config.tasks.map((task) => ({ ...task }));
  const results: ChainTaskResult[] = [];
  let totalTokens = 0;
  let chainStatus: ChainResult['chainStatus'] = 'done';
  let partial = false;

  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];

    if (typeof task.dependsOn === 'number') {
      const dependencyResult = results[task.dependsOn];
      if (!dependencyResult || !isSuccessfulStatus(dependencyResult.status)) {
        results.push({
          index,
          taskId: '',
          status: 'skipped',
        });
        partial = true;
        continue;
      }
    }

    let executionResult: ExecuteResult;
    try {
      executionResult = await executeTask({
        instruction: task.instruction,
        scope: task.scope,
        risk: task.risk,
        opusHints: task.opusHints,
      });
    } catch (error) {
      console.error('[opusChainController] executeTask failed:', error);
      results.push({ index, taskId: '', status: 'error' });
      chainStatus = 'error';
      partial = true;
      continue;
    }

    totalTokens += executionResult.totalTokens;

    const [storedTask] = await db
      .select({ commitHash: builderTasks.commitHash })
      .from(builderTasks)
      .where(eq(builderTasks.id, executionResult.taskId));

    const taskResult: ChainTaskResult = {
      index,
      taskId: executionResult.taskId,
      status: executionResult.status,
      commitHash: storedTask?.commitHash ?? undefined,
    };

    const nextTask = tasks[index + 1];
    const unanimous = executionResult.consensusType === 'unanimous';
    if (!(config.autoSkipIfUnanimous && unanimous) && nextTask) {
      const controllerDecision = await decideNextStep(executionResult, nextTask);
      taskResult.controllerDecision = controllerDecision;

      if (controllerDecision.decision === 'adjust' && controllerDecision.adjustedHints) {
        nextTask.opusHints = controllerDecision.adjustedHints;
      }

      if (controllerDecision.decision === 'stop') {
        results.push(taskResult);
        chainStatus = 'blocked';
        partial = true;
        break;
      }
    }

    results.push(taskResult);

    if ((config.stopOnBlock ?? true) && !isSuccessfulStatus(executionResult.status)) {
      chainStatus = 'blocked';
      partial = true;
      break;
    }
  }

  if (chainStatus === 'done' && partial) {
    chainStatus = 'partial';
  }

  await db
    .update(builderChains)
    .set({
      status: chainStatus,
      totalTokens,
      updatedAt: new Date(),
    })
    .where(eq(builderChains.id, chain.id));

  return {
    chainId: chain.id,
    name: config.name,
    chainStatus,
    tasks: results,
    totalTokens,
    durationMs: Date.now() - startedAt,
  };
}