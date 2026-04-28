import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useBuilderApi,
  type BuilderPatrolDeepResult,
} from '../hooks/useBuilderApi';

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

type DeepResult = BuilderPatrolDeepResult;

interface PatrolModelSlot {
  role: string;
  model: string;
  color: string;
}

const AVAILABLE_MODELS = [
  'GLM-5-Turbo', 'GLM-5.1', 'GLM-5', 'GLM-4.7',
  'GPT-5.4', 'GPT-5-mini', 'GPT-5-nano',
  'Sonnet 4.6', 'Opus 4.6',
  'DeepSeek-R', 'DeepSeek Chat',
  'Kimi', 'Qwen', 'Minimax',
];

const DEEP_MODEL_TO_ID: Record<string, string> = {
  'GLM-5-Turbo': 'glm-5-turbo',
  'GLM-5.1': 'glm-5.1',
  'GPT-5.4': 'gpt-5.4',
  'Sonnet 4.6': 'sonnet-4.6',
  'DeepSeek-R': 'deepseek-r',
  Kimi: 'kimi',
};

const AVAILABLE_DEEP_MODELS = Object.keys(DEEP_MODEL_TO_ID);

const ROUTINE_SCOUT_SLOTS: PatrolModelSlot[] = [
  { role: 'SCOUT #1', model: 'GLM 4.7 FlashX', color: '#39ff14' },
  { role: 'SCOUT #2', model: 'DeepSeek Chat', color: '#39ff14' },
];

const DEEP_ANALYSIS_SLOTS: PatrolModelSlot[] = [
  { role: 'DEEP #1', model: 'GPT-5.4', color: '#00f0ff' },
  { role: 'DEEP #2', model: 'Sonnet 4.6', color: '#a78bfa' },
  { role: 'DEEP #3', model: 'DeepSeek-R', color: '#f97316' },
  { role: 'DEEP #4', model: 'Kimi', color: '#f472b6' },
  { role: 'DEEP #5', model: 'GLM-5.1', color: '#22d3ee' },
];

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

interface DeepResultCardProps {
  result: DeepResult;
}

function DeepResultCard({ result }: DeepResultCardProps) {
  return (
    <div
      style={{
        background: '#12132a',
        borderRadius: 8,
        padding: '10px 14px',
        border: '1px solid #7c6af733',
        marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#7c6af7' }}>{result.model || 'Model'}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#7c6af7',
            background: '#7c6af718',
            padding: '2px 8px',
            borderRadius: 10,
            textTransform: 'uppercase',
          }}
        >
          {result.scanned} Dateien
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#8b8fa3', lineHeight: 1.5 }}>
        <span>{result.found} Findings erkannt</span>
        <span>{result.inserted} neu gespeichert</span>
      </div>
    </div>
  );
}

interface PatrolModelCardProps {
  role: string;
  model: string;
  color: string;
  onChange: (value: string) => void;
}

function ModelSelect({ value, onChange, models }: {
  value: string;
  onChange: (v: string) => void;
  models: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen((current) => !current)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14, color: '#e2e4f0' }}>{value}</span>
        <span style={{ fontSize: 10, opacity: 0.5 }}>▼</span>
      </div>
      {open ? (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: -12,
            marginTop: 8,
            background: '#1a1a2e',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            padding: '4px 0',
            zIndex: 1000,
            minWidth: 180,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {models.map((entry) => (
            <div
              key={entry}
              onClick={() => {
                onChange(entry);
                setOpen(false);
              }}
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
                color: entry === value ? '#d4af37' : '#e2e4f0',
                background: entry === value ? 'rgba(212,175,55,0.1)' : 'transparent',
                fontWeight: entry === value ? 700 : 400,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = entry === value ? 'rgba(212,175,55,0.1)' : 'transparent';
              }}
            >
              {entry}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PatrolModelCard({
  role,
  model,
  color,
  onChange,
  models = AVAILABLE_MODELS,
  readOnly = false,
  sublabel,
}: PatrolModelCardProps & { models?: string[]; readOnly?: boolean; sublabel?: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}33`,
        borderRadius: 10,
        padding: '10px 16px',
        minWidth: 140,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{role}</div>
          <div style={{ marginTop: 4 }}>
            {readOnly ? (
              <div style={{ fontSize: 14, color: '#e2e4f0' }}>{model}</div>
            ) : (
              <ModelSelect value={model} onChange={onChange} models={models} />
            )}
          </div>
          {sublabel ? <div style={{ marginTop: 6, fontSize: 11, color: '#6b7084' }}>{sublabel}</div> : null}
        </div>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 12px ${color}66`, flexShrink: 0 }} />
      </div>
    </div>
  );
}

