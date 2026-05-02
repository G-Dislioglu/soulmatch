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
import { webSearch } from './builderSearch.js';
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
import { setActiveBuilderTask, syncBuilderMemoryForTask } from './builderMemory.js';
import { buildBuilderTaskContract } from './builderTaskContract.js';

type ComplexityTier = 1 | 2 | 3;

async function classifyComplexity(task: typeof builderTasks.$inferSelect): Promise<ComplexityTier> {
  try {
    const response = await callProvider('gemini', 'gemini-3-flash-preview', {
      system: 'Klassifiziere die Komplexitaet dieses Builder-Tasks. Antworte NUR mit 1, 2 oder 3.\n1 = einfach (neue Datei, kleiner Fix, 1 Datei)\n2 = mittel (mehrere Dateien, Pattern-Suche noetig, Logik-Aenderung)\n3 = komplex (Architektur, mehrere Module, Abhaengigkeiten)',
      messages: [{
        role: 'user',
        content: `Title: ${task.title}\nGoal: ${task.goal}\nType: ${task.taskType}\nIntent: ${task.intentKind}\nRequestedOutput: ${task.requestedOutputKind}\nRequestedFormat: ${task.requestedOutputFormat}\nRisk: ${task.risk}`,
      }],
      maxTokens: 10,
      temperature: 0,
    });
    const tier = parseInt(response.trim().charAt(0), 10);
    if (tier === 1 || tier === 2 || tier === 3) {
      return tier;
    }
    return 1;
  } catch {
    return 1;
  }
}

async function runCollaborativeAnalysis(
  task: typeof builderTasks.$inferSelect,
  worktreePath: string,
): Promise<{ claudeAnalysis: string; chatgptAnalysis: string; combined: string }> {
  const analysisPrompt = [
    'Analysiere diesen Task OHNE ihn umzusetzen.',
    `Title: ${task.title}`,
    `Goal: ${task.goal}`,
    `Intent: ${task.intentKind}`,
    `Requested Output: ${task.requestedOutputKind}`,
    `Requested Format: ${task.requestedOutputFormat}`,
    `Scope: ${task.scope.join(', ') || '(alle Dateien erlaubt)'}`,
    `Worktree: ${worktreePath}`,
    '',
    'Liefere:',
    '1. BETROFFENE DATEIEN: Welche Dateien muessen gelesen/geaendert werden?',
    '2. RISIKEN: Was koennte schiefgehen?',
    '3. ANSATZ: Wie wuerdest du vorgehen? (2-3 Saetze)',
    '4. REUSE: Gibt es bestehende Patterns die wiederverwendet werden sollten?',
    '',
    'Antworte knapp und praezise.',
  ].join('\n');

  const [claudeResult, chatgptResult] = await Promise.all([
    callProvider('anthropic', 'claude-sonnet-4-20250514', {
      system: 'Du bist ein Senior Backend-Architect. Analysiere den Task aus Architektur-Perspektive.',
      messages: [{ role: 'user', content: analysisPrompt }],
      maxTokens: 800,
      temperature: 0.5,
    }).catch(() => 'Claude-Analyse nicht verfuegbar.'),
    callProvider('openai', 'gpt-4.1-mini', {
      system: 'Du bist ein Senior Code-Reviewer. Analysiere den Task aus Qualitaets- und Sicherheits-Perspektive.',
      messages: [{ role: 'user', content: analysisPrompt }],
      maxTokens: 800,
      temperature: 0.5,
    }).catch(() => 'ChatGPT-Analyse nicht verfuegbar.'),
  ]);

  const combined = [
    '=== KOLLABORATIVE ANALYSE ===',
    '',
    '--- Claude (Architect-Perspektive) ---',
    claudeResult,
    '',
    '--- ChatGPT (Reviewer-Perspektive) ---',
    chatgptResult,
    '',
    '=== ENDE ANALYSE ===',
    'Beruecksichtige BEIDE Perspektiven in deinem Plan.',
  ].join('\n');

  return { claudeAnalysis: claudeResult, chatgptAnalysis: chatgptResult, combined };
}

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

