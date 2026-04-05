import { execSync } from 'node:child_process';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderActions, builderTasks } from '../schema/builder.js';
import { BUILDER_POLICY_PROFILES, TASK_TYPE_TO_PROFILE } from './builderPolicyProfiles.js';
import { callProvider } from './providers.js';
import { parseBdl, type BdlCommand } from './builderBdlParser.js';
import { checkScope, checkTokenBudget } from './builderGates.js';
import { diffFiles, findPattern, readFile } from './builderFileIO.js';
import { createWorktree, removeWorktree, runCheck } from './builderExecutor.js';
import { applyPatch } from './builderPatchExecutor.js';
import { triggerGithubAction, convertBdlPatchesToPayload } from './builderGithubBridge.js';
import { runBrowserLane } from './builderBrowserLane.js';
import { executePrototype } from './builderPrototypeLane.js';
import {
  assertExpect,
  assertExpectJson,
  callLocalEndpoint,
  verifyDatabaseState,
  type RuntimeCallResult,
} from './builderRuntimeLane.js';
import {
  computeAgreement,
  parseReviewBody,
  runObserver,
  saveReview,
  type ParsedReview,
  type ReviewVerdict,
} from './builderReviewLane.js';
import { generateEvidencePack, saveEvidencePack } from './builderEvidencePack.js';
import { evaluateCanaryGate } from './builderCanary.js';

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

function buildArchitectSystemPrompt(
  task: typeof builderTasks.$inferSelect,
  laneFlags: { browser: boolean },
) {
  return [
    'Du bist der Builder-Architect fuer Soulmatch.',
    'Antworte NUR in BDL (Builder Dialog Language).',
    `Task: ${task.goal}`,
    `Scope: ${task.scope.join(', ') || '(leer)'}`,
    `Not-Scope: ${task.notScope.join(', ') || '(leer)'}`,
    `Policy: ${task.policyProfile ?? TASK_TYPE_TO_PROFILE[task.taskType as keyof typeof TASK_TYPE_TO_PROFILE]}`,
    'Regel: @FIND_PATTERN ist Pflicht vor jedem @PLAN.',
    laneFlags.browser && ['B', 'C'].includes(task.taskType)
      ? 'Fuer Typ B/C musst du mindestens einen @UI_RUN Block liefern: route/path ist Pflicht, selector/text/waitFor optional.'
      : '',
  ].join('\n');
}

function buildReviewerSystemPrompt(mode: 'primary' | 'secondary') {
  return [
    'Du bist der Builder-Reviewer fuer Soulmatch.',
    'Antworte NUR in BDL.',
    'Pruefe den Vorschlag des Architects. Achte auf:',
    '1. Scope-Einhaltung',
    '2. Reuse-Check (wurde @FIND_PATTERN gemacht?)',
    '3. Korrektheit des Plans/Patches',
    mode === 'secondary'
      ? 'Du bist der zweite Reviewer. Beurteile auch UX-Heuristik, Taeuscht-Pruefung und Dissens zum ersten Review.'
      : 'Du bist der erste Reviewer. Liefere eine harte Code- und Reuse-Pruefung.',
    'Gib genau einen @REVIEW Block mit diesen Feldern: verdict, lane, scope_ok, blocking, notes, reuse_check, ux_heuristic, false_success_check, agreement.',
    'Wenn searched_codebase=false, musst du blockieren.',
    'Danach genau eine Entscheidung: @APPROVE, @REQUEST_CHANGE oder @BLOCK.',
  ].join('\n');
}

function decideVerdict(verdicts: ReviewVerdict[]) {
  if (verdicts.every((verdict) => verdict === 'ok')) {
    return 'ok';
  }

  if (verdicts.some((verdict) => verdict === 'block')) {
    return 'block';
  }

  return 'issue';
}

function summarizeCommandResult(command: BdlCommand, result: Record<string, unknown>) {
  return JSON.stringify({ kind: command.kind, params: command.params, result });
}

