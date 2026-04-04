import { asc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderActions, builderTasks } from '../schema/builder.js';
import { BUILDER_POLICY_PROFILES, TASK_TYPE_TO_PROFILE } from './builderPolicyProfiles.js';
import { callProvider } from './providers.js';
import { parseBdl, type BdlCommand } from './builderBdlParser.js';
import { checkTokenBudget } from './builderGates.js';
import { diffFiles, findPattern, readFile } from './builderFileIO.js';
import { createWorktree, removeWorktree, runCheck } from './builderExecutor.js';

export interface DialogRound {
  roundNumber: number;
  actor: 'claude' | 'chatgpt' | 'gemini' | 'deepseek' | 'system';
  role: 'architect' | 'reviewer' | 'scout' | 'observer' | 'system';
  rawResponse: string;
  commands: BdlCommand[];
  tokensUsed: number;
  timestamp: string;
}

export interface EngineResult {
  taskId: string;
  rounds: DialogRound[];
  finalStatus: string;
  totalTokens: number;
  abortReason?: string;
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function buildArchitectSystemPrompt(task: typeof builderTasks.$inferSelect) {
  return [
    'Du bist der Builder-Architect fuer Soulmatch.',
    'Antworte NUR in BDL (Builder Dialog Language).',
    `Task: ${task.goal}`,
    `Scope: ${task.scope.join(', ') || '(leer)'}`,
    `Not-Scope: ${task.notScope.join(', ') || '(leer)'}`,
    `Policy: ${task.policyProfile ?? TASK_TYPE_TO_PROFILE[task.taskType as keyof typeof TASK_TYPE_TO_PROFILE]}`,
    'Regel: @FIND_PATTERN ist Pflicht vor jedem @PLAN.',
  ].join('\n');
}

function buildReviewerSystemPrompt() {
  return [
    'Du bist der Builder-Reviewer fuer Soulmatch.',
    'Antworte NUR in BDL.',
    'Pruefe den Vorschlag des Architects. Achte auf:',
    '1. Scope-Einhaltung',
    '2. Reuse-Check (wurde @FIND_PATTERN gemacht?)',
    '3. Korrektheit des Plans/Patches',
    'Antworte mit @REVIEW { verdict: ok|issue|block ... } und dann @APPROVE oder @REQUEST_CHANGE.',
  ].join('\n');
}

function summarizeCommandResult(command: BdlCommand, result: Record<string, unknown>) {
  return JSON.stringify({ kind: command.kind, params: command.params, result });
}

async function saveCommandActions(
  taskId: string,
  actor: DialogRound['actor'],
  role: DialogRound['role'],
  roundNumber: number,
  commands: BdlCommand[],
  rawResponse: string,
  tokensUsed: number,
  results: Array<Record<string, unknown>>,
) {
  const db = getDb();

  if (commands.length === 0) {
    await db.insert(builderActions).values({
      taskId,
      lane: role === 'reviewer' ? 'review' : 'code',
      kind: 'SAY',
      actor,
      payload: {
        roundNumber,
        role,
        rawResponse,
        params: {},
      },
      result: { emptyBdl: true },
      tokenCount: tokensUsed,
    });
    return;
  }

  await db.insert(builderActions).values(
    commands.map((command, index) => ({
      taskId,
      lane: role === 'reviewer' ? 'review' : 'code',
      kind: command.kind,
      actor,
      payload: {
        roundNumber,
        role,
        rawResponse,
        rawCommand: command.raw,
        params: command.params,
        body: command.body,
      },
      result: results[index] ?? { stub: true },
      tokenCount: tokensUsed,
    })),
  );
}

async function executeArchitectCommands(
  task: typeof builderTasks.$inferSelect,
  worktreePath: string,
  commands: BdlCommand[],
) {
  const policyName = task.policyProfile as keyof typeof BUILDER_POLICY_PROFILES | null;
  const policy = policyName ? BUILDER_POLICY_PROFILES[policyName] : null;
  const forbiddenFiles = policy?.forbidden_files ?? [];
  const outputs: string[] = [];
  const results: Array<Record<string, unknown>> = [];

  for (const command of commands) {
    const kind = command.kind;

    if (kind === 'READ') {
      const filePath = command.params.file;
      if (!filePath) {
        const result = { error: 'missing_file_param' };
        results.push(result);
        outputs.push(summarizeCommandResult(command, result));
        continue;
      }

      const readResult = await readFile(worktreePath, filePath, task.scope, forbiddenFiles);
      const result = {
        file: filePath,
        lines: readResult.lines,
        content: readResult.content,
      };
      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'FIND_PATTERN') {
      const pattern = command.params.intent || command.params.pattern || command.params.arg1 || '';
      const matches = await findPattern(worktreePath, pattern, command.params.fileGlob);
      const result = { pattern, matches };
      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'CHECK') {
      const checkType = command.params.arg1 || command.params.type || 'build';
      let result: Record<string, unknown>;

      if (checkType === 'tsc' || checkType === 'build') {
        const checkResult = runCheck(worktreePath);
        result = checkType === 'tsc'
          ? { type: 'tsc', ...checkResult.tsc }
          : { type: 'build', ...checkResult.build };
      } else if (checkType === 'diff') {
        result = { type: 'diff', output: await diffFiles(worktreePath) };
      } else {
        result = { type: checkType, stub: true };
      }

      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'SAY') {
      const result = { message: command.body || command.params.arg1 || '' };
      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'PLAN' || kind === 'PATCH' || kind === 'APPLY') {
      const result = { stub: true, body: command.body ?? null, params: command.params };
      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    const result = { stub: true, params: command.params, body: command.body ?? null };
    results.push(result);
    outputs.push(summarizeCommandResult(command, result));
  }

  return {
    results,
    contextText: outputs.join('\n'),
  };
}

export async function runDialogEngine(taskId: string): Promise<EngineResult> {
  const db = getDb();
  const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  const policyName = task.policyProfile as keyof typeof BUILDER_POLICY_PROFILES | null;
  const policy = policyName ? BUILDER_POLICY_PROFILES[policyName] : null;
  const maxRounds = policy?.max_rounds ?? 3;
  const tokenBudget = task.tokenBudget ?? (task.risk === 'high' ? 10000 : task.risk === 'medium' ? 5000 : 2000);

  const rounds: DialogRound[] = [];
  const worktree = createWorktree(taskId);
  let totalTokens = 0;
  let finalStatus = 'needs_human_review';
  let abortReason: string | undefined;
  let latestContext = '';

  try {
    for (let roundNumber = 1; roundNumber <= maxRounds; roundNumber += 1) {
      await db
        .update(builderTasks)
        .set({ status: 'planning', updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));

      const architectResponse = await callProvider('anthropic', 'claude-sonnet-4-20250514', {
        system: buildArchitectSystemPrompt(task),
        messages: [
          {
            role: 'user',
            content: [
              `Task title: ${task.title}`,
              `Task goal: ${task.goal}`,
              latestContext ? `Bisherige Beobachtungen:\n${latestContext}` : 'Noch keine Beobachtungen.',
            ].join('\n\n'),
          },
        ],
        maxTokens: 2000,
        temperature: 0.7,
      });

      const architectTokens = estimateTokens(architectResponse);
      totalTokens += architectTokens;

      const architectCommands = parseBdl(architectResponse);
      const architectExecution = await executeArchitectCommands(task, worktree.worktreePath, architectCommands);

      const architectRound: DialogRound = {
        roundNumber,
        actor: 'claude',
        role: 'architect',
        rawResponse: architectResponse,
        commands: architectCommands,
        tokensUsed: architectTokens,
        timestamp: new Date().toISOString(),
      };
      rounds.push(architectRound);

      await saveCommandActions(
        taskId,
        'claude',
        'architect',
        roundNumber,
        architectCommands,
        architectResponse,
        architectTokens,
        architectExecution.results,
      );

      const architectBudget = checkTokenBudget(totalTokens, tokenBudget);
      if (!architectBudget.ok) {
        finalStatus = 'blocked';
        abortReason = 'token_budget_exceeded';
        break;
      }

      await db
        .update(builderTasks)
        .set({ status: 'reviewing', updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));

      const reviewerResponse = await callProvider('openai', 'gpt-4.1-mini', {
        system: buildReviewerSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: [
              `Task goal: ${task.goal}`,
              `Architect BDL:\n${architectResponse}`,
              architectExecution.contextText ? `Execution summary:\n${architectExecution.contextText}` : 'No execution summary.',
            ].join('\n\n'),
          },
        ],
        maxTokens: 2000,
        temperature: 0.7,
      });

      const reviewerTokens = estimateTokens(reviewerResponse);
      totalTokens += reviewerTokens;
      const reviewerCommands = parseBdl(reviewerResponse);

      const reviewerRound: DialogRound = {
        roundNumber,
        actor: 'chatgpt',
        role: 'reviewer',
        rawResponse: reviewerResponse,
        commands: reviewerCommands,
        tokensUsed: reviewerTokens,
        timestamp: new Date().toISOString(),
      };
      rounds.push(reviewerRound);

      await saveCommandActions(
        taskId,
        'chatgpt',
        'reviewer',
        roundNumber,
        reviewerCommands,
        reviewerResponse,
        reviewerTokens,
        reviewerCommands.map(() => ({ stub: true })),
      );

      const reviewerBudget = checkTokenBudget(totalTokens, tokenBudget);
      if (!reviewerBudget.ok) {
        finalStatus = 'blocked';
        abortReason = 'token_budget_exceeded';
        break;
      }

      const hasApprove = reviewerCommands.some((command) => command.kind === 'APPROVE');
      const hasBlock = reviewerCommands.some((command) => command.kind === 'BLOCK');
      const hasRequestChange = reviewerCommands.some((command) => command.kind === 'REQUEST_CHANGE');

      latestContext = [architectExecution.contextText, reviewerResponse].filter(Boolean).join('\n\n');

      if (hasBlock) {
        finalStatus = 'blocked';
        abortReason = 'review_blocked';
        break;
      }

      if (hasApprove) {
        finalStatus = 'push_candidate';
        break;
      }

      if (!hasRequestChange && roundNumber === maxRounds) {
        finalStatus = 'needs_human_review';
        abortReason = 'max_rounds_exceeded';
        break;
      }
    }

    if (rounds.length > 0 && finalStatus === 'needs_human_review' && !abortReason) {
      abortReason = 'max_rounds_exceeded';
    }
  } catch (error) {
    finalStatus = 'blocked';
    abortReason = error instanceof Error ? error.message : String(error);
    await db.insert(builderActions).values({
      taskId,
      lane: 'review',
      kind: 'BLOCK',
      actor: 'system',
      payload: { taskId },
      result: { error: abortReason },
      tokenCount: 0,
    });
  } finally {
    removeWorktree(taskId);
  }

  await db
    .update(builderTasks)
    .set({
      status: finalStatus,
      tokenCount: totalTokens,
      updatedAt: new Date(),
    })
    .where(eq(builderTasks.id, taskId));

  return {
    taskId,
    rounds,
    finalStatus,
    totalTokens,
    ...(abortReason ? { abortReason } : {}),
  };
}