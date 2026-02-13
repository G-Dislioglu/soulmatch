const API_BASE = '/api/dev';

let cachedToken: string | null = null;

export function setDevToken(token: string): void {
  cachedToken = token;
}

export function getDevToken(): string | null {
  return cachedToken;
}

async function devFetch<T>(path: string, options?: RequestInit): Promise<T> {
  if (!cachedToken) throw new Error('Dev token not set');
  const sep = path.includes('?') ? '&' : '?';
  const url = `${API_BASE}${path}${sep}token=${encodeURIComponent(cachedToken)}`;
  const resp = await fetch(url, options);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error((body as { error?: string }).error || `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface ProviderStats {
  requests: number;
  successes: number;
  failures: number;
  lastError?: string;
  lastErrorAt?: string;
  avgDurationMs: number;
}

export interface HealthData {
  uptime: number;
  startedAt: string;
  nodeVersion: string;
  memoryMB: number;
  envStatus: Record<string, boolean>;
  providerStats: Record<string, ProviderStats>;
  totalLogs: number;
  recentErrors: LogEntry[];
}

export function fetchHealth(): Promise<HealthData> {
  return devFetch<HealthData>('/health');
}

export function fetchLogs(
  limit = 50,
  level?: string,
  category?: string,
): Promise<{ logs: LogEntry[] }> {
  const params: string[] = [`limit=${limit}`];
  if (level) params.push(`level=${level}`);
  if (category) params.push(`category=${category}`);
  return devFetch<{ logs: LogEntry[] }>(`/logs?${params.join('&')}`);
}

export function reportClientError(message: string, stack?: string): void {
  if (!cachedToken) return;
  const body = { message, stack, url: window.location.href, userAgent: navigator.userAgent };
  fetch(`${API_BASE}/client-error?token=${encodeURIComponent(cachedToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => { /* silent */ });
}
