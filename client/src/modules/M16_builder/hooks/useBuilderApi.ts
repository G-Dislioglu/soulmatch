import { useCallback } from 'react';

export interface BuilderTask {
  id: string;
  title: string;
  goal: string;
  risk: string;
  taskType: string;
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

export interface BuilderFileContent {
  content: string;
  lines: number;
}

export interface BuilderCreateTaskInput {
  title: string;
  goal: string;
  risk?: string;
  taskType: string;
}

export interface BuilderEvidencePack {
  taskId: string;
  title: string;
  goal: string;
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
  agreement_level: string | null;
  final_status: string;
  false_success_detected: boolean;
  total_tokens: number;
  total_rounds: number;
  created_at: string;
}

function toApiPath(path: string) {
  return `/api/builder${path}`;
}

function encodeFilePath(filePath: string) {
  return filePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function useBuilderApi(token: string | null) {
  const requestJson = useCallback(async <T>(path: string, init?: RequestInit): Promise<T> => {
    if (!token || token.trim().length === 0) {
      throw new Error('Builder token missing');
    }

    const response = await fetch(toApiPath(path), {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) as T | { error?: string } : null;

    if (!response.ok) {
      const message = parsed && typeof parsed === 'object' && 'error' in parsed
        ? parsed.error
        : `HTTP ${response.status}`;
      throw new Error(message || `HTTP ${response.status}`);
    }

    return parsed as T;
  }, [token]);

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

  const revertTask = useCallback((taskId: string) => {
    return requestJson<BuilderTask>(`/tasks/${encodeURIComponent(taskId)}/revert`, {
      method: 'POST',
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
    approveTask,
    approvePrototype,
    revisePrototype,
    revertTask,
  };
}