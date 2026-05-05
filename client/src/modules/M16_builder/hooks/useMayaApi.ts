import { useCallback } from 'react';

export type PoolType = 'maya' | 'council' | 'distiller' | 'worker' | 'scout';

export interface PoolState {
  maya: string[];
  council: string[];
  distiller: string[];
  worker: string[];
  scout: string[];
}

export interface MayaPoolModel {
  id: string;
  label: string;
  provider: string;
  model: string;
  quality: number;
  speed: 'slow' | 'medium' | 'fast';
  color: string;
  pools: PoolType[];
  visionCapable?: boolean;
  supportsMultiImage?: boolean;
  supportsWebResearch?: boolean;
  recommendedVisualRoles?: string[];
  experimental?: boolean;
}

export interface MayaPoolConfig {
  selectionMode: 'manual';
  autoSelectionAvailable: boolean;
  active: PoolState;
  available: Record<PoolType, string[]>;
  models: MayaPoolModel[];
}

export interface MayaContext {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    risk: string;
    taskType: string;
    updatedAt: string;
  }>;
  memory: { episodes: Array<{ id?: string; key: string; summary: string; updatedAt: string }> };
  continuityNotes: Array<{ id?: string; key: string; summary: string; updatedAt: string }>;
  workerStats: Array<{ worker: string; avg_quality: number; task_count: number }>;
  poolConfig: MayaPoolConfig;
  timestamp: string;
}

export type VisualReviewTaskType =
  | 'ui_review'
  | 'layout_drift'
  | 'ocr_and_label_check'
  | 'frontend_recreation_hint'
  | 'multi_state_review';

export interface VisualReviewFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  suggestedFix?: string;
  confidence?: number;
  screenshotRef?: string;
  regionHint?: string;
}

export interface VisualReviewModelResult {
  modelId: string;
  provider: string;
  model: string;
  summary: string;
  findings: VisualReviewFinding[];
  raw?: string;
  error?: string | null;
}

export interface VisualReviewRunResponse {
  success: boolean;
  taskId: string;
  reportArtifactId: string | null;
  taskType: VisualReviewTaskType;
  screenshotArtifactIds: string[];
  modelResults: VisualReviewModelResult[];
  mayaSynthesis: {
    modelId: string;
    provider: string;
    model: string;
    summary: string;
  };
}

export interface VisionModelScoreAggregate {
  modelId: string;
  runs: number;
  findingsEmitted: number;
  feedbackCount: number;
  confirmedCount: number;
  mixedCount: number;
  falsePositiveCount: number;
  avgUsefulness: number | null;
  score: number;
  taskTypes: string[];
  taskTypeScores: VisionModelTaskTypeScore[];
}

export interface VisionModelTaskTypeScore {
  taskType: string;
  runs: number;
  findingsEmitted: number;
  feedbackCount: number;
  confirmedCount: number;
  mixedCount: number;
  falsePositiveCount: number;
  avgUsefulness: number | null;
  score: number;
}

export interface VisionAutoPickModel {
  id: string;
  label: string;
  provider: string;
  model: string;
  quality: number;
  score: number | null;
  runs: number;
  feedbackCount: number;
  compositeScore: number;
  reason: string;
}

export interface VisionAutoPickResponse {
  success: boolean;
  taskType: VisualReviewTaskType;
  modelIds: string[];
  selected: VisionAutoPickModel[];
  scores: VisionModelScoreAggregate[];
}

export interface VisualCouncilModelResponse {
  modelId: string;
  provider: string;
  model: string;
  position: string;
  recommendations: string[];
  risks: string[];
  error?: string | null;
  raw?: string;
}

export interface VisualCouncilEscalationResponse {
  success: boolean;
  taskId: string;
  reportArtifactId: string;
  debateArtifactId: string | null;
  councilResults: VisualCouncilModelResponse[];
  mayaSynthesis: {
    modelId: string;
    provider: string;
    model: string;
    summary: string;
  };
}

export interface VisualFixTaskCreationResponse {
  success: boolean;
  sourceTaskId: string;
  reportArtifactId: string;
  createdCount: number;
  tasks: Array<{
    task: {
      id: string;
      title: string;
      status: string;
      risk: string;
      taskType: string;
    };
    goalState: {
      honesty: { status: 'stub_only'; summary: string };
      budget: { iterations: number; used: number; remaining: number; exhausted: boolean };
    };
  }>;
}

export interface MayaChatResponse {
  response: string;
  model: string;
  contextUsed: { tasksLoaded: number; hasContinuity: boolean };
  actions?: MayaActionResult[];
  taskId?: string | null;
  taskTitle?: string | null;
  isTask?: boolean;
}

export interface MayaActionResult {
  tool: string;
  ok: boolean;
  summary: string;
  data?: unknown;
}

export interface MayaChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type DirectorModel = 'opus' | 'gpt5.4' | 'glm5.1';

function buildUrl(path: string, token: string) {
  const sep = path.includes('?') ? '&' : '?';
  return `/api/builder${path}${sep}token=${encodeURIComponent(token)}&opus_token=${encodeURIComponent(token)}`;
}

