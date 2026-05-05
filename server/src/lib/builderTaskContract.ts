import type { BuilderStatus } from '../schema/builder.js';

export type BuilderTaskIntentKind =
  | 'app_build'
  | 'code_change'
  | 'debug'
  | 'technical_review'
  | 'research'
  | 'analysis'
  | 'strategy'
  | 'clarification'
  | 'general';

export type BuilderUniversalLifecyclePhase =
  | 'requested'
  | 'understood'
  | 'routed'
  | 'active'
  | 'synthesizing'
  | 'delivered'
  | 'confirmed'
  | 'stopped';

export type BuilderAttentionState = 'active' | 'waiting' | 'complete' | 'blocked';

export type BuilderLaneKey = 'code' | 'runtime' | 'review' | 'prototype';

export type BuilderOutputKind =
  | 'chat_answer'
  | 'structured_answer'
  | 'html_artifact'
  | 'markdown_artifact'
  | 'json_artifact'
  | 'code_artifact'
  | 'presentation_artifact'
  | 'visual_artifact';

export type BuilderOutputFormat = 'chat' | 'markdown' | 'html' | 'json' | 'code' | 'mixed';

export type BuilderInstanceMode = 'maya' | 'council' | 'distiller' | 'worker' | 'judge' | 'scout';

export type BuilderCodeLanePhase =
  | 'idle'
  | 'scope_resolved'
  | 'prototype_building'
  | 'workers_editing'
  | 'checks_running'
  | 'review_pending'
  | 'push_candidate'
  | 'runtime_verified'
  | 'completed'
  | 'stopped';

