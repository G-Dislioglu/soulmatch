import { useCallback } from 'react';

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
  teamCoordination?: {
    summary: string;
  };
  timestamp: string;
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

  return { getContext, chat, directorChat, chatWithFile, executeAction, cancelTask, deleteTask, createMemory, updateMemory, deleteMemory, getTaskDialog, getTaskEvidence };
}