function parseStageFiles(value: string) {
  return value
    .replace(/[\[\]]/g, '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function runGitCommand(command: string, cwd: string) {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf-8',
      timeout: 60_000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const execError = error as Error & { stderr?: string; stdout?: string };
    throw new Error(execError.stderr || execError.stdout || execError.message);
  }
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
  laneOverride?: string,
) {
  const db = getDb();

  if (commands.length === 0) {
    await db.insert(builderActions).values({
      taskId,
      lane: laneOverride ?? (role === 'reviewer' || role === 'observer' ? 'review' : 'code'),
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
      lane: laneOverride ?? (role === 'reviewer' || role === 'observer' ? 'review' : 'code'),
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
  const pendingPatches: Array<{ file: string; body: string }> = [];
  let lastCallResult: RuntimeCallResult | null = null;

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

    if (kind === 'CALL') {
      const result = await callLocalEndpoint(task.id, command);
      lastCallResult = result;
      const summaryResult = result as unknown as Record<string, unknown>;
      results.push(summaryResult);
      outputs.push(summarizeCommandResult(command, summaryResult));
      continue;
    }

    if (kind === 'EXPECT') {
      const result = await assertExpect(task.id, command, lastCallResult);
      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'EXPECT_JSON') {
      const result = await assertExpectJson(task.id, command, lastCallResult);
      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'DB_VERIFY') {
      const result = await verifyDatabaseState(task.id, command);
      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'PROTOTYPE') {
      const prototypeResult = await executePrototype(task.id, command);
      const result = prototypeResult as unknown as Record<string, unknown>;
      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'UI_RUN') {
      const result = {
        queued: true,
        route: command.params.route || command.params.path || command.params.url || command.params.arg1 || '/',
        selector: command.params.selector || command.params.locator || null,
        text: command.params.text || command.params.contains || null,
        waitFor: command.params.waitFor || command.params.wait || null,
        notes: command.body ?? null,
      };
      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'PROMOTE') {
      const result = { stub: true, note: 'PROMOTE handled via API endpoint' };
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

    if (kind === 'PLAN') {
      const result = {
        planned: true,
        body: command.body ?? null,
        params: command.params,
      };
      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'PATCH') {
      const filePath = command.params.file;
      let result: Record<string, unknown>;

      if (!filePath) {
        result = { error: 'missing_file_param' };
      } else {
        pendingPatches.push({ file: filePath, body: command.body ?? '' });
        result = { buffered: true, file: filePath };
      }

      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'APPLY') {
      const hasGithubPat = !!process.env.GITHUB_PAT;
      let result: Record<string, unknown>;

      if (hasGithubPat) {
        const patchPayloads = convertBdlPatchesToPayload(
          pendingPatches.map((p) => ({
            kind: 'PATCH' as const,
            params: { file: p.file },
            body: p.body,
            raw: '',
          })),
        );
        const triggerResult = await triggerGithubAction(task.id, patchPayloads);
        pendingPatches.length = 0;
        result = {
          mode: 'github_actions',
          triggered: triggerResult.triggered,
          error: triggerResult.error || null,
          note: triggerResult.triggered
            ? 'Patches sent to GitHub Actions. Results will arrive via callback.'
            : 'GitHub bridge not available. Patches saved but not executed.',
        };
      } else {
        const patchResults = [];
        for (const patch of pendingPatches) {
          patchResults.push(
            await applyPatch(worktreePath, patch.file, patch.body, task.scope, forbiddenFiles),
          );
        }
        pendingPatches.length = 0;
        result = { mode: 'local', patches: patchResults };
      }

      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'STAGE') {
      const filesParam = command.params.files || command.params.arg1 || '';
      const fileList = parseStageFiles(filesParam);
      let result: Record<string, unknown>;

      if (fileList.length === 0) {
        result = { error: 'missing_files_param' };
      } else {
        const scopeViolation = fileList
          .map((file) => ({ file, check: checkScope(file, task.scope, forbiddenFiles) }))
          .find(({ check }) => !check.allowed);

        if (scopeViolation) {
          result = {
            error: `scope_violation:${scopeViolation.file}`,
            reason: scopeViolation.check.reason,
          };
        } else {
          const quotedFiles = fileList.map((file) => JSON.stringify(file)).join(' ');
          runGitCommand(`git add -- ${quotedFiles}`, worktreePath);
          result = { staged: fileList };
        }
      }

      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'COMMIT') {
      const message = command.params.msg || command.params.message || command.body || 'builder: auto-commit';
      let result: Record<string, unknown>;

      try {
        runGitCommand('git diff --cached --quiet', worktreePath);
        result = { error: 'no_staged_changes' };
      } catch {
        runGitCommand(`git commit -m ${JSON.stringify(message)}`, worktreePath);
        const commitHash = runGitCommand('git rev-parse HEAD', worktreePath);
        result = { commitHash, message };
      }

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

  const canaryGate = await evaluateCanaryGate(task);
  if (!canaryGate.allowed) {
    await db
      .update(builderTasks)
      .set({ status: 'blocked', updatedAt: new Date() })
      .where(eq(builderTasks.id, taskId));

    await db.insert(builderActions).values({
      taskId,
      lane: 'review',
      kind: 'BLOCK',
      actor: 'system',
      payload: {
        taskId,
        stage: canaryGate.stage,
        reasons: canaryGate.reasons,
      },
      result: { error: canaryGate.summary },
      tokenCount: 0,
    });

    return {
      taskId,
      rounds: [],
      finalStatus: 'blocked',
      totalTokens: 0,
      abortReason: canaryGate.summary,
    };
  }

  const laneFlags = canaryGate.laneFlags;

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
  const needsPrototype = laneFlags.prototype && ['B', 'C', 'P'].includes(task.taskType);
  const shouldRunPrototypeLane = needsPrototype && task.status !== 'planning' && task.status !== 'prototype_review';

  try {
    if (task.status === 'prototype_review') {
      finalStatus = 'prototype_review';
    } else if (shouldRunPrototypeLane) {
      await db
        .update(builderTasks)
        .set({ status: 'prototyping', updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));

      const protoResponse = await callProvider('anthropic', 'claude-sonnet-4-20250514', {
        system: [
          'Du bist der Builder-Prototype-Designer fuer Soulmatch.',
          'Erzeuge eine HTML Quick Preview mit inline CSS/JS.',
          'Antworte mit einem @PROTOTYPE kind:"html" { ... } Block.',
          'Das HTML soll die geplante UI-Aenderung als statische Vorschau zeigen.',
          "Nutze diese Farben: bg=#0f0f17 text=#e5e4ee gold=#d4af37 font='DM Sans'",
        ].join('\n'),
        messages: [
          {
            role: 'user',
            content: `Task: ${task.goal}\nScope: ${task.scope.join(', ')}`,
          },
        ],
        maxTokens: 3000,
        temperature: 0.8,
      });

      const protoTokens = estimateTokens(protoResponse);
      totalTokens += protoTokens;
      const protoCommands = parseBdl(protoResponse);
      const protoCommand = protoCommands.find((command) => command.kind === 'PROTOTYPE');
      const resolvedProtoResults = protoCommands.map((command) => ({ stub: true } as Record<string, unknown>));

      if (protoCommand) {
        const protoIndex = protoCommands.indexOf(protoCommand);
        const protoResult = await executePrototype(taskId, protoCommand);
        resolvedProtoResults[protoIndex] = protoResult as unknown as Record<string, unknown>;
      }

      rounds.push({
        roundNumber: 0,
        actor: 'claude',
        role: 'architect',
        rawResponse: protoResponse,
        commands: protoCommands,
        tokensUsed: protoTokens,
        timestamp: new Date().toISOString(),
      });

      await saveCommandActions(
        taskId,
        'claude',
        'architect',
        0,
        protoCommands,
        protoResponse,
        protoTokens,
        resolvedProtoResults,
        'prototype',
      );

      await db
        .update(builderTasks)
        .set({ status: 'prototype_review', updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));

      finalStatus = 'prototype_review';
    }

    if (!needsPrototype || task.status === 'planning') {
      for (let roundNumber = 1; roundNumber <= maxRounds; roundNumber += 1) {
        await db
          .update(builderTasks)
          .set({ status: 'planning', updatedAt: new Date() })
          .where(eq(builderTasks.id, taskId));

        const architectResponse = await callProvider('anthropic', 'claude-sonnet-4-20250514', {
          system: buildArchitectSystemPrompt(task, laneFlags),
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
          system: buildReviewerSystemPrompt('primary'),
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
        const reviewerReviewCommand = reviewerCommands.find((command) => command.kind === 'REVIEW');
        const reviewerReview = parseReviewBody(reviewerReviewCommand?.body ?? reviewerResponse);

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

        await saveReview(taskId, 'chatgpt', reviewerReview);

        const reviewerBudget = checkTokenBudget(totalTokens, tokenBudget);
        if (!reviewerBudget.ok) {
          finalStatus = 'blocked';
          abortReason = 'token_budget_exceeded';
          break;
        }

        const claudeReviewerResponse = await callProvider('anthropic', 'claude-sonnet-4-20250514', {
          system: buildReviewerSystemPrompt('secondary'),
          messages: [
            {
              role: 'user',
              content: [
                `Task goal: ${task.goal}`,
                `Architect BDL:\n${architectResponse}`,
                architectExecution.contextText ? `Execution summary:\n${architectExecution.contextText}` : 'No execution summary.',
                `Erstes Review (ChatGPT):\n${reviewerResponse}`,
              ].join('\n\n'),
            },
          ],
          maxTokens: 2000,
          temperature: 0.5,
        });

        const claudeReviewerTokens = estimateTokens(claudeReviewerResponse);
        totalTokens += claudeReviewerTokens;
        const claudeReviewerCommands = parseBdl(claudeReviewerResponse);
        const claudeReviewCommand = claudeReviewerCommands.find((command) => command.kind === 'REVIEW');
        const claudeReview = parseReviewBody(claudeReviewCommand?.body ?? claudeReviewerResponse);

        const claudeReviewerRound: DialogRound = {
          roundNumber,
          actor: 'claude',
          role: 'reviewer',
          rawResponse: claudeReviewerResponse,
          commands: claudeReviewerCommands,
          tokensUsed: claudeReviewerTokens,
          timestamp: new Date().toISOString(),
        };
        rounds.push(claudeReviewerRound);

        await saveCommandActions(
          taskId,
          'claude',
          'reviewer',
          roundNumber,
          claudeReviewerCommands,
          claudeReviewerResponse,
          claudeReviewerTokens,
          claudeReviewerCommands.map(() => ({ stub: true })),
        );

        const agreement = computeAgreement(reviewerReview, claudeReview);
        await saveReview(taskId, 'claude', claudeReview, agreement);

        const claudeReviewerBudget = checkTokenBudget(totalTokens, tokenBudget);
        if (!claudeReviewerBudget.ok) {
          finalStatus = 'blocked';
          abortReason = 'token_budget_exceeded';
          break;
        }

        let observerReview: ParsedReview | null = null;
        const observerResult = await runObserver(
          task,
          agreement,
          [
            `Architect BDL:\n${architectResponse}`,
            architectExecution.contextText ? `Execution summary:\n${architectExecution.contextText}` : 'No execution summary.',
            `Review 1 (ChatGPT):\n${reviewerResponse}`,
            `Review 2 (Claude):\n${claudeReviewerResponse}`,
          ].filter(Boolean).join('\n\n'),
        );

        if (observerResult) {
          observerReview = observerResult.review;
          rounds.push({
            roundNumber,
            actor: 'deepseek',
            role: 'observer',
            rawResponse: observerResult.rawResponse,
            commands: observerResult.commands,
            tokensUsed: observerResult.tokensUsed,
            timestamp: new Date().toISOString(),
          });

          await saveCommandActions(
            taskId,
            'deepseek',
            'observer',
            roundNumber,
            observerResult.commands,
            observerResult.rawResponse,
            observerResult.tokensUsed,
            observerResult.commands.map(() => ({ stub: true })),
          );

          totalTokens += observerResult.tokensUsed;
          await saveReview(taskId, 'deepseek', observerReview, agreement);

          const observerBudget = checkTokenBudget(totalTokens, tokenBudget);
          if (!observerBudget.ok) {
            finalStatus = 'blocked';
            abortReason = 'token_budget_exceeded';
            break;
          }
        }

        latestContext = [
          architectExecution.contextText,
          reviewerResponse,
          claudeReviewerResponse,
          observerResult?.rawResponse ?? '',
          `agreement:${agreement.level}`,
          agreement.dissentPoints.length > 0 ? `dissent:${agreement.dissentPoints.join(', ')}` : '',
        ].filter(Boolean).join('\n\n');

        const combinedVerdict = observerReview
          ? observerReview.verdict
          : decideVerdict([reviewerReview.verdict, claudeReview.verdict]);

        if (combinedVerdict === 'block') {
          finalStatus = 'blocked';
          abortReason = observerReview ? 'observer_blocked' : 'dual_review_blocked';
          break;
        }

        if (combinedVerdict === 'ok') {
          if (laneFlags.browser && ['B', 'C'].includes(task.taskType)) {
            const uiRunCommands = architectCommands.filter((command) => command.kind === 'UI_RUN');

            await db
              .update(builderTasks)
              .set({ status: 'browser_testing', updatedAt: new Date() })
              .where(eq(builderTasks.id, taskId));

            try {
              const browserExecution = await runBrowserLane(taskId, worktree.worktreePath, uiRunCommands);

              if (uiRunCommands.length > 0) {
                await saveCommandActions(
                  taskId,
                  'system',
                  'system',
                  roundNumber,
                  uiRunCommands,
                  browserExecution.summary,
                  0,
                  browserExecution.commandResults,
                  'browser',
                );
              } else {
                await saveCommandActions(
                  taskId,
                  'system',
                  'system',
                  roundNumber,
                  [],
                  browserExecution.summary,
                  0,
                  [],
                  'browser',
                );
              }

              latestContext = [
                latestContext,
                `browser_lane:${browserExecution.reason}`,
                browserExecution.summary,
              ].filter(Boolean).join('\n\n');

              if (!browserExecution.ok) {
                finalStatus = 'review_needed';
                abortReason = browserExecution.reason;
                break;
              }
            } catch (browserError) {
              const message = browserError instanceof Error ? browserError.message : String(browserError);
              await saveCommandActions(
                taskId,
                'system',
                'system',
                roundNumber,
                [],
                `Browser lane error: ${message}`,
                0,
                [],
                'browser',
              );
              finalStatus = 'review_needed';
              abortReason = `browser_lane_error:${message}`;
              break;
            }
          }

          finalStatus = 'push_candidate';
          break;
        }

        if (roundNumber === maxRounds) {
          finalStatus = 'needs_human_review';
          abortReason = 'review_issue_unresolved';
          break;
        }
      }
    }

    if (rounds.length > 0 && finalStatus === 'needs_human_review' && !abortReason) {
      abortReason = 'max_rounds_exceeded';
    }

    const needsCounterexamples = laneFlags.counterexample
      && policy?.counterexamples_required === true
      && (task.risk === 'medium' || task.risk === 'high');

    if (needsCounterexamples && finalStatus === 'push_candidate') {
      await db
        .update(builderTasks)
        .set({ status: 'counterexampling', updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));

      const counterexampleResponse = await callProvider('openai', 'gpt-4.1-mini', {
        system: [
          'Du bist der Builder-Counterexample-Analyst fuer Soulmatch.',
          'Antworte NUR in BDL.',
          'Generiere 1-3 @COUNTEREXAMPLE oder @FAILURE_PATH Bloecke.',
          'Denke: Was koennte an diesem Fix schiefgehen?',
          'Wenn du einen echten Blocker findest: @BLOCK. Sonst: @APPROVE.',
        ].join('\n'),
        messages: [
          {
            role: 'user',
            content: `Task: ${task.goal}\n\nBisheriger Dialog:\n${latestContext}`,
          },
        ],
        maxTokens: 1500,
        temperature: 0.8,
      });

      const ceTokens = estimateTokens(counterexampleResponse);
      totalTokens += ceTokens;
      const ceCommands = parseBdl(counterexampleResponse);

      rounds.push({
        roundNumber: rounds.length + 1,
        actor: 'chatgpt',
        role: 'reviewer',
        rawResponse: counterexampleResponse,
        commands: ceCommands,
        tokensUsed: ceTokens,
        timestamp: new Date().toISOString(),
      });

      await saveCommandActions(
        taskId,
        'chatgpt',
        'reviewer',
        rounds.length,
        ceCommands,
        counterexampleResponse,
        ceTokens,
        ceCommands.map(() => ({ stub: true })),
      );

      const counterexampleBudget = checkTokenBudget(totalTokens, tokenBudget);
      if (!counterexampleBudget.ok) {
        finalStatus = 'blocked';
        abortReason = 'token_budget_exceeded';
      } else if (ceCommands.some((command) => command.kind === 'BLOCK')) {
        finalStatus = 'blocked';
        abortReason = 'counterexample_blocked';
      }
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

  try {
    const evidencePack = await generateEvidencePack(taskId);
    await saveEvidencePack(taskId, evidencePack);
  } catch (evidenceError) {
    console.error('[builder] Evidence pack generation failed:', evidenceError);
  }

  return {
    taskId,
    rounds,
    finalStatus,
    totalTokens,
    ...(abortReason ? { abortReason } : {}),
  };
}