export interface BuilderTaskRecord {
  id: string;
  title: string;
  goal: string;
  risk: string;
  taskType: string;
  intentKind?: BuilderTaskIntentKind | string | null;
  requestedOutputKind?: BuilderOutputKind | string | null;
  requestedOutputFormat?: BuilderOutputFormat | string | null;
  parentTaskId?: string | null;
  goalKind?: string | null;
  successConditions?: string[] | null;
  revisionLog?: Record<string, unknown>[] | null;
  budgetIterations?: number | null;
  budgetUsed?: number | null;
  policyProfile: string | null;
  scope: string[];
  notScope: string[];
  requiredLanes: string[];
  status: BuilderStatus | string;
  commitHash: string | null;
  tokenCount: number | null;
  tokenBudget: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BuilderTaskContract {
  intent: {
    kind: BuilderTaskIntentKind;
    summary: string;
    preservesCodeLane: boolean;
  };
  lifecycle: {
    phase: BuilderUniversalLifecyclePhase;
    attentionState: BuilderAttentionState;
    summary: string;
  };
  routing: {
    primaryLane: BuilderLaneKey;
    supportingLanes: BuilderLaneKey[];
    activeLanes: BuilderLaneKey[];
    summary: string;
  };
  team: {
    activeInstances: BuilderInstanceMode[];
    summary: string;
  };
  output: {
    kind: BuilderOutputKind;
    format: BuilderOutputFormat;
    plannedArtifacts: string[];
    needsUserConfirmation: boolean;
    summary: string;
  };
  codeLane: {
    enabled: boolean;
    status: BuilderAttentionState;
    phase: BuilderCodeLanePhase;
    summary: string;
    commitHash: string | null;
  };
}

export interface PresentedBuilderTask extends BuilderTaskRecord {
  contract: BuilderTaskContract;
}

export interface BuilderTaskCreationDefaults {
  intentKind: BuilderTaskIntentKind;
  requestedOutputKind: BuilderOutputKind;
  requestedOutputFormat: BuilderOutputFormat;
  requiredLanes: BuilderLaneKey[];
}

const REVIEW_STATUSES = new Set<BuilderStatus | string>(['prototype_review', 'review_needed', 'needs_human_review']);
const STOPPED_STATUSES = new Set<BuilderStatus | string>(['blocked', 'reverted', 'discarded', 'cancelled']);

export function inferIntentKindFromText(title: string, goal: string): BuilderTaskIntentKind {
  const haystack = `${title} ${goal}`.toLowerCase();

  if (/(debug|bug|fix|fehler|regression|issue)/.test(haystack)) {
    return 'debug';
  }
  if (/(review|audit|inspect|check|hardening)/.test(haystack)) {
    return 'technical_review';
  }
  if (/(app|ui|screen|frontend|landing page|component|prototype)/.test(haystack)) {
    return 'app_build';
  }

  return 'code_change';
}

export function normalizeIntentKind(value: string | null | undefined, fallbackTitle: string, fallbackGoal: string): BuilderTaskIntentKind {
  switch (value) {
    case 'app_build':
    case 'code_change':
    case 'debug':
    case 'technical_review':
    case 'research':
    case 'analysis':
    case 'strategy':
    case 'clarification':
    case 'general':
      return value;
    default:
      return inferIntentKindFromText(fallbackTitle, fallbackGoal);
  }
}

export function normalizeOutputKind(value: string | null | undefined, status?: string): BuilderOutputKind {
  switch (value) {
    case 'chat_answer':
    case 'structured_answer':
    case 'html_artifact':
    case 'markdown_artifact':
    case 'json_artifact':
    case 'code_artifact':
    case 'presentation_artifact':
    case 'visual_artifact':
      return value;
    default:
      return status === 'prototype_review' || status === 'prototyping' ? 'html_artifact' : 'code_artifact';
  }
}

export function normalizeOutputFormat(value: string | null | undefined, outputKind: BuilderOutputKind): BuilderOutputFormat {
  switch (value) {
    case 'chat':
    case 'markdown':
    case 'html':
    case 'json':
    case 'code':
    case 'mixed':
      return value;
    default:
      if (outputKind === 'html_artifact') {
        return 'html';
      }
      if (outputKind === 'json_artifact') {
        return 'json';
      }
      if (outputKind === 'chat_answer') {
        return 'chat';
      }
      if (outputKind === 'markdown_artifact' || outputKind === 'structured_answer') {
        return 'markdown';
      }
      return 'code';
  }
}

function isVisualOutputKind(outputKind: BuilderOutputKind): boolean {
  return outputKind === 'html_artifact'
    || outputKind === 'presentation_artifact'
    || outputKind === 'visual_artifact';
}

function isAnswerLikeOutputKind(outputKind: BuilderOutputKind): boolean {
  return outputKind === 'chat_answer'
    || outputKind === 'structured_answer'
    || outputKind === 'markdown_artifact'
    || outputKind === 'json_artifact';
}

function deriveRequiredLanesFromContract(
  taskType: string,
  risk: string,
  intentKind: BuilderTaskIntentKind,
  outputKind: BuilderOutputKind,
): BuilderLaneKey[] {
  const lanes = new Set<BuilderLaneKey>(['code']);
  const visualOutput = isVisualOutputKind(outputKind);
  const answerLikeOutput = isAnswerLikeOutputKind(outputKind);

  if (
    visualOutput
    || intentKind === 'app_build'
    || taskType === 'P'
  ) {
    lanes.add('prototype');
  }

  if (
    visualOutput
    || intentKind === 'app_build'
    || taskType === 'B'
    || taskType === 'C'
    || risk === 'high'
  ) {
    lanes.add('runtime');
  }

  if (
    !answerLikeOutput
    || risk !== 'low'
    || taskType === 'C'
    || taskType === 'D'
    || taskType === 'S'
    || intentKind === 'debug'
    || intentKind === 'technical_review'
  ) {
    lanes.add('review');
  }

  return [...lanes];
}

function derivePlannedArtifacts(outputKind: BuilderOutputKind): string[] {
  switch (outputKind) {
    case 'html_artifact':
      return ['prototype_preview', 'code_artifact', 'evidence_pack'];
    case 'presentation_artifact':
      return ['prototype_preview', 'presentation_artifact', 'evidence_pack'];
    case 'visual_artifact':
      return ['prototype_preview', 'visual_artifact', 'evidence_pack'];
    case 'markdown_artifact':
      return ['markdown_artifact', 'evidence_pack', 'review_notes'];
    case 'json_artifact':
      return ['json_artifact', 'evidence_pack', 'review_notes'];
    case 'structured_answer':
      return ['structured_answer', 'evidence_pack'];
    case 'chat_answer':
      return ['chat_response'];
    default:
      return ['code_artifact', 'evidence_pack', 'review_notes'];
  }
}

export function deriveTaskCreationDefaults(input: {
  title: string;
  goal: string;
  taskType: string;
  risk?: string | null;
  intentKind?: string | null;
  requestedOutputKind?: string | null;
  requestedOutputFormat?: string | null;
}): BuilderTaskCreationDefaults {
  const intentKind = normalizeIntentKind(input.intentKind, input.title, input.goal);
  const requestedOutputKind = normalizeOutputKind(input.requestedOutputKind);
  const requestedOutputFormat = normalizeOutputFormat(input.requestedOutputFormat, requestedOutputKind);
  const requiredLanes = deriveRequiredLanesFromContract(
    input.taskType,
    input.risk ?? 'low',
    intentKind,
    requestedOutputKind,
  );

  return {
    intentKind,
    requestedOutputKind,
    requestedOutputFormat,
    requiredLanes,
  };
}

function inferIntentKind(task: BuilderTaskRecord): BuilderTaskIntentKind {
  return normalizeIntentKind(task.intentKind, task.title, task.goal);
}

function inferOutputKind(task: BuilderTaskRecord): BuilderOutputKind {
  return normalizeOutputKind(task.requestedOutputKind, task.status);
}

function inferOutputFormat(task: BuilderTaskRecord, outputKind: BuilderOutputKind): BuilderOutputFormat {
  return normalizeOutputFormat(task.requestedOutputFormat, outputKind);
}

function inferIntentSummary(task: BuilderTaskRecord, intentKind: BuilderTaskIntentKind): string {
  if (intentKind === 'app_build') {
    return 'Maya behandelt diese Aufgabe als App- oder Produktbau unter vollem Erhalt der Code-Lane.';
  }
  if (intentKind === 'debug') {
    return 'Maya behandelt diese Aufgabe als technische Fehlerbehebung mit weiter aktivem Code-Lane-Schutz.';
  }
  if (intentKind === 'technical_review') {
    return 'Maya behandelt diese Aufgabe als technische Pruef- oder Haertungsarbeit mit Code-Lane-Bezug.';
  }

  return `Maya behandelt diese Aufgabe aktuell als code-zentrierte Builder-Arbeit: ${task.goal}`;
}

function normalizeLanes(task: BuilderTaskRecord): BuilderLaneKey[] {
  const normalized = new Set<BuilderLaneKey>();
  const hasStoredLanes = Array.isArray(task.requiredLanes) && task.requiredLanes.length > 0;

  for (const lane of task.requiredLanes ?? []) {
    if (lane === 'code' || lane === 'runtime' || lane === 'review' || lane === 'prototype') {
      normalized.add(lane);
    }
  }

  if (!hasStoredLanes) {
    const fallbackLanes = deriveRequiredLanesFromContract(
      task.taskType,
      task.risk,
      inferIntentKind(task),
      inferOutputKind(task),
    );
    for (const lane of fallbackLanes) {
      normalized.add(lane);
    }
  }

  normalized.add('code');

  if (task.status === 'prototyping' || task.status === 'prototype_review') {
    normalized.add('prototype');
  }

  return [...normalized];
}

function deriveLifecycle(task: BuilderTaskRecord): BuilderTaskContract['lifecycle'] {
  switch (task.status) {
    case 'queued':
      return {
        phase: 'requested',
        attentionState: 'active',
        summary: 'Die Aufgabe ist registriert und wartet darauf, dass Maya sie aufgreift.',
      };
    case 'classifying':
      return {
        phase: 'understood',
        attentionState: 'active',
        summary: 'Maya klaert gerade Absicht, Risiko und Problemzuschnitt.',
      };
    case 'planning':
      return {
        phase: 'routed',
        attentionState: 'active',
        summary: 'Maya hat die Aufgabe in die passende Lane geroutet und schneidet den Arbeitsweg zu.',
      };
    case 'prototyping':
    case 'applying':
      return {
        phase: 'active',
        attentionState: 'active',
        summary: 'Die spezialisierte Lane arbeitet gerade aktiv am Artefakt.',
      };
    case 'checking':
    case 'testing':
    case 'reviewing':
    case 'counterexampling':
      return {
        phase: 'synthesizing',
        attentionState: 'active',
        summary: 'Maya verdichtet gerade Pruef-, Gegenbeispiel- und Bewertungssignale.',
      };
    case 'prototype_review':
    case 'review_needed':
    case 'needs_human_review':
    case 'push_candidate':
      return {
        phase: 'delivered',
        attentionState: 'waiting',
        summary: 'Ein verwertbarer Zwischen- oder Endstand liegt vor und wartet auf Entscheidung oder Freigabe.',
      };
    case 'done':
      return {
        phase: 'confirmed',
        attentionState: 'complete',
        summary: task.commitHash
          ? 'Die Aufgabe gilt im aktuellen System als bestaetigt und commit-seitig verankert.'
          : 'Die Aufgabe gilt im aktuellen System als bestaetigt, auch wenn noch kein Commit sichtbar ist.',
      };
    default:
      if (STOPPED_STATUSES.has(task.status)) {
        return {
          phase: 'stopped',
          attentionState: 'blocked',
          summary: 'Die Aufgabe wurde bewusst gestoppt, verworfen oder rueckgaengig gemacht.',
        };
      }

      return {
        phase: 'active',
        attentionState: 'active',
        summary: `Die Aufgabe laeuft in einem legacy Builder-Status: ${task.status}.`,
      };
  }
}

function deriveTeam(task: BuilderTaskRecord): BuilderTaskContract['team'] {
  const activeLanes = normalizeLanes(task);
  const plannedInstances = new Set<BuilderInstanceMode>(['maya', 'distiller']);

  if (activeLanes.includes('prototype') || activeLanes.includes('code')) {
    plannedInstances.add('worker');
  }
  if (activeLanes.includes('runtime')) {
    plannedInstances.add('scout');
  }
  if (activeLanes.includes('review') && (task.risk !== 'low' || task.taskType === 'S' || task.intentKind === 'technical_review')) {
    plannedInstances.add('judge');
  }
  if (task.risk === 'high' || task.taskType === 'S' || task.taskType === 'C') {
    plannedInstances.add('council');
  }

  switch (task.status) {
    case 'queued':
    case 'classifying':
      return {
        activeInstances: [...plannedInstances],
        summary: `Maya hat die erste Team-Form bereits aus dem Contract abgeleitet: ${[...plannedInstances].join(', ')}.`,
      };
    case 'planning':
      return {
        activeInstances: [...new Set<BuilderInstanceMode>([...plannedInstances, 'council'])],
        summary: 'Maya richtet das aus dem Contract abgeleitete Team und die passenden Lanes fuer den naechsten sauberen Schritt aus.',
      };
    case 'prototyping':
    case 'applying':
      return {
        activeInstances: ['maya', 'worker'],
        summary: 'Maya fuehrt den Code-Lane-Bau ueber Worker aus.',
      };
    case 'checking':
    case 'testing':
    case 'counterexampling':
      return {
        activeInstances: ['maya', 'worker', 'scout'],
        summary: 'Maya laesst Build, Runtime und Gegenbeispiele parallel absichern.',
      };
    case 'reviewing':
      return {
        activeInstances: ['maya', 'judge', 'scout'],
        summary: 'Maya zieht Bewertungs- und Patrol-Signale fuer die Entscheidung zusammen.',
      };
    case 'prototype_review':
    case 'review_needed':
    case 'needs_human_review':
    case 'push_candidate':
      return {
        activeInstances: ['maya', 'judge'],
        summary: 'Maya haelt den Stand fuer eine menschliche oder finale Entscheidung bereit.',
      };
    default:
      return {
        activeInstances: ['maya'],
        summary: 'Maya bleibt die primäre Orchestratorin dieses Laufs.',
      };
  }
}

function deriveOutput(task: BuilderTaskRecord): BuilderTaskContract['output'] {
  const outputKind = inferOutputKind(task);
  const format = inferOutputFormat(task, outputKind);

  if (outputKind === 'html_artifact') {
    return {
      kind: outputKind,
      format,
      plannedArtifacts: derivePlannedArtifacts(outputKind),
      needsUserConfirmation: task.status === 'prototype_review',
      summary: 'Der aktuelle Stand zielt auf einen pruefbaren Prototype-Output mit weiter offenem Code-Lane-Fortgang.',
    };
  }

    return {
      kind: outputKind,
      format,
      plannedArtifacts: derivePlannedArtifacts(outputKind),
      needsUserConfirmation: REVIEW_STATUSES.has(task.status),
    summary: outputKind === 'chat_answer'
      ? 'Der aktuelle Stand zielt auf eine direkte Maya-Antwort.'
      : outputKind === 'structured_answer'
        ? 'Der aktuelle Stand zielt auf eine strukturierte Antwort unter dem universalisierten Builder-Dach.'
        : outputKind === 'markdown_artifact'
          ? 'Der aktuelle Stand zielt auf ein markdown-basiertes Ergebnis mit erhaltenem Code-Lane-Rueckgrat.'
          : outputKind === 'json_artifact'
            ? 'Der aktuelle Stand zielt auf ein JSON-Artefakt mit sauberem Rueckkanal in die Code-Lane.'
            : 'Der aktuelle Stand zielt auf eine Code-Aenderung mit technischer Evidenz und abgesicherter Review-Spur.',
  };
}

function deriveCodeLane(task: BuilderTaskRecord): BuilderTaskContract['codeLane'] {
  if (STOPPED_STATUSES.has(task.status)) {
    return {
      enabled: true,
      status: 'blocked',
      phase: 'stopped',
      summary: 'Die Code-Lane wurde fail-closed gestoppt oder rueckgaengig gemacht.',
      commitHash: task.commitHash,
    };
  }

  switch (task.status) {
    case 'queued':
    case 'classifying':
      return {
        enabled: true,
        status: 'active',
        phase: 'idle',
        summary: 'Die Code-Lane ist vorgemerkt, aber noch nicht im Ausfuehrungsabschnitt.',
        commitHash: task.commitHash,
      };
    case 'planning':
      return {
        enabled: true,
        status: 'active',
        phase: 'scope_resolved',
        summary: 'Scope und Arbeitsweg werden fuer die Code-Lane konkret zugeschnitten.',
        commitHash: task.commitHash,
      };
    case 'prototyping':
      return {
        enabled: true,
        status: 'active',
        phase: 'prototype_building',
        summary: 'Die Code-Lane baut bewusst in einem vorgeschalteten Prototype-Modus.',
        commitHash: task.commitHash,
      };
    case 'applying':
      return {
        enabled: true,
        status: 'active',
        phase: 'workers_editing',
        summary: 'Worker setzen den ausgewaehlten Code-Pfad gerade um.',
        commitHash: task.commitHash,
      };
    case 'checking':
    case 'testing':
    case 'counterexampling':
    case 'reviewing':
      return {
        enabled: true,
        status: 'active',
        phase: 'checks_running',
        summary: 'Build-, Runtime- und Gegenbeispiel-Pruefungen laufen ueber der Code-Lane.',
        commitHash: task.commitHash,
      };
    case 'prototype_review':
    case 'review_needed':
    case 'needs_human_review':
      return {
        enabled: true,
        status: 'waiting',
        phase: 'review_pending',
        summary: 'Die Code-Lane haelt an und wartet auf menschliche Entscheidung.',
        commitHash: task.commitHash,
      };
    case 'push_candidate':
      return {
        enabled: true,
        status: 'waiting',
        phase: 'push_candidate',
        summary: 'Die Code-Lane meldet einen Landing-Kandidaten vor dem finalen Schritt.',
        commitHash: task.commitHash,
      };
    case 'done':
      return {
        enabled: true,
        status: 'complete',
        phase: task.commitHash ? 'runtime_verified' : 'completed',
        summary: task.commitHash
          ? 'Die Code-Lane meldet einen bestaetigten Stand mit sichtbarem Commit.'
          : 'Die Code-Lane meldet einen abgeschlossenen Stand ohne sichtbaren Commit.',
        commitHash: task.commitHash,
      };
    default:
      return {
        enabled: true,
        status: 'active',
        phase: 'workers_editing',
        summary: `Die Code-Lane arbeitet in einem legacy Status: ${task.status}.`,
        commitHash: task.commitHash,
      };
  }
}

export function buildBuilderTaskContract(task: BuilderTaskRecord): BuilderTaskContract {
  const intentKind = normalizeIntentKind(task.intentKind, task.title, task.goal);
  const lifecycle = deriveLifecycle(task);
  const activeLanes = normalizeLanes(task);
  const primaryLane = activeLanes.includes('code') ? 'code' : activeLanes[0] ?? 'code';
  const supportingLanes = activeLanes.filter((lane) => lane !== primaryLane);
  const output = deriveOutput(task);
  const codeLane = deriveCodeLane(task);

  return {
    intent: {
      kind: intentKind,
      summary: inferIntentSummary(task, intentKind),
      preservesCodeLane: true,
    },
    lifecycle,
    routing: {
        primaryLane,
        supportingLanes,
        activeLanes,
        summary: supportingLanes.length > 0
          ? `Primäre Lane ist ${primaryLane}; Maya zieht zusaetzlich ${supportingLanes.join(', ')} als Stuetz-Lanes heran.`
          : `Primäre Lane ist ${primaryLane}; Maya haelt die aktuelle Aufgabe noch eng am Code-Lane-Kern.`,
    },
    team: deriveTeam(task),
    output,
    codeLane,
  };
}

export function presentBuilderTask(task: BuilderTaskRecord): PresentedBuilderTask {
  return {
    ...task,
    contract: buildBuilderTaskContract(task),
  };
}
