import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';

import { CosmicTrail } from '../../M02_ui-kit/CosmicTrail';
import { TOKENS } from '../../../design/tokens';
import { useSpeechToText } from '../../../hooks/useSpeechToText';
import './maya-highlight.css';
import {
  BuilderConfigPanel,
  loadPools,
  savePools,
  syncPoolsToServer,
  type PoolState,
  type PoolType,
} from './BuilderConfigPanel';
import { useMayaApi, type DirectorModel, type MayaActionResult, type MayaContext } from '../hooks/useMayaApi';
import { useMayaFigureGuide } from '../hooks/useMayaFigureGuide';
import { useMayaTargetRegistry } from '../hooks/useMayaTargetRegistry';
import {
  useBuilderApi,
  type BuilderAction,
  type BuilderChatMessage,
  type BuilderChatPoolEntry,
  type BuilderCreateTaskInput,
  type BuilderEvidencePack,
  type BuilderPatrolFinding,
  type BuilderPatrolSeverity,
  type BuilderPatrolStatus,
  type BuilderTask,
} from '../hooks/useBuilderApi';
import { MayaFigure } from './MayaFigure';
import { PoolChatWindow } from './PoolChatWindow';

type DialogFormat = 'dsl' | 'text';

interface BuilderBubble {
  id: string;
  actor: string;
  role: string;
  lane: string;
  roundNumber: number;
  createdAt: string;
  content: string;
}

interface StudioChatMessage extends BuilderChatMessage {
  label?: string;
  endpoint?: string;
  actions?: MayaActionResult[];
}

interface DirectorLiveStatus {
  phase: 'thinking' | 'tool' | 'done' | 'error';
  tool?: string;
  message?: string;
}

interface ReadFilePreview {
  path: string;
  content: string;
}

type PoolChatType = 'scout' | 'distiller' | 'worker' | 'council';

interface OpenPoolChat {
  pool: PoolChatType;
  align: 'left' | 'right';
}

const STATUS_COLORS: Record<string, string> = {
  queued: TOKENS.text2,
  classifying: TOKENS.cyan,
  prototyping: TOKENS.purple,
  prototype_review: TOKENS.gold,
  planning: TOKENS.purple,
  reviewing: TOKENS.gold,
  counterexampling: TOKENS.rose,
  testing: TOKENS.green,
  push_candidate: TOKENS.green,
  blocked: '#ef4444',
  done: TOKENS.green,
  reverted: TOKENS.text3,
  discarded: TOKENS.rose,
};

const ACTOR_COLORS: Record<string, string> = {
  claude: TOKENS.gold,
  chatgpt: TOKENS.cyan,
  deepseek: TOKENS.green,
  system: TOKENS.rose,
};

const POOL_MODEL_META: Record<string, { label: string; quality: number }> = {
  opus: { label: 'Opus 4.6', quality: 95 },
  sonnet: { label: 'Sonnet 4.6', quality: 85 },
  'gpt-5.4': { label: 'GPT-5.4', quality: 88 },
  'glm-turbo': { label: 'GLM 5 Turbo', quality: 68 },
  glm51: { label: 'GLM 5.1', quality: 90 },
  grok: { label: 'Grok 4.1', quality: 80 },
  deepseek: { label: 'DeepSeek Chat', quality: 72 },
  minimax: { label: 'MiniMax M2.7', quality: 60 },
  kimi: { label: 'Kimi K2.5', quality: 65 },
  qwen: { label: 'Qwen 3.6+', quality: 58 },
  'glm-flash': { label: 'GLM FlashX', quality: 72 },
  'gemini-flash': { label: 'Gemini Flash', quality: 78 },
  'deepseek-scout': { label: 'DeepSeek Chat', quality: 70 },
  'qwen-scout': { label: 'Qwen 3.6+', quality: 55 },
};

const DIRECTOR_MODEL_META: Record<DirectorModel, { label: string }> = {
  opus: { label: 'Opus 4.6' },
  'gpt5.4': { label: 'GPT 5.4' },
  'glm5.1': { label: 'GLM 5.1' },
};

const POOL_OPTIONS: Record<PoolType, string[]> = {
  maya: ['opus', 'sonnet', 'gpt-5.4', 'glm-turbo', 'glm51', 'grok'],
  council: ['opus', 'sonnet', 'gpt-5.4', 'grok', 'deepseek', 'glm-turbo', 'glm51', 'minimax', 'kimi', 'qwen'],
  distiller: ['glm-flash', 'deepseek-scout', 'gemini-flash', 'qwen-scout'],
  worker: ['glm-turbo', 'glm51', 'minimax', 'kimi', 'qwen', 'deepseek'],
  scout: ['deepseek-scout', 'glm-flash', 'gemini-flash', 'qwen-scout'],
};

const POOL_LABELS: Record<PoolType, { label: string; accent: string }> = {
  maya: { label: 'Maya', accent: '#7c6af7' },
  council: { label: 'Council', accent: TOKENS.gold },
  distiller: { label: 'Destillierer', accent: '#f59e0b' },
  worker: { label: 'Worker', accent: TOKENS.cyan },
  scout: { label: 'Scout', accent: TOKENS.green },
};

const PATROL_SEVERITY_ORDER: Record<BuilderPatrolSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const PATROL_SEVERITY_CONFIG: Record<BuilderPatrolSeverity, { color: string; bg: string; icon: string; label: string }> = {
  critical: { color: '#ff3b5c', bg: '#ff3b5c18', icon: '⛔', label: 'Kritisch' },
  high: { color: '#ff8c42', bg: '#ff8c4218', icon: '🔴', label: 'Hoch' },
  medium: { color: '#ffd166', bg: '#ffd16618', icon: '🟡', label: 'Mittel' },
  low: { color: '#6ec6ff', bg: '#6ec6ff18', icon: '🔵', label: 'Niedrig' },
  info: { color: '#8b8fa3', bg: '#8b8fa318', icon: '⚪', label: 'Info' },
};

const PATROL_CATEGORY_LABELS: Record<string, string> = {
  'security-concern': 'Sicherheit',
  'missing-error-handli': 'Error Handling',
  'missing-validation': 'Validierung',
  'unused-import': 'Unused Import',
  'dead-code': 'Dead Code',
  'type-inconsistency': 'Type Fehler',
  'stale-comment': 'Veralteter Kommentar',
};

const BUILDER_TOKEN_STORAGE_KEY = 'builder_token';
const LEGACY_BUILDER_TOKEN_STORAGE_KEY = 'maya-token';
const OPUS_TOKEN_STORAGE_KEY = 'builder_opus_token';
const LEGACY_OPUS_TOKEN_STORAGE_KEY = 'opus-bridge-token';

function readStoredValue(keys: string[]) {
  try {
    for (const key of keys) {
      const value = localStorage.getItem(key)?.trim();
      if (value) {
        return value;
      }
    }
  } catch {
    return '';
  }

  return '';
}

function getInitialBuilderToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('builderToken') || params.get('token')
    || readStoredValue([BUILDER_TOKEN_STORAGE_KEY, LEGACY_BUILDER_TOKEN_STORAGE_KEY]);
}

function getInitialOpusToken() {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('opus_token');
  if (urlToken && urlToken.trim().length > 0) {
    return urlToken;
  }

  const storedBuilderToken = readStoredValue([BUILDER_TOKEN_STORAGE_KEY, LEGACY_BUILDER_TOKEN_STORAGE_KEY]);
  const storedOpusToken = readStoredValue([OPUS_TOKEN_STORAGE_KEY]);
  if (storedOpusToken) {
    return storedOpusToken;
  }

  const legacyOpusToken = readStoredValue([LEGACY_OPUS_TOKEN_STORAGE_KEY]);
  return legacyOpusToken && legacyOpusToken !== storedBuilderToken ? legacyOpusToken : '';
}

async function validateBuilderToken(token: string) {
  const response = await fetch(`/api/builder/maya/context?token=${encodeURIComponent(token)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 404) {
    throw new Error('Ungültiger Token');
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json() as { tasks?: unknown[] };
  return { canonicalExecutor: '/opus-task', tasks: payload.tasks };
}

function useViewportWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return width;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function maskToken(token: string) {
  if (token.length <= 6) {
    return '••••••';
  }

  return `${token.slice(0, 3)}…${token.slice(-2)}`;
}

function normalizePatrolSeverity(value: string | null | undefined): BuilderPatrolSeverity {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low' || value === 'info') {
    return value;
  }

  return 'info';
}

function shortenGuideLabel(value: string, maxLength = 48) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function extractNavigationDirective(content: string) {
  const matches = [...content.matchAll(/\[NAVIGATE:([^\]]+)\]/g)];
  const lastMatch = matches.length > 0 ? matches[matches.length - 1] : null;
  const targetId = lastMatch?.[1]?.trim() || null;
  const cleanContent = content.replace(/\s*\[NAVIGATE:[^\]]+\]/g, '').trim();

  return {
    targetId,
    cleanContent,
  };
}

function formatPatrolAffectedFiles(files: string[] | undefined) {
  const list = Array.isArray(files) ? files.filter(Boolean) : [];
  if (list.length === 0) {
    return 'Keine Dateien';
  }

  const visible = list.slice(0, 3);
  const hiddenCount = list.length - visible.length;
  return hiddenCount > 0 ? `${visible.join(', ')} +${hiddenCount} more` : visible.join(', ');
}

function sortPatrolFindings(findings: BuilderPatrolFinding[]) {
  return [...findings].sort((left, right) => {
    const severityDiff = PATROL_SEVERITY_ORDER[normalizePatrolSeverity(left.severity)] - PATROL_SEVERITY_ORDER[normalizePatrolSeverity(right.severity)];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
    const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
    return rightTime - leftTime;
  });
}

function toLines(text: string) {
  return text.split(/\r?\n/).filter(Boolean).slice(0, 18);
}

function parseTaskConfirmation(content: string) {
  try {
    const trimmed = content.trim();
    if (!trimmed.startsWith('{') || !trimmed.includes('"intent"')) {
      return null;
    }

    const parsed = JSON.parse(trimmed) as { intent?: string; title?: string; goal?: string };
    if (parsed.intent !== 'task') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function getDirectorLabel(model: DirectorModel, thinking: boolean) {
  const meta = DIRECTOR_MODEL_META[model];
  return `Maya (${meta.label} ${thinking ? 'Deep' : 'Fast'})`;
}

function getDirectorModeHint(thinking: boolean) {
  return thinking
    ? 'Deep: mehrstufige Analyse mit aktivem Toolpfad.'
    : 'Fast: kurzer Lauf, Tools bleiben aktiv fuer den direktesten Schritt.';
}

function getDirectorRunStatus(thinking: boolean, elapsedMs: number) {
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

  if (thinking) {
    if (elapsedSeconds < 4) {
      return `Deep scannt Kontext und Scope · ${elapsedSeconds}s`;
    }
    if (elapsedSeconds < 10) {
      return `Deep prueft Tasks, Memory und Toolweg · ${elapsedSeconds}s`;
    }
    if (elapsedSeconds < 18) {
      return `Deep baut den naechsten Builder-Schritt · ${elapsedSeconds}s`;
    }
    return `Deep verdichtet Antwort und Actions · ${elapsedSeconds}s`;
  }

  if (elapsedSeconds < 3) {
    return `Fast scannt den Auftrag · ${elapsedSeconds}s`;
  }
  if (elapsedSeconds < 7) {
    return `Fast waehlt den kuerzesten Toolweg · ${elapsedSeconds}s`;
  }
  return `Fast finalisiert Antwort und Actions · ${elapsedSeconds}s`;
}

function getDirectorStatusText(
  thinking: boolean,
  status: DirectorLiveStatus | null,
  elapsedMs: number | null,
) {
  if (!status) {
    return getDirectorModeHint(thinking);
  }

  if (status.phase === 'thinking') {
    return getDirectorRunStatus(thinking, elapsedMs ?? 0);
  }

  if (status.phase === 'tool') {
    return `ruft Tool: ${status.tool ?? 'read-file'}`;
  }

  if (status.phase === 'error') {
    return status.message ?? 'Fehler im Maya-Brain-Lauf.';
  }

  return status.tool ? `fertig · ${status.tool}` : 'fertig';
}

function getReadFilePreview(action: MayaActionResult): ReadFilePreview | null {
  if (action.tool !== 'read-file' || !action.data || typeof action.data !== 'object') {
    return null;
  }

  const candidate = action.data as { path?: unknown; content?: unknown };
  if (typeof candidate.path !== 'string' || typeof candidate.content !== 'string') {
    return null;
  }

  return {
    path: candidate.path,
    content: candidate.content.length > 3200
      ? `${candidate.content.slice(0, 3200)}\n\n...[Preview gekuerzt]`
      : candidate.content,
  };
}

function extractBubbleContent(action: BuilderAction, format: DialogFormat) {
  if (format === 'text') {
    return typeof action.text === 'string' && action.text.trim().length > 0
      ? action.text
      : typeof action.payload.rawResponse === 'string'
        ? action.payload.rawResponse
        : '';
  }

  return typeof action.payload.rawResponse === 'string'
    ? action.payload.rawResponse
    : JSON.stringify(action.payload, null, 2);
}

function groupDialog(actions: BuilderAction[], format: DialogFormat) {
  const seen = new Set<string>();
  const bubbles: BuilderBubble[] = [];

  for (const action of actions) {
    const content = extractBubbleContent(action, format).trim();
    if (!content) {
      continue;
    }

    const roundNumber = typeof action.payload.roundNumber === 'number' ? action.payload.roundNumber : 0;
    const role = typeof action.payload.role === 'string' ? action.payload.role : action.lane;
    const dedupeKey = `${roundNumber}:${action.actor}:${role}:${content}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    bubbles.push({
      id: dedupeKey,
      actor: action.actor,
      role,
      lane: action.lane,
      roundNumber,
      createdAt: action.createdAt,
      content,
    });
  }

  return bubbles;
}

