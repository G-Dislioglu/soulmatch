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
  timestamp: string;
}

export interface MayaChatResponse {
  response: string;
  model: 'opus' | 'flash';
  contextUsed: { tasksLoaded: number; hasContinuity: boolean };
}

export interface MayaChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

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

  return { getContext, chat, executeAction, createMemory, updateMemory, deleteMemory };
}
