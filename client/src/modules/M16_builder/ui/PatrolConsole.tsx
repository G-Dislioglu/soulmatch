import { useCallback, useEffect, useMemo, useState } from 'react';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface PatrolFinding {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  problem?: string;
  solution?: string;
  affectedFiles?: string[];
  tags?: string[];
  createdAt?: string;
  foundBy?: string;
}

interface PatrolStatus {
  totalFindings?: number;
  lastRound?: string;
  triaged?: number;
  crossConfirmed?: number;
  bySeverity?: Partial<Record<Severity, number>>;
}

const API = 'https://soulmatch-1.onrender.com/api/builder/opus-bridge';

const SEV_CONFIG: Record<Severity, { color: string; bg: string; icon: string; label: string }> = {
  critical: { color: '#ff3b5c', bg: '#ff3b5c18', icon: '⛔', label: 'Kritisch' },
  high: { color: '#ff8c42', bg: '#ff8c4218', icon: '🔴', label: 'Hoch' },
  medium: { color: '#ffd166', bg: '#ffd16618', icon: '🟡', label: 'Mittel' },
  low: { color: '#6ec6ff', bg: '#6ec6ff18', icon: '🔵', label: 'Niedrig' },
  info: { color: '#8b8fa3', bg: '#8b8fa318', icon: '⚪', label: 'Info' },
};

const CAT_LABELS: Record<string, string> = {
  'security-concern': 'Sicherheit',
  'missing-error-handli': 'Error Handling',
  'missing-validation': 'Validierung',
  'unused-import': 'Unused Import',
  'dead-code': 'Dead Code',
  'type-inconsistency': 'Type Fehler',
  'stale-comment': 'Veralteter Kommentar',
};

function timeAgo(iso?: string) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `vor ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs}h`;
  return `vor ${Math.floor(hrs / 24)}d`;
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEV_CONFIG[severity] || SEV_CONFIG.info;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}33`,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function StatCard({ label, value, accent, sub }: { label: string; value: string | number; accent?: string; sub?: string }) {
  return (
    <div
      style={{
        background: '#1a1b2e',
        borderRadius: 12,
        padding: '16px 20px',
        border: '1px solid #2a2b40',
        flex: '1 1 140px',
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 11, color: '#6b7084', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent || '#e2e4f0', fontFamily: 'DM Sans, sans-serif' }}>{value}</div>
      {sub ? <div style={{ fontSize: 11, color: '#6b7084', marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

function FindingCard(props: { finding: PatrolFinding; expanded: boolean; onToggle: () => void }) {
  const { finding, expanded, onToggle } = props;
  const cfg = SEV_CONFIG[finding.severity] || SEV_CONFIG.info;
  return (
    <div
      onClick={onToggle}
      style={{
        background: expanded ? '#1e1f35' : '#16172a',
        borderRadius: 10,
        padding: '14px 18px',
        border: `1px solid ${expanded ? `${cfg.color}44` : '#2a2b40'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <SeverityBadge severity={finding.severity} />
            <span style={{ fontSize: 10, color: '#6b7084', background: '#252640', padding: '2px 8px', borderRadius: 10 }}>
              {CAT_LABELS[finding.category] || finding.category}
            </span>
            {finding.tags?.includes('cross-confirmed') ? (
              <span style={{ fontSize: 10, color: '#7c6af7', background: '#7c6af718', padding: '2px 8px', borderRadius: 10 }}>✓ bestätigt</span>
            ) : null}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e4f0' }}>{finding.title}</div>
        </div>
        <div style={{ fontSize: 11, color: '#6b7084', whiteSpace: 'nowrap' }}>{timeAgo(finding.createdAt)}</div>
      </div>

      {expanded ? (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #2a2b40' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#6b7084', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Problem</div>
            <div style={{ fontSize: 13, color: '#c4c7d8', lineHeight: 1.5 }}>{finding.problem || '—'}</div>
          </div>
          {finding.solution ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#6b7084', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Lösung</div>
              <div style={{ fontSize: 13, color: '#a8e6cf', lineHeight: 1.5 }}>{finding.solution}</div>
            </div>
          ) : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(finding.affectedFiles || []).map((file, index) => (
              <span
                key={`${file}-${index}`}
                style={{
                  fontSize: 11,
                  color: '#7c6af7',
                  background: '#7c6af712',
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontFamily: 'DM Sans, monospace',
                }}
              >
                {file}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: '#4a4d60' }}>ID: {finding.id} · {finding.foundBy || 'unknown'}</div>
        </div>
      ) : null}
    </div>
  );
}