export function useMayaApi(token: string | null) {
  const request = useCallback(async <T>(path: string, init?: RequestInit): Promise<T> => {
    if (!token) throw new Error('No token');
    const res = await fetch(buildUrl(path, token), {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }, [token]);

  const getContext = useCallback(() => request<MayaContext>('/maya/context'), [request]);
  const getPoolConfig = useCallback(() => request<MayaPoolConfig>('/maya/pools'), [request]);
  const getVisionModels = useCallback(() => request<{ models: MayaPoolModel[]; count: number }>('/maya/vision-models'), [request]);
  const getVisionScores = useCallback(() => request<{ scores: VisionModelScoreAggregate[]; count: number }>('/maya/vision-scores'), [request]);
  const autoPickVisionModels = useCallback((input: {
    taskType?: VisualReviewTaskType;
    limit?: number;
  }) =>
    request<VisionAutoPickResponse>('/visual-perception/auto-pick', {
      method: 'POST',
      body: JSON.stringify(input),
    }), [request]);
  const updatePools = useCallback((pools: PoolState) =>
    request<{ success: boolean; pools: PoolState; poolConfig: MayaPoolConfig }>('/maya/pools', {
      method: 'POST',
      body: JSON.stringify({ pools }),
    }), [request]);
  const runVisualPerception = useCallback((input: {
    taskId: string;
    artifactIds?: string[];
    modelIds: string[];
    taskType?: VisualReviewTaskType;
    prompt?: string;
  }) =>
    request<VisualReviewRunResponse>('/visual-perception/run', {
      method: 'POST',
      body: JSON.stringify(input),
    }), [request]);
  const submitVisualFeedback = useCallback((reportArtifactId: string, input: {
    modelId: string;
    verdict: 'confirmed' | 'mixed' | 'false_positive';
    usefulness?: number;
    notes?: string;
  }) =>
    request<{ success: boolean; feedbackArtifactId: string | null; reportArtifactId: string; modelId: string; verdict: string; usefulness: number }>(`/visual-perception/reports/${reportArtifactId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(input),
    }), [request]);
  const escalateVisualReportToCouncil = useCallback((reportArtifactId: string, input: {
    councilModelIds?: string[];
    prompt?: string;
    confirmed?: boolean;
  } = {}) =>
    request<VisualCouncilEscalationResponse>(`/visual-perception/reports/${reportArtifactId}/council`, {
      method: 'POST',
      body: JSON.stringify(input),
    }), [request]);
  const createVisualFixTasks = useCallback((reportArtifactId: string, input: {
    maxTasks?: number;
    severities?: Array<'critical' | 'high' | 'medium' | 'low'>;
  } = {}) =>
    request<VisualFixTaskCreationResponse>(`/visual-perception/reports/${reportArtifactId}/fix-tasks`, {
      method: 'POST',
      body: JSON.stringify(input),
    }), [request]);

  const chat = useCallback((message: string, history: MayaChatMessage[] = []) =>
    request<MayaChatResponse>('/maya/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }), [request]);

  const directorChat = useCallback((message: string, directorModel: DirectorModel, thinking: boolean, conversationHistory: MayaChatMessage[] = []) =>
    request<MayaChatResponse>('/maya/director', {
      method: 'POST',
      body: JSON.stringify({ message, directorModel, thinking, conversationHistory }),
    }), [request]);

  const createMemory = useCallback((layer: string, key: string, summary: string) =>
    request<{ success: boolean; data: unknown }>('/maya/memory', {
      method: 'POST',
      body: JSON.stringify({ layer, key, summary }),
    }), [request]);

  const updateMemory = useCallback((id: string, summary: string) =>
    request<{ success: boolean; data: unknown }>(`/maya/memory/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ summary }),
    }), [request]);

  const deleteMemory = useCallback((id: string) =>
    request<{ success: boolean }>(`/maya/memory/${id}`, { method: 'DELETE' }), [request]);

  const executeAction = useCallback((action: { endpoint: string; branch?: string; worker?: string; params?: Record<string, unknown> }, confirmed?: boolean) =>
    request<{ success: boolean; needsConfirmation?: boolean; endpoint: string; risk: string; result?: unknown; message?: string }>('/maya/action', {
      method: 'POST',
      body: JSON.stringify({ action, confirmed }),
    }), [request]);

  const getTaskDialog = useCallback((taskId: string) =>
    request<Array<{ id: string; taskId: string; actionType: string; createdAt: string; payload: unknown; text?: string }>>(`/tasks/${taskId}/dialog?format=text`), [request]);

  const getTaskEvidence = useCallback((taskId: string) =>
    request<Record<string, unknown>>(`/tasks/${taskId}/evidence`).catch(() => null), [request]);

  const chatWithFile = useCallback(async (message: string, fileBase64: string, fileMime: string, fileName: string, history: MayaChatMessage[] = []) => {
    return request<MayaChatResponse>('/maya/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history, file: { data: fileBase64, mime: fileMime, name: fileName } }),
    });
  }, [request]);

  const cancelTask = useCallback((taskId: string) =>
    request<{ success: boolean; result?: unknown }>('/maya/action', {
      method: 'POST',
      body: JSON.stringify({ action: { endpoint: `/override/${taskId}`, params: { action: 'cancel', reason: 'Cancelled via Maya UI' } }, confirmed: true }),
    }), [request]);

  const deleteTask = useCallback((taskId: string) =>
    request<{ deleted: boolean; taskId: string }>(`/tasks/${taskId}`, { method: 'DELETE' }), [request]);

  return {
    getContext,
    getPoolConfig,
    getVisionModels,
    getVisionScores,
    autoPickVisionModels,
    updatePools,
    runVisualPerception,
    submitVisualFeedback,
    escalateVisualReportToCouncil,
    createVisualFixTasks,
    chat,
    directorChat,
    chatWithFile,
    executeAction,
    cancelTask,
    deleteTask,
    createMemory,
    updateMemory,
    deleteMemory,
    getTaskDialog,
    getTaskEvidence,
  };
}
