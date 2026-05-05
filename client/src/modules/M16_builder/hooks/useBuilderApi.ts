import { useCallback } from 'react';

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

export interface BuilderTask {
  id: string;
  title: string;
  goal: string;
  risk: string;
  taskType: string;
  intentKind: BuilderTaskIntentKind;
  requestedOutputKind: BuilderOutputKind;
  requestedOutputFormat: BuilderOutputFormat;
  parentTaskId?: string | null;
  goalKind?: string | null;
  successConditions?: string[];
  revisionLog?: Record<string, unknown>[];
  budgetIterations?: number;
  budgetUsed?: number;
  policyProfile: string | null;
  scope: string[];
  notScope: string[];
  requiredLanes: string[];
  status: string;
  commitHash: string | null;
  tokenCount: number | null;
  tokenBudget: number | null;
  createdAt: string;
  updatedAt: string;
  contract: BuilderTaskContract;
}

export interface BuilderAction {
  id: string;
  taskId: string;
  lane: string;
  kind: string;
  actor: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  tokenCount: number | null;
  createdAt: string;
  text?: string;
}

export interface BuilderArtifact {
  id: string;
  taskId: string;
  artifactType: string;
  lane: string;
  path: string | null;
  jsonPayload: Record<string, unknown> | null;
  createdAt: string;
}

export interface BuilderFileContent {
  content: string;
  lines: number;
}

export interface BuilderCreateTaskInput {
  title: string;
  goal: string;
  risk?: string;
  taskType: string;
  intentKind: BuilderTaskIntentKind;
  requestedOutputKind: BuilderOutputKind;
  requestedOutputFormat: BuilderOutputFormat;
}

export interface BuilderChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BuilderChatResponse {
  type: 'task_created' | 'task_status' | 'chat' | 'error';
  message: string;
  taskId?: string;
  taskTitle?: string;
}

export interface BuilderEvidencePack {
  taskId: string;
  title: string;
  goal: string;
  intent_kind: BuilderTaskIntentKind;
  requested_output_kind: BuilderOutputKind;
  requested_output_format: BuilderOutputFormat;
  intent: {
    why: string;
    user_outcome: string;
    false_success: string;
  } | null;
  scope_files: string[];
  base_commit: string | null;
  head_commit: string | null;
  diff_stat: string | null;
  reuse_search: {
    patterns_found: number;
    reused: boolean;
    source: string | null;
  } | null;
  checks: {
    tsc: string;
    build: string;
  };
  runtime_results: Array<{
    test: string;
    result: string;
    details: string;
    durationMs: number | null;
  }>;
  counterexamples_tested: number;
  counterexamples_passed: number;
  reviews: Record<string, { verdict: string; notes: string | null }>;
  contract_snapshot: {
    lifecycle_phase: string;
    attention_state: string;
    active_lanes: string[];
    team_instances: string[];
    output_kind: string;
    output_format: string;
    planned_artifacts: string[];
    code_lane_phase: string;
  };
  status_transitions: Array<{
    from_status: string | null;
    to_status: string;
    lifecycle_phase: string;
    lane: string;
    reason: string | null;
    at: string;
  }>;
  execution_summary: {
    channel: string;
    last_transition_reason: string | null;
    last_transition_lane: string | null;
    last_transition_at: string | null;
    transition_count: number;
    latest_status_source: string | null;
  };
  agreement_level: string | null;
  final_status: string;
  false_success_detected: boolean;
  total_tokens: number;
  total_rounds: number;
  created_at: string;
}

export interface BuilderChatPoolEntry {
  round: number;
  phase: string;
  actor: string;
  model: string;
  content: string;
  tokensUsed: number | null;
  createdAt: string;
}

export interface BuilderObservedAction {
  lane: string;
  kind: string;
  actor: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  createdAt: string;
}

export interface BuilderObservedLog {
  action: string;
  input: unknown;
  output: unknown;
  tokensUsed: number | null;
  createdAt: string;
}