export function PatrolConsole() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = params.get('opus_token') || params.get('token') || 'opus-bridge-2026-geheim';
  const [status, setStatus] = useState<PatrolStatus | null>(null);
  const [findings, setFindings] = useState<PatrolFinding[]>([]);
  const [filter, setFilter] = useState<'all' | Severity>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const api = useCallback(async <T,>(endpoint: string, extraParams = ''): Promise<T> => {
    const response = await fetch(`${API}/${endpoint}?opus_token=${encodeURIComponent(token)}${extraParams}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
  }, [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextStatus, nextFindings] = await Promise.all([
        api<PatrolStatus>('patrol-status'),
        api<{ findings?: PatrolFinding[] } | PatrolFinding[]>('patrol-findings', '&limit=100'),
      ]);
      setStatus(nextStatus);
      setFindings(Array.isArray(nextFindings) ? nextFindings : nextFindings.findings || []);
    } catch (error) {
      console.error('Patrol load error:', error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = filter === 'all' ? findings : findings.filter((finding) => finding.severity === filter);
  const sev = status?.bySeverity || {};

  return (
    <div
      style={{
        fontFamily: 'DM Sans, system-ui, sans-serif',
        background: '#0f1021',
        color: '#e2e4f0',
        minHeight: '100vh',
        padding: '24px 20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              letterSpacing: -0.5,
              background: 'linear-gradient(135deg, #7c6af7, #ff8c42)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Scout Patrol Console
          </h1>
          <div style={{ fontSize: 12, color: '#6b7084', marginTop: 4 }}>
            {status ? `Letzte Runde: ${timeAgo(status.lastRound)} · ${status.triaged ?? 0} triaged · ${status.crossConfirmed ?? 0} bestätigt` : 'Laden...'}
          </div>
        </div>
        <button
          onClick={() => { void load(); }}
          disabled={loading}
          style={{
            background: '#7c6af7',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            opacity: loading ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? '⟳ Laden...' : '⟳ Refresh'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard label="Gesamt" value={status?.totalFindings || '—'} />
        <StatCard label="Kritisch" value={sev.critical || 0} accent="#ff3b5c" />
        <StatCard label="Hoch" value={sev.high || 0} accent="#ff8c42" />
        <StatCard label="Mittel" value={sev.medium || 0} accent="#ffd166" />
        <StatCard label="Niedrig" value={sev.low || 0} accent="#6ec6ff" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Alle', count: findings.length },
          { key: 'critical', label: 'Kritisch', count: sev.critical || 0 },
          { key: 'high', label: 'Hoch', count: sev.high || 0 },
          { key: 'medium', label: 'Mittel', count: sev.medium || 0 },
          { key: 'low', label: 'Niedrig', count: sev.low || 0 },
          { key: 'info', label: 'Info', count: sev.info || 0 },
        ].map((entry) => {
          const severity = entry.key as 'all' | Severity;
          const severityCfg = severity === 'all' ? null : SEV_CONFIG[severity];
          return (
            <button
              key={entry.key}
              onClick={() => setFilter(severity)}
              style={{
                background: filter === severity ? (severityCfg?.bg || '#7c6af722') : '#1a1b2e',
                color: filter === severity ? (severityCfg?.color || '#7c6af7') : '#6b7084',
                border: `1px solid ${filter === severity ? `${severityCfg?.color || '#7c6af7'}44` : '#2a2b40'}`,
                borderRadius: 20,
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {entry.label} ({entry.count})
            </button>
          );
        })}
      </div>

      <div>
        {loading && findings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7084' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⟳</div>
            Patrol-Daten werden geladen...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7084' }}>Keine Findings für diesen Filter.</div>
        ) : (
          filtered.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              expanded={expanded === finding.id}
              onToggle={() => setExpanded(expanded === finding.id ? null : finding.id)}
            />
          ))
        )}
      </div>

      <div style={{ marginTop: 24, padding: '16px 0', borderTop: '1px solid #1a1b2e', fontSize: 11, color: '#4a4d60', textAlign: 'center' }}>
        Scout Patrol v1.0 · {findings.length} findings geladen · {Object.keys(CAT_LABELS).length} Kategorien
      </div>
    </div>
  );
}