function groupFiles(files: string[]) {
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const [head] = file.split('/');
    const group = head || 'root';
    const existing = groups.get(group) ?? [];
    existing.push(file);
    groups.set(group, existing);
  }

  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de'));
}

function BuilderPanel(props: { title: string; subtitle?: string; children: React.ReactNode; accent?: string; }) {
  const { title, subtitle, children, accent = TOKENS.gold } = props;

  return (
    <section
      style={{
        border: `1.5px solid ${TOKENS.b2}`,
        borderRadius: 22,
        background: TOKENS.card,
        boxShadow: TOKENS.shadow.card,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 18px 14px',
          borderBottom: `2px solid ${TOKENS.b1}`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        }}
      >
        <div style={{ fontSize: 11, color: accent, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: TOKENS.font.body }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ marginTop: 6, fontSize: 13, color: TOKENS.text2, lineHeight: 1.6, fontFamily: TOKENS.font.body }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </section>
  );
}

function poolScore(ids: string[]) {
  if (ids.length === 0) {
    return 0;
  }

  const scores = ids.map((id) => POOL_MODEL_META[id]?.quality ?? 0);
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function PoolBar(props: {
  pools: PoolState;
  openPool: PoolType | null;
  onTogglePool: (pool: PoolType) => void;
  onToggleModel: (pool: PoolType, modelId: string) => void;
  taskId: string | null;
  fetchObservation: (taskId: string) => Promise<import('../hooks/useBuilderApi').BuilderTaskObservation>;
}) {
  const { pools, openPool, onTogglePool, onToggleModel, taskId, fetchObservation } = props;
  const [openPoolChat, setOpenPoolChat] = useState<OpenPoolChat | null>(null);
  const chatAnchorsRef = useRef<Partial<Record<PoolChatType, HTMLDivElement | null>>>({});

  const getChatPopupAlign = useCallback((pool: PoolChatType) => {
    const node = chatAnchorsRef.current[pool];
    const popupWidth = Math.min(600, window.innerWidth - 32);

    if (!node) {
      return pool === 'scout' ? 'right' : 'left';
    }

    const rect = node.getBoundingClientRect();
    return rect.left + popupWidth > window.innerWidth - 16 ? 'right' : 'left';
  }, []);

  const handleTogglePoolChat = useCallback((pool: PoolChatType) => {
    setOpenPoolChat((current) => {
      if (current?.pool === pool) {
        return null;
      }

      return {
        pool,
        align: getChatPopupAlign(pool),
      };
    });
  }, [getChatPopupAlign]);

  useEffect(() => {
    if (!openPoolChat) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const anchor = chatAnchorsRef.current[openPoolChat.pool];
      if (anchor && anchor.contains(event.target as Node)) {
        return;
      }

      setOpenPoolChat(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPoolChat(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [openPoolChat]);

  const poolChatConfig: Record<PoolChatType, { title: string; accent: string; description: string; emptyStateText: string; filter: (entry: BuilderChatPoolEntry) => boolean }> = useMemo(() => ({
    scout: {
      title: 'Scout',
      accent: POOL_LABELS.scout.accent,
      description: 'Scout-Findings aus dem laufenden Chat-Pool.',
      emptyStateText: 'Noch keine Scout-Nachrichten fuer diese Task.',
      filter: (entry) => entry.phase === 'scout',
    },
    council: {
      title: 'Council',
      accent: POOL_LABELS.council.accent,
      description: 'Council-Debatte: Architekt, Skeptiker und Pragmatiker, moderiert von Maya.',
      emptyStateText: 'Noch keine Council-Nachrichten fuer diese Task.',
      filter: (entry) => entry.phase === 'roundtable' && !entry.actor.startsWith('worker-'),
    },
    distiller: {
      title: 'Destillierer',
      accent: POOL_LABELS.distiller.accent,
      description: 'Destillierte Briefs und Verdichtungen aus dem Chat-Pool.',
      emptyStateText: 'Noch keine Distiller-Nachrichten fuer diese Task.',
      filter: (entry) => entry.phase === 'distiller',
    },
    worker: {
      title: 'Worker',
      accent: POOL_LABELS.worker.accent,
      description: 'Worker-Debatten und Ausfuehrungsdiskussionen aus dem Chat-Pool.',
      emptyStateText: 'Noch keine Worker-Nachrichten fuer diese Task.',
      filter: (entry) => entry.phase === 'roundtable' && entry.actor.startsWith('worker-'),
    },
  }), []);

  return (
    <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
      <div style={{ border: `1.5px solid ${TOKENS.b2}`, borderRadius: 22, background: TOKENS.card, boxShadow: TOKENS.shadow.card, padding: '14px 16px' }}>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {(Object.keys(POOL_LABELS) as PoolType[]).map((pool) => {
            const meta = POOL_LABELS[pool];
            const activeIds = pools[pool];
            const leadId = activeIds[0];
            const leadLabel = leadId ? POOL_MODEL_META[leadId]?.label ?? leadId : 'leer';
            const score = poolScore(activeIds);
            const supportsChat = pool === 'scout' || pool === 'council' || pool === 'distiller' || pool === 'worker';
            const chatPool = supportsChat ? pool : null;
            const chatConfig = chatPool ? poolChatConfig[chatPool] : null;
            const isChatOpen = chatPool ? openPoolChat?.pool === chatPool : false;

            return (
              <div
                key={pool}
                data-maya-target={`pool.${pool}`}
                ref={(node) => {
                  if (chatPool) {
                    chatAnchorsRef.current[chatPool] = node;
                  }
                }}
                style={{ position: 'relative', display: 'grid', gap: 8 }}
              >
                <button
                  onClick={() => onTogglePool(pool)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: 18,
                    border: `1.5px solid ${openPool === pool ? meta.accent : TOKENS.b2}`,
                    background: openPool === pool ? `${meta.accent}16` : TOKENS.card2,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: meta.accent, fontWeight: 700 }}>{meta.label}</span>
                    <span style={{ fontSize: 12, color: score >= 80 ? TOKENS.green : score >= 60 ? TOKENS.gold : TOKENS.text2, fontFamily: 'monospace', fontWeight: 700 }}>{score}%</span>
                  </div>
                  <div style={{ fontSize: 13, color: TOKENS.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{leadLabel}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>{activeIds.length} aktiv</div>
                </button>
                {supportsChat && chatPool && chatConfig ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleTogglePoolChat(chatPool)}
                      title={`${chatConfig.title}-Live-Feed anzeigen`}
                      style={{
                        justifySelf: 'start',
                        borderRadius: 999,
                        border: `1px solid ${isChatOpen ? meta.accent : TOKENS.b1}`,
                        background: isChatOpen ? `${meta.accent}18` : 'rgba(255,255,255,0.03)',
                        color: isChatOpen ? meta.accent : TOKENS.text2,
                        padding: '5px 10px',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Live ▾
                    </button>
                    {isChatOpen ? (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          ...(openPoolChat?.align === 'right' ? { right: 0 } : { left: 0 }),
                          width: 'min(600px, calc(100vw - 32px))',
                          minHeight: 200,
                          display: 'grid',
                          zIndex: 50,
                        }}
                      >
                        <PoolChatWindow
                          title={chatConfig.title}
                          taskId={taskId}
                          accent={chatConfig.accent}
                          description={chatConfig.description}
                          emptyStateText={chatConfig.emptyStateText}
                          maxHeight={500}
                          filter={chatConfig.filter}
                          fetchObservation={fetchObservation}
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {openPool ? (
        <div style={{ border: `1.5px solid ${TOKENS.b2}`, borderRadius: 22, background: TOKENS.card, boxShadow: TOKENS.shadow.card, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: POOL_LABELS[openPool].accent, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>{POOL_LABELS[openPool].label}</div>
            <button onClick={() => onTogglePool(openPool)} style={{ border: 'none', background: 'transparent', color: TOKENS.text2, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {POOL_OPTIONS[openPool].map((modelId) => {
              const active = pools[openPool].includes(modelId);
              const model = POOL_MODEL_META[modelId];
              return (
                <button
                  key={modelId}
                  onClick={() => onToggleModel(openPool, modelId)}
                  style={{
                    borderRadius: 999,
                    border: `1.5px solid ${active ? `${POOL_LABELS[openPool].accent}88` : TOKENS.b2}`,
                    background: active ? `${POOL_LABELS[openPool].accent}18` : 'transparent',
                    color: active ? POOL_LABELS[openPool].accent : TOKENS.text2,
                    padding: '6px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                >
                  {model?.label ?? modelId}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ContextPanel(props: {
  ctx: MayaContext | null;
  onDeleteMemory: (id: string) => void;
  onAddNote: (summary: string) => void;
}) {
  const { ctx, onDeleteMemory, onAddNote } = props;
  const [showAdd, setShowAdd] = useState(false);
  const [newNote, setNewNote] = useState('');

  if (!ctx) {
    return <div style={{ fontSize: 12, color: TOKENS.text3 }}>Kein Maya-Kontext geladen.</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ borderRadius: 16, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Continuity Notes</div>
          <button onClick={() => setShowAdd((current) => !current)} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 999, border: `1px solid ${TOKENS.gold}40`, background: 'transparent', color: TOKENS.gold, cursor: 'pointer', fontWeight: 600 }}>+ Notiz</button>
        </div>
        {showAdd ? (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input
              value={newNote}
              onChange={(event) => setNewNote(event.target.value)}
              placeholder="Session-Notiz..."
              onKeyDown={(event) => {
                if (event.key === 'Enter' && newNote.trim()) {
                  onAddNote(newNote.trim());
                  setNewNote('');
                  setShowAdd(false);
                }
              }}
              style={{ flex: 1, background: TOKENS.bg, border: `1.5px solid ${TOKENS.b1}`, borderRadius: 10, padding: '6px 10px', color: TOKENS.text, fontSize: 11, outline: 'none' }}
            />
            <button onClick={() => {
              if (!newNote.trim()) {
                return;
              }
              onAddNote(newNote.trim());
              setNewNote('');
              setShowAdd(false);
            }} style={{ fontSize: 10, padding: '6px 12px', borderRadius: 10, border: 'none', background: TOKENS.gold, color: '#000', cursor: 'pointer', fontWeight: 600 }}>OK</button>
          </div>
        ) : null}
        <div style={{ display: 'grid', gap: 6 }}>
          {ctx.continuityNotes.map((note, index) => (
            <div key={note.id || index} style={{ display: 'flex', gap: 6, padding: '5px 0', fontSize: 11, color: TOKENS.text2, lineHeight: 1.5, borderBottom: `1px solid ${TOKENS.b3}` }}>
              <div style={{ flex: 1 }}>
                <span style={{ color: TOKENS.text3, fontFamily: 'monospace', fontSize: 9 }}>{formatDate(note.updatedAt)}</span>{' '}
                {note.summary}
              </div>
              {note.id ? <button onClick={() => onDeleteMemory(note.id!)} style={{ border: 'none', background: 'transparent', color: TOKENS.text3, cursor: 'pointer', fontSize: 10 }}>✕</button> : null}
            </div>
          ))}
          {ctx.continuityNotes.length === 0 ? <div style={{ fontSize: 11, color: TOKENS.text3, fontStyle: 'italic' }}>Keine Continuity Notes.</div> : null}
        </div>
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
        <div style={{ fontSize: 11, color: TOKENS.purple, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Memory Episodes</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {ctx.memory.episodes.slice(0, 6).map((entry, index) => (
            <div key={entry.id || index} style={{ borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: TOKENS.card2, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{entry.key}</span>
                <span style={{ fontSize: 10, color: TOKENS.text3, fontFamily: 'monospace' }}>{formatDate(entry.updatedAt)}</span>
              </div>
              <div style={{ fontSize: 12, color: TOKENS.text2, lineHeight: 1.5 }}>{entry.summary}</div>
            </div>
          ))}
          {ctx.memory.episodes.length === 0 ? <div style={{ fontSize: 11, color: TOKENS.text3, fontStyle: 'italic' }}>Keine Memory Episodes.</div> : null}
        </div>
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
        <div style={{ fontSize: 11, color: TOKENS.cyan, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>System Status</div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'monospace', color: TOKENS.text2, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: TOKENS.green, boxShadow: `0 0 8px ${TOKENS.green}60`, display: 'inline-block' }} />
            Render
          </span>
          <span style={{ border: `1px solid ${TOKENS.b3}`, borderRadius: 999, padding: '2px 8px' }}>{ctx.tasks.length} Tasks</span>
          <span style={{ border: `1px solid ${TOKENS.b3}`, borderRadius: 999, padding: '2px 8px' }}>{ctx.workerStats.length} Worker</span>
        </div>
        {ctx.teamCoordination?.summary ? (
          <div style={{ marginTop: 10, borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: TOKENS.card2, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: TOKENS.cyan, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Team Coordination</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.55, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
              {ctx.teamCoordination.summary}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BuilderAuthGate(props: {
  tokenInput: string;
  tokenVisible: boolean;
  loading: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const { tokenInput, tokenVisible, loading, error, onChange, onToggleVisibility, onSubmit, onBack } = props;

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.bg, color: TOKENS.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div
        style={{
          width: 'min(520px, 100%)',
          borderRadius: 24,
          border: `1.5px solid ${TOKENS.b1}`,
          background: TOKENS.card,
          boxShadow: TOKENS.shadow.dropdown,
          padding: 28,
        }}
      >
        <div style={{ fontFamily: TOKENS.font.display, fontSize: 28, color: TOKENS.text }}>Builder Studio</div>
        <div style={{ marginTop: 10, fontFamily: TOKENS.font.body, fontSize: 14, lineHeight: 1.7, color: TOKENS.text2 }}>
          Zugriff nur mit Builder-Token aus URL, vorhandenem Browser-Speicher oder Passwort-Dialog. Auf diesem Geraet gespeicherte Tokens koennen wiederverwendet werden.
        </div>
        {error ? (
          <div style={{ marginTop: 18, borderRadius: 14, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(127,29,29,0.32)', color: '#fecaca', padding: '12px 14px', fontSize: 13 }}>
            {error}
          </div>
        ) : null}
        <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              borderRadius: 14,
              border: `1.5px solid ${TOKENS.b1}`,
              background: TOKENS.bg2,
              overflow: 'hidden',
            }}
          >
            <input
              type={tokenVisible ? 'text' : 'password'}
              value={tokenInput}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSubmit();
                }
              }}
              placeholder="Builder-Token"
              autoFocus
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                color: TOKENS.text,
                padding: '14px 16px',
                fontSize: 14,
                fontFamily: TOKENS.font.body,
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={onToggleVisibility}
              aria-label={tokenVisible ? 'Token verbergen' : 'Token anzeigen'}
              title={tokenVisible ? 'Token verbergen' : 'Token anzeigen'}
              style={{
                minWidth: 52,
                border: 'none',
                borderLeft: `1px solid ${TOKENS.b1}`,
                background: 'rgba(255,255,255,0.03)',
                color: TOKENS.text2,
                cursor: 'pointer',
                fontSize: 18,
                transition: 'transform 0.18s ease, filter 0.18s ease, background 0.18s ease',
              }}
            >
              {tokenVisible ? '🙈' : '👁'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={onSubmit}
              disabled={loading || tokenInput.trim().length === 0}
              style={{
                borderRadius: 999,
                border: `1.5px solid ${TOKENS.gold}`,
                background: 'rgba(212,175,55,0.14)',
                color: TOKENS.text,
                padding: '11px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'progress' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'transform 0.18s ease, filter 0.18s ease, opacity 0.18s ease, background 0.18s ease',
              }}
              onMouseEnter={(event) => {
                if (loading || tokenInput.trim().length === 0) return;
                event.currentTarget.style.transform = 'scale(1.02)';
                event.currentTarget.style.filter = 'brightness(1.08)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = 'scale(1)';
                event.currentTarget.style.filter = 'brightness(1)';
              }}
              onMouseDown={(event) => {
                if (loading || tokenInput.trim().length === 0) return;
                event.currentTarget.style.transform = 'scale(0.97)';
              }}
              onMouseUp={(event) => {
                if (loading || tokenInput.trim().length === 0) return;
                event.currentTarget.style.transform = 'scale(1.02)';
              }}
            >
              {loading ? 'Verbinde...' : 'Verbinden'}
            </button>
            <button onClick={onBack} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.b1}`, background: 'transparent', color: TOKENS.text2, padding: '11px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Zurück
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BuilderStudioPage() {
  const [, navigate] = useLocation();
  const viewportWidth = useViewportWidth();
  const [token, setToken] = useState(() => getInitialBuilderToken());
  const [opusToken] = useState(() => getInitialOpusToken());
  const [tokenInput, setTokenInput] = useState(() => getInitialBuilderToken());
  const [tokenVisible, setTokenVisible] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<BuilderTask[]>([]);
  const [taskDetail, setTaskDetail] = useState<BuilderTask | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const [dialogFormat, setDialogFormat] = useState<DialogFormat>('dsl');
  const [dialogActions, setDialogActions] = useState<BuilderAction[]>([]);
  const [evidencePack, setEvidencePack] = useState<BuilderEvidencePack | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [chatMessages, setChatMessages] = useState<StudioChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLoadingStartedAt, setChatLoadingStartedAt] = useState<number | null>(null);
  const [chatLoadingTick, setChatLoadingTick] = useState(() => Date.now());
  const [directorLiveStatus, setDirectorLiveStatus] = useState<DirectorLiveStatus | null>(null);
  const [directorModel, setDirectorModel] = useState<DirectorModel | null>(null);
  const [directorThinking, setDirectorThinking] = useState(false);
  const [commitHash, setCommitHash] = useState('');
  const [draft, setDraft] = useState<BuilderCreateTaskInput>({
    title: '',
    goal: '',
    risk: 'low',
    taskType: 'A',
  });
  const builderRef = useRef<HTMLDivElement | null>(null);
  const registryState = useMayaTargetRegistry(builderRef);
  const targetRegistry = useMemo(() => ({
    targets: registryState.targets,
    getTargetRect: registryState.getTargetRect,
    refreshTargets: registryState.refreshTargets,
  }), [registryState.getTargetRect, registryState.refreshTargets, registryState.targets]);
  const refreshMayaTargets = registryState.refreshTargets;
  const {
    phase: mayaFigurePhase,
    figureRef: mayaFigureRef,
    bubbleText: mayaBubbleText,
    guideTo: guideMayaTo,
    clearGuide: clearMayaGuide,
    onPointerDown: handleMayaPointerDown,
    onPointerMove: handleMayaPointerMove,
    onPointerUp: handleMayaPointerUp,
    isFixedSupported: mayaFixedSupported,
  } = useMayaFigureGuide(targetRegistry);

  const {
    listFiles: listBuilderFiles,
    readFile: readBuilderFile,
    getTasks: getBuilderTasks,
    createTask: createBuilderTask,
    getTask: getBuilderTask,
    runTask: runBuilderTask,
    getDialog: getBuilderDialog,
    getEvidence: getBuilderEvidence,
    getTaskObservation,
    getPatrolStatus,
    getPatrolFindings,
    approveTask: approveBuilderTask,
    approvePrototype: approveBuilderPrototype,
    revisePrototype: reviseBuilderPrototype,
    discardPrototype: discardBuilderPrototype,
    revertTask: revertBuilderTask,
    deleteTask: deleteBuilderTask,
  } = useBuilderApi(token || null, opusToken || token || null);
  const { getContext: getMayaContext, createMemory, deleteMemory, chat: mayaChat, directorChat } = useMayaApi(token || null);
  const [showConfig, setShowConfig] = useState(false);
  const [mayaCtx, setMayaCtx] = useState<MayaContext | null>(null);
  const [pools, setPools] = useState<PoolState>(() => loadPools());
  const [openPool, setOpenPool] = useState<PoolType | null>(null);
  const [patrolOpen, setPatrolOpen] = useState(false);
  const [patrolLoading, setPatrolLoading] = useState(false);
  const [patrolError, setPatrolError] = useState<string | null>(null);
  const [patrolStatus, setPatrolStatus] = useState<BuilderPatrolStatus | null>(null);
  const [patrolFindings, setPatrolFindings] = useState<BuilderPatrolFinding[]>([]);
  const [expandedPatrolFindingId, setExpandedPatrolFindingId] = useState<string | null>(null);
  const groupedFiles = useMemo(() => groupFiles(files), [files]);
  const activeTask = useMemo(() => taskDetail ?? tasks.find((task) => task.id === selectedTaskId) ?? null, [taskDetail, tasks, selectedTaskId]);
  const dialogBubbles = useMemo(() => groupDialog(dialogActions, dialogFormat), [dialogActions, dialogFormat]);
  const compact = viewportWidth < 1180;
  const isPrototypeReview = activeTask?.status === 'prototype_review';
  const isRunDisabled = isBusy || !selectedTaskId || isPrototypeReview;
  const sessionSummary = mayaCtx?.continuityNotes?.[0]?.summary ?? null;
  const sortedPatrolFindings = useMemo(() => sortPatrolFindings(patrolFindings), [patrolFindings]);
  const effectiveOpusToken = opusToken.trim().length > 0 ? opusToken : null;
  const previewUrl = activeTask
    ? (() => {
        const params = new URLSearchParams({
          t: activeTask.updatedAt,
          token,
        });

        if (effectiveOpusToken) {
          params.set('opus_token', effectiveOpusToken);
        }

        return `/api/builder/preview/${encodeURIComponent(activeTask.id)}?${params.toString()}`;
      })()
    : null;
  const activeChatLabel = directorModel ? getDirectorLabel(directorModel, directorThinking) : 'Maya Standard';
  const activeChatEndpoint = directorModel ? '/api/builder/maya/director' : '/api/builder/maya/chat';
  const directorStatusText = directorModel
    ? getDirectorStatusText(
        directorThinking,
        directorLiveStatus,
        chatLoading && chatLoadingStartedAt !== null ? chatLoadingTick - chatLoadingStartedAt : null,
      )
    : null;
  const bootstrappedTokenRef = useRef<string | null>(null);
  const dialogFormatRef = useRef(dialogFormat);
  const confirmDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directorStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mayaTourTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const clearMayaTourTimers = useCallback(() => {
    mayaTourTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    mayaTourTimersRef.current = [];
  }, []);

  const handleStartMayaTour = useCallback(() => {
    clearMayaTourTimers();
    refreshMayaTargets();
    guideMayaTo('tasklist', 'Hier sind deine aktiven Tasks.');

    mayaTourTimersRef.current = [
      window.setTimeout(() => guideMayaTo('maya-chat', 'Gib mir hier deinen naechsten Auftrag.'), 4000),
      window.setTimeout(() => guideMayaTo('approve-button', 'Fertige Tasks hier freigeben.'), 8000),
      window.setTimeout(() => clearMayaGuide(), 12000),
    ];
  }, [clearMayaGuide, clearMayaTourTimers, guideMayaTo, refreshMayaTargets]);

  useEffect(() => {
    dialogFormatRef.current = dialogFormat;
  }, [dialogFormat]);

  useEffect(() => {
    return () => {
      clearMayaTourTimers();
    };
  }, [clearMayaTourTimers]);

  useEffect(() => {
    refreshMayaTargets();
  }, [compact, dialogBubbles.length, patrolOpen, refreshMayaTargets, selectedTaskId, showConfig, tasks.length]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatLoading, chatMessages]);

  useEffect(() => {
    if (!chatLoading) {
      return;
    }

    setChatLoadingTick(Date.now());
    const timer = window.setInterval(() => setChatLoadingTick(Date.now()), 800);
    return () => window.clearInterval(timer);
  }, [chatLoading]);

  useEffect(() => () => {
    if (confirmDeleteTimer.current) {
      clearTimeout(confirmDeleteTimer.current);
    }
    if (directorStatusTimerRef.current) {
      clearTimeout(directorStatusTimerRef.current);
    }
  }, []);

  useEffect(() => {
    setConfirmDelete(false);
    if (confirmDeleteTimer.current) {
      clearTimeout(confirmDeleteTimer.current);
      confirmDeleteTimer.current = null;
    }
  }, [selectedTaskId]);

  const refreshTasks = useCallback(async () => {
    const nextTasks = await getBuilderTasks();
    setTasks(nextTasks);
    setSelectedTaskId((current) => {
      if (current && nextTasks.some((task) => task.id === current)) {
        return current;
      }
      return nextTasks[0]?.id ?? null;
    });
  }, [getBuilderTasks]);

  const refreshFiles = useCallback(async () => {
    const nextFiles = await listBuilderFiles();
    setFiles(nextFiles);
    setSelectedFilePath((current) => current ?? nextFiles[0] ?? null);
  }, [listBuilderFiles]);

  const refreshTaskDetail = useCallback(async (taskId: string) => {
    const nextTask = await getBuilderTask(taskId);
    setTaskDetail(nextTask);
  }, [getBuilderTask]);

  const refreshDialog = useCallback(async (taskId: string, format: DialogFormat) => {
    const nextActions = await getBuilderDialog(taskId, format);
    setDialogActions(nextActions);
  }, [getBuilderDialog]);

  const refreshEvidence = useCallback(async (taskId: string) => {
    try {
      const nextEvidence = await getBuilderEvidence(taskId);
      setEvidencePack(nextEvidence);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/not found/i.test(message)) {
        setEvidencePack(null);
        return;
      }
      throw error;
    }
  }, [getBuilderEvidence]);

  const refreshMayaContext = useCallback(async () => {
    const nextContext = await getMayaContext();
    setMayaCtx(nextContext);
  }, [getMayaContext]);

  const refreshPatrolFeed = useCallback(async () => {
    setPatrolLoading(true);
    setPatrolError(null);
    try {
      const [nextStatus, nextFindings] = await Promise.all([
        getPatrolStatus(),
        getPatrolFindings(100),
      ]);
      setPatrolStatus(nextStatus);
      setPatrolFindings(Array.isArray(nextFindings.findings) ? nextFindings.findings : []);
    } catch (error) {
      setPatrolError(error instanceof Error ? error.message : 'Patrol-Findings konnten nicht geladen werden');
    } finally {
      setPatrolLoading(false);
    }
  }, [getPatrolFindings, getPatrolStatus]);

  useEffect(() => {
    const trimmedToken = token.trim();

    if (trimmedToken.length === 0) {
      bootstrappedTokenRef.current = null;
      setAuthenticated(false);
      setAuthLoading(false);
      return;
    }

    if (bootstrappedTokenRef.current === trimmedToken) {
      return;
    }

    bootstrappedTokenRef.current = trimmedToken;
    let cancelled = false;

    void (async () => {
      setAuthLoading(true);
      setAuthError(null);
      setPageError(null);
      try {
        await validateBuilderToken(trimmedToken);
        if (cancelled) {
          return;
        }
        setTasks([]);
        setFiles([]);
        setSelectedTaskId(null);
        setSelectedFilePath(null);
        setAuthenticated(true);
        try {
          localStorage.setItem(BUILDER_TOKEN_STORAGE_KEY, trimmedToken);
          localStorage.setItem(LEGACY_BUILDER_TOKEN_STORAGE_KEY, trimmedToken);
        } catch { /* noop */ }
        if (effectiveOpusToken) {
          try { localStorage.setItem(OPUS_TOKEN_STORAGE_KEY, effectiveOpusToken); } catch { /* noop */ }
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        bootstrappedTokenRef.current = null;
        setAuthenticated(false);
        const message = error instanceof Error ? error.message : 'Builder-Authentifizierung fehlgeschlagen';
        setAuthError(message === 'HTTP 401' ? 'Ungültiger Token' : message);
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveOpusToken, token]);

  // Initial load: fetch tasks and files once authenticated
  useEffect(() => {
    if (!authenticated) return;
    void refreshTasks().catch(() => {});
    void refreshFiles().catch(() => {});
    void refreshMayaContext().catch(() => {});
  }, [authenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authenticated || !patrolOpen) {
      return;
    }

    void refreshPatrolFeed();
  }, [authenticated, patrolOpen, refreshPatrolFeed]);

  useEffect(() => {
    if (!patrolOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPatrolOpen(false);
        setExpandedPatrolFindingId(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [patrolOpen]);

  useEffect(() => {
    if (!authenticated || !selectedTaskId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshTasks().catch((error) => {
        setPageError(error instanceof Error ? error.message : 'Tasks konnten nicht aktualisiert werden');
      });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [authenticated, selectedTaskId, refreshTasks]);

  useEffect(() => {
    if (!authenticated || !selectedTaskId) {
      return;
    }

    void refreshTaskDetail(selectedTaskId).catch((error) => {
      setPageError(error instanceof Error ? error.message : 'Task konnte nicht geladen werden');
    });
    void refreshDialog(selectedTaskId, dialogFormat).catch((error) => {
      setPageError(error instanceof Error ? error.message : 'Dialog konnte nicht geladen werden');
    });
    void refreshEvidence(selectedTaskId).catch((error) => {
      setPageError(error instanceof Error ? error.message : 'Evidence Pack konnte nicht geladen werden');
    });
  }, [authenticated, selectedTaskId, dialogFormat, refreshTaskDetail, refreshDialog, refreshEvidence]);

  useEffect(() => {
    if (!authenticated || !selectedTaskId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshDialog(selectedTaskId, dialogFormatRef.current).catch((error) => {
        setPageError(error instanceof Error ? error.message : 'Dialog konnte nicht aktualisiert werden');
      });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [authenticated, selectedTaskId, refreshDialog]);

  useEffect(() => {
    if (!authenticated || !selectedFilePath) {
      return;
    }

    void readBuilderFile(selectedFilePath)
      .then((file) => setSelectedFileContent(file.content))
      .catch((error) => {
        setSelectedFileContent('');
        setPageError(error instanceof Error ? error.message : 'Datei konnte nicht geladen werden');
      });
  }, [authenticated, readBuilderFile, selectedFilePath]);

  const handleAuthSubmit = useCallback(() => {
    setToken(tokenInput.trim());
  }, [tokenInput]);

  const handleTogglePool = useCallback((pool: PoolType) => {
    setOpenPool((current) => current === pool ? null : pool);
  }, []);

  const handleTogglePoolModel = useCallback((pool: PoolType, modelId: string) => {
    setPools((current) => {
      const isSingle = pool === 'maya';
      const nextIds = isSingle
        ? [modelId]
        : current[pool].includes(modelId)
          ? current[pool].filter((entry) => entry !== modelId)
          : [...current[pool], modelId];
      const nextPools = { ...current, [pool]: nextIds };
      savePools(nextPools);
      void syncPoolsToServer(token, nextPools);
      return nextPools;
    });
  }, [token]);

  const handleAddNote = useCallback(async (summary: string) => {
    await createMemory('continuity', `note-${Date.now()}`, summary);
    await refreshMayaContext();
  }, [createMemory, refreshMayaContext]);

  const handleDeleteMemory = useCallback(async (id: string) => {
    await deleteMemory(id);
    await refreshMayaContext();
  }, [deleteMemory, refreshMayaContext]);

  const handleCreateTask = useCallback(async () => {
    setIsBusy(true);
    setPageError(null);
    try {
      const created = await createBuilderTask(draft);
      setDraft({ title: '', goal: '', risk: draft.risk, taskType: draft.taskType });
      await refreshTasks();
      setSelectedTaskId(created.id);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Task konnte nicht erstellt werden');
    } finally {
      setIsBusy(false);
    }
  }, [createBuilderTask, draft, refreshTasks]);

  const handleRunTask = useCallback(async () => {
    if (!selectedTaskId) {
      return;
    }
    setIsBusy(true);
    setPageError(null);
    try {
      await runBuilderTask(selectedTaskId);
      await refreshTasks();
      await refreshTaskDetail(selectedTaskId);
      await refreshDialog(selectedTaskId, dialogFormat);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Task konnte nicht gestartet werden');
    } finally {
      setIsBusy(false);
    }
  }, [dialogFormat, refreshDialog, refreshTaskDetail, refreshTasks, runBuilderTask, selectedTaskId]);

  const handleApproveTask = useCallback(async () => {
    if (!selectedTaskId) {
      return;
    }
    setIsBusy(true);
    setPageError(null);
    try {
      await approveBuilderTask(selectedTaskId, commitHash || undefined);
      await refreshTasks();
      await refreshTaskDetail(selectedTaskId);
      await refreshEvidence(selectedTaskId);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Task konnte nicht freigegeben werden');
    } finally {
      setIsBusy(false);
    }
  }, [approveBuilderTask, commitHash, refreshEvidence, refreshTaskDetail, refreshTasks, selectedTaskId]);

  const handleApprovePrototype = useCallback(async () => {
    if (!selectedTaskId) {
      return;
    }

    setIsBusy(true);
    setPageError(null);
    try {
      await approveBuilderPrototype(selectedTaskId);
      await refreshTasks();
      await refreshTaskDetail(selectedTaskId);
      await refreshDialog(selectedTaskId, dialogFormat);
      await refreshEvidence(selectedTaskId);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Prototype konnte nicht freigegeben werden');
    } finally {
      setIsBusy(false);
    }
  }, [approveBuilderPrototype, dialogFormat, refreshDialog, refreshEvidence, refreshTaskDetail, refreshTasks, selectedTaskId]);

  const handleRevisePrototype = useCallback(async () => {
    if (!selectedTaskId) {
      return;
    }

    const notes = window.prompt('Revisionshinweis für den Prototype', 'Bitte Layout oder Flow überarbeiten.') ?? undefined;

    setIsBusy(true);
    setPageError(null);
    try {
      await reviseBuilderPrototype(selectedTaskId, notes);
      await refreshTasks();
      await refreshTaskDetail(selectedTaskId);
      await refreshDialog(selectedTaskId, dialogFormat);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Prototype konnte nicht zur Revision gesendet werden');
    } finally {
      setIsBusy(false);
    }
  }, [dialogFormat, refreshDialog, refreshTaskDetail, refreshTasks, reviseBuilderPrototype, selectedTaskId]);

  const handleRevertTask = useCallback(async () => {
    if (!selectedTaskId) {
      return;
    }
    setIsBusy(true);
    setPageError(null);
    try {
      if (isPrototypeReview) {
        await discardBuilderPrototype(selectedTaskId);
      } else {
        await revertBuilderTask(selectedTaskId);
      }
      await refreshTasks();
      await refreshTaskDetail(selectedTaskId);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : isPrototypeReview ? 'Prototype konnte nicht verworfen werden' : 'Task konnte nicht revertiert werden');
    } finally {
      setIsBusy(false);
    }
  }, [discardBuilderPrototype, isPrototypeReview, refreshTaskDetail, refreshTasks, revertBuilderTask, selectedTaskId]);

  const handleDeleteTask = useCallback(async () => {
    if (!selectedTaskId) {
      return;
    }

    if (!confirmDelete) {
      setConfirmDelete(true);
      if (confirmDeleteTimer.current) {
        clearTimeout(confirmDeleteTimer.current);
      }
      confirmDeleteTimer.current = setTimeout(() => {
        setConfirmDelete(false);
        confirmDeleteTimer.current = null;
      }, 3000);
      return;
    }

    if (confirmDeleteTimer.current) {
      clearTimeout(confirmDeleteTimer.current);
      confirmDeleteTimer.current = null;
    }

    setConfirmDelete(false);
    setIsBusy(true);
    setPageError(null);
    try {
      await deleteBuilderTask(selectedTaskId);
      setSelectedTaskId(null);
      setTaskDetail(null);
      setDialogActions([]);
      setEvidencePack(null);
      await refreshTasks();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Task konnte nicht gelöscht werden');
    } finally {
      setIsBusy(false);
    }
  }, [confirmDelete, deleteBuilderTask, refreshTasks, selectedTaskId]);

  const handleCancelTask = useCallback(async (taskId: string) => {
    setIsBusy(true);
    setPageError(null);
    try {
      if (!effectiveOpusToken) {
        throw new Error('Opus token missing');
      }

      const response = await fetch(`/api/builder/opus-bridge/override/${encodeURIComponent(taskId)}?opus_token=${encodeURIComponent(effectiveOpusToken)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveOpusToken}`,
        },
        body: JSON.stringify({ action: 'cancel', reason: 'Manually cancelled via UI' }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }

      await refreshTasks();
      await refreshTaskDetail(taskId);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Task konnte nicht abgebrochen werden');
    } finally {
      setIsBusy(false);
    }
  }, [effectiveOpusToken, refreshTaskDetail, refreshTasks]);

  const handleDeleteInline = useCallback(async (taskId: string) => {
    setIsBusy(true);
    setPageError(null);
    try {
      await deleteBuilderTask(taskId);
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
        setTaskDetail(null);
        setDialogActions([]);
        setEvidencePack(null);
      }
      await refreshTasks();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Task konnte nicht gelöscht werden');
    } finally {
      setIsBusy(false);
    }
  }, [deleteBuilderTask, refreshTasks, selectedTaskId]);

  const sendMayaMessage = useCallback(async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || chatLoading) {
      return;
    }

    const history: BuilderChatMessage[] = chatMessages.map((entry) => ({ role: entry.role, content: entry.content }));
    const userMessage: StudioChatMessage = { role: 'user', content: message };
    setChatMessages((current) => [...current, userMessage]);
    setChatInput('');
    setChatLoadingStartedAt(Date.now());
    setChatLoadingTick(Date.now());
    if (directorStatusTimerRef.current) {
      clearTimeout(directorStatusTimerRef.current);
      directorStatusTimerRef.current = null;
    }
    if (directorModel) {
      setDirectorLiveStatus({ phase: 'thinking' });
    }
    setChatLoading(true);
    setPageError(null);

    try {
      if (directorModel) {
        const response = await directorChat(message, directorModel, directorThinking, history);
        const { targetId, cleanContent } = extractNavigationDirective(response.response);
        const finalContent = cleanContent || 'Ich zeige es dir direkt.';
        const assistantMessage: StudioChatMessage = {
          role: 'assistant',
          content: finalContent,
          label: getDirectorLabel(directorModel, directorThinking),
          endpoint: '/api/builder/maya/director',
          actions: response.actions ?? [],
        };
        setChatMessages((current) => [...current, assistantMessage]);
        if (targetId) {
          refreshMayaTargets();
          guideMayaTo(targetId, shortenGuideLabel(finalContent, 120));
        }
        const firstTool = response.actions?.find((action) => action.ok)?.tool ?? response.actions?.[0]?.tool;
        if (firstTool) {
          setDirectorLiveStatus({ phase: 'tool', tool: firstTool });
          directorStatusTimerRef.current = window.setTimeout(() => {
            setDirectorLiveStatus({ phase: 'done', tool: firstTool });
            directorStatusTimerRef.current = null;
          }, 900);
        } else {
          setDirectorLiveStatus({ phase: 'done' });
        }
        await refreshMayaContext();
      } else {
        const response = await mayaChat(message, history);
        const { targetId, cleanContent } = extractNavigationDirective(response.response);
        const finalContent = cleanContent || 'Ich zeige es dir direkt.';
        const assistantMessage: StudioChatMessage = {
          role: 'assistant',
          content: finalContent,
          label: 'Maya Standard',
          endpoint: '/api/builder/maya/chat',
        };
        setChatMessages((current) => [...current, assistantMessage]);

        if (response.taskId) {
          await refreshTasks();
          setSelectedTaskId(response.taskId);
        }

        if (targetId) {
          refreshMayaTargets();
          guideMayaTo(targetId, shortenGuideLabel(finalContent, 120));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler bei der Verbindung.';
      if (directorModel) {
        setDirectorLiveStatus({ phase: 'error', message: errorMessage });
      }
      setChatMessages((current) => [...current, {
        role: 'assistant',
        content: errorMessage,
        label: activeChatLabel,
        endpoint: activeChatEndpoint,
      }]);
    } finally {
      setChatLoading(false);
      setChatLoadingStartedAt(null);
      window.setTimeout(() => {
        const el = chatContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, 100);
    }
  }, [activeChatEndpoint, activeChatLabel, chatLoading, chatMessages, directorChat, directorModel, directorThinking, guideMayaTo, mayaChat, refreshMayaContext, refreshMayaTargets, refreshTasks]);

  const speech = useSpeechToText('de', (text) => {
    void sendMayaMessage(text);
  });

  const handleMicClick = useCallback(() => {
    if (!speech.isSupported) {
      return;
    }

    if (!speech.hasConsent) {
      speech.grantConsent();
    }

    if (speech.isListening) {
      speech.stopListening();
      return;
    }

    speech.resetTranscript();
    speech.startListening();
  }, [speech]);

  const handleSendChat = useCallback(async () => {
    void sendMayaMessage(chatInput);
  }, [chatInput, sendMayaMessage]);

  if (!authenticated) {
    return (
      <BuilderAuthGate
        tokenInput={tokenInput}
        tokenVisible={tokenVisible}
        loading={authLoading}
        error={authError}
        onChange={setTokenInput}
        onToggleVisibility={() => setTokenVisible((current) => !current)}
        onSubmit={handleAuthSubmit}
        onBack={() => navigate('/')}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(circle at top, rgba(34,211,238,0.08), transparent 32%), ${TOKENS.bg}`, color: TOKENS.text }}>
      <div ref={builderRef} style={{ position: 'relative', maxWidth: 1680, margin: '0 auto', padding: compact ? '18px 16px 28px' : '22px 22px 32px' }}>
        <div
          data-maya-target="maya-idle"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: compact ? 20 : 26,
            right: compact ? 18 : 24,
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
        <header
          style={{
            border: `1.5px solid ${TOKENS.b2}`,
            borderRadius: 24,
            background: TOKENS.card,
            boxShadow: TOKENS.shadow.card,
            padding: compact ? 18 : 22,
            marginBottom: 18,
          }}
        >
          <CosmicTrail intensity={64} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, color: TOKENS.text2, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: TOKENS.font.body }}>
              Builder Control Surface
            </div>
            <div style={{ marginTop: 8, fontFamily: TOKENS.font.display, fontSize: compact ? 28 : 34, color: TOKENS.text, letterSpacing: '0.05em' }}>
              Builder Studio
            </div>
            <div style={{ marginTop: 8, fontFamily: TOKENS.font.body, fontSize: 13, lineHeight: 1.7, color: TOKENS.text2, maxWidth: 760 }}>
              Task-Orchestrierung, Dialog-Review und Evidence Packs in einer operativen Oberfläche.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => navigate('/')} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.b1}`, background: 'transparent', color: TOKENS.text2, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Zur App
              </button>
              <button onClick={() => { void refreshTasks(); void refreshFiles(); void refreshMayaContext().catch(() => {}); if (patrolOpen) { void refreshPatrolFeed(); } }} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.14)', color: TOKENS.text, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Refresh
              </button>
              <button onClick={handleStartMayaTour} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(124,106,247,0.14)', color: TOKENS.text, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                🧭 Maya Tour
              </button>
              <button onClick={() => setShowConfig(!showConfig)} style={{ borderRadius: 999, border: `1.5px solid ${showConfig ? '#7c6af7' : TOKENS.b1}`, background: showConfig ? 'rgba(124,106,247,0.14)' : 'transparent', color: showConfig ? '#7c6af7' : TOKENS.text2, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {showConfig ? 'Config ✕' : 'Config'}
              </button>
              <a
                data-maya-target="patrol-console"
                href="/patrol?opus_token=opus-bridge-2026-geheim"
                style={{
                  borderRadius: 999,
                  border: '1.5px solid #f97316',
                  background: 'rgba(249,115,22,0.14)',
                  color: '#f97316',
                  textDecoration: 'none',
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🛡️ Patrol Console
              </a>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', color: TOKENS.text2, fontSize: 12 }}>
              <span>Token {maskToken(token)}</span>
              <span>{tasks.length} Tasks</span>
              <span>{files.length} Files</span>
            </div>
          </div>
        </header>

        {pageError ? (
          <div style={{ marginBottom: 16, borderRadius: 16, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(127,29,29,0.24)', color: '#fecaca', padding: '12px 14px', fontSize: 13 }}>
            {pageError}
          </div>
        ) : null}

        <PoolBar
          pools={pools}
          openPool={openPool}
          onTogglePool={handleTogglePool}
          onToggleModel={handleTogglePoolModel}
          taskId={selectedTaskId}
          fetchObservation={getTaskObservation}
        />

        {sessionSummary ? (
          <div style={{ marginBottom: 18, display: 'grid', gap: 10 }}>
            <button
              data-maya-target="session"
              type="button"
              onClick={() => {
                setPatrolOpen((current) => {
                  const next = !current;
                  if (!next) {
                    setExpandedPatrolFindingId(null);
                  }
                  return next;
                });
              }}
              title="Patrol-Findings ein- oder ausklappen"
              style={{
                width: '100%',
                border: `1.5px solid rgba(212,175,55,0.28)`,
                borderRadius: 18,
                background: 'rgba(212,175,55,0.12)',
                boxShadow: TOKENS.shadow.card,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 12, color: TOKENS.gold, fontWeight: 700, width: 16, flexShrink: 0 }}>{patrolOpen ? '▾' : '▸'}</span>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: TOKENS.gold, whiteSpace: 'nowrap', borderRadius: 999, border: `1px solid ${TOKENS.gold}40`, padding: '2px 8px' }}>Session</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: TOKENS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sessionSummary}</span>
            </button>

            {patrolOpen ? (
              <div style={{ borderRadius: 20, border: `1.5px solid ${TOKENS.b2}`, background: TOKENS.card, boxShadow: TOKENS.shadow.card, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ fontSize: 11, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Patrol Findings</div>
                    <div style={{ fontSize: 12, color: TOKENS.text2 }}>
                      {patrolStatus
                        ? `${patrolStatus.totalFindings ?? 0} Findings · ${patrolStatus.crossConfirmed ?? 0} cross-confirmed · ${patrolStatus.triaged ?? 0} triaged`
                        : 'Patrol-Status wird geladen...'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {(Object.keys(PATROL_SEVERITY_CONFIG) as BuilderPatrolSeverity[]).map((severity) => {
                      const config = PATROL_SEVERITY_CONFIG[severity];
                      return (
                        <span
                          key={severity}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            borderRadius: 999,
                            border: `1px solid ${config.color}33`,
                            background: config.bg,
                            color: config.color,
                            padding: '3px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          <span>{config.icon}</span>
                          <span>{patrolStatus?.bySeverity?.[severity] ?? 0}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div style={{ maxHeight: 400, overflowY: 'auto', display: 'grid', gap: 10, paddingRight: 2 }}>
                  {patrolLoading ? (
                    <div style={{ borderRadius: 16, border: `1px dashed ${TOKENS.b2}`, background: 'rgba(255,255,255,0.02)', padding: '14px 12px', fontSize: 12, color: TOKENS.text2 }}>
                      Patrol-Findings werden geladen...
                    </div>
                  ) : patrolError ? (
                    <div style={{ borderRadius: 16, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(127,29,29,0.24)', color: '#fecaca', padding: '14px 12px', fontSize: 12 }}>
                      {patrolError}
                    </div>
                  ) : sortedPatrolFindings.length === 0 ? (
                    <div style={{ borderRadius: 16, border: `1px dashed ${TOKENS.b2}`, background: 'rgba(255,255,255,0.02)', padding: '14px 12px', fontSize: 12, color: TOKENS.text2 }}>
                      Keine Patrol-Findings vorhanden.
                    </div>
                  ) : (
                    sortedPatrolFindings.map((finding) => {
                      const severity = normalizePatrolSeverity(finding.severity);
                      const config = PATROL_SEVERITY_CONFIG[severity];
                      const expanded = expandedPatrolFindingId === finding.id;
                      const categoryLabel = PATROL_CATEGORY_LABELS[finding.category] ?? finding.category;
                      const hasDetails = Boolean(finding.problem || finding.solution);

                      return (
                        <article key={finding.id} style={{ borderRadius: 16, border: `1px solid ${TOKENS.b2}`, background: TOKENS.card2, overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => setExpandedPatrolFindingId((current) => current === finding.id ? null : finding.id)}
                            style={{
                              width: '100%',
                              border: 'none',
                              background: 'transparent',
                              color: TOKENS.text,
                              cursor: 'pointer',
                              padding: '12px 14px',
                              display: 'grid',
                              gridTemplateColumns: compact ? '1fr' : '148px minmax(0, 1fr) minmax(0, 220px)',
                              gap: 10,
                              alignItems: 'center',
                              textAlign: 'left',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: config.color, background: config.bg, border: `1px solid ${config.color}33`, textTransform: 'uppercase' }}>
                                <span>{config.icon}</span>
                                <span>{config.label}</span>
                              </span>
                              <span style={{ fontSize: 11, color: TOKENS.text3 }}>{expanded ? '▾' : '▸'}</span>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{finding.title}</div>
                              <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: TOKENS.text2 }}>{categoryLabel}</span>
                                <span style={{ fontSize: 11, color: TOKENS.text3 }}>{formatDate(finding.createdAt ?? null)}</span>
                              </div>
                            </div>
                            <div style={{ minWidth: 0, fontSize: 11, color: TOKENS.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {formatPatrolAffectedFiles(finding.affectedFiles)}
                            </div>
                          </button>
                          {expanded ? (
                            <div style={{ borderTop: `1px solid ${TOKENS.b3}`, padding: '12px 14px', display: 'grid', gap: 10, background: 'rgba(255,255,255,0.02)' }}>
                              <div style={{ display: 'grid', gap: 4 }}>
                                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: TOKENS.text3 }}>Problem</div>
                                <div style={{ fontSize: 12, color: TOKENS.text2, lineHeight: 1.6 }}>{finding.problem || 'Kein Problemtext vorhanden.'}</div>
                              </div>
                              <div style={{ display: 'grid', gap: 4 }}>
                                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: TOKENS.text3 }}>Solution</div>
                                <div style={{ fontSize: 12, color: TOKENS.text2, lineHeight: 1.6 }}>{finding.solution || 'Noch keine Loesung dokumentiert.'}</div>
                              </div>
                              {Array.isArray(finding.affectedFiles) && finding.affectedFiles.length > 0 ? (
                                <div style={{ display: 'grid', gap: 4 }}>
                                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: TOKENS.text3 }}>Affected Files</div>
                                  <div style={{ fontSize: 12, color: TOKENS.text2, lineHeight: 1.6 }}>{finding.affectedFiles.join(', ')}</div>
                                </div>
                              ) : null}
                              {!hasDetails && (!finding.affectedFiles || finding.affectedFiles.length === 0) ? (
                                <div style={{ fontSize: 12, color: TOKENS.text3 }}>Keine weiteren Details vorhanden.</div>
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gap: 18,
            gridTemplateColumns: compact ? '1fr' : '280px minmax(0, 1fr) 340px',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'grid', gap: 18 }}>
            <div data-maya-target="tasklist">
              <BuilderPanel title="Task-Liste" subtitle="Aktive Builder-Queues und Statusfarben." accent={TOKENS.cyan}>
                <div style={{ display: 'grid', gap: 10 }}>
                {tasks.map((task) => {
                  const selected = task.id === selectedTaskId;
                  const isActive = !['done', 'cancelled', 'blocked', 'deleted'].includes(task.status);
                  return (
                    <div
                      key={task.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) auto',
                        gap: 8,
                        alignItems: 'start',
                      }}
                    >
                      <button
                        onClick={() => setSelectedTaskId(task.id)}
                        style={{
                          textAlign: 'left',
                          borderRadius: 18,
                          border: `1.5px solid ${selected ? TOKENS.gold : TOKENS.b2}`,
                          background: selected ? 'rgba(212,175,55,0.10)' : TOKENS.card2,
                          padding: '12px 14px',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                          <div
                            style={{
                              minWidth: 0,
                              fontSize: 13,
                              fontWeight: 600,
                              color: TOKENS.text,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                            }}
                          >
                            {task.title}
                          </div>
                          <span
                            style={{
                              borderRadius: 999,
                              border: `1px solid ${TOKENS.b1}`,
                              color: STATUS_COLORS[task.status] ?? TOKENS.text2,
                              padding: '3px 8px',
                              fontSize: 11,
                              textTransform: 'uppercase',
                              flexShrink: 0,
                              maxWidth: 80,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {task.status}
                          </span>
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            lineHeight: 1.55,
                            color: TOKENS.text2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                          }}
                        >
                          {task.goal}
                        </div>
                      </button>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'center' }}>
                        {isActive ? (
                          <button
                            onClick={() => { void handleCancelTask(task.id); }}
                            title="Task abbrechen"
                            disabled={isBusy}
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 999,
                              border: `1.5px solid rgba(239,68,68,0.45)`,
                              background: 'rgba(127,29,29,0.22)',
                              color: '#fecaca',
                              cursor: isBusy ? 'not-allowed' : 'pointer',
                              fontSize: 16,
                              lineHeight: 1,
                              opacity: isBusy ? 0.6 : 1,
                            }}
                          >
                            ×
                          </button>
                        ) : null}
                        <button
                          onClick={() => { void handleDeleteInline(task.id); }}
                          title="Task löschen"
                          disabled={isBusy}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 999,
                            border: `1.5px solid rgba(161,98,7,0.45)`,
                            background: 'rgba(120,53,15,0.22)',
                            color: '#fde68a',
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            fontSize: 15,
                            lineHeight: 1,
                            opacity: isBusy ? 0.6 : 1,
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
                  {tasks.length === 0 ? <div style={{ fontSize: 13, color: TOKENS.text2 }}>Noch keine Builder-Tasks vorhanden.</div> : null}
                </div>
              </BuilderPanel>
            </div>

            <BuilderPanel title="File Explorer" subtitle="Repo-Dateien bis Tiefe 3, direkt aus dem Builder-Endpoint." accent={TOKENS.purple}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gap: 12, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
                  {groupedFiles.map(([group, entries]) => (
                    <div key={group}>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: TOKENS.text3, marginBottom: 8 }}>{group}</div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {entries.slice(0, 14).map((file) => (
                          <button
                            key={file}
                            onClick={() => setSelectedFilePath(file)}
                            style={{
                              textAlign: 'left',
                              borderRadius: 12,
                              border: `1px solid ${selectedFilePath === file ? TOKENS.gold : TOKENS.b3}`,
                              background: selectedFilePath === file ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)',
                              color: TOKENS.text2,
                              padding: '8px 10px',
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            {file}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderRadius: 16, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
                  <div style={{ fontSize: 12, color: TOKENS.text3, marginBottom: 8 }}>{selectedFilePath ?? 'Keine Datei gewählt'}</div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.55, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                    {selectedFileContent ? toLines(selectedFileContent).join('\n') : 'Dateiinhalt erscheint hier als kurzer Preview-Ausschnitt.'}
                  </pre>
                </div>
              </div>
            </BuilderPanel>
          </div>

          <div data-maya-target="dialog-viewer">
            <BuilderPanel title="Dialog Viewer" subtitle="BDL oder Textansicht mit Bubble-Gruppierung pro Akteur und Runde." accent={TOKENS.gold}>
              <div
                data-maya-target="maya-chat"
              style={{
                background: TOKENS.bg2,
                borderRadius: 22,
                border: `1px solid ${TOKENS.b1}`,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: TOKENS.gold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: 10,
                  fontFamily: TOKENS.font.display,
                }}
              >
                Maya Chat
              </div>
              <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => setDirectorModel((current) => current ? null : 'opus')}
                    style={{
                      borderRadius: 999,
                      border: `1.5px solid ${directorModel ? '#7c6af7' : TOKENS.b1}`,
                      background: directorModel ? 'rgba(124,106,247,0.14)' : 'transparent',
                      color: directorModel ? '#c4b5fd' : TOKENS.text2,
                      padding: '7px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Maya Brain {directorModel ? 'AN' : 'AUS'}
                  </button>
                  {directorModel ? (Object.entries(DIRECTOR_MODEL_META) as Array<[DirectorModel, { label: string }]>).map(([id, meta]) => (
                    <button
                      key={id}
                      onClick={() => setDirectorModel(id)}
                      style={{
                        borderRadius: 999,
                        border: `1px solid ${directorModel === id ? TOKENS.gold : TOKENS.b1}`,
                        background: directorModel === id ? 'rgba(212,175,55,0.14)' : 'transparent',
                        color: directorModel === id ? TOKENS.gold : TOKENS.text2,
                        padding: '6px 11px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {meta.label}
                    </button>
                  )) : null}
                  {directorModel ? (
                    <button
                      onClick={() => setDirectorThinking((current) => !current)}
                      style={{
                        borderRadius: 999,
                        border: `1px solid ${directorThinking ? TOKENS.cyan : TOKENS.b1}`,
                        background: directorThinking ? 'rgba(34,211,238,0.12)' : 'transparent',
                        color: directorThinking ? TOKENS.cyan : TOKENS.text2,
                        padding: '6px 11px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {directorThinking ? 'Deep' : 'Fast'}
                    </button>
                  ) : null}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 14, border: `1px solid ${TOKENS.b1}`, background: 'rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: 12, color: TOKENS.text }}>
                    {directorModel ? 'Mehrstufiger Maya-Brain aktiv' : 'Normaler Builder-Chat aktiv'}
                  </span>
                  <span style={{ fontSize: 11, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                    {activeChatLabel} · {activeChatEndpoint}
                  </span>
                </div>
              </div>
              <div
                ref={chatContainerRef}
                style={{
                  maxHeight: 420,
                  overflowY: 'auto',
                  marginBottom: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {chatMessages.length === 0 ? (
                  <div style={{ color: TOKENS.text3, fontSize: 13, fontStyle: 'italic' }}>
                    {directorModel
                      ? 'Beschreibe den naechsten Builder-Schritt — Maya Brain kann analysieren, delegieren und Actions ausfuehren.'
                      : 'Beschreibe was du aendern willst — Maya erstellt den Task automatisch.'}
                  </div>
                ) : null}
                {chatMessages.map((message, index) => {
                  const parsedTask = message.role === 'assistant'
                    ? parseTaskConfirmation(message.content)
                    : null;

                  return (
                    <div
                      key={`${message.role}-${index}`}
                      style={{
                        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                        background: message.role === 'user' ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${message.role === 'user' ? `${TOKENS.gold}30` : TOKENS.b1}`,
                        borderRadius: 14,
                        padding: '8px 12px',
                        maxWidth: '85%',
                        fontSize: 13,
                        color: TOKENS.text,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {message.role === 'assistant' && message.label ? (
                        <div style={{ marginBottom: 6, fontSize: 10, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                          {message.label}
                        </div>
                      ) : null}
                      {parsedTask ? (
                        <div
                          style={{
                            background: 'rgba(212,175,55,0.08)',
                            border: '1px solid rgba(212,175,55,0.25)',
                            borderRadius: 10,
                            padding: '12px 16px',
                          }}
                        >
                          <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                            ✨ Task erstellt
                          </div>
                          <div style={{ fontSize: 15, color: '#e2e4f0', fontWeight: 600 }}>
                            {parsedTask.title}
                          </div>
                          {parsedTask.goal ? (
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                              {parsedTask.goal}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          {message.content}
                          {message.actions && message.actions.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                              {message.actions.map((action, actionIndex) => (
                                <span
                                  key={`${action.tool}-${actionIndex}`}
                                  style={{
                                    borderRadius: 999,
                                    border: `1px solid ${action.ok ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'}`,
                                    background: action.ok ? 'rgba(20,83,45,0.26)' : 'rgba(127,29,29,0.22)',
                                    color: action.ok ? '#bbf7d0' : '#fecaca',
                                    padding: '3px 8px',
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }}
                                  title={action.summary}
                                >
                                  {action.tool}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {message.actions
                            ?.map((action) => getReadFilePreview(action))
                            .filter((preview): preview is ReadFilePreview => preview !== null)
                            .map((preview, previewIndex) => (
                              <details
                                key={`${preview.path}-${previewIndex}`}
                                style={{
                                  marginTop: 10,
                                  borderRadius: 12,
                                  border: `1px solid ${TOKENS.b2}`,
                                  background: 'rgba(255,255,255,0.03)',
                                  padding: '10px 12px',
                                }}
                              >
                                <summary style={{ cursor: 'pointer', color: TOKENS.gold, fontSize: 12, fontWeight: 700 }}>
                                  read-file · {preview.path}
                                </summary>
                                <pre
                                  style={{
                                    margin: '10px 0 0',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontSize: 11,
                                    lineHeight: 1.6,
                                    color: TOKENS.text2,
                                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                                  }}
                                >
                                  {preview.content}
                                </pre>
                              </details>
                            ))}
                        </>
                      )}
                    </div>
                  );
                })}
                {chatLoading && !directorModel ? (
                  <div style={{ color: TOKENS.gold, fontSize: 12, fontStyle: 'italic' }}>
                    Maya denkt nach...
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleSendChat();
                      }
                    }}
                    placeholder={directorModel ? "z.B. 'Pruefe den Patrol-Status und delegiere den naechsten sinnvollen Schritt'" : "z.B. 'Erstelle einen Health-Check Endpoint'"}
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      border: `1.5px solid ${TOKENS.b1}`,
                      background: TOKENS.bg,
                      color: TOKENS.text,
                      padding: '10px 12px',
                      fontSize: 13,
                      outline: 'none',
                    }}
                    disabled={chatLoading}
                  />
                  <button
                    onClick={handleMicClick}
                    disabled={!speech.isSupported || chatLoading}
                    title={speech.isSupported ? (speech.isListening ? 'Mikrofon stoppen' : 'Mikrofon starten') : 'Spracherkennung nicht verfuegbar'}
                    aria-label={speech.isSupported ? (speech.isListening ? 'Mikrofon stoppen' : 'Mikrofon starten') : 'Spracherkennung nicht verfuegbar'}
                    style={{
                      borderRadius: 12,
                      border: `1.5px solid ${speech.isListening ? TOKENS.green : TOKENS.b1}`,
                      background: speech.isListening ? 'rgba(16,185,129,0.16)' : 'transparent',
                      color: speech.isListening ? TOKENS.green : TOKENS.text2,
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: !speech.isSupported || chatLoading ? 'not-allowed' : 'pointer',
                      opacity: !speech.isSupported || chatLoading ? 0.45 : 1,
                    }}
                  >
                    {speech.isListening ? 'Stop' : 'Mic'}
                  </button>
                  <button
                    data-maya-target="send-button"
                    onClick={() => {
                      void handleSendChat();
                    }}
                    disabled={chatLoading || !chatInput.trim()}
                    style={{
                      borderRadius: 12,
                      border: `1.5px solid ${TOKENS.gold}`,
                      background: 'rgba(212,175,55,0.12)',
                      color: TOKENS.gold,
                      padding: '10px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: chatLoading ? 'not-allowed' : 'pointer',
                      opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
                    }}
                  >
                    Senden
                  </button>
                </div>
                {speech.micBlocked || speech.isListening ? (
                  <div
                    style={{
                      minHeight: 18,
                      color: speech.micBlocked ? '#fca5a5' : TOKENS.green,
                      fontSize: 12,
                    }}
                  >
                    {speech.micBlocked ? 'Mikrofon blockiert. Bitte Browser-Freigabe pruefen.' : 'Maya hoert zu...'}
                  </div>
                ) : null}
                {directorModel && directorStatusText ? (
                  <div
                    style={{
                      minHeight: 20,
                      color: directorLiveStatus?.phase === 'error'
                        ? '#fca5a5'
                        : directorLiveStatus?.phase === 'tool' || chatLoading
                          ? TOKENS.green
                          : TOKENS.text2,
                      fontSize: 12,
                    }}
                  >
                    {directorStatusText}
                  </div>
                ) : null}
              </div>
              </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ color: TOKENS.text2, fontSize: 13 }}>
                Aktiver Task: {activeTask?.title ?? '—'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['dsl', 'text'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setDialogFormat(format)}
                    style={{
                      borderRadius: 999,
                      border: `1.5px solid ${dialogFormat === format ? TOKENS.gold : TOKENS.b1}`,
                      background: dialogFormat === format ? 'rgba(212,175,55,0.12)' : 'transparent',
                      color: dialogFormat === format ? TOKENS.text : TOKENS.text2,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 14, minHeight: 720 }}>
              {dialogBubbles.map((bubble) => (
                <article
                  key={bubble.id}
                  style={{
                    justifySelf: bubble.actor === 'chatgpt' ? 'end' : 'start',
                    width: 'min(86%, 760px)',
                    borderRadius: 22,
                    border: `1.5px solid ${ACTOR_COLORS[bubble.actor] ?? TOKENS.b2}`,
                    background: bubble.actor === 'chatgpt' ? 'rgba(34,211,238,0.07)' : bubble.actor === 'claude' ? 'rgba(212,175,55,0.08)' : TOKENS.card2,
                    padding: '14px 16px',
                    boxShadow: TOKENS.shadow.card,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: ACTOR_COLORS[bubble.actor] ?? TOKENS.text2 }}>{bubble.actor}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: TOKENS.text3 }}>Runde {bubble.roundNumber || '—'} · {bubble.role}</div>
                    </div>
                    <div style={{ fontSize: 11, color: TOKENS.text3 }}>{formatDate(bubble.createdAt)}</div>
                  </div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12.5, lineHeight: 1.7, color: TOKENS.text, fontFamily: dialogFormat === 'dsl' ? 'ui-monospace, SFMono-Regular, monospace' : TOKENS.font.body }}>
                    {bubble.content}
                  </pre>
                </article>
              ))}
              {dialogBubbles.length === 0 ? <div style={{ fontSize: 14, color: TOKENS.text2 }}>Noch kein Dialog für den gewählten Task vorhanden.</div> : null}
            </div>
            </BuilderPanel>
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            <div data-maya-target="task-detail">
              <BuilderPanel title="Task Detail" subtitle="Erstellen, starten und final markieren." accent={TOKENS.green}>
                <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Task-Titel" style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '11px 12px', fontSize: 13 }} />
                  <textarea value={draft.goal} onChange={(event) => setDraft((current) => ({ ...current, goal: event.target.value }))} placeholder="Task-Ziel" rows={4} style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '11px 12px', fontSize: 13, resize: 'vertical' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <select value={draft.risk ?? 'low'} onChange={(event) => setDraft((current) => ({ ...current, risk: event.target.value }))} style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '11px 12px', fontSize: 13 }}>
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                    <select value={draft.taskType} onChange={(event) => setDraft((current) => ({ ...current, taskType: event.target.value }))} style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '11px 12px', fontSize: 13 }}>
                      {['A', 'B', 'C', 'D', 'P', 'S'].map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <button onClick={() => { void handleCreateTask(); }} disabled={isBusy || draft.title.trim().length === 0 || draft.goal.trim().length === 0} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.14)', color: TOKENS.text, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: isBusy ? 0.7 : 1 }}>
                    Neue Task erstellen
                  </button>
                </div>

                <div style={{ borderTop: `1px solid ${TOKENS.b3}`, paddingTop: 14, display: 'grid', gap: 10 }}>
                  {showConfig && (
                    <div style={{ border: `1.5px solid rgba(124,106,247,0.3)`, borderRadius: 18, background: TOKENS.card, overflow: 'hidden', marginBottom: 10 }}>
                      <BuilderConfigPanel token={token} ctx={mayaCtx} />
                    </div>
                  )}
                  <div
                    style={{
                      fontFamily: TOKENS.font.display,
                      fontSize: 22,
                      color: TOKENS.text,
                      overflowWrap: 'break-word',
                      wordBreak: 'normal',
                      hyphens: 'auto',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {activeTask?.title ?? 'Keine Task gewählt'}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: TOKENS.text2,
                      lineHeight: 1.7,
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      overflow: 'hidden',
                    }}
                  >
                    {activeTask?.goal ?? 'Links eine Task wählen oder oben eine neue erstellen.'}
                  </div>
                  <div style={{ display: 'grid', gap: 6, fontSize: 12, color: TOKENS.text2 }}>
                    <span>Status: <strong style={{ color: STATUS_COLORS[activeTask?.status ?? ''] ?? TOKENS.text }}>{activeTask?.status ?? '—'}</strong></span>
                    <span>Risk: {activeTask?.risk ?? '—'} · Type: {activeTask?.taskType ?? '—'}</span>
                    <span>Policy: {activeTask?.policyProfile ?? '—'}</span>
                    <span>Updated: {formatDate(activeTask?.updatedAt)}</span>
                  </div>
                  <input value={commitHash} onChange={(event) => setCommitHash(event.target.value)} placeholder="Commit-Hash für Approve" style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '11px 12px', fontSize: 13 }} />
                  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0,1fr))' }}>
                    <button data-maya-target="run-button" onClick={() => { void handleRunTask(); }} disabled={isRunDisabled} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.cyan}`, background: 'rgba(34,211,238,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: isPrototypeReview ? 'not-allowed' : 'pointer', opacity: isPrototypeReview ? 0.45 : 1 }}>Run</button>
                    <button data-maya-target="approve-button" onClick={() => { void handleApproveTask(); }} disabled={isBusy || !selectedTaskId || isPrototypeReview} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.green}`, background: 'rgba(74,222,128,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: isPrototypeReview ? 'not-allowed' : 'pointer', opacity: isPrototypeReview ? 0.45 : 1 }}>Approve</button>
                    <button data-maya-target="revert-button" onClick={() => { void handleRevertTask(); }} disabled={isBusy || !selectedTaskId} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.rose}`, background: 'rgba(244,114,182,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{isPrototypeReview ? 'Discard' : 'Revert'}</button>
                  </div>
                  <button
                    onClick={() => { void handleDeleteTask(); }}
                    disabled={isBusy || !selectedTaskId}
                    style={{
                      borderRadius: 999,
                      border: `1.5px solid ${confirmDelete ? '#ef4444' : TOKENS.b1}`,
                      background: confirmDelete ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                      color: confirmDelete ? '#ef4444' : TOKENS.text2,
                      padding: '8px 14px',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                      marginTop: 6,
                      width: '100%',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {confirmDelete ? 'Wirklich löschen?' : 'Task löschen'}
                  </button>
                  {isPrototypeReview && previewUrl ? (
                    <div style={{ marginTop: 8, display: 'grid', gap: 12 }}>
                      <div style={{ borderRadius: 18, border: `1px solid ${TOKENS.b2}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
                        <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Prototype Preview</div>
                        <div style={{ marginTop: 6, fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                          Der Builder stoppt hier bewusst. Preview prüfen und dann explizit freigeben, überarbeiten lassen oder verwerfen.
                        </div>
                        <iframe
                          title={`Prototype Preview ${activeTask.id}`}
                          src={previewUrl}
                          style={{ width: '100%', height: 400, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, marginTop: 12, background: '#0f0f17' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0,1fr))' }}>
                        <button data-maya-target="approve-prototype-button" onClick={() => { void handleApprovePrototype(); }} disabled={isBusy || !selectedTaskId} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.green}`, background: 'rgba(74,222,128,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Approve Prototype</button>
                        <button data-maya-target="revise-prototype-button" onClick={() => { void handleRevisePrototype(); }} disabled={isBusy || !selectedTaskId} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Revise</button>
                        <button data-maya-target="discard-prototype-button" onClick={() => { void handleRevertTask(); }} disabled={isBusy || !selectedTaskId} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.rose}`, background: 'rgba(244,114,182,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Discard</button>
                      </div>
                    </div>
                  ) : null}
                </div>
                </div>
              </BuilderPanel>
            </div>

            <BuilderPanel title="Context" subtitle="Continuity Notes, Memory Episodes und Systemstatus aus dem Maya-Context." accent={TOKENS.gold}>
              <ContextPanel ctx={mayaCtx} onDeleteMemory={(id) => { void handleDeleteMemory(id); }} onAddNote={(summary) => { void handleAddNote(summary); }} />
            </BuilderPanel>

            <BuilderPanel title="Check Results" subtitle="Runtime- und Build-Befunde aus dem aktuellen Evidence Pack." accent={TOKENS.cyan}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, padding: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>TSC</div>
                    <div style={{ marginTop: 6, fontSize: 18, color: evidencePack?.checks.tsc === 'pass' ? TOKENS.green : TOKENS.text }}>{evidencePack?.checks.tsc ?? '—'}</div>
                  </div>
                  <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, padding: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Build</div>
                    <div style={{ marginTop: 6, fontSize: 18, color: evidencePack?.checks.build === 'pass' ? TOKENS.green : TOKENS.text }}>{evidencePack?.checks.build ?? '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {(evidencePack?.runtime_results ?? []).slice(0, 8).map((result) => (
                    <div key={`${result.test}-${result.details}`} style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontSize: 12.5, color: TOKENS.text }}>{result.test}</span>
                        <span style={{ fontSize: 12, color: result.result === 'pass' ? TOKENS.green : '#fca5a5' }}>{result.result}</span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, color: TOKENS.text2 }}>{result.details}</div>
                    </div>
                  ))}
                  {!evidencePack || evidencePack.runtime_results.length === 0 ? <div style={{ fontSize: 13, color: TOKENS.text2 }}>Noch keine Test- oder Runtime-Ergebnisse vorhanden.</div> : null}
                </div>
              </div>
            </BuilderPanel>

            <BuilderPanel title="Evidence Pack" subtitle="Verdichteter Review-, Check- und Diff-Stand des gewählten Tasks." accent={TOKENS.rose}>
              {evidencePack ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Final Status: <strong style={{ color: STATUS_COLORS[evidencePack.final_status] ?? TOKENS.text }}>{evidencePack.final_status}</strong></div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Agreement: {evidencePack.agreement_level ?? '—'} · Tokens: {evidencePack.total_tokens}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Counterexamples: {evidencePack.counterexamples_passed}/{evidencePack.counterexamples_tested}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>False success detected: {evidencePack.false_success_detected ? 'ja' : 'nein'}</div>
                  <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
                    <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Reviews</div>
                    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                      {Object.entries(evidencePack.reviews).map(([reviewer, review]) => (
                        <div key={reviewer} style={{ fontSize: 12.5, color: TOKENS.text2 }}>
                          <strong style={{ color: ACTOR_COLORS[reviewer] ?? TOKENS.text }}>{reviewer}</strong>: {review.verdict}
                          {review.notes ? <div style={{ marginTop: 3 }}>{review.notes}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.7, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace', maxHeight: 280, overflowY: 'auto' }}>
                    {JSON.stringify(evidencePack, null, 2)}
                  </pre>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: TOKENS.text2 }}>Für diese Task liegt noch kein Evidence Pack vor.</div>
              )}
            </BuilderPanel>
          </div>
        </div>

        <footer style={{ marginTop: 18, borderRadius: 22, border: `1.5px solid ${TOKENS.b2}`, background: TOKENS.card, boxShadow: TOKENS.shadow.card, padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${selectedTaskId === task.id ? TOKENS.gold : TOKENS.b1}`,
                  background: selectedTaskId === task.id ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.03)',
                  color: STATUS_COLORS[task.status] ?? TOKENS.text2,
                  padding: '8px 12px',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {task.title} · {task.status}
              </button>
            ))}
          </div>
        </footer>

        <MayaFigure
          phase={mayaFigurePhase}
          figureRef={mayaFigureRef}
          bubbleText={mayaBubbleText}
          isFixedSupported={mayaFixedSupported}
          onPointerDown={handleMayaPointerDown}
          onPointerMove={handleMayaPointerMove}
          onPointerUp={handleMayaPointerUp}
        />
      </div>
    </div>
  );
}