function needsVisualPrototype(task: typeof builderTasks.$inferSelect, laneFlags: { prototype: boolean }): boolean {
  if (!laneFlags.prototype) {
    return false;
  }

  return task.requestedOutputKind === 'html_artifact'
    || task.requestedOutputKind === 'presentation_artifact'
    || task.requestedOutputKind === 'visual_artifact'
    || task.intentKind === 'app_build'
    || ['B', 'C', 'P'].includes(task.taskType);
}

function needsBrowserLane(task: typeof builderTasks.$inferSelect, laneFlags: { browser: boolean }): boolean {
  if (!laneFlags.browser) {
    return false;
  }

  return task.requestedOutputKind === 'html_artifact'
    || task.requestedOutputKind === 'presentation_artifact'
    || task.requestedOutputKind === 'visual_artifact'
    || task.intentKind === 'app_build'
    || ['B', 'C'].includes(task.taskType);
}

function buildArchitectSystemPrompt(
  task: typeof builderTasks.$inferSelect,
  laneFlags: { browser: boolean },
) {
  return [
    'Du bist der Builder-Architect fuer Soulmatch.',
    'Antworte NUR in BDL (Builder Dialog Language). Kein Fliesstext, kein Markdown, kein Bash.',
    '',
    '=== BDL Syntax-Referenz ===',
    '@FIND_PATTERN pattern:"regex_oder_text" fileGlob:"*.ts"',
    '  -> Sucht im Repo. Alle Parameter auf EINER Zeile nach @FIND_PATTERN.',
    '@READ file:"server/src/lib/example.ts"',
    '  -> Liest eine Datei. Parameter auf derselben Zeile.',
    '@PLAN',
    '1. Schritt eins',
    '2. Schritt zwei',
    '  -> Freitext-Plan, Zeilen direkt nach @PLAN.',
    '@PATCH file:"server/src/lib/example.ts" {',
    '  -alte Zeile die entfernt wird',
    '  +neue Zeile die eingefuegt wird',
    '}',
    '  -> Aenderung an einer Datei. Fuer neue Dateien: nur + Zeilen.',
    '@APPLY',
    '  -> Fuehrt alle gepufferten @PATCH Befehle aus. PFLICHT nach @PATCH.',
    '@SEARCH query:"suchbegriff oder technische frage"',
    '  -> Web-Suche. Nutze wenn du eine API-Referenz, ein Pattern oder aktuelle Doku brauchst.',
    '',
    '=== VERBOTEN ===',
    '@EXECUTE, @READ_FILE, @VERIFY, @BASH - existieren NICHT.',
    'Nutze @READ statt @READ_FILE. Nutze @PATCH + @APPLY statt @EXECUTE.',
    '',
    '=== Ablauf ===',
    '1. @FIND_PATTERN (Pflicht) -> 2. @READ/@SEARCH (optional) -> 3. @PLAN -> 4. @PATCH -> 5. @APPLY',
    '',
    'Wenn dir eine KOLLABORATIVE ANALYSE mitgegeben wird, beruecksichtige die Erkenntnisse beider Experten.',
    'Baue auf ihren Risiko-Einschaetzungen und Ansaetzen auf statt sie zu ignorieren.',
    '',
    `Task: ${task.goal}`,
    `IntentKind: ${task.intentKind ?? 'code_change'}`,
    `Requested Output: ${task.requestedOutputKind ?? 'code_artifact'} / ${task.requestedOutputFormat ?? 'code'}`,
    `Scope: ${task.scope.join(', ') || '(leer - alle Dateien erlaubt)'}`,
    `Not-Scope: ${task.notScope.join(', ') || '(leer)'}`,
    `Policy: ${task.policyProfile ?? TASK_TYPE_TO_PROFILE[task.taskType as keyof typeof TASK_TYPE_TO_PROFILE]}`,
    'Halte die Code-Lane voll funktionsfaehig, auch wenn die Aufgabe als universeller Maya-Task geroutet wurde.',
    needsBrowserLane(task, laneFlags)
      ? 'Du musst mindestens einen @UI_RUN Block liefern: route/path ist Pflicht, selector/text/waitFor optional.'
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

function buildTaskSnapshot(
  task: typeof builderTasks.$inferSelect,
  patch: Partial<typeof builderTasks.$inferSelect> = {},
): typeof builderTasks.$inferSelect {
  return {
    ...task,
    ...patch,
  };
}

async function recordContractAction(input: {
  task: typeof builderTasks.$inferSelect;
  lane: string;
  kind: string;
  actor: string;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  tokenCount?: number;
}) {
  const db = getDb();
  await db.insert(builderActions).values({
    taskId: input.task.id,
    lane: input.lane,
    kind: input.kind,
    actor: input.actor,
    payload: {
      ...(input.payload ?? {}),
      contract: buildBuilderTaskContract(input.task),
    },
    result: input.result ?? null,
    tokenCount: input.tokenCount ?? 0,
  });
}

async function saveCommandActions(
  task: typeof builderTasks.$inferSelect,
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
        contract: buildBuilderTaskContract(task),
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
        contract: buildBuilderTaskContract(task),
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
      const pattern = command.params.intent || command.params.pattern || command.params.arg1 || (command.body ?? '').split('\n')[0].trim() || '';
      const matches = await findPattern(worktreePath, pattern, command.params.fileGlob);
      const result = { pattern, matches };
      results.push(result);
      outputs.push(summarizeCommandResult(command, result));
      continue;
    }

    if (kind === 'SEARCH') {
      const query = command.params.query || command.params.q || command.params.arg1 || (command.body ?? '').split('\n')[0].trim() || '';
      if (!query) {
        const result = { error: 'missing_query_param' };
        results.push(result);
        outputs.push(summarizeCommandResult(command, result));
        continue;
      }

      const searchResult = await webSearch(query);
      const result = {
        query: searchResult.query,
        summary: searchResult.summary,
        error: searchResult.error || null,
      };
      results.push(result);
      outputs.push(`SEARCH "${query}": ${searchResult.summary.slice(0, 500)}`);
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
  setActiveBuilderTask(taskId);
  const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  let currentTask = task;

  const updateTaskStatus = async (
    nextStatus: typeof builderTasks.$inferSelect.status,
    lane: 'code' | 'review' | 'runtime' | 'prototype',
    reason: string,
    patch: Partial<typeof builderTasks.$inferSelect> = {},
  ) => {
    const nextTask = buildTaskSnapshot(currentTask, {
      ...patch,
      status: nextStatus,
      updatedAt: new Date(),
    });

    await db
      .update(builderTasks)
      .set({
        status: nextStatus,
        updatedAt: nextTask.updatedAt,
        ...(patch.commitHash !== undefined ? { commitHash: patch.commitHash } : {}),
        ...(patch.tokenCount !== undefined ? { tokenCount: patch.tokenCount } : {}),
      })
      .where(eq(builderTasks.id, taskId));

    await recordContractAction({
      task: nextTask,
      lane,
      kind: 'STATUS_TRANSITION',
      actor: 'system',
      payload: {
        fromStatus: currentTask.status,
        toStatus: nextStatus,
        reason,
      },
      result: {
        status: nextStatus,
        lifecyclePhase: buildBuilderTaskContract(nextTask).lifecycle.phase,
      },
      tokenCount: 0,
    });

    currentTask = nextTask;
  };

  const canaryGate = await evaluateCanaryGate(currentTask);
  if (!canaryGate.allowed) {
    await updateTaskStatus('blocked', 'review', 'canary_gate_blocked');
    await recordContractAction({
      task: currentTask,
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

  const policyName = currentTask.policyProfile as keyof typeof BUILDER_POLICY_PROFILES | null;
  const policy = policyName ? BUILDER_POLICY_PROFILES[policyName] : null;
  const maxRounds = policy?.max_rounds ?? 3;
  const tokenBudget = currentTask.tokenBudget ?? (currentTask.risk === 'high' ? 10000 : currentTask.risk === 'medium' ? 5000 : 2000);

  const rounds: DialogRound[] = [];
  const worktree = createWorktree(taskId);
  let totalTokens = 0;
  let finalStatus = 'needs_human_review';
  let abortReason: string | undefined;
  let latestContext = '';
  const needsPrototype = needsVisualPrototype(currentTask, laneFlags);
  const shouldRunPrototypeLane = needsPrototype && currentTask.status !== 'planning' && currentTask.status !== 'prototype_review';

  try {
    if (currentTask.status === 'prototype_review') {
      finalStatus = 'prototype_review';
    } else if (shouldRunPrototypeLane) {
      await updateTaskStatus('prototyping', 'prototype', 'prototype_lane_started');

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
            content: `Task: ${currentTask.goal}\nIntent: ${currentTask.intentKind}\nRequested Output: ${currentTask.requestedOutputKind}\nRequested Format: ${currentTask.requestedOutputFormat}\nScope: ${currentTask.scope.join(', ')}`,
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
        currentTask,
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

      await updateTaskStatus('prototype_review', 'prototype', 'prototype_ready_for_review');

      finalStatus = 'prototype_review';
    }

    const tier = await classifyComplexity(currentTask);
    console.log(`[builder] Task ${taskId} classified as Tier ${tier}`);

    if (tier >= 2) {
      const analysis = await runCollaborativeAnalysis(currentTask, worktree.worktreePath);
      latestContext = analysis.combined;

      await recordContractAction({
        task: currentTask,
        lane: 'review',
        kind: 'COLLABORATIVE_ANALYSIS',
        actor: 'system',
        payload: {
          tier,
          claudeAnalysis: analysis.claudeAnalysis.slice(0, 2000),
          chatgptAnalysis: analysis.chatgptAnalysis.slice(0, 2000),
        },
        result: { tier, analysisLength: analysis.combined.length },
        tokenCount: estimateTokens(analysis.combined),
      });

      const analysisTokens = estimateTokens(analysis.combined);
      totalTokens += analysisTokens;
    }

    if (!needsPrototype || currentTask.status === 'planning') {
      for (let roundNumber = 1; roundNumber <= maxRounds; roundNumber += 1) {
        await updateTaskStatus('planning', 'code', 'architect_round_started');

        const architectResponse = await callProvider('anthropic', 'claude-sonnet-4-20250514', {
          system: buildArchitectSystemPrompt(currentTask, laneFlags),
          messages: [
            {
              role: 'user',
              content: [
                `Task title: ${currentTask.title}`,
                `Task goal: ${currentTask.goal}`,
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
        const architectExecution = await executeArchitectCommands(currentTask, worktree.worktreePath, architectCommands);

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
          currentTask,
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

        await updateTaskStatus('reviewing', 'review', 'review_round_started');

        const reviewerResponse = await callProvider('openai', 'gpt-4.1-mini', {
          system: buildReviewerSystemPrompt('primary'),
          messages: [
            {
              role: 'user',
              content: [
                `Task goal: ${currentTask.goal}`,
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
          currentTask,
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
                `Task goal: ${currentTask.goal}`,
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
          currentTask,
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
          currentTask,
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
            currentTask,
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
          if (needsBrowserLane(currentTask, laneFlags)) {
            const uiRunCommands = architectCommands.filter((command) => command.kind === 'UI_RUN');

            await updateTaskStatus('browser_testing', 'runtime', 'browser_lane_started');

            try {
              const browserExecution = await runBrowserLane(taskId, worktree.worktreePath, uiRunCommands);

              if (uiRunCommands.length > 0) {
                await saveCommandActions(
                  currentTask,
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
                  currentTask,
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
                currentTask,
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
      && (currentTask.risk === 'medium' || currentTask.risk === 'high');

    if (needsCounterexamples && finalStatus === 'push_candidate') {
      await updateTaskStatus('counterexampling', 'review', 'counterexample_lane_started');

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
            content: `Task: ${currentTask.goal}\n\nBisheriger Dialog:\n${latestContext}`,
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
        currentTask,
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
    await recordContractAction({
      task: currentTask,
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

  await updateTaskStatus(
    finalStatus as typeof builderTasks.$inferSelect.status,
    finalStatus === 'prototype_review' ? 'prototype' : finalStatus === 'push_candidate' ? 'review' : finalStatus === 'done' ? 'code' : 'review',
    'dialog_engine_completed',
    { tokenCount: totalTokens },
  );

  try {
    const evidencePack = await generateEvidencePack(taskId);
    await saveEvidencePack(taskId, evidencePack);
  } catch (evidenceError) {
    console.error('[builder] Evidence pack generation failed:', evidenceError);
  }

  try {
    await syncBuilderMemoryForTask(taskId);
  } catch (memoryError) {
    console.error('[builder] Builder memory sync failed:', memoryError);
  }

  return {
    taskId,
    rounds,
    finalStatus,
    totalTokens,
    ...(abortReason ? { abortReason } : {}),
  };
}