export interface BuilderTaskObservation {
  task: {
    id: string;
    title: string;
    goal: string;
    status: string;
    scope: string[];
    risk: string | null;
    commitHash: string | null;
    tokenCount: number | null;
    createdAt: string;
    updatedAt: string;
    contract?: BuilderTaskContract;
  };
  chatPool: BuilderChatPoolEntry[];
  actions: BuilderObservedAction[];
  opusLogs: BuilderObservedLog[];
}

export type BuilderPatrolSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface BuilderPatrolStatus {
  totalFindings?: number;
  lastRound?: string | null;
  triaged?: number;
  crossConfirmed?: number;
  bySeverity?: Partial<Record<BuilderPatrolSeverity, number>>;
}

export interface BuilderPatrolFinding {
  id: string;
  title: string;
  category: string;
  severity: BuilderPatrolSeverity;
  tags?: string[];
  problem?: string | null;
  solution?: string | null;
  affectedFiles?: string[];
  foundBy?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
}

function toApiPath(path: string) {
  return `/api/builder${path}`;
}

function appendTokenQuery(path: string, token?: string | null, opusToken?: string | null) {
  const params: string[] = [];

  if (token && token.trim().length > 0) {
    params.push(`token=${encodeURIComponent(token)}`);
  }

  if (opusToken && opusToken.trim().length > 0) {
    params.push(`opus_token=${encodeURIComponent(opusToken)}`);
  }

  if (params.length === 0) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${params.join('&')}`;
}

function encodeFilePath(filePath: string) {
  return filePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function useBuilderApi(token: string | null, opusToken?: string | null) {
  const requestJson = useCallback(async <T>(
    path: string,
    init?: RequestInit,
    authOverride?: { token?: string | null; opusToken?: string | null; authorizationToken?: string | null; preferOpusOnly?: boolean },
  ): Promise<T> => {
    const requestToken = authOverride?.token ?? token ?? opusToken ?? null;
    const requestOpusToken = authOverride?.preferOpusOnly
      ? (authOverride?.opusToken ?? opusToken ?? null)
      : (authOverride?.opusToken ?? opusToken ?? requestToken);
    const authorizationToken = authOverride?.authorizationToken
      ?? (authOverride?.preferOpusOnly ? requestOpusToken : requestToken ?? requestOpusToken);

    if ((!requestToken || requestToken.trim().length === 0) && (!requestOpusToken || requestOpusToken.trim().length === 0)) {
      throw new Error('Builder token missing');
    }

    const response = await fetch(appendTokenQuery(toApiPath(path), requestToken, requestOpusToken), {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(authorizationToken ? { Authorization: `Bearer ${authorizationToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) as T | { error?: string } : null;

    if (!response.ok && response.status === 500 && window.location.hostname === 'localhost' && text.trim().length === 0) {
      throw new Error('Builder-Backend nicht erreichbar. Starte den Server mit "cd server" und "pnpm dev" auf Port 3001.');
    }

    if (!response.ok) {
      const message = parsed && typeof parsed === 'object' && 'error' in parsed
        ? parsed.error
        : `HTTP ${response.status}`;
      throw new Error(message || `HTTP ${response.status}`);
    }

    return parsed as T;
  }, [opusToken, token]);

  const listFiles = useCallback((path?: string) => {
    const query = path ? `?path=${encodeURIComponent(path)}` : '';
    return requestJson<string[]>(`/files${query}`);
  }, [requestJson]);

  const readFile = useCallback((filePath: string) => {
    return requestJson<BuilderFileContent>(`/files/${encodeFilePath(filePath)}`);
  }, [requestJson]);

  const getTasks = useCallback((status?: string) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return requestJson<BuilderTask[]>(`/tasks${query}`);
  }, [requestJson]);

  const createTask = useCallback((input: BuilderCreateTaskInput) => {
    return requestJson<BuilderTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }, [requestJson]);

  const getTask = useCallback((taskId: string) => {
    return requestJson<BuilderTask>(`/tasks/${encodeURIComponent(taskId)}`);
  }, [requestJson]);

  const runTask = useCallback((taskId: string) => {
    return requestJson<{ taskId: string; status: string }>(`/tasks/${encodeURIComponent(taskId)}/run`, {
      method: 'POST',
    });
  }, [requestJson]);

  const getDialog = useCallback((taskId: string, format: 'dsl' | 'text') => {
    const query = format === 'text' ? '?format=text' : '';
    return requestJson<BuilderAction[]>(`/tasks/${encodeURIComponent(taskId)}/dialog${query}`);
  }, [requestJson]);

  const getEvidence = useCallback((taskId: string) => {
    return requestJson<BuilderEvidencePack>(`/tasks/${encodeURIComponent(taskId)}/evidence`);
  }, [requestJson]);

  const getArtifacts = useCallback((taskId: string) => {
    return requestJson<BuilderArtifact[]>(`/tasks/${encodeURIComponent(taskId)}/artifacts`);
  }, [requestJson]);

  const getTaskObservation = useCallback((taskId: string) => {
    return requestJson<BuilderTaskObservation>(`/opus-bridge/observe/${encodeURIComponent(taskId)}`, undefined, {
      preferOpusOnly: true,
    });
  }, [requestJson]);

  const getPatrolStatus = useCallback(() => {
    return requestJson<BuilderPatrolStatus>('/opus-bridge/patrol-status', undefined, {
      preferOpusOnly: true,
    });
  }, [requestJson]);

  const getPatrolFindings = useCallback((limit = 100) => {
    return requestJson<{ count: number; findings: BuilderPatrolFinding[] }>(`/opus-bridge/patrol-findings?limit=${encodeURIComponent(String(limit))}`, undefined, {
      preferOpusOnly: true,
    });
  }, [requestJson]);

  const approveTask = useCallback((taskId: string, commitHash?: string) => {
    return requestJson<BuilderTask>(`/tasks/${encodeURIComponent(taskId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ commitHash }),
    });
  }, [requestJson]);

  const approvePrototype = useCallback((taskId: string, approved?: string[], exclude?: string[]) => {
    return requestJson<{ promoted: boolean; notes: string }>(`/tasks/${encodeURIComponent(taskId)}/approve-prototype`, {
      method: 'POST',
      body: JSON.stringify({ approved, exclude }),
    });
  }, [requestJson]);

  const revisePrototype = useCallback((taskId: string, notes?: string) => {
    return requestJson<{ status: string; notes: string }>(`/tasks/${encodeURIComponent(taskId)}/revise-prototype`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }, [requestJson]);

  const discardPrototype = useCallback((taskId: string) => {
    return requestJson<BuilderTask>(`/tasks/${encodeURIComponent(taskId)}/discard`, {
      method: 'POST',
    });
  }, [requestJson]);

  const revertTask = useCallback((taskId: string) => {
    return requestJson<BuilderTask>(`/tasks/${encodeURIComponent(taskId)}/revert`, {
      method: 'POST',
    });
  }, [requestJson]);

  const deleteTask = useCallback((taskId: string) => {
    return requestJson<{ deleted: boolean; taskId: string }>(`/tasks/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
    });
  }, [requestJson]);

  const sendChat = useCallback((message: string, history: BuilderChatMessage[] = []) => {
    return requestJson<BuilderChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
  }, [requestJson]);

  return {
    listFiles,
    readFile,
    getTasks,
    createTask,
    getTask,
    runTask,
    getDialog,
    getEvidence,
    getArtifacts,
    getTaskObservation,
    getPatrolStatus,
    getPatrolFindings,
    approveTask,
    approvePrototype,
    revisePrototype,
    discardPrototype,
    revertTask,
    deleteTask,
    sendChat,
  };
}
