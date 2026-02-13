import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '../../M02_ui-kit';
import { Button } from '../../M02_ui-kit';
import {
  fetchHealth,
  fetchLogs,
  setDevToken,
  getDevToken,
  reportClientError,
} from '../lib/devApi';
import type { HealthData, LogEntry } from '../lib/devApi';

interface DevPanelProps {
  onClose: () => void;
}

export function DevPanel({ onClose }: DevPanelProps) {
  const [tab, setTab] = useState<'health' | 'logs'>('health');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [authenticated, setAuthenticated] = useState(!!getDevToken());
  const [tokenInput, setTokenInput] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'health') {
        setHealth(await fetchHealth());
      } else {
        const res = await fetchLogs(100, levelFilter || undefined);
        setLogs(res.logs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [tab, levelFilter]);

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated, loadData]);

  // Auto-refresh every 10s
  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(loadData, 10_000);
    return () => clearInterval(interval);
  }, [authenticated, loadData]);

  // Install global error handler
  useEffect(() => {
    function handler(event: ErrorEvent) {
      reportClientError(event.message, event.error?.stack);
    }
    function rejectionHandler(event: PromiseRejectionEvent) {
      reportClientError(String(event.reason));
    }
    window.addEventListener('error', handler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    return () => {
      window.removeEventListener('error', handler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  async function handleAuth() {
    if (!tokenInput.trim()) return;
    setAuthError(null);
    setAuthLoading(true);
    setDevToken(tokenInput.trim());
    try {
      await fetchHealth();
      setAuthenticated(true);
      setTokenInput('');
    } catch {
      setAuthError('Falsches Passwort');
      setDevToken('');
      setAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  }

  function formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  const levelColor: Record<string, string> = {
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono bg-red-900/40 text-red-400 px-2 py-0.5 rounded">DEV</span>
            <h2 className="text-sm font-bold">Developer Console</h2>
          </div>
          <button onClick={onClose} className="text-[color:var(--muted-fg)] hover:text-[color:var(--fg)] text-lg">✕</button>
        </div>

        {!authenticated ? (
          <div className="p-6 flex flex-col items-center gap-4">
            <p className="text-sm text-[color:var(--muted-fg)]">Passwort eingeben:</p>
            {authError && (
              <div className="rounded bg-red-900/30 px-3 py-2 text-xs text-red-400">{authError}</div>
            )}
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => { setTokenInput(e.target.value); setAuthError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              className="w-64 rounded border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm font-mono text-[color:var(--fg)]"
              placeholder="Passwort..."
              autoFocus
            />
            <Button variant="primary" onClick={handleAuth} disabled={authLoading}>
              {authLoading ? 'Prüfe…' : 'Verbinden'}
            </Button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-[color:var(--border)] px-4">
              {(['health', 'logs'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    tab === t
                      ? 'border-[color:var(--ring)] text-[color:var(--fg)]'
                      : 'border-transparent text-[color:var(--muted-fg)] hover:text-[color:var(--fg)]'
                  }`}
                >
                  {t === 'health' ? '🏥 Health' : '📋 Logs'}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2 py-1">
                {loading && <span className="text-xs text-[color:var(--muted-fg)]">⟳</span>}
                <button onClick={loadData} className="text-xs text-[color:var(--muted-fg)] hover:text-[color:var(--fg)]">
                  Refresh
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {error && (
                <div className="mb-3 rounded bg-red-900/30 px-3 py-2 text-xs text-red-400">{error}</div>
              )}

              {tab === 'health' && health && (
                <div className="flex flex-col gap-4">
                  <Card>
                    <CardHeader><h3 className="text-sm font-semibold">Server</h3></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <span className="text-[color:var(--muted-fg)]">Uptime</span>
                        <span className="font-mono">{formatUptime(health.uptime)}</span>
                        <span className="text-[color:var(--muted-fg)]">Node</span>
                        <span className="font-mono">{health.nodeVersion}</span>
                        <span className="text-[color:var(--muted-fg)]">Memory</span>
                        <span className="font-mono">{health.memoryMB} MB</span>
                        <span className="text-[color:var(--muted-fg)]">Logs buffered</span>
                        <span className="font-mono">{health.totalLogs}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><h3 className="text-sm font-semibold">ENV Status</h3></CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-1">
                        {Object.entries(health.envStatus).map(([key, set]) => (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="font-mono">{key}</span>
                            <span className={set ? 'text-green-400' : 'text-red-400'}>
                              {set ? '✅ gesetzt' : '❌ fehlt'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><h3 className="text-sm font-semibold">Provider Stats</h3></CardHeader>
                    <CardContent>
                      {Object.keys(health.providerStats).length === 0 ? (
                        <p className="text-xs text-[color:var(--muted-fg)]">Noch keine Requests</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {Object.entries(health.providerStats).map(([name, stats]) => (
                            <div key={name} className="rounded border border-[color:var(--border)] p-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold">{name}</span>
                                <span className="text-xs font-mono">{stats.avgDurationMs}ms avg</span>
                              </div>
                              <div className="flex gap-3 text-xs">
                                <span className="text-green-400">{stats.successes} ✓</span>
                                <span className="text-red-400">{stats.failures} ✗</span>
                                <span className="text-[color:var(--muted-fg)]">{stats.requests} total</span>
                              </div>
                              {stats.lastError && (
                                <p className="mt-1 text-[10px] text-red-400 truncate">
                                  Last: {stats.lastError}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {tab === 'logs' && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 mb-2">
                    {['', 'error', 'warn', 'info'].map((l) => (
                      <button
                        key={l}
                        onClick={() => setLevelFilter(l)}
                        className={`px-2 py-1 text-[10px] rounded border ${
                          levelFilter === l
                            ? 'border-[color:var(--ring)] text-[color:var(--fg)]'
                            : 'border-[color:var(--border)] text-[color:var(--muted-fg)]'
                        }`}
                      >
                        {l || 'Alle'}
                      </button>
                    ))}
                  </div>

                  {logs.length === 0 ? (
                    <p className="text-xs text-[color:var(--muted-fg)]">Keine Logs</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="rounded border border-[color:var(--border)] px-2 py-1.5 text-[11px] font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[color:var(--muted-fg)]">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`font-bold uppercase ${levelColor[log.level] ?? ''}`}>
                              {log.level}
                            </span>
                            <span className="text-[color:var(--muted-fg)]">[{log.category}]</span>
                            <span className="text-[color:var(--fg)] truncate flex-1">{log.message}</span>
                          </div>
                          {log.meta && Object.keys(log.meta).length > 0 && (
                            <div className="mt-1 text-[10px] text-[color:var(--muted-fg)] break-all">
                              {JSON.stringify(log.meta)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