interface FindingCardProps {
  finding: PatrolFinding;
  expanded: boolean;
  onToggle: () => void;
  deepResult: DeepResult[] | null;
  deepError?: string | null;
  deepLoading: boolean;
  onDeepPatrol: () => void;
}

function FindingCard({ finding, expanded, onToggle, deepResult, deepError, deepLoading, onDeepPatrol }: FindingCardProps) {
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

          {/* Deep Patrol Section */}
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onDeepPatrol(); }}
              disabled={deepLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: deepLoading ? '#4a4d80' : '#7c6af7',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: deepLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {deepLoading ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>⟳</span>
                  Analyse läuft...
                </>
              ) : (
                '🔬 Deep Analyse'
              )}
            </button>
          </div>

          {/* Deep Patrol Results */}
          {deepError ? (
            <div style={{ marginTop: 10, fontSize: 12, color: '#ff8c42', lineHeight: 1.5 }}>
              {deepError}
            </div>
          ) : null}

          {deepResult && deepResult.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: '#7c6af7', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>🔬 Deep Patrol Ergebnisse</div>
              {deepResult.map((r, i) => (
                <DeepResultCard key={`${r.model}-${i}`} result={r} />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
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
  const token = (params.get('opus_token') || params.get('token') || '').trim();
  const hasToken = token.length > 0;
  const {
    getPatrolStatus,
    getPatrolFindings,
    triggerRoutinePatrol,
    triggerDeepPatrol,
  } = useBuilderApi(token || null, token || null);
  const [status, setStatus] = useState<PatrolStatus | null>(null);
  const [findings, setFindings] = useState<PatrolFinding[]>([]);
  const [filter, setFilter] = useState<'all' | Severity>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [deepResults, setDeepResults] = useState<Record<string, DeepResult[]>>({});
  const [deepErrors, setDeepErrors] = useState<Record<string, string>>({});
  const [deepLoading, setDeepLoading] = useState<Record<string, boolean>>({});
  const [deepModels, setDeepModels] = useState<Record<string, string>>(() =>
    Object.fromEntries(DEEP_ANALYSIS_SLOTS.map((slot) => [slot.role, slot.model])),
  );
  const [routineRunning, setRoutineRunning] = useState(false);
  const [routineMessage, setRoutineMessage] = useState<string | null>(null);
  const [routineError, setRoutineError] = useState<string | null>(null);

  const triggerDeep = useCallback(async (finding: PatrolFinding) => {
    if (!hasToken) {
      setDeepErrors((prev) => ({ ...prev, [finding.id]: 'Deep Patrol braucht einen gueltigen Opus-Token.' }));
      return;
    }

    const files = Array.from(new Set((finding.affectedFiles || []).map((file) => file.trim()).filter(Boolean)));
    if (files.length === 0) {
      setDeepResults((prev) => ({ ...prev, [finding.id]: [] }));
      setDeepErrors((prev) => ({ ...prev, [finding.id]: 'Deep Patrol kann fuer dieses Finding keine files[] ableiten, weil affectedFiles fehlen.' }));
      return;
    }

    const selectedModels = DEEP_ANALYSIS_SLOTS.map((slot) => deepModels[slot.role] ?? slot.model);
    const unsupportedModels = selectedModels.filter((model) => !DEEP_MODEL_TO_ID[model]);
    if (unsupportedModels.length > 0) {
      setDeepResults((prev) => ({ ...prev, [finding.id]: [] }));
      setDeepErrors((prev) => ({
        ...prev,
        [finding.id]: `Deep Patrol kennt fuer diese Auswahl keine serverseitigen model ids: ${unsupportedModels.join(', ')}.`,
      }));
      return;
    }

    const modelIds = Array.from(new Set(selectedModels.map((model) => DEEP_MODEL_TO_ID[model]).filter(Boolean)));
    setDeepLoading((prev) => ({ ...prev, [finding.id]: true }));
    setDeepErrors((prev) => {
      const next = { ...prev };
      delete next[finding.id];
      return next;
    });
    try {
      const data = await triggerDeepPatrol(modelIds, files);
      setDeepResults((prev) => ({ ...prev, [finding.id]: data.results || [] }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Deep Patrol fehlgeschlagen.';
      setDeepResults((prev) => ({ ...prev, [finding.id]: [] }));
      setDeepErrors((prev) => ({ ...prev, [finding.id]: message }));
    } finally {
      setDeepLoading((prev) => ({ ...prev, [finding.id]: false }));
    }
  }, [deepModels, hasToken, triggerDeepPatrol]);

  const load = useCallback(async () => {
    setLoading(true);
    setFeedError(null);
    try {
      const [nextStatus, nextFindings] = await Promise.all([
        getPatrolStatus(),
        getPatrolFindings(100),
      ]);
      setStatus(nextStatus);
      setFindings(nextFindings.findings || []);
    } catch (error) {
      console.error('Patrol load error:', error);
      setFeedError(error instanceof Error ? error.message : 'Patrol-Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [getPatrolFindings, getPatrolStatus]);

  const triggerRoutine = useCallback(async () => {
    if (!hasToken) {
      setRoutineError('Routine Patrol braucht einen gueltigen Opus-Token.');
      return;
    }

    setRoutineRunning(true);
    setRoutineError(null);
    setRoutineMessage(null);
    try {
      const result = await triggerRoutinePatrol();
      setRoutineMessage(
        `Routine Patrol fertig: ${result.scanned} Dateien gescannt, ${result.found} Findings erkannt, ${result.inserted} neu gespeichert, ${result.crossConfirmed} doppelt bestaetigt.`,
      );
      await load();
    } catch (error) {
      setRoutineError(error instanceof Error ? error.message : 'Routine Patrol konnte nicht gestartet werden.');
    } finally {
      setRoutineRunning(false);
    }
  }, [hasToken, load, triggerRoutinePatrol]);

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      return;
    }

    void load();
  }, [hasToken, load]);

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
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <a
            href="/builder"
            style={{ color: '#d4af37', textDecoration: 'none', fontSize: '0.8rem', display: 'inline-flex', marginBottom: 8 }}
          >
            ← Builder Studio
          </a>
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
            {!hasToken
              ? 'Opus-Token fehlt in der URL.'
              : status
                ? `Letzte Runde: ${timeAgo(status.lastRound)} · ${status.triaged ?? 0} triagiert · ${status.crossConfirmed ?? 0} bestaetigt`
                : 'Laden...'}
          </div>
        </div>
        <button
          onClick={() => { void load(); }}
          disabled={loading || !hasToken}
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

      {feedError ? (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid #ff8c4233',
            background: '#ff8c4212',
            color: '#ffb273',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          Patrol-Feed konnte nicht geladen werden: {feedError}
        </div>
      ) : null}

      <div style={{ margin: '20px 0 24px' }}>
        <div style={{ fontSize: 11, color: '#39ff14', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Routine Scouts</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {ROUTINE_SCOUT_SLOTS.map((slot) => (
            <PatrolModelCard
              key={slot.role}
              role={slot.role}
              model={slot.model}
              color={slot.color}
              onChange={() => {}}
              readOnly
              sublabel="Serverseitig fest verdrahteter Routine-Scout"
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
          <button
            onClick={() => { void triggerRoutine(); }}
            disabled={routineRunning || !hasToken}
            style={{
              background: routineRunning ? '#2b7c3a' : '#39ff14',
              color: '#07110a',
              border: 'none',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: routineRunning || !hasToken ? 'not-allowed' : 'pointer',
              opacity: routineRunning || !hasToken ? 0.6 : 1,
            }}
          >
            {routineRunning ? 'Routine Patrol laeuft...' : 'Routine Patrol starten'}
          </button>
          <span style={{ fontSize: 12, color: '#6b7084' }}>
            Nutzt den vorhandenen body-losen Server-Trigger. Keine freie Modellkonfiguration.
          </span>
        </div>
        {routineError ? <div style={{ marginTop: 8, fontSize: 12, color: '#ff8c42' }}>{routineError}</div> : null}
        {routineMessage ? <div style={{ marginTop: 8, fontSize: 12, color: '#9ee7a8', lineHeight: 1.5 }}>{routineMessage}</div> : null}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '14px 0 16px' }} />

        <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Deep Analysis</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {DEEP_ANALYSIS_SLOTS.map((slot) => (
            <PatrolModelCard
              key={slot.role}
              role={slot.role}
              model={deepModels[slot.role] ?? slot.model}
              color={slot.color}
              models={AVAILABLE_DEEP_MODELS}
              onChange={(value) => setDeepModels((current) => ({ ...current, [slot.role]: value }))}
            />
          ))}
        </div>
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
        {!hasToken ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7084' }}>
            Patrol braucht einen gueltigen Opus-Token in der URL. Oeffne die Konsole ueber Builder Studio.
          </div>
        ) : loading && findings.length === 0 ? (
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
              deepResult={deepResults[finding.id] ?? null}
              deepError={deepErrors[finding.id] ?? null}
              deepLoading={!!deepLoading[finding.id]}
              onDeepPatrol={() => void triggerDeep(finding)}
            />
          ))
        )}
      </div>

      <div style={{ marginTop: 24, padding: '16px 0', borderTop: '1px solid #1a1b2e', fontSize: 11, color: '#4a4d60', textAlign: 'center' }}>
        Scout Patrol v1.0 · {findings.length} Findings geladen · {Object.keys(CAT_LABELS).length} Kategorien
      </div>
    </div>
  );
}
