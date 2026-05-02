import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';

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
  type BuilderArtifact,
  type BuilderChatMessage,
  type BuilderChatPoolEntry,
  type BuilderEvidencePack,
  type BuilderTaskObservation,
  type BuilderPatrolFinding,
  type BuilderPatrolSeverity,
  type BuilderPatrolStatus,
  type BuilderTask,
  type BuilderUniversalLifecyclePhase,
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
  opus: { label: 'Opus 4.7', quality: 95 },
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
  opus: { label: 'Opus 4.7' },
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
  critical: { color: '#ff3b5c', bg: '#ff3b5c18', icon: 'â›”', label: 'Kritisch' },
  high: { color: '#ff8c42', bg: '#ff8c4218', icon: 'ğŸ”´', label: 'Hoch' },
  medium: { color: '#ffd166', bg: '#ffd16618', icon: 'ğŸŸ¡', label: 'Mittel' },
  low: { color: '#6ec6ff', bg: '#6ec6ff18', icon: 'ğŸ”µ', label: 'Niedrig' },
  info: { color: '#8b8fa3', bg: '#8b8fa318', icon: 'âšª', label: 'Info' },
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
const BUILDER_TASK_QUEUE_FILTER_STORAGE_KEY = 'builder_task_queue_filter';
const BUILDER_TASK_QUEUE_SORT_STORAGE_KEY = 'builder_task_queue_sort';

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

function getInitialTaskQueueFilter(): TaskQueueFilter {
  const params = new URLSearchParams(window.location.search);
  const urlValue = params.get('queue');
  if (urlValue === 'attention' || urlValue === 'active' || urlValue === 'ready' || urlValue === 'delivered' || urlValue === 'done') {
    return urlValue;
  }

  const stored = readStoredValue([BUILDER_TASK_QUEUE_FILTER_STORAGE_KEY]);
  return stored === 'attention' || stored === 'active' || stored === 'ready' || stored === 'delivered' || stored === 'done'
    ? stored
    : 'all';
}

function getInitialTaskQueueSort(): TaskQueueSort {
  const params = new URLSearchParams(window.location.search);
  const urlValue = params.get('queue_sort');
  if (urlValue === 'updated' || urlValue === 'title' || urlValue === 'priority') {
    return urlValue;
  }

  const stored = readStoredValue([BUILDER_TASK_QUEUE_SORT_STORAGE_KEY]);
  return stored === 'updated' || stored === 'title' ? stored : 'priority';
}

function getInitialSelectedTaskId() {
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get('task');
  return taskId && taskId.trim().length > 0 ? taskId.trim() : null;
}

async function validateBuilderToken(token: string) {
  const response = await fetch(`/api/builder/maya/context?token=${encodeURIComponent(token)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const bodyText = await response.text().catch(() => '');

  if (response.status === 401 || response.status === 404) {
    throw new Error('UngÃ¼ltiger Token');
  }

  if (!response.ok && response.status === 500 && window.location.hostname === 'localhost' && bodyText.trim().length === 0) {
    throw new Error('Builder-Backend nicht erreichbar. Starte den Server mit "cd server" und "pnpm dev" auf Port 3001.');
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = (bodyText ? JSON.parse(bodyText) : {}) as { tasks?: unknown[] };
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
    return 'â€”';
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
    return 'â€¢â€¢â€¢â€¢â€¢â€¢';
  }

  return `${token.slice(0, 3)}â€¦${token.slice(-2)}`;
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

  return `${normalized.slice(0, maxLength - 1).trimEnd()}â€¦`;
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
      return `Deep scannt Kontext und Scope Â· ${elapsedSeconds}s`;
    }
    if (elapsedSeconds < 10) {
      return `Deep prueft Tasks, Memory und Toolweg Â· ${elapsedSeconds}s`;
    }
    if (elapsedSeconds < 18) {
      return `Deep baut den naechsten Builder-Schritt Â· ${elapsedSeconds}s`;
    }
    return `Deep verdichtet Antwort und Actions Â· ${elapsedSeconds}s`;
  }

  if (elapsedSeconds < 3) {
    return `Fast scannt den Auftrag Â· ${elapsedSeconds}s`;
  }
  if (elapsedSeconds < 7) {
    return `Fast waehlt den kuerzesten Toolweg Â· ${elapsedSeconds}s`;
  }
  return `Fast finalisiert Antwort und Actions Â· ${elapsedSeconds}s`;
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

  return status.tool ? `fertig Â· ${status.tool}` : 'fertig';
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
        border: `2px solid ${TOKENS.b1}`,
        borderRadius: 22,
        background: TOKENS.card,
        boxShadow: `${TOKENS.shadow.card}, 0 0 0 1px rgba(255,255,255,0.04) inset`,
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

interface ExecutionStateSummary {
  label: string;
  detail: string;
  accent: string;
}

type BuilderExperienceMode = 'default' | 'single_specialist' | 'pipeline';

type SidebarView = 'chat' | 'tasks' | 'patrol' | 'models' | 'files' | 'notes';

type DrawerView = 'models' | 'task' | 'output';

type TribunePhaseKey =
  BuilderUniversalLifecyclePhase;

interface TribuneTimelineEntry {
  key: TribunePhaseKey;
  label: string;
  detail: string;
  meta: string;
  accent: string;
  state: 'done' | 'current' | 'pending' | 'waiting' | 'blocked';
}

interface TribunePhaseDetail {
  title: string;
  summary: string;
  source: string;
  lines: string[];
  note?: string;
  notRequired?: boolean;
}

type OperatorActionKey =
  | 'run'
  | 'approve'
  | 'approve_prototype'
  | 'revise_prototype'
  | 'revert'
  | 'inspect';

interface OperatorActionSuggestion {
  key: OperatorActionKey;
  label: string;
  tone: 'primary' | 'warning' | 'neutral' | 'danger';
}

interface OperatorGuidance {
  title: string;
  summary: string;
  detail: string;
  accent: string;
  actions: OperatorActionSuggestion[];
}

interface TaskQueueSignal {
  label: string;
  summary: string;
  accent: string;
  priority: 'attention' | 'active' | 'ready' | 'delivered' | 'done';
}

type TaskQueueFilter = 'all' | TaskQueueSignal['priority'];
type TaskQueueSort = 'priority' | 'updated' | 'title';

interface TaskCardTone {
  border: string;
  background: string;
  glow: string;
  chipBg: string;
}

const TRIBUNE_PHASE_ORDER: TribunePhaseKey[] = [
  'requested',
  'understood',
  'routed',
  'active',
  'synthesizing',
  'delivered',
  'confirmed',
  'stopped',
];

const UNIVERSAL_PHASE_COLORS: Record<TribunePhaseKey, string> = {
  requested: TOKENS.text2,
  understood: TOKENS.cyan,
  routed: '#8b5cf6',
  active: TOKENS.purple,
  synthesizing: TOKENS.green,
  delivered: TOKENS.gold,
  confirmed: TOKENS.green,
  stopped: TOKENS.rose,
};

function formatLaneList(lanes: string[]) {
  return lanes.length > 0 ? lanes.join(' Â· ') : 'Noch keine Lane zugewiesen';
}

function formatInstanceList(instances: string[]) {
  return instances.length > 0 ? instances.join(' Â· ') : 'Noch kein Team sichtbar';
}

function formatArtifacts(list: string[]) {
  return list.length > 0 ? list.join(', ') : 'Noch keine geplanten Artefakte';
}

function formatExecutionChannelLabel(channel: string | null | undefined) {
  switch (channel) {
    case 'dialog':
      return 'Dialog';
    case 'quick':
      return 'Quick';
    case 'pipeline':
      return 'Pipeline';
    case 'bridge':
      return 'Opus Bridge';
    case 'manual':
      return 'Manual';
    default:
      return 'Unknown';
  }
}

function formatExecutionSummary(evidence: BuilderEvidencePack | null) {
  if (!evidence) {
    return 'Noch keine Execution-Spur verfuegbar';
  }

  const channel = formatExecutionChannelLabel(evidence.execution_summary.channel);
  const reason = evidence.execution_summary.last_transition_reason ?? 'kein letzter Grund';
  return `${channel} Â· ${reason}`;
}

function formatExecutionMeta(evidence: BuilderEvidencePack | null) {
  if (!evidence) {
    return 'Noch keine sichtbare Transition';
  }

  const channel = formatExecutionChannelLabel(evidence.execution_summary.channel);
  const lane = evidence.execution_summary.last_transition_lane ?? 'unknown';
  const reason = evidence.execution_summary.last_transition_reason ?? 'ohne Grund';
  return `${channel} Â· ${lane} Â· ${reason}`;
}

function deriveOperatorGuidance(
  task: BuilderTask | null,
  evidence: BuilderEvidencePack | null,
  waitingCount: number,
): OperatorGuidance | null {
  if (!task) {
    return null;
  }

  const channel = evidence?.execution_summary.channel ?? 'unknown';
  const channelLabel = formatExecutionChannelLabel(channel);
  const reason = evidence?.execution_summary.last_transition_reason ?? 'ohne klaren Uebergangsgrund';
  const moreWaiting = waitingCount > 1 ? ` Es warten noch ${waitingCount - 1} weitere Tasks.` : '';

  if (task.status === 'prototype_review') {
    return {
      title: 'Prototype braucht Entscheidung',
      summary: 'Dieser Lauf hat bewusst vor dem Weiterbau angehalten, damit du den sichtbaren Zwischenstand freigibst, ueberarbeiten laesst oder verwirfst.',
      detail: `Modus ${channelLabel} Â· letzter Uebergang ${reason}.${moreWaiting}`,
      accent: TOKENS.gold,
      actions: [
        { key: 'approve_prototype', label: 'Prototype freigeben', tone: 'primary' },
        { key: 'revise_prototype', label: 'Revision anfordern', tone: 'warning' },
        { key: 'revert', label: 'Prototype verwerfen', tone: 'danger' },
      ],
    };
  }

  if (task.contract.lifecycle.attentionState === 'waiting') {
    return {
      title: 'Maya wartet auf deine Freigabe',
      summary: 'Das Ergebnis liegt bereit, aber dieser Vertrag verlangt vor dem naechsten Schritt eine menschliche Entscheidung.',
      detail: `Modus ${channelLabel} Â· letzter Uebergang ${reason}.${moreWaiting}`,
      accent: TOKENS.gold,
      actions: [
        { key: 'approve', label: 'Freigeben', tone: 'primary' },
        { key: 'inspect', label: 'Details ansehen', tone: 'neutral' },
        { key: 'revert', label: 'Zuruecknehmen', tone: 'danger' },
      ],
    };
  }

  if (task.status === 'queued' || task.status === 'classifying' || task.status === 'planning') {
    return {
      title: 'Task ist bereit zum Start',
      summary: 'Der Vertrag ist angelegt, aber der Lauf wurde noch nicht aktiv gestartet.',
      detail: 'Empfohlener Schritt: Task anwerfen und danach den Routing-Pfad beobachten.',
      accent: TOKENS.cyan,
      actions: [
        { key: 'run', label: 'Task starten', tone: 'primary' },
        { key: 'inspect', label: 'Details ansehen', tone: 'neutral' },
      ],
    };
  }

  if (task.status === 'blocked' || task.contract.lifecycle.phase === 'stopped' || task.contract.lifecycle.attentionState === 'blocked') {
    return {
      title: channel === 'bridge' ? 'Bridge-Pfad ist angehalten' : 'Lauf ist angehalten',
      summary: channel === 'bridge'
        ? 'Ein externer Bridge- oder Override-Pfad hat den Task in einen gestoppten Zustand gebracht.'
        : 'Der aktuelle Lauf ist nicht mehr aktiv und braucht jetzt eine bewusste Entscheidung.',
      detail: `Modus ${channelLabel} Â· letzter Uebergang ${reason}.`,
      accent: TOKENS.rose,
      actions: [
        { key: 'inspect', label: 'Ursache ansehen', tone: 'neutral' },
        { key: 'run', label: 'Erneut starten', tone: 'warning' },
        { key: 'revert', label: 'Zuruecknehmen', tone: 'danger' },
      ],
    };
  }

  if (task.contract.lifecycle.phase === 'delivered') {
    return {
      title: 'Ergebnis ist geliefert',
      summary: 'Maya betrachtet den Stand als lieferbar. Der naechste sinnvolle Schritt ist jetzt Pruefung oder Abschluss.',
      detail: `Modus ${channelLabel} Â· letzter Uebergang ${reason}.`,
      accent: TOKENS.green,
      actions: task.contract.output.needsUserConfirmation
        ? [
            { key: 'approve', label: 'Abschliessen', tone: 'primary' },
            { key: 'inspect', label: 'Details ansehen', tone: 'neutral' },
          ]
        : [
            { key: 'inspect', label: 'Details ansehen', tone: 'neutral' },
          ],
    };
  }

  if (channel === 'bridge') {
    return {
      title: 'Bridge-Pfad aktiv',
      summary: 'Dieser Task wird gerade ueber einen externen Bridge-Kontext mitgesteuert. Eingriffe sollten bewusst und sparsam sein.',
      detail: `Letzter Uebergang ${reason}. Beobachte zuerst die Details, bevor du neu startest oder revertierst.`,
      accent: '#8b5cf6',
      actions: [
        { key: 'inspect', label: 'Bridge-Details ansehen', tone: 'primary' },
      ],
    };
  }

  if (channel === 'quick') {
    return {
      title: 'Quick-Pfad aktiv',
      summary: 'Maya versucht hier einen kurzen, direkten Durchlauf statt eines schweren Multi-Lane-Baums.',
      detail: `Letzter Uebergang ${reason}. Solange nichts blockiert ist, ist Beobachten sinnvoller als Eingreifen.`,
      accent: TOKENS.cyan,
      actions: [
        { key: 'inspect', label: 'Quick-Details ansehen', tone: 'primary' },
      ],
    };
  }

  if (channel === 'pipeline') {
    return {
      title: 'Pipeline-Pfad aktiv',
      summary: 'Diese Task laeuft ueber einen mehrstufigen Ausfuehrungspfad. Der relevante Operator-Schritt ist meist Kontrolle statt Soforteingriff.',
      detail: `Letzter Uebergang ${reason}.`,
      accent: TOKENS.purple,
      actions: [
        { key: 'inspect', label: 'Pipeline-Details ansehen', tone: 'primary' },
      ],
    };
  }

  return {
    title: 'Kein Eingriff noetig',
    summary: 'Maya arbeitet aktuell in einem normalen Lauf und hat keinen expliziten Bedienbedarf signalisiert.',
    detail: `Modus ${channelLabel} Â· letzter Uebergang ${reason}.`,
    accent: TOKENS.text3,
    actions: [
      { key: 'inspect', label: 'Task verfolgen', tone: 'neutral' },
    ],
  };
}

function deriveTaskQueueSignal(task: BuilderTask): TaskQueueSignal {
  if (task.status === 'prototype_review') {
    return {
      label: 'Entscheidung',
      summary: 'Prototype liegt vor und wartet auf Freigabe, Revision oder Verwerfung.',
      accent: TOKENS.gold,
      priority: 'attention',
    };
  }

  if (task.contract.lifecycle.attentionState === 'waiting') {
    return {
      label: 'Wartet auf dich',
      summary: 'Der aktuelle Vertrag verlangt vor dem naechsten Schritt eine menschliche Freigabe.',
      accent: TOKENS.gold,
      priority: 'attention',
    };
  }

  if (task.status === 'queued' || task.status === 'classifying' || task.status === 'planning') {
    return {
      label: 'Startklar',
      summary: 'Task ist angelegt und kann jetzt in den aktiven Lauf geschickt werden.',
      accent: TOKENS.cyan,
      priority: 'ready',
    };
  }

  if (task.status === 'blocked' || task.contract.lifecycle.phase === 'stopped' || task.contract.lifecycle.attentionState === 'blocked') {
    return {
      label: 'Angehalten',
      summary: 'Der Lauf ist gestoppt und braucht eine bewusste Operator-Entscheidung.',
      accent: TOKENS.rose,
      priority: 'attention',
    };
  }

  if (task.contract.lifecycle.phase === 'delivered') {
    return {
      label: 'Bereit',
      summary: 'Ergebnis ist geliefert und kann jetzt geprueft oder abgeschlossen werden.',
      accent: TOKENS.green,
      priority: 'delivered',
    };
  }

  if (task.contract.lifecycle.phase === 'confirmed' || task.status === 'done') {
    return {
      label: 'Abgeschlossen',
      summary: 'Diese Task ist bestaetigt und braucht aktuell keinen Eingriff.',
      accent: TOKENS.text3,
      priority: 'done',
    };
  }

  return {
    label: 'Laeuft',
    summary: `Maya arbeitet aktiv in der Phase ${task.contract.lifecycle.phase} mit den Lanes ${formatLaneList(task.contract.routing.activeLanes)}.`,
    accent: TOKENS.purple,
    priority: 'active',
  };
}

function deriveTaskCardTone(task: BuilderTask, selected: boolean): TaskCardTone {
  const signal = deriveTaskQueueSignal(task);
  const base = selected ? TOKENS.gold : signal.accent;

  if (signal.priority === 'attention') {
    return {
      border: selected ? TOKENS.gold : `${base}88`,
      background: selected ? 'rgba(212,175,55,0.12)' : `linear-gradient(135deg, ${base}18, rgba(255,255,255,0.03))`,
      glow: `${base}33`,
      chipBg: `${base}18`,
    };
  }

  if (signal.priority === 'delivered') {
    return {
      border: selected ? TOKENS.gold : `${base}66`,
      background: selected ? 'rgba(212,175,55,0.10)' : `linear-gradient(135deg, ${base}12, rgba(255,255,255,0.03))`,
      glow: `${base}22`,
      chipBg: `${base}14`,
    };
  }

  if (signal.priority === 'ready') {
    return {
      border: selected ? TOKENS.gold : `${base}55`,
      background: selected ? 'rgba(212,175,55,0.10)' : `linear-gradient(135deg, ${base}10, rgba(255,255,255,0.025))`,
      glow: `${base}18`,
      chipBg: `${base}12`,
    };
  }

  if (signal.priority === 'active') {
    return {
      border: selected ? TOKENS.gold : `${base}44`,
      background: selected ? 'rgba(212,175,55,0.10)' : `linear-gradient(135deg, ${base}0f, rgba(255,255,255,0.02))`,
      glow: `${base}18`,
      chipBg: `${base}10`,
    };
  }

  return {
    border: selected ? TOKENS.gold : TOKENS.b2,
    background: selected ? 'rgba(212,175,55,0.10)' : TOKENS.card2,
    glow: 'transparent',
    chipBg: 'rgba(255,255,255,0.04)',
  };
}

function sortTaskQueue(tasks: BuilderTask[], sortMode: TaskQueueSort) {
  const priorityOrder: Record<TaskQueueSignal['priority'], number> = {
    attention: 0,
    active: 1,
    ready: 2,
    delivered: 3,
    done: 4,
  };

  return [...tasks].sort((left, right) => {
    if (sortMode === 'title') {
      return left.title.localeCompare(right.title, 'de');
    }

    if (sortMode === 'updated') {
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    }

    const leftSignal = deriveTaskQueueSignal(left);
    const rightSignal = deriveTaskQueueSignal(right);
    const priorityDiff = priorityOrder[leftSignal.priority] - priorityOrder[rightSignal.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });
}

function deriveExecutionState(task: BuilderTask | null, evidence: BuilderEvidencePack | null): ExecutionStateSummary {
  if (!task) {
    return {
      label: 'Keine Task aktiv',
      detail: 'Waehle eine Task, um den laufenden Builder-Zustand und die aktuelle Workflow-Lage zu sehen.',
      accent: TOKENS.text3,
    };
  }

  const runtimeFailures = (evidence?.runtime_results ?? []).filter((result) => result.result !== 'pass').length;
  const runtimeSummary = evidence
    ? `${evidence.runtime_results.length} Runtime-Checks, ${runtimeFailures} nicht gruen`
    : 'Noch kein Evidence Pack verfuegbar';
  const counterexampleSummary = evidence
    ? `${evidence.counterexamples_passed}/${evidence.counterexamples_tested} Gegenbeispiele bestanden`
    : 'Keine Counterexample-Werte verfuegbar';
  const { contract } = task;

  switch (contract.lifecycle.phase) {
    case 'requested':
      return { label: 'Auftrag eingegangen', detail: contract.lifecycle.summary, accent: UNIVERSAL_PHASE_COLORS.requested };
    case 'understood':
      return { label: 'Versteht den Auftrag', detail: `${contract.lifecycle.summary} ${contract.intent.summary}`, accent: UNIVERSAL_PHASE_COLORS.understood };
    case 'routed':
      return { label: 'Routet in Lanes', detail: `${contract.routing.summary} Team: ${formatInstanceList(contract.team.activeInstances)}.`, accent: UNIVERSAL_PHASE_COLORS.routed };
    case 'active':
      return {
        label: contract.codeLane.phase === 'prototype_building' ? 'Baut einen Prototyp' : 'Arbeitet aktiv',
        detail: `${contract.codeLane.summary} ${contract.team.summary}`,
        accent: UNIVERSAL_PHASE_COLORS.active,
      };
    case 'synthesizing':
      return { label: 'Verdichtet Signale', detail: `${contract.lifecycle.summary} ${runtimeSummary}. ${counterexampleSummary}.`, accent: UNIVERSAL_PHASE_COLORS.synthesizing };
    case 'delivered':
      return { label: 'Ergebnis bereit', detail: `${contract.output.summary} ${contract.lifecycle.summary}`, accent: UNIVERSAL_PHASE_COLORS.delivered };
    case 'confirmed':
      if (evidence?.false_success_detected) {
        return { label: 'Formal bestaetigt, aber fraglich', detail: 'Der Stand ist bestaetigt, aber das Evidence Pack markiert moeglichen False Success.', accent: '#ef4444' };
      }
      return {
        label: task.commitHash ? 'Bestaetigt und verankert' : 'Bestaetigt',
        detail: task.commitHash
          ? `${contract.codeLane.summary} Commit ${task.commitHash.slice(0, 7)} ist sichtbar.`
          : contract.lifecycle.summary,
        accent: UNIVERSAL_PHASE_COLORS.confirmed,
      };
    case 'stopped':
      return { label: 'Gestoppt', detail: contract.lifecycle.summary, accent: '#ef4444' };
    default:
      return { label: task.status, detail: `${runtimeSummary}. ${counterexampleSummary}.`, accent: STATUS_COLORS[task.status] ?? TOKENS.text2 };
  }
}

function needsUserAttention(task: BuilderTask | null) {
  return Boolean(task && task.contract.lifecycle.attentionState === 'waiting');
}

function deriveExperienceMode(
  task: BuilderTask | null,
  evidence: BuilderEvidencePack | null,
): BuilderExperienceMode {
  if (!task) {
    return 'default';
  }

  const executionChannel = evidence?.execution_summary.channel ?? null;
  const teamSize = task.contract.team.activeInstances.length;
  const laneCount = task.contract.routing.activeLanes.length;

  if (
    executionChannel === 'pipeline'
    || teamSize >= 3
    || (laneCount >= 2 && task.contract.lifecycle.phase !== 'requested')
  ) {
    return 'pipeline';
  }

  return 'single_specialist';
}

function getPipelineReadinessText(pools: PoolState) {
  const connectedModels = Object.values(pools).reduce((sum, entries) => sum + entries.length, 0);
  return `Pipeline bereit Â· ${connectedModels} Modelle verbunden`;
}

function getSpecialistTransparencyLabel(
  pools: PoolState,
  directorModel: DirectorModel | null,
) {
  if (directorModel) {
    return `Maya nutzt ${DIRECTOR_MODEL_META[directorModel].label}`;
  }

  const mayaLead = pools.maya[0];
  const mayaLabel = mayaLead ? POOL_MODEL_META[mayaLead]?.label ?? mayaLead : 'ein Spezialmodell';
  return `Maya nutzt ${mayaLabel}`;
}

function formatObservationMeta(observation: BuilderTaskObservation | null) {
  if (!observation) {
    return 'Noch keine Live-Signale geladen.';
  }

  const latestChat = observation.chatPool[observation.chatPool.length - 1];
  if (latestChat) {
    return `${latestChat.actor} Â· ${latestChat.phase} Â· ${formatDate(latestChat.createdAt)}`;
  }

  const latestAction = observation.actions[observation.actions.length - 1];
  if (latestAction) {
    return `${latestAction.actor} Â· ${latestAction.kind} Â· ${formatDate(latestAction.createdAt)}`;
  }

  const latestLog = observation.opusLogs[observation.opusLogs.length - 1];
  if (latestLog) {
    return `${latestLog.action} Â· ${formatDate(latestLog.createdAt)}`;
  }

  return 'Live-Feed noch ohne einzelne Events.';
}

function summarizeWorkerModels(observation: BuilderTaskObservation | null) {
  if (!observation || observation.chatPool.length === 0) {
    return 'Noch keine Worker- oder Council-Signale im Live-Feed.';
  }

  const models = [...new Set(
    observation.chatPool
      .map((entry) => entry.model?.trim())
      .filter((entry): entry is string => Boolean(entry) && entry !== 'manual'),
  )];

  if (models.length === 0) {
    return 'Live-Feed aktiv, aber noch ohne sichtbare Modellnamen.';
  }

  const visible = models.slice(0, 6);
  const hidden = models.length - visible.length;
  return `${models.length} Modelle aktiv: ${visible.join(', ')}${hidden > 0 ? ` +${hidden}` : ''}`;
}

function deriveTribuneCurrentPhase(
  task: BuilderTask,
): TribunePhaseKey {
  return task.contract.lifecycle.phase;
}

function deriveTribuneTimeline(
  task: BuilderTask | null,
  evidence: BuilderEvidencePack | null,
  observation: BuilderTaskObservation | null,
): TribuneTimelineEntry[] {
  if (!task) {
    return [];
  }

  const currentPhase = deriveTribuneCurrentPhase(task);
  const currentIndex = TRIBUNE_PHASE_ORDER.indexOf(currentPhase);
  const latestMeta = formatObservationMeta(observation);
  const executionMeta = formatExecutionMeta(evidence);
  const runtimePasses = (evidence?.runtime_results ?? []).filter((result) => result.result === 'pass').length;
  const runtimeFailures = (evidence?.runtime_results ?? []).filter((result) => result.result !== 'pass').length;
  const { contract } = task;
  const phaseContent: Record<TribunePhaseKey, Omit<TribuneTimelineEntry, 'state'>> = {
    requested: {
      key: 'requested',
      label: 'Angefragt',
      detail: `Task angelegt am ${formatDate(task.createdAt)} und fuer Maya registriert.`,
      meta: `Status ${task.status} Â· Updated ${formatDate(task.updatedAt)}`,
      accent: UNIVERSAL_PHASE_COLORS.requested,
    },
    understood: {
      key: 'understood',
      label: 'Verstanden',
      detail: contract.intent.summary,
      meta: latestMeta,
      accent: UNIVERSAL_PHASE_COLORS.understood,
    },
    routed: {
      key: 'routed',
      label: 'Geroutet',
      detail: `${contract.routing.summary} Aktive Lanes: ${formatLaneList(contract.routing.activeLanes)}.`,
      meta: executionMeta,
      accent: UNIVERSAL_PHASE_COLORS.routed,
    },
    active: {
      key: 'active',
      label: 'Aktiv',
      detail: `${contract.team.summary} ${summarizeWorkerModels(observation)}`,
      meta: `${contract.codeLane.phase} Â· ${executionMeta}`,
      accent: UNIVERSAL_PHASE_COLORS.active,
    },
    synthesizing: {
      key: 'synthesizing',
      label: 'Verdichtet',
      detail: evidence
        ? `${evidence.checks.tsc}/${evidence.checks.build} bei TSC/Build Â· Runtime ${runtimePasses} gruen, ${runtimeFailures} nicht gruen.`
        : contract.lifecycle.summary,
      meta: evidence
        ? `Agreement ${evidence.agreement_level ?? 'â€”'} Â· Counterexamples ${evidence.counterexamples_passed}/${evidence.counterexamples_tested}`
        : latestMeta,
      accent: UNIVERSAL_PHASE_COLORS.synthesizing,
    },
    delivered: {
      key: 'delivered',
      label: 'Bereit',
      detail: contract.output.summary,
      meta: `${contract.output.format} Â· ${formatArtifacts(contract.output.plannedArtifacts)} Â· ${executionMeta}`,
      accent: UNIVERSAL_PHASE_COLORS.delivered,
    },
    confirmed: {
      key: 'confirmed',
      label: 'Bestaetigt',
      detail: task.commitHash
        ? `Commit ${task.commitHash.slice(0, 7)} ist sichtbar und die Aufgabe gilt als bestaetigt.`
        : contract.lifecycle.summary,
      meta: task.commitHash ? `Updated ${formatDate(task.updatedAt)}` : formatArtifacts(contract.output.plannedArtifacts),
      accent: UNIVERSAL_PHASE_COLORS.confirmed,
    },
    stopped: {
      key: 'stopped',
      label: 'Gestoppt',
      detail: contract.lifecycle.summary,
      meta: `Updated ${formatDate(task.updatedAt)}`,
      accent: UNIVERSAL_PHASE_COLORS.stopped,
    },
  };

  return TRIBUNE_PHASE_ORDER.map((phase, index) => {
    let state: TribuneTimelineEntry['state'] = 'pending';
    if (phase === currentPhase) {
      state = contract.lifecycle.attentionState === 'waiting'
        ? 'waiting'
        : phase === 'stopped' || contract.lifecycle.attentionState === 'blocked'
          ? 'blocked'
          : 'current';
    } else if (phase === 'stopped') {
      state = currentPhase === 'stopped' ? 'blocked' : 'pending';
    } else if (index < currentIndex) {
      state = 'done';
    }

    return {
      ...phaseContent[phase],
      state,
    };
  });
}

function deriveMayaTribuneSentence(
  task: BuilderTask | null,
  evidence: BuilderEvidencePack | null,
  observation: BuilderTaskObservation | null,
) {
  if (!task) {
    return 'Waehle eine Task, dann erklaere ich dir den laufenden Builder-Ablauf in normaler Sprache.';
  }

  if (task.contract.lifecycle.attentionState === 'waiting') {
    return task.contract.output.needsUserConfirmation
      ? 'Ich habe einen verwertbaren Stand vorbereitet und brauche jetzt deine Entscheidung zum naechsten Schritt.'
      : 'Ich halte das Ergebnis bereit und warte auf dein Signal fuer den Abschluss.';
  }

  if (task.contract.lifecycle.phase === 'confirmed' && task.commitHash && evidence?.runtime_results.length) {
    return `Ich bin mit dieser Aufgabe durch; Commit ${task.commitHash.slice(0, 7)} ist sichtbar und die Runtime-Signale sehen gruen aus.`;
  }

  if (evidence?.execution_summary.transition_count) {
    const channel = formatExecutionChannelLabel(evidence.execution_summary.channel);
    const reason = evidence.execution_summary.last_transition_reason ?? 'ohne klaren Uebergangsgrund';
    return `Ich arbeite gerade im ${channel}-Modus; der letzte sichtbare Uebergang war ${reason}.`;
  }

  const latestChat = observation?.chatPool[observation.chatPool.length - 1];
  if (latestChat) {
    return `Ich arbeite gerade in ${latestChat.phase} und der letzte sichtbare Beitrag kam von ${latestChat.actor}.`;
  }

  return task.contract.lifecycle.summary;
}

function deriveAttentionDetail(task: BuilderTask | null, waitingCount: number) {
  if (!task) {
    return null;
  }

  const moreCount = Math.max(0, waitingCount - 1);
  const tail = moreCount > 0 ? ` Dazu kommen noch ${moreCount} weitere wartende Tasks.` : '';

  if (task.contract.output.kind === 'html_artifact') {
    return `Diese Task wartet bewusst auf eine Prototype-Entscheidung. Ohne dein Signal lande ich hier nichts.${tail}`;
  }

  return `Diese Task braucht vor dem naechsten Schritt deinen Blick oder deine Zustimmung.${tail}`;
}

function toArtifactPayload(artifact: BuilderArtifact | null | undefined) {
  if (!artifact?.jsonPayload || typeof artifact.jsonPayload !== 'object') {
    return null;
  }

  return artifact.jsonPayload;
}

function getArtifactPayloadString(artifact: BuilderArtifact | null | undefined, key: string) {
  const payload = toArtifactPayload(artifact);
  const value = payload?.[key];
  return typeof value === 'string' ? value : null;
}

function getArtifactPreviewText(artifact: BuilderArtifact | null | undefined) {
  const payload = toArtifactPayload(artifact);
  if (!payload) {
    return null;
  }

  const directFields = ['summary', 'notes', 'html', 'step', 'route', 'kind'] as const;
  for (const field of directFields) {
    const value = payload[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  const compact = JSON.stringify(payload, null, 2);
  return compact.length > 1200 ? `${compact.slice(0, 1200).trimEnd()}...` : compact;
}

function formatArtifactTypeLabel(type: string) {
  switch (type) {
    case 'prototype':
      return 'Prototype';
    case 'promoted_prototype':
      return 'Promoted Prototype';
    case 'browser_screenshot':
      return 'Browser Screenshot';
    case 'approval_ticket':
      return 'Approval Ticket';
    default:
      return type.replace(/_/g, ' ');
  }
}

function pickLatestArtifact(artifacts: BuilderArtifact[], types: string[]) {
  return artifacts.find((artifact) => types.includes(artifact.artifactType)) ?? null;
}

function matchObservationSignals(
  observation: BuilderTaskObservation | null,
  patterns: string[],
) {
  if (!observation) {
    return [];
  }

  const loweredPatterns = patterns.map((pattern) => pattern.toLowerCase());
  return observation.chatPool.filter((entry) => {
    const haystack = `${entry.phase} ${entry.actor} ${entry.content}`.toLowerCase();
    return loweredPatterns.some((pattern) => haystack.includes(pattern));
  });
}

function deriveTribunePhaseDetail(
  phase: TribunePhaseKey,
  task: BuilderTask | null,
  evidence: BuilderEvidencePack | null,
  observation: BuilderTaskObservation | null,
  timeline: TribuneTimelineEntry[],
): TribunePhaseDetail | null {
  if (!task) {
    return null;
  }

  const timelineEntry = timeline.find((entry) => entry.key === phase);
  const currentPhase = deriveTribuneCurrentPhase(task);
  const currentIndex = TRIBUNE_PHASE_ORDER.indexOf(currentPhase);
  const phaseIndex = TRIBUNE_PHASE_ORDER.indexOf(phase);
  const beforeCurrent = phaseIndex < currentIndex;
  const afterCurrent = phaseIndex > currentIndex;
  const { contract } = task;
  const isManualReviewLane = contract.lifecycle.attentionState === 'waiting';

  switch (phase) {
    case 'requested':
      return {
        title: 'Auftrag wurde angelegt',
        summary: 'Hier beginnt der Builder-Lauf. Ziel, Intent und Startkontext sind registriert, aber noch nicht vertieft.',
        source: 'task',
        lines: [
          `Titel: ${task.title}`,
          `Intent: ${contract.intent.kind} Â· Risk: ${task.risk ?? 'â€”'}`,
          `Erstellt: ${formatDate(task.createdAt)} Â· Zuletzt aktualisiert: ${formatDate(task.updatedAt)}`,
        ],
      };
    case 'understood': {
      const planningSignals = matchObservationSignals(observation, ['architect', 'scope', 'plan', 'classify', 'understand']);
      return {
        title: 'Maya versteht den Auftrag',
        summary: beforeCurrent || currentPhase === 'understood'
          ? 'Maya klaert hier Problemkern, Risiko und die richtige Rahmung fuer die Aufgabe.'
          : 'Diese Verstehensphase ist vorbei; der weitere Lauf baut auf diesem Zuschnitt auf.',
        source: 'observe',
        lines: planningSignals.length > 0
          ? planningSignals.slice(-3).map((entry) => `${entry.actor} Â· ${entry.phase} Â· ${shortenGuideLabel(entry.content, 96)}`)
          : [
              contract.intent.summary,
              timelineEntry?.meta ?? `Status ${task.status}`,
            ],
      };
    }
    case 'routed': {
      const routeSignals = matchObservationSignals(observation, ['route', 'scope', 'lane', 'council', 'distiller']);
      return {
        title: 'Routing unter dem universellen Dach',
        summary: currentPhase === 'routed'
          ? 'Maya legt hier Lane, Team und geplante Outputform fuer den naechsten Schritt fest.'
          : 'Diese Phase beschreibt den Uebergang von Verstehen zu gezielter Ausfuehrung.',
        source: 'observe',
        lines: [
          `Lanes: ${formatLaneList(contract.routing.activeLanes)}`,
          `Team: ${formatInstanceList(contract.team.activeInstances)}`,
          `Execution: ${formatExecutionMeta(evidence)}`,
          ...(routeSignals.length > 0
            ? routeSignals.slice(-2).map((entry) => `${entry.actor} Â· ${entry.phase} Â· ${shortenGuideLabel(entry.content, 96)}`)
            : [contract.routing.summary]),
        ],
      };
    }
    case 'active': {
      const buildSignals = matchObservationSignals(observation, ['roundtable', 'worker', 'distiller', 'scout', 'swarm', 'patch']);
      return {
        title: 'Aktive Ausfuehrung',
        summary: currentPhase === 'active'
          ? 'Hier arbeitet das aktive Team in der spezialisierten Lane am eigentlichen Artefakt.'
          : 'Diese Phase beschreibt den konkreten Arbeitsabschnitt der Aufgabe.',
        source: 'observe',
        lines: [
          `Code-Lane: ${contract.codeLane.phase} Â· ${contract.codeLane.summary}`,
          `Execution: ${formatExecutionMeta(evidence)}`,
          summarizeWorkerModels(observation),
          ...(buildSignals.length > 0
            ? buildSignals.slice(-3).map((entry) => `${entry.actor} Â· ${entry.phase} Â· ${shortenGuideLabel(entry.content, 96)}`)
            : [timelineEntry?.meta ?? 'Noch keine sichtbaren Worker-Signale.']),
        ],
      };
    }
    case 'synthesizing':
      return {
        title: 'Synthese und Pruefung',
        summary: evidence
          ? 'Hier verdichtet Maya Build-, Runtime-, Gegenbeispiel- und Review-Signale zu einem belastbaren Stand.'
          : afterCurrent
            ? 'Diese Phase ist noch nicht erreicht.'
            : 'Noch kein Evidence Pack sichtbar; die Synthesephase hat noch nichts Verdichtetes geschrieben.',
        source: 'evidence',
        lines: evidence
          ? [
              `TSC: ${evidence.checks.tsc} Â· Build: ${evidence.checks.build}`,
              `Runtime: ${evidence.runtime_results.length} Signale, ${evidence.runtime_results.filter((result) => result.result !== 'pass').length} nicht gruen`,
              `Counterexamples: ${evidence.counterexamples_passed}/${evidence.counterexamples_tested}`,
              `Execution: ${formatExecutionMeta(evidence)}`,
              `Agreement: ${evidence.agreement_level ?? 'â€”'}`,
            ]
          : [timelineEntry?.detail ?? 'Noch keine Check-Signale sichtbar.'],
      };
    case 'delivered':
      return {
        title: 'Ergebnis liegt vor',
        summary: isManualReviewLane
          ? 'Maya hat einen verwertbaren Stand vorbereitet und haelt ihn fuer Entscheidung oder Freigabe bereit.'
          : 'Maya betrachtet das Ergebnis als bereit fuer Auslieferung oder Abschluss.',
        source: 'task + contract',
        lines: [
          `Output: ${contract.output.kind} Â· Format: ${contract.output.format}`,
          `Artefakte: ${formatArtifacts(contract.output.plannedArtifacts)}`,
          `Execution: ${formatExecutionMeta(evidence)}`,
          ...(isManualReviewLane
          ? [
              task.contract.output.kind === 'html_artifact'
                ? 'Prototype liegt sichtbar vor und wartet auf Freigabe, Revision oder Verwerfung.'
                : 'Builder meldet eine Review- oder Approval-Pflicht vor dem naechsten Schritt.',
            ]
          : [contract.output.summary]),
        ],
        notRequired: !isManualReviewLane,
      };
    case 'confirmed':
      return {
        title: 'Bestaetigter Stand',
        summary: task.commitHash
          ? 'Der Builder hat einen bestaetigten Stand mit sichtbarem Commit verankert.'
          : afterCurrent
            ? 'Diese Phase ist noch nicht erreicht.'
            : 'Die Aufgabe gilt als bestaetigt, auch wenn noch kein Commit-Hash sichtbar ist.',
        source: task.commitHash ? 'task + contract' : 'task',
        lines: task.commitHash
          ? [
              `Commit: ${task.commitHash}`,
              `Code-Lane: ${contract.codeLane.phase}`,
              `Zuletzt aktualisiert: ${formatDate(task.updatedAt)}`,
              contract.codeLane.summary,
            ]
          : [
              contract.lifecycle.summary,
              `Output: ${contract.output.kind}`,
            ],
      };
    case 'stopped':
      return {
        title: 'Fail-closed / gestoppt',
        summary: currentPhase === 'stopped'
          ? 'Der Workflow wurde bewusst gestoppt oder rueckgaengig gemacht.'
          : 'Diese Phase wurde fuer die aktuelle Task nicht benoetigt.',
        source: 'task',
        lines: currentPhase === 'stopped'
          ? [`Status: ${task.status}`, `Zuletzt aktualisiert: ${formatDate(task.updatedAt)}`, contract.codeLane.summary]
          : ['Kein Stop-Signal fuer diese Task sichtbar.'],
        notRequired: currentPhase !== 'stopped',
      };
    default:
      return null;
  }
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
      <div style={{ border: `2px solid ${TOKENS.b1}`, borderRadius: 22, background: TOKENS.card, boxShadow: `${TOKENS.shadow.card}, 0 0 0 1px rgba(255,255,255,0.04) inset`, padding: '14px 16px' }}>
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
                      Live â–¾
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
            <button onClick={() => onTogglePool(openPool)} style={{ border: 'none', background: 'transparent', color: TOKENS.text2, cursor: 'pointer', fontSize: 16 }}>âœ•</button>
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
              {note.id ? <button onClick={() => onDeleteMemory(note.id!)} style={{ border: 'none', background: 'transparent', color: TOKENS.text3, cursor: 'pointer', fontSize: 10 }}>âœ•</button> : null}
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
          Zugriff nur mit Builder-Token aus URL oder Passwort-Dialog. Der Token bleibt nur im laufenden Zustand und wird nicht im Browser gespeichert.
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
              {tokenVisible ? 'ğŸ™ˆ' : 'ğŸ‘'}
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
              ZurÃ¼ck
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => getInitialSelectedTaskId());
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const [dialogFormat, setDialogFormat] = useState<DialogFormat>('dsl');
  const [dialogActions, setDialogActions] = useState<BuilderAction[]>([]);
  const [evidencePack, setEvidencePack] = useState<BuilderEvidencePack | null>(null);
  const [taskArtifacts, setTaskArtifacts] = useState<BuilderArtifact[]>([]);
  const [taskObservation, setTaskObservation] = useState<BuilderTaskObservation | null>(null);
  const [selectedTribunePhase, setSelectedTribunePhase] = useState<TribunePhaseKey | null>(null);
  const [taskQueueFilter, setTaskQueueFilter] = useState<TaskQueueFilter>(() => getInitialTaskQueueFilter());
  const [taskQueueSort, setTaskQueueSort] = useState<TaskQueueSort>(() => getInitialTaskQueueSort());
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
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>('chat');
  const [drawerView, setDrawerView] = useState<DrawerView | null>(null);
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
    getTask: getBuilderTask,
    runTask: runBuilderTask,
    getDialog: getBuilderDialog,
    getEvidence: getBuilderEvidence,
    getArtifacts: getBuilderArtifacts,
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
  const visibleTasks = useMemo(() => {
    const filtered = taskQueueFilter === 'all'
      ? tasks
      : tasks.filter((task) => deriveTaskQueueSignal(task).priority === taskQueueFilter);
    return sortTaskQueue(filtered, taskQueueSort);
  }, [taskQueueFilter, taskQueueSort, tasks]);
  const executionState = useMemo(() => deriveExecutionState(activeTask, evidencePack), [activeTask, evidencePack]);
  const experienceMode = useMemo(() => deriveExperienceMode(activeTask, evidencePack), [activeTask, evidencePack]);
  const tribuneTimeline = useMemo(() => deriveTribuneTimeline(activeTask, evidencePack, taskObservation), [activeTask, evidencePack, taskObservation]);
  const waitingTasks = useMemo(() => tasks.filter((task) => needsUserAttention(task)), [tasks]);
  const attentionTask = useMemo(() => {
    if (needsUserAttention(activeTask)) {
      return activeTask;
    }
    return waitingTasks[0] ?? null;
  }, [activeTask, waitingTasks]);
  const mayaTribuneSentence = useMemo(() => deriveMayaTribuneSentence(activeTask, evidencePack, taskObservation), [activeTask, evidencePack, taskObservation]);
  const attentionDetail = useMemo(() => deriveAttentionDetail(attentionTask, waitingTasks.length), [attentionTask, waitingTasks.length]);
  const operatorGuidance = useMemo(
    () => deriveOperatorGuidance(activeTask, evidencePack, waitingTasks.length),
    [activeTask, evidencePack, waitingTasks.length],
  );
  const latestDialogSnippet = useMemo(() => {
    const latest = dialogBubbles[dialogBubbles.length - 1]?.content?.trim();
    if (!latest) {
      return null;
    }

    return latest.length > 420 ? `${latest.slice(0, 420).trimEnd()}...` : latest;
  }, [dialogBubbles]);
  const nonEvidenceArtifacts = useMemo(
    () => taskArtifacts.filter((artifact) => artifact.artifactType !== 'evidence_pack'),
    [taskArtifacts],
  );
  const latestPrototypeArtifact = useMemo(
    () => pickLatestArtifact(nonEvidenceArtifacts, ['promoted_prototype', 'prototype']),
    [nonEvidenceArtifacts],
  );
  const latestScreenshotArtifact = useMemo(
    () => pickLatestArtifact(nonEvidenceArtifacts, ['browser_screenshot']),
    [nonEvidenceArtifacts],
  );
  const latestApprovalArtifact = useMemo(
    () => pickLatestArtifact(nonEvidenceArtifacts, ['approval_ticket']),
    [nonEvidenceArtifacts],
  );
  const latestStructuredArtifact = useMemo(
    () => nonEvidenceArtifacts.find((artifact) => {
      const payload = toArtifactPayload(artifact);
      if (!payload) {
        return false;
      }

      return typeof payload.html !== 'string' && typeof payload.dataBase64 !== 'string';
    }) ?? null,
    [nonEvidenceArtifacts],
  );
  const screenshotPreviewSrc = useMemo(() => {
    const payload = toArtifactPayload(latestScreenshotArtifact);
    const dataBase64 = typeof payload?.dataBase64 === 'string' ? payload.dataBase64 : null;
    const contentType = typeof payload?.contentType === 'string' ? payload.contentType : 'image/png';
    return dataBase64 ? `data:${contentType};base64,${dataBase64}` : null;
  }, [latestScreenshotArtifact]);
  const deliveryArtifacts = useMemo(
    () => nonEvidenceArtifacts.filter((artifact) => artifact.artifactType !== 'approval_ticket').slice(0, 6),
    [nonEvidenceArtifacts],
  );
  const sidebarTasks = useMemo(() => sortTaskQueue(tasks, 'priority').slice(0, 8), [tasks]);
  const continuityNotes = mayaCtx?.continuityNotes ?? [];
  const builderStatus = useMemo(() => {
    if (experienceMode === 'pipeline' && activeTask) {
      const activeIndex = Math.max(0, tribuneTimeline.findIndex((entry) => entry.state === 'current' || entry.state === 'waiting' || entry.state === 'blocked'));
      return {
        left: `Pipeline aktiv Â· ${activeTask.title} Â· Phase ${activeIndex + 1} von ${tribuneTimeline.length}`,
        right: evidencePack ? `${formatExecutionChannelLabel(evidencePack.execution_summary.channel)} Â· ${evidencePack.total_tokens} Tokens` : 'Maya orchestriert gerade',
      };
    }

    if (experienceMode === 'single_specialist') {
      return {
        left: getPipelineReadinessText(pools),
        right: getSpecialistTransparencyLabel(pools, directorModel),
      };
    }

    return {
      left: getPipelineReadinessText(pools),
      right: 'Maya wartet auf deine naechste Aufgabe',
    };
  }, [activeTask, directorModel, evidencePack, experienceMode, pools, tribuneTimeline]);
  const currentTribuneEntry = useMemo(
    () => tribuneTimeline.find((entry) => entry.state === 'current' || entry.state === 'waiting' || entry.state === 'blocked') ?? tribuneTimeline[0] ?? null,
    [tribuneTimeline],
  );
  const effectiveTribunePhase = selectedTribunePhase ?? currentTribuneEntry?.key ?? null;
  const tribuneHeroTitle = activeTask
    ? `Maya arbeitet gerade an: ${activeTask.title}`
    : 'Im Moment laeuft keine Task.';
  const tribuneHeroPhaseLabel = currentTribuneEntry?.label ?? executionState.label;
  const tribuneHeroPhaseTone = currentTribuneEntry?.accent ?? executionState.accent;
  const tribuneHeroSummary = attentionTask && attentionTask.id === activeTask?.id
    ? `${tribuneHeroPhaseLabel}. Maya wartet gerade bewusst auf deine Entscheidung.`
    : activeTask
      ? `${tribuneHeroPhaseLabel}. ${executionState.detail}`
      : 'Maya wartet auf die naechste sinnvolle Aufgabe.';
  const tribunePhaseDetail = useMemo(
    () => effectiveTribunePhase
      ? deriveTribunePhaseDetail(effectiveTribunePhase, activeTask, evidencePack, taskObservation, tribuneTimeline)
      : null,
    [activeTask, effectiveTribunePhase, evidencePack, taskObservation, tribuneTimeline],
  );
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
    if (compact) {
      setSidebarExpanded(false);
    }
  }, [compact]);

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

  useEffect(() => {
    setSelectedTribunePhase(currentTribuneEntry?.key ?? null);
  }, [currentTribuneEntry?.key, selectedTaskId]);

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

  const refreshArtifacts = useCallback(async (taskId: string) => {
    try {
      const nextArtifacts = await getBuilderArtifacts(taskId);
      setTaskArtifacts(Array.isArray(nextArtifacts) ? nextArtifacts : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/not found/i.test(message)) {
        setTaskArtifacts([]);
        return;
      }
      throw error;
    }
  }, [getBuilderArtifacts]);

  const refreshObservation = useCallback(async (taskId: string) => {
    try {
      const nextObservation = await getTaskObservation(taskId);
      setTaskObservation(nextObservation);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/not found/i.test(message)) {
        setTaskObservation(null);
        return;
      }
      throw error;
    }
  }, [getTaskObservation]);

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
        setAuthError(message === 'HTTP 401' ? 'UngÃ¼ltiger Token' : message);
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

  useEffect(() => {
    try {
      localStorage.setItem(BUILDER_TASK_QUEUE_FILTER_STORAGE_KEY, taskQueueFilter);
    } catch {
      // noop
    }
  }, [taskQueueFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(BUILDER_TASK_QUEUE_SORT_STORAGE_KEY, taskQueueSort);
    } catch {
      // noop
    }
  }, [taskQueueSort]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (taskQueueFilter === 'all') {
      params.delete('queue');
    } else {
      params.set('queue', taskQueueFilter);
    }

    if (taskQueueSort === 'priority') {
      params.delete('queue_sort');
    } else {
      params.set('queue_sort', taskQueueSort);
    }

    if (selectedTaskId) {
      params.set('task', selectedTaskId);
    } else {
      params.delete('task');
    }

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, [selectedTaskId, taskQueueFilter, taskQueueSort]);

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
    void refreshArtifacts(selectedTaskId).catch((error) => {
      setPageError(error instanceof Error ? error.message : 'Artefakte konnten nicht geladen werden');
    });
    void refreshObservation(selectedTaskId).catch((error) => {
      setPageError(error instanceof Error ? error.message : 'Live-Beobachtung konnte nicht geladen werden');
    });
  }, [authenticated, selectedTaskId, dialogFormat, refreshTaskDetail, refreshDialog, refreshEvidence, refreshArtifacts, refreshObservation]);

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
    if (!authenticated || !selectedTaskId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshArtifacts(selectedTaskId).catch((error) => {
        setPageError(error instanceof Error ? error.message : 'Artefakte konnten nicht aktualisiert werden');
      });
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [authenticated, selectedTaskId, refreshArtifacts]);

  useEffect(() => {
    if (!authenticated || !selectedTaskId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshObservation(selectedTaskId).catch((error) => {
        setPageError(error instanceof Error ? error.message : 'Live-Beobachtung konnte nicht aktualisiert werden');
      });
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [authenticated, selectedTaskId, refreshObservation]);

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

  const focusTaskDetail = useCallback(() => {
    const target = document.querySelector('[data-maya-target="task-detail"]');
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const focusMayaTarget = useCallback((targetKey: string) => {
    const target = document.querySelector(`[data-maya-target="${targetKey}"]`);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleOpenAttentionTask = useCallback(() => {
    if (!attentionTask) {
      return;
    }

    setSelectedTaskId(attentionTask.id);
    setDrawerView('task');
    window.setTimeout(() => {
      focusTaskDetail();
    }, 80);
  }, [attentionTask, focusTaskDetail]);

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

    const notes = window.prompt('Revisionshinweis fÃ¼r den Prototype', 'Bitte Layout oder Flow Ã¼berarbeiten.') ?? undefined;

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
      setTaskArtifacts([]);
      setTaskObservation(null);
      await refreshTasks();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Task konnte nicht gelÃ¶scht werden');
    } finally {
      setIsBusy(false);
    }
  }, [confirmDelete, deleteBuilderTask, refreshTasks, selectedTaskId]);

  const isOperatorActionDisabled = useCallback((action: OperatorActionKey) => {
    switch (action) {
      case 'run':
        return isRunDisabled;
      case 'approve':
      case 'approve_prototype':
      case 'revise_prototype':
      case 'revert':
        return isBusy || !selectedTaskId;
      case 'inspect':
        return !activeTask;
      default:
        return true;
    }
  }, [activeTask, isBusy, isRunDisabled, selectedTaskId]);

  const handleOperatorAction = useCallback((action: OperatorActionKey) => {
    switch (action) {
      case 'run':
        void handleRunTask();
        break;
      case 'approve':
        void handleApproveTask();
        break;
      case 'approve_prototype':
        void handleApprovePrototype();
        break;
      case 'revise_prototype':
        void handleRevisePrototype();
        break;
      case 'revert':
        void handleRevertTask();
        break;
      case 'inspect':
        focusTaskDetail();
        break;
      default:
        break;
    }
  }, [
    focusMayaTarget,
    focusTaskDetail,
    handleApprovePrototype,
    handleApproveTask,
    handleRevisePrototype,
    handleRevertTask,
    handleRunTask,
  ]);

  const handleTransitionJump = useCallback((lane: string, reason: string | null) => {
    if (reason?.includes('prototype') || activeTask?.status === 'prototype_review') {
      focusMayaTarget('preview-panel');
      return;
    }

    if (lane === 'review') {
      focusMayaTarget('technical-details');
      return;
    }

    if (lane === 'runtime') {
      focusMayaTarget('pruefstand');
      return;
    }

    if (lane === 'prototype') {
      focusMayaTarget('delivery-surface');
      return;
    }

    focusMayaTarget('dialog-viewer');
  }, [activeTask?.status, focusMayaTarget]);

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
        setTaskArtifacts([]);
        setTaskObservation(null);
      }
      await refreshTasks();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Task konnte nicht gelÃ¶scht werden');
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

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Guten Morgen' : greetingHour < 18 ? 'Guten Tag' : 'Guten Abend';
  const sidebarWidth = sidebarExpanded && !compact ? 248 : 72;
  const showDrawerColumn = Boolean(drawerView) && !compact;
  const topbarStatus = builderStatus;
  /* legacy topbar status removed
  const topbarStatusLegacy = experienceMode === 'pipeline' && activeTask
    ? {
        left: `Pipeline aktiv Â· ${activeTask.title}`,
        right: evidencePack ? `${formatExecutionChannelLabel(evidencePack.execution_summary.channel)} Â· ${evidencePack.total_tokens} Tokens` : 'Maya orchestriert gerade',
      }
    : experienceMode === 'single_specialist'
      ? {
          left: getPipelineReadinessText(pools),
          right: getSpecialistTransparencyLabel(pools, directorModel),
        }
      : {
          left: getPipelineReadinessText(pools),
          right: 'Maya wartet auf deine naechste Aufgabe',
        };
  void topbarStatusLegacy;
  */

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
        <div
          style={{
            border: `2px solid ${TOKENS.b1}`,
            borderRadius: 20,
            background: TOKENS.card,
            boxShadow: TOKENS.shadow.card,
            padding: compact ? '14px 14px' : '14px 18px',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: compact ? 'start' : 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setSidebarExpanded((current) => !current)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      border: `2px solid ${sidebarExpanded ? TOKENS.cyan : TOKENS.b1}`,
                      background: sidebarExpanded ? 'rgba(34,211,238,0.12)' : TOKENS.bg2,
                      color: sidebarExpanded ? TOKENS.text : TOKENS.text2,
                      fontSize: 18,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {sidebarExpanded ? 'âˆ’' : '+'}
                  </button>
                  <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.16em', fontFamily: TOKENS.font.body }}>
                    Maya Stage
                  </div>
                </div>
                <div style={{ fontFamily: TOKENS.font.display, fontSize: compact ? 20 : 24, color: TOKENS.text, letterSpacing: '0.04em' }}>
                  {greeting}. Builder bleibt im Dialog mit Maya.
                </div>
                <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.6, maxWidth: 860 }}>
                  {topbarStatus.left}. {topbarStatus.right}.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', color: TOKENS.text3, fontSize: 12 }}>
                <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.b2}`, padding: '6px 10px', background: TOKENS.bg2 }}>Token {maskToken(token)}</span>
                <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.b2}`, padding: '6px 10px', background: TOKENS.bg2 }}>{tasks.length} Tasks</span>
                <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.b2}`, padding: '6px 10px', background: TOKENS.bg2 }}>{files.length} Files</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => navigate('/')} style={{ borderRadius: 999, border: `2px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                Zur App
              </button>
              <button onClick={() => { void refreshTasks(); void refreshFiles(); void refreshMayaContext().catch(() => {}); if (patrolOpen) { void refreshPatrolFeed(); } }} style={{ borderRadius: 999, border: `2px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.14)', color: TOKENS.text, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                Refresh
              </button>
              <button onClick={handleStartMayaTour} style={{ borderRadius: 999, border: `2px solid ${TOKENS.gold}`, background: 'rgba(124,106,247,0.14)', color: TOKENS.text, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                Maya Tour
              </button>
              <button onClick={() => { setSidebarExpanded(true); setSidebarView('tasks'); }} style={{ borderRadius: 999, border: `2px solid ${sidebarView === 'tasks' ? TOKENS.cyan : TOKENS.b1}`, background: sidebarView === 'tasks' ? 'rgba(34,211,238,0.12)' : TOKENS.bg2, color: sidebarView === 'tasks' ? TOKENS.text : TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                Queue
              </button>
              <button onClick={() => { setSidebarExpanded(true); setSidebarView('files'); }} style={{ borderRadius: 999, border: `2px solid ${sidebarView === 'files' ? TOKENS.purple : TOKENS.b1}`, background: sidebarView === 'files' ? 'rgba(124,106,247,0.14)' : TOKENS.bg2, color: sidebarView === 'files' ? TOKENS.text : TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                Files
              </button>
              <button onClick={() => { setSidebarExpanded(true); setSidebarView('patrol'); if (!patrolOpen) { setPatrolOpen(true); } }} style={{ borderRadius: 999, border: `2px solid ${sidebarView === 'patrol' ? '#f97316' : TOKENS.b1}`, background: sidebarView === 'patrol' ? 'rgba(249,115,22,0.14)' : TOKENS.bg2, color: sidebarView === 'patrol' ? '#fdba74' : TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                Patrol
              </button>
              <button onClick={() => { setSidebarExpanded(true); setSidebarView('notes'); }} style={{ borderRadius: 999, border: `2px solid ${sidebarView === 'notes' ? TOKENS.gold : TOKENS.b1}`, background: sidebarView === 'notes' ? 'rgba(212,175,55,0.14)' : TOKENS.bg2, color: sidebarView === 'notes' ? TOKENS.text : TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                Notes
              </button>
              <button onClick={() => { setDrawerView((current) => current === 'task' ? null : 'task'); }} style={{ borderRadius: 999, border: `2px solid ${drawerView === 'task' ? TOKENS.green : TOKENS.b1}`, background: drawerView === 'task' ? 'rgba(74,222,128,0.12)' : TOKENS.bg2, color: drawerView === 'task' ? TOKENS.text : TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                Task Drawer
              </button>
              <button onClick={() => { setDrawerView((current) => current === 'output' ? null : 'output'); }} style={{ borderRadius: 999, border: `2px solid ${drawerView === 'output' ? TOKENS.gold : TOKENS.b1}`, background: drawerView === 'output' ? 'rgba(212,175,55,0.12)' : TOKENS.bg2, color: drawerView === 'output' ? TOKENS.text : TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                Output Drawer
              </button>
              <button onClick={() => { setDrawerView((current) => current === 'models' ? null : 'models'); setShowConfig(true); }} style={{ borderRadius: 999, border: `2px solid ${drawerView === 'models' || showConfig ? '#7c6af7' : TOKENS.b1}`, background: drawerView === 'models' || showConfig ? 'rgba(124,106,247,0.14)' : TOKENS.bg2, color: drawerView === 'models' || showConfig ? '#c4b5fd' : TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                Model & Config
              </button>
              <a
                data-maya-target="patrol-console"
                href="/patrol?opus_token=opus-bridge-2026-geheim"
                style={{
                  borderRadius: 999,
                  border: '2px solid #f97316',
                  background: 'rgba(249,115,22,0.14)',
                  color: '#fdba74',
                  textDecoration: 'none',
                  padding: '9px 14px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Patrol Console
              </a>
            </div>
          </div>
        </div>
        {/* legacy header removed
          style={{
            border: `1.5px solid ${TOKENS.b2}`,
            borderRadius: 24,
            background: TOKENS.card,
            boxShadow: TOKENS.shadow.card,
            padding: compact ? 18 : 22,
            marginBottom: 18,
            display: 'none',
          }}
        >
          {null}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, color: TOKENS.text2, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: TOKENS.font.body }}>
              Maya-Centered Universal Builder
            </div>
            <div style={{ marginTop: 8, fontFamily: TOKENS.font.display, fontSize: compact ? 28 : 34, color: TOKENS.text, letterSpacing: '0.05em' }}>
              Builder Studio
            </div>
            <div style={{ marginTop: 8, fontFamily: TOKENS.font.body, fontSize: 13, lineHeight: 1.7, color: TOKENS.text2, maxWidth: 760 }}>
              Task-Orchestrierung, Dialog-Review und Evidence Packs in einer operativen OberflÃ¤che.
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
                ğŸ§­ Maya Tour
              </button>
              <button onClick={() => setShowConfig(!showConfig)} style={{ borderRadius: 999, border: `1.5px solid ${showConfig ? '#7c6af7' : TOKENS.b1}`, background: showConfig ? 'rgba(124,106,247,0.14)' : 'transparent', color: showConfig ? '#7c6af7' : TOKENS.text2, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {showConfig ? 'Config âœ•' : 'Config'}
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
                ğŸ›¡ï¸ Patrol Console
              </a>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', color: TOKENS.text2, fontSize: 12 }}>
              <span>Token {maskToken(token)}</span>
              <span>{tasks.length} Tasks</span>
              <span>{files.length} Files</span>
            </div>
          </div>
        */}

        {pageError ? (
          <div style={{ marginBottom: 16, borderRadius: 16, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(127,29,29,0.24)', color: '#fecaca', padding: '12px 14px', fontSize: 13 }}>
            {pageError}
          </div>
        ) : null}

        {experienceMode === 'pipeline' || drawerView === 'models' ? (
          <PoolBar
            pools={pools}
            openPool={openPool}
            onTogglePool={handleTogglePool}
            onToggleModel={handleTogglePoolModel}
            taskId={selectedTaskId}
            fetchObservation={getTaskObservation}
          />
        ) : null}

        {sessionSummary && (sidebarView === 'patrol' || compact || experienceMode === 'pipeline') ? (
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
              <span style={{ fontSize: 12, color: TOKENS.gold, fontWeight: 700, width: 16, flexShrink: 0 }}>{patrolOpen ? 'â–¾' : 'â–¸'}</span>
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
                        ? `${patrolStatus.totalFindings ?? 0} Findings Â· ${patrolStatus.crossConfirmed ?? 0} cross-confirmed Â· ${patrolStatus.triaged ?? 0} triaged`
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
                              <span style={{ fontSize: 11, color: TOKENS.text3 }}>{expanded ? 'â–¾' : 'â–¸'}</span>
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
            gridTemplateColumns: compact ? '1fr' : `${sidebarWidth}px minmax(0, 1fr) ${showDrawerColumn ? '360px' : '0px'}`,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'grid', gap: 18 }}>
            <div
              style={{
                borderRadius: 20,
                border: `2px solid ${TOKENS.b1}`,
                background: TOKENS.card,
                boxShadow: TOKENS.shadow.card,
                padding: compact ? 12 : 14,
                display: 'grid',
                gap: 12,
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: sidebarExpanded || compact ? 11 : 10, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
                  Sidebar
                </div>
                {[
                  { key: 'chat', label: 'Chat', accent: TOKENS.gold },
                  { key: 'tasks', label: 'Queue', accent: TOKENS.cyan },
                  { key: 'files', label: 'Files', accent: TOKENS.purple },
                  { key: 'patrol', label: 'Patrol', accent: '#f97316' },
                  { key: 'notes', label: 'Notes', accent: TOKENS.green },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setSidebarExpanded(true);
                      setSidebarView(item.key as SidebarView);
                    }}
                    style={{
                      borderRadius: 14,
                      border: `2px solid ${sidebarView === item.key ? item.accent : TOKENS.b2}`,
                      background: sidebarView === item.key ? `${item.accent}18` : TOKENS.bg2,
                      color: sidebarView === item.key ? TOKENS.text : TOKENS.text2,
                      padding: sidebarExpanded || compact ? '10px 12px' : '10px 0',
                      minHeight: 42,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: sidebarExpanded || compact ? 'left' : 'center',
                    }}
                  >
                    {sidebarExpanded || compact ? item.label : item.label.slice(0, 1)}
                  </button>
                ))}
              </div>
              {sidebarExpanded || compact ? (
                <div style={{ borderTop: `2px solid ${TOKENS.b2}`, paddingTop: 12, display: 'grid', gap: 10 }}>
                  {sidebarView === 'chat' ? (
                    <>
                      <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                        Maya Einstieg
                      </div>
                      <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                        Aufgaben entstehen hier aus dem Dialog mit Maya, nicht aus einem Formular. Beschreibe den nÃ¤chsten Schritt im Chat und Maya routet ihn in die passende Arbeitsform.
                      </div>
                      <button
                        type="button"
                        onClick={() => focusMayaTarget('maya-chat')}
                        style={{ borderRadius: 14, border: `2px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.12)', color: TOKENS.text, padding: '10px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Zum Maya-Chat
                      </button>
                    </>
                  ) : null}
                  {sidebarView === 'tasks' ? (
                    <>
                      <div style={{ fontSize: 11, color: TOKENS.cyan, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                        Aufmerksamkeit zuerst
                      </div>
                      {sidebarTasks.length > 0 ? sidebarTasks.map((task) => (
                        <button
                          key={`sidebar-${task.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setDrawerView('task');
                          }}
                          style={{
                            textAlign: 'left',
                            borderRadius: 14,
                            border: `2px solid ${selectedTaskId === task.id ? TOKENS.cyan : TOKENS.b2}`,
                            background: selectedTaskId === task.id ? 'rgba(34,211,238,0.12)' : TOKENS.bg2,
                            color: TOKENS.text,
                            padding: '10px 12px',
                            cursor: 'pointer',
                            display: 'grid',
                            gap: 4,
                          }}
                        >
                          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{task.title}</span>
                          <span style={{ fontSize: 11.5, color: TOKENS.text3 }}>{deriveTaskQueueSignal(task).label} Â· {task.status}</span>
                        </button>
                      )) : (
                        <div style={{ fontSize: 12.5, color: TOKENS.text3 }}>Noch keine Builder-Tasks vorhanden.</div>
                      )}
                    </>
                  ) : null}
                  {sidebarView === 'files' ? (
                    <>
                      <div style={{ fontSize: 11, color: TOKENS.purple, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                        Repo Einstieg
                      </div>
                      <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                        {selectedFilePath ?? `${files.length} Builder-Dateien indexiert`}
                      </div>
                      <button
                        type="button"
                        onClick={() => focusMayaTarget('file-explorer')}
                        style={{ borderRadius: 14, border: `2px solid ${TOKENS.purple}`, background: 'rgba(124,106,247,0.14)', color: TOKENS.text, padding: '10px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Zum File Explorer
                      </button>
                    </>
                  ) : null}
                  {sidebarView === 'patrol' ? (
                    <>
                      <div style={{ fontSize: 11, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                        Patrol Feed
                      </div>
                      <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                        {patrolStatus
                          ? `${patrolStatus.totalFindings ?? 0} Findings Â· ${patrolStatus.crossConfirmed ?? 0} cross-confirmed`
                          : 'Patrol-Status wird geladen oder ist noch nicht geoeffnet.'}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPatrolOpen((current) => !current);
                          focusMayaTarget('session');
                        }}
                        style={{ borderRadius: 14, border: '2px solid #f97316', background: 'rgba(249,115,22,0.14)', color: TOKENS.text, padding: '10px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {patrolOpen ? 'Patrol einklappen' : 'Patrol zeigen'}
                      </button>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {(Object.keys(PATROL_SEVERITY_CONFIG) as BuilderPatrolSeverity[]).map((severity) => {
                          const config = PATROL_SEVERITY_CONFIG[severity];
                          return (
                            <div key={`sidebar-patrol-${severity}`} style={{ borderRadius: 14, border: `2px solid ${config.color}33`, background: config.bg, color: config.color, padding: '9px 10px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                              <span>{config.label}</span>
                              <span>{patrolStatus?.bySeverity?.[severity] ?? 0}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                  {sidebarView === 'notes' ? (
                    <>
                      <div style={{ fontSize: 11, color: TOKENS.green, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                        Continuity
                      </div>
                      {continuityNotes.length > 0 ? continuityNotes.slice(0, 3).map((note) => (
                        <div key={note.id} style={{ borderRadius: 14, border: `2px solid ${TOKENS.b2}`, background: TOKENS.bg2, padding: '10px 12px', display: 'grid', gap: 4 }}>
                          <div style={{ fontSize: 11, color: TOKENS.text3 }}>{formatDate(note.updatedAt)}</div>
                          <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.55 }}>{note.summary}</div>
                        </div>
                      )) : (
                        <div style={{ fontSize: 12.5, color: TOKENS.text3 }}>Noch keine Continuity Notes gespeichert.</div>
                      )}
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
            {sidebarView === 'tasks' || compact ? (
            <div data-maya-target="tasklist">
              <BuilderPanel title="Task-Liste" subtitle="Aktive Builder-Queues, Prioritaetssignale und Statusfarben." accent={TOKENS.cyan}>
                <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: compact ? '1fr' : '1fr 1fr' }}>
                    <select value={taskQueueFilter} onChange={(event) => setTaskQueueFilter(event.target.value as TaskQueueFilter)} style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '10px 12px', fontSize: 12.5 }}>
                      <option value="all">Alle Prioritaeten</option>
                      <option value="attention">Nur Aufmerksamkeit</option>
                      <option value="active">Nur Laufend</option>
                      <option value="ready">Nur Startklar</option>
                      <option value="delivered">Nur Bereit</option>
                      <option value="done">Nur Abgeschlossen</option>
                    </select>
                    <select value={taskQueueSort} onChange={(event) => setTaskQueueSort(event.target.value as TaskQueueSort)} style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '10px 12px', fontSize: 12.5 }}>
                      <option value="priority">Sort: Prioritaet zuerst</option>
                      <option value="updated">Sort: Zuletzt aktualisiert</option>
                      <option value="title">Sort: Titel A-Z</option>
                    </select>
                  </div>
                  <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
                    {visibleTasks.length} von {tasks.length} Tasks sichtbar
                  </div>
                </div>
                {visibleTasks.map((task) => {
                  const selected = task.id === selectedTaskId;
                  const isActive = !['done', 'cancelled', 'blocked', 'deleted'].includes(task.status);
                  const queueSignal = deriveTaskQueueSignal(task);
                  const cardTone = deriveTaskCardTone(task, selected);
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
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setDrawerView('task');
                        }}
                        style={{
                          textAlign: 'left',
                          borderRadius: 18,
                          border: `1.5px solid ${cardTone.border}`,
                          background: cardTone.background,
                          boxShadow: `0 0 0 1px ${cardTone.glow} inset`,
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
                          <div style={{ display: 'grid', gap: 6, justifyItems: 'end', flexShrink: 0 }}>
                            <span
                              style={{
                                borderRadius: 999,
                                border: `1px solid ${TOKENS.b1}`,
                                color: STATUS_COLORS[task.status] ?? TOKENS.text2,
                                padding: '3px 8px',
                                fontSize: 11,
                                textTransform: 'uppercase',
                                maxWidth: 80,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {task.status}
                            </span>
                            <span
                              style={{
                                borderRadius: 999,
                                border: `1px solid ${queueSignal.accent}55`,
                                background: cardTone.chipBg,
                                color: queueSignal.accent,
                                padding: '3px 8px',
                                fontSize: 10.5,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {queueSignal.label}
                            </span>
                          </div>
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
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 11.5,
                            lineHeight: 1.55,
                            color: queueSignal.accent,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                          }}
                        >
                          {queueSignal.summary}
                        </div>
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 10.5, color: TOKENS.text3, borderRadius: 999, border: `1px solid ${TOKENS.b3}`, padding: '3px 7px', background: 'rgba(255,255,255,0.03)' }}>
                            {task.contract.lifecycle.phase}
                          </span>
                          <span style={{ fontSize: 10.5, color: TOKENS.text3, borderRadius: 999, border: `1px solid ${TOKENS.b3}`, padding: '3px 7px', background: 'rgba(255,255,255,0.03)' }}>
                            {task.requestedOutputKind}
                          </span>
                          <span style={{ fontSize: 10.5, color: TOKENS.text3 }}>
                            {formatLaneList(task.contract.routing.activeLanes)}
                          </span>
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
                            Ã—
                          </button>
                        ) : null}
                        <button
                          onClick={() => { void handleDeleteInline(task.id); }}
                          title="Task lÃ¶schen"
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
                          ğŸ—‘
                        </button>
                      </div>
                    </div>
                  );
                })}
                  {tasks.length === 0 ? <div style={{ fontSize: 13, color: TOKENS.text2 }}>Noch keine Builder-Tasks vorhanden.</div> : null}
                  {tasks.length > 0 && visibleTasks.length === 0 ? <div style={{ fontSize: 13, color: TOKENS.text2 }}>Fuer diesen Filter sind gerade keine Tasks sichtbar.</div> : null}
                </div>
              </BuilderPanel>
            </div>
            ) : null}

            {sidebarView === 'files' || compact ? (
            <div data-maya-target="file-explorer">
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
                  <div style={{ fontSize: 12, color: TOKENS.text3, marginBottom: 8 }}>{selectedFilePath ?? 'Keine Datei gewÃ¤hlt'}</div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.55, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                    {selectedFileContent ? toLines(selectedFileContent).join('\n') : 'Dateiinhalt erscheint hier als kurzer Preview-Ausschnitt.'}
                  </pre>
                </div>
              </div>
            </BuilderPanel>
            </div>
            ) : null}
            {sidebarView === 'notes' || compact ? (
            <BuilderPanel title="Context" subtitle="Continuity Notes und Memory-Episoden fuer Maya im einklappbaren Sidebar-Kontext." accent={TOKENS.gold}>
              <ContextPanel ctx={mayaCtx} onDeleteMemory={(id) => { void handleDeleteMemory(id); }} onAddNote={(summary) => { void handleAddNote(summary); }} />
            </BuilderPanel>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            <div data-maya-target="tribune-main">
              <BuilderPanel title="Live Tribune" subtitle="Was passiert gerade, warum und wartet Maya auf dich oder nicht?" accent={TOKENS.purple}>
                {activeTask ? (
                  <div style={{ display: 'grid', gap: 14 }}>
                    <div
                      style={{
                        borderRadius: 22,
                        border: `1.5px solid ${tribuneHeroPhaseTone}55`,
                        background: `linear-gradient(135deg, ${tribuneHeroPhaseTone}16, rgba(255,255,255,0.03))`,
                        padding: compact ? '16px 16px' : '18px 20px',
                        display: 'grid',
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: 11, color: tribuneHeroPhaseTone, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
                        First Cognition
                      </div>
                      <div style={{ fontSize: compact ? 24 : 30, color: TOKENS.text, fontFamily: TOKENS.font.display, lineHeight: 1.2 }}>
                        {tribuneHeroTitle}
                      </div>
                      <div style={{ fontSize: 15, color: TOKENS.text2, lineHeight: 1.7, maxWidth: 920 }}>
                        {tribuneHeroSummary}
                      </div>
                    </div>

                    {attentionTask && attentionDetail ? (
                      <div
                        style={{
                          borderRadius: 18,
                          border: `1.5px solid ${TOKENS.gold}66`,
                          background: 'rgba(212,175,55,0.12)',
                          padding: '14px 16px',
                          display: 'grid',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ display: 'grid', gap: 6 }}>
                            <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                              Maya braucht dich kurz
                            </div>
                            <div style={{ fontSize: 18, color: TOKENS.text, fontFamily: TOKENS.font.display }}>
                              {attentionTask.title}
                            </div>
                          </div>
                          <div style={{ minWidth: 28, height: 28, borderRadius: '50%', background: `${TOKENS.gold}22`, border: `1px solid ${TOKENS.gold}55`, display: 'grid', placeItems: 'center', color: TOKENS.gold, fontWeight: 700 }}>
                            M
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                          {attentionDetail}
                        </div>
                        <div style={{ fontSize: 11.5, color: TOKENS.text3, fontFamily: TOKENS.font.body }}>
                          {attentionTask.status === 'prototype_review'
                            ? 'Ich habe einen sichtbaren Zwischenstand vorbereitet. Bitte entscheide jetzt bewusst.'
                            : 'Ich bin an einem Punkt, an dem ich nicht still weiterlanden sollte.'}
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={handleOpenAttentionTask}
                            style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.16)', color: TOKENS.text, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            {attentionTask.id === activeTask.id ? 'Zum Entscheidungsblock' : 'Zu dieser Task'}
                          </button>
                          {attentionTask.id === activeTask.id && attentionTask.status === 'prototype_review' ? (
                            <button
                              type="button"
                              onClick={() => { void handleApprovePrototype(); }}
                              disabled={isBusy || !selectedTaskId}
                              style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.green}`, background: 'rgba(74,222,128,0.10)', color: TOKENS.text, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: isBusy ? 0.7 : 1 }}
                            >
                              Prototype freigeben
                            </button>
                          ) : null}
                          {attentionTask.id === activeTask.id && attentionTask.status !== 'prototype_review' ? (
                            <button
                              type="button"
                              onClick={() => { void handleApproveTask(); }}
                              disabled={isBusy || !selectedTaskId}
                              style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.green}`, background: 'rgba(74,222,128,0.10)', color: TOKENS.text, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: isBusy ? 0.7 : 1 }}
                            >
                              Freigeben
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                        Sichtbarer Task-Pfad
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                        {tribuneTimeline.map((entry, index) => {
                          const stateStyles: Record<TribuneTimelineEntry['state'], { border: string; background: string; dot: string; text: string; badge: string }> = {
                            done: { border: `${TOKENS.green}44`, background: 'rgba(74,222,128,0.08)', dot: TOKENS.green, text: TOKENS.text, badge: 'Durchlaufen' },
                            current: { border: `${entry.accent}66`, background: `${entry.accent}16`, dot: entry.accent, text: TOKENS.text, badge: 'Aktiv' },
                            pending: { border: TOKENS.b3, background: 'rgba(255,255,255,0.02)', dot: TOKENS.text3, text: TOKENS.text2, badge: 'Ausstehend' },
                            waiting: { border: `${TOKENS.gold}66`, background: 'rgba(212,175,55,0.12)', dot: TOKENS.gold, text: TOKENS.text, badge: 'Wartet auf dich' },
                            blocked: { border: `${TOKENS.rose}66`, background: 'rgba(244,114,182,0.12)', dot: TOKENS.rose, text: TOKENS.text, badge: 'Gestoppt' },
                          };
                          const style = stateStyles[entry.state];

                          return (
                            <button
                              type="button"
                              key={entry.key}
                              onClick={() => setSelectedTribunePhase(entry.key)}
                              style={{
                                borderRadius: 16,
                                border: `1.5px solid ${effectiveTribunePhase === entry.key ? entry.accent : style.border}`,
                                background: effectiveTribunePhase === entry.key ? `${entry.accent}18` : style.background,
                                padding: '12px 12px 13px',
                                display: 'grid',
                                gap: 8,
                                minHeight: compact ? 92 : 108,
                                alignContent: 'start',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                                <span style={{ width: 9, height: 9, borderRadius: '50%', background: style.dot, boxShadow: entry.state === 'current' ? `0 0 12px ${style.dot}66` : 'none', display: 'inline-block', flexShrink: 0 }} />
                                <span style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                  Schritt {index + 1}
                                </span>
                              </div>
                              <div style={{ fontSize: 14, color: style.text, fontWeight: 700, lineHeight: 1.35 }}>
                                {entry.label}
                              </div>
                              <div style={{ fontSize: 11.5, color: entry.state === 'current' || entry.state === 'waiting' || entry.state === 'blocked' ? style.text : TOKENS.text3, lineHeight: 1.5 }}>
                                {style.badge}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ borderRadius: 18, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '13px 14px', display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                        Maya sagt gerade
                      </div>
                      <div style={{ fontSize: 15, color: TOKENS.text, lineHeight: 1.75 }}>
                        {mayaTribuneSentence}
                      </div>
                      {currentTribuneEntry ? (
                        <div style={{ display: 'grid', gap: 4, borderTop: `1px solid ${TOKENS.b3}`, paddingTop: 8 }}>
                          <div style={{ fontSize: 13, color: currentTribuneEntry.accent, fontWeight: 700 }}>
                            {currentTribuneEntry.label}
                          </div>
                          <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                            {currentTribuneEntry.detail}
                          </div>
                          <div style={{ fontSize: 11, color: TOKENS.text3, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                            {currentTribuneEntry.meta}
                          </div>
                        </div>
                      ) : null}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                        <button type="button" onClick={() => focusMayaTarget('delivery-surface')} style={{ borderRadius: 999, border: `1px solid ${TOKENS.b1}`, background: 'rgba(255,255,255,0.04)', color: TOKENS.text2, padding: '6px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                          Zum Output
                        </button>
                        <button type="button" onClick={() => focusMayaTarget('dialog-viewer')} style={{ borderRadius: 999, border: `1px solid ${TOKENS.b1}`, background: 'rgba(255,255,255,0.04)', color: TOKENS.text2, padding: '6px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                          Zum Dialog
                        </button>
                        <button type="button" onClick={() => focusMayaTarget('technical-details')} style={{ borderRadius: 999, border: `1px solid ${TOKENS.b1}`, background: 'rgba(255,255,255,0.04)', color: TOKENS.text2, padding: '6px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                          Zu Transitions
                        </button>
                        {previewUrl ? (
                          <button type="button" onClick={() => focusMayaTarget('preview-panel')} style={{ borderRadius: 999, border: `1px solid ${TOKENS.gold}55`, background: 'rgba(212,175,55,0.10)', color: TOKENS.gold, padding: '6px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                            Zum Preview
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {operatorGuidance ? (
                      <div style={{ borderRadius: 18, border: `1.5px solid ${operatorGuidance.accent}55`, background: `linear-gradient(135deg, ${operatorGuidance.accent}12, rgba(255,255,255,0.03))`, padding: '13px 14px', display: 'grid', gap: 10 }}>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <div style={{ fontSize: 11, color: operatorGuidance.accent, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                            Operator Next Step
                          </div>
                          <div style={{ fontSize: 16, color: TOKENS.text, fontFamily: TOKENS.font.display }}>
                            {operatorGuidance.title}
                          </div>
                          <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                            {operatorGuidance.summary}
                          </div>
                          <div style={{ fontSize: 11.5, color: TOKENS.text3, lineHeight: 1.6 }}>
                            {operatorGuidance.detail}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {operatorGuidance.actions.map((action) => {
                            const tones: Record<OperatorActionSuggestion['tone'], { border: string; background: string; color: string }> = {
                              primary: { border: TOKENS.cyan, background: 'rgba(34,211,238,0.12)', color: TOKENS.text },
                              warning: { border: TOKENS.gold, background: 'rgba(212,175,55,0.12)', color: TOKENS.text },
                              neutral: { border: TOKENS.b1, background: 'rgba(255,255,255,0.04)', color: TOKENS.text2 },
                              danger: { border: TOKENS.rose, background: 'rgba(244,114,182,0.12)', color: TOKENS.text },
                            };
                            const tone = tones[action.tone];
                            const disabled = isOperatorActionDisabled(action.key);

                            return (
                              <button
                                type="button"
                                key={action.key}
                                onClick={() => handleOperatorAction(action.key)}
                                disabled={disabled}
                                style={{
                                  borderRadius: 999,
                                  border: `1.5px solid ${tone.border}`,
                                  background: tone.background,
                                  color: tone.color,
                                  padding: '9px 14px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: disabled ? 'not-allowed' : 'pointer',
                                  opacity: disabled ? 0.45 : 1,
                                }}
                              >
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {tribunePhaseDetail ? (
                      <div style={{ borderRadius: 18, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '13px 14px', display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                            Phase im Detail
                          </div>
                          <div style={{ fontSize: 11, color: tribunePhaseDetail.notRequired ? TOKENS.text3 : TOKENS.cyan, fontWeight: 700 }}>
                            Quelle: {tribunePhaseDetail.source}
                          </div>
                        </div>
                        <div style={{ fontSize: 16, color: TOKENS.text, fontFamily: TOKENS.font.display }}>
                          {tribunePhaseDetail.title}
                        </div>
                        <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                          {tribunePhaseDetail.summary}
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {tribunePhaseDetail.lines.map((line, index) => (
                            <div key={`${tribunePhaseDetail.title}-${index}`} style={{ borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '9px 11px', fontSize: 12, color: TOKENS.text2, lineHeight: 1.55 }}>
                              {line}
                            </div>
                          ))}
                        </div>
                        {tribunePhaseDetail.notRequired ? (
                          <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
                            Diese Phase war fuer die aktuelle Task nicht erforderlich und ist deshalb bewusst nicht weiter ausgefaltet.
                          </div>
                        ) : null}
                        {tribunePhaseDetail.note ? (
                          <div style={{ fontSize: 11.5, color: TOKENS.text3, borderTop: `1px solid ${TOKENS.b3}`, paddingTop: 8 }}>
                            {tribunePhaseDetail.note}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 14 }}>
                    <div style={{ borderRadius: 20, border: `2px solid ${TOKENS.gold}66`, background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(255,255,255,0.03))', padding: compact ? '16px 16px' : '18px 20px', display: 'grid', gap: 10 }}>
                      <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                        Default Mode
                      </div>
                      <div style={{ fontSize: compact ? 24 : 28, color: TOKENS.text, fontFamily: TOKENS.font.display }}>
                        {greeting}. Sprich mit Maya, nicht mit einem Task-Formular.
                      </div>
                      <div style={{ fontSize: 14, color: TOKENS.text2, lineHeight: 1.7 }}>
                        Builder startet jetzt dialogisch. Beschreibe die Aufgabe im Maya-Chat; Intent, Output und Routing entstehen aus der Kommunikation und erscheinen danach erst als strukturierte Task.
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}66`, background: 'rgba(212,175,55,0.10)', color: TOKENS.text, padding: '5px 10px', fontSize: 11.5, fontWeight: 700 }}>Dialog first</span>
                        <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.cyan}66`, background: 'rgba(34,211,238,0.10)', color: TOKENS.text, padding: '5px 10px', fontSize: 11.5, fontWeight: 700 }}>Keine manuelle Task-Erstellung</span>
                        <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.purple}66`, background: 'rgba(124,106,247,0.10)', color: TOKENS.text, padding: '5px 10px', fontSize: 11.5, fontWeight: 700 }}>{experienceMode === 'single_specialist' ? 'Single Specialist' : 'Universal Maya Studio'}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>
                      Maya wartet auf deine naechste klare Aufgabe. Sobald eine Task aktiv ist, wird hier zuerst sichtbar, was gerade passiert, warum und ob Maya gerade deine Entscheidung braucht.
                    </div>
                  </div>
                )}
              </BuilderPanel>
            </div>

            <div data-maya-target="dialog-viewer">
            <BuilderPanel title="Dialog Viewer" subtitle="Rueckfragen, Begruendungen und Builder-Dialoge. Sekundaer zur Tribune, aber weiter voll nutzbar." accent={TOKENS.gold}>
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
                    {activeChatLabel} Â· {activeChatEndpoint}
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
                      ? 'Beschreibe den naechsten Builder-Schritt â€” Maya Brain kann analysieren, delegieren und Actions ausfuehren.'
                      : 'Beschreibe was du aendern willst â€” Maya erstellt den Task automatisch.'}
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
                            âœ¨ Task erstellt
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
                                  read-file Â· {preview.path}
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
                Aktiver Task: {activeTask?.title ?? 'â€”'}
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
                      <div style={{ marginTop: 4, fontSize: 12, color: TOKENS.text3 }}>Runde {bubble.roundNumber || 'â€”'} Â· {bubble.role}</div>
                    </div>
                    <div style={{ fontSize: 11, color: TOKENS.text3 }}>{formatDate(bubble.createdAt)}</div>
                  </div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12.5, lineHeight: 1.7, color: TOKENS.text, fontFamily: dialogFormat === 'dsl' ? 'ui-monospace, SFMono-Regular, monospace' : TOKENS.font.body }}>
                    {bubble.content}
                  </pre>
                </article>
              ))}
              {dialogBubbles.length === 0 ? <div style={{ fontSize: 14, color: TOKENS.text2 }}>Noch kein Dialog fÃ¼r den gewÃ¤hlten Task vorhanden.</div> : null}
            </div>
            </BuilderPanel>
          </div>
          </div>

          {showDrawerColumn || compact ? (
          <div style={{ display: 'grid', gap: 18 }}>
            {drawerView === 'task' || compact ? (
            <div data-maya-target="task-detail">
              <BuilderPanel title="Task Detail" subtitle="Steuerung und Aktionen fuer die gewaehlte Task. Nicht die Hauptbuehne." accent={TOKENS.green}>
                <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ borderRadius: 16, border: `2px solid ${TOKENS.b2}`, background: TOKENS.bg2, padding: '12px 14px', display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                      Dialog first
                    </div>
                    <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                      Neue Tasks werden nicht manuell angelegt. Beschreibe die Aufgabe im Maya-Chat, Maya schneidet daraus Intent, Output und Routing.
                    </div>
                    <button
                      type="button"
                      onClick={() => focusMayaTarget('maya-chat')}
                      style={{ justifySelf: 'start', borderRadius: 999, border: `2px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.12)', color: TOKENS.text, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Zum Chat
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${TOKENS.b3}`, paddingTop: 14, display: 'grid', gap: 10 }}>
                  {showConfig && (
                    <div style={{ border: `1.5px solid rgba(124,106,247,0.3)`, borderRadius: 18, background: TOKENS.card, overflow: 'hidden', marginBottom: 10 }}>
                      <BuilderConfigPanel token={token} ctx={mayaCtx} />
                    </div>
                  )}
                  {activeTask ? (
                    <div data-maya-target="workspace-panel" style={{ borderRadius: 18, border: `1.5px solid ${operatorGuidance?.accent ?? TOKENS.b2}44`, background: `linear-gradient(135deg, ${(operatorGuidance?.accent ?? TOKENS.b2)}12, rgba(255,255,255,0.03))`, padding: '13px 14px', display: 'grid', gap: 12 }}>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <div style={{ fontSize: 11, color: operatorGuidance?.accent ?? TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                          Active Workspace
                        </div>
                        <div style={{ fontSize: 17, color: TOKENS.text, fontFamily: TOKENS.font.display }}>
                          {operatorGuidance?.title ?? executionState.label}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 10 }}>
                        <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', display: 'grid', gap: 5 }}>
                          <div style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                            Was Maya jetzt braucht
                          </div>
                          <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                            {operatorGuidance?.summary ?? executionState.detail}
                          </div>
                        </div>
                        <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', display: 'grid', gap: 5 }}>
                          <div style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                            Was als NÃ¤chstes lieferbar ist
                          </div>
                          <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                            {activeTask.contract.output.summary}
                          </div>
                          <div style={{ fontSize: 11, color: TOKENS.text3 }}>
                            Plan: {activeTask.contract.output.plannedArtifacts.join(', ') || 'â€”'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div
                    style={{
                      borderRadius: 18,
                      border: `1.5px solid ${executionState.accent}44`,
                      background: `${executionState.accent}14`,
                      padding: '12px 14px',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 11, color: executionState.accent, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                      Jetzt gerade
                    </div>
                    <div style={{ fontSize: 19, color: TOKENS.text, fontFamily: TOKENS.font.display }}>
                      {executionState.label}
                    </div>
                    <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                      {executionState.detail}
                    </div>
                  </div>
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
                    {activeTask?.title ?? 'Keine Task gewÃ¤hlt'}
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
                    {activeTask?.goal ?? 'Links eine Task wÃ¤hlen oder oben eine neue erstellen.'}
                  </div>
                  <div style={{ display: 'grid', gap: 6, fontSize: 12, color: TOKENS.text2 }}>
                    <span>Status: <strong style={{ color: STATUS_COLORS[activeTask?.status ?? ''] ?? TOKENS.text }}>{activeTask?.status ?? 'â€”'}</strong></span>
                    <span>Risk: {activeTask?.risk ?? 'â€”'} Â· Type: {activeTask?.taskType ?? 'â€”'}</span>
                    <span>Intent: {activeTask?.intentKind ?? 'â€”'} Â· Output: {activeTask?.requestedOutputKind ?? 'â€”'}</span>
                    <span>Format: {activeTask?.requestedOutputFormat ?? 'â€”'} Â· Phase: {activeTask?.contract.lifecycle.phase ?? 'â€”'}</span>
                    <span>Execution: {formatExecutionSummary(evidencePack)}</span>
                    <span>Lanes: {activeTask ? activeTask.contract.routing.activeLanes.join(' Â· ') : 'â€”'}</span>
                    <span>Team: {activeTask ? activeTask.contract.team.activeInstances.join(' Â· ') : 'â€”'}</span>
                    <span>Plan: {activeTask ? activeTask.contract.output.plannedArtifacts.join(', ') : 'â€”'}</span>
                    <span>Policy: {activeTask?.policyProfile ?? 'â€”'}</span>
                    <span>Updated: {formatDate(activeTask?.updatedAt)}</span>
                  </div>
                  <input value={commitHash} onChange={(event) => setCommitHash(event.target.value)} placeholder="Commit-Hash fÃ¼r Approve" style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '11px 12px', fontSize: 13 }} />
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
                    {confirmDelete ? 'Wirklich lÃ¶schen?' : 'Task lÃ¶schen'}
                  </button>
                  {isPrototypeReview && previewUrl ? (
                    <div style={{ marginTop: 8, display: 'grid', gap: 12 }}>
                      <div style={{ borderRadius: 18, border: `1px solid ${TOKENS.b2}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
                        <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Prototype Preview</div>
                        <div style={{ marginTop: 6, fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                          Der Builder stoppt hier bewusst. Preview prÃ¼fen und dann explizit freigeben, Ã¼berarbeiten lassen oder verwerfen.
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
            ) : null}

            {drawerView === 'models' || compact ? (
            <BuilderPanel title="Model & Config" subtitle="Pool-Transparenz und Maya-Konfiguration nur bei Bedarf im Drawer." accent={TOKENS.purple}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Aktive Pools</div>
                  {(['maya', 'council', 'distiller', 'worker', 'scout'] as PoolType[]).map((pool) => (
                    <div key={pool} style={{ borderRadius: 14, border: `2px solid ${TOKENS.b2}`, background: TOKENS.bg2, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 12.5, color: TOKENS.text }}>{pool}</span>
                      <span style={{ fontSize: 11.5, color: TOKENS.text3 }}>{pools[pool].length} aktiv</span>
                    </div>
                  ))}
                </div>
                {showConfig ? (
                  <div style={{ border: `2px solid rgba(124,106,247,0.35)`, borderRadius: 18, background: TOKENS.card, overflow: 'hidden' }}>
                    <BuilderConfigPanel token={token} ctx={mayaCtx} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfig(true)}
                    style={{ borderRadius: 14, border: `2px solid #7c6af7`, background: 'rgba(124,106,247,0.14)', color: TOKENS.text, padding: '10px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Config oeffnen
                  </button>
                )}
              </div>
            </BuilderPanel>
            ) : null}

            {drawerView === 'output' || compact ? (
            <div data-maya-target="delivery-surface">
              <BuilderPanel title="Delivery Surface" subtitle="Die passende Arbeits- und Ergebnisansicht pro Output-Typ statt nur generischer Technikdaten." accent={TOKENS.gold}>
                {activeTask ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                        {activeTask.requestedOutputKind}
                      </div>
                      <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                        {activeTask.contract.output.summary}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {deliveryArtifacts.length > 0 ? deliveryArtifacts.map((artifact) => (
                        <span key={artifact.id} style={{ borderRadius: 999, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', color: TOKENS.text3, padding: '4px 8px', fontSize: 11 }}>
                          {formatArtifactTypeLabel(artifact.artifactType)} Â· {artifact.lane}
                        </span>
                      )) : (
                        <span style={{ borderRadius: 999, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', color: TOKENS.text3, padding: '4px 8px', fontSize: 11 }}>
                          Noch keine persistierten Delivery-Artefakte
                        </span>
                      )}
                    </div>
                    {(activeTask.requestedOutputKind === 'html_artifact' || activeTask.requestedOutputKind === 'visual_artifact') ? (
                      <div data-maya-target="preview-panel" style={{ borderRadius: 16, border: `1px solid ${TOKENS.b2}`, background: 'rgba(255,255,255,0.02)', padding: 12, display: 'grid', gap: 10 }}>
                        <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Preview Surface</div>
                        <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                          {latestPrototypeArtifact
                            ? `Gespeichertes ${formatArtifactTypeLabel(latestPrototypeArtifact.artifactType)} aus der Prototype-Lane ist vorhanden und dient hier als primaere Delivery-Spur.`
                            : previewUrl
                              ? 'Die Preview ist verfuegbar, aber noch nicht als eigenstaendiges Artefakt beschrieben.'
                              : 'Noch keine direkte Vorschau verfuegbar. Die Tribune und der Dialog liefern aktuell den besten Zwischenstand.'}
                        </div>
                        {previewUrl ? (
                          <iframe
                            title={`Delivery Preview ${activeTask.id}`}
                            src={previewUrl}
                            style={{ width: '100%', height: 320, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, background: '#0f0f17' }}
                          />
                        ) : null}
                        {latestPrototypeArtifact ? (
                          <div style={{ fontSize: 12, color: TOKENS.text3 }}>
                            {formatArtifactTypeLabel(latestPrototypeArtifact.artifactType)} Â· {latestPrototypeArtifact.path ?? 'ohne Pfad'} Â· {formatDate(latestPrototypeArtifact.createdAt)}
                          </div>
                        ) : null}
                        {screenshotPreviewSrc ? (
                          <div style={{ display: 'grid', gap: 8 }}>
                            <div style={{ fontSize: 11, color: TOKENS.green, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Latest Browser Capture</div>
                            <img
                              src={screenshotPreviewSrc}
                              alt="Latest browser screenshot"
                              style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#0f0f17' }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {activeTask.requestedOutputKind === 'code_artifact' ? (
                      <div style={{ borderRadius: 16, border: `1px solid ${TOKENS.b2}`, background: 'rgba(255,255,255,0.02)', padding: 12, display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 11, color: TOKENS.cyan, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Code Delivery</div>
                        <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                          {latestApprovalArtifact
                            ? 'Es liegt bereits ein persistierter Freigabe- oder Operator-Artefaktpfad vor. Das ist aktuell die belastbarste Delivery-Spur fuer diesen Lauf.'
                            : deliveryArtifacts.length > 0
                              ? 'Der Lauf hat persistierte Builder-Artefakte erzeugt. Fuer Code ist die Artefaktspur noch knapper als fuer Preview-Outputs, aber nicht mehr rein dialogbasiert.'
                              : activeTask.contract.codeLane.summary}
                        </div>
                        <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
                          Geplante Artefakte: {activeTask.contract.output.plannedArtifacts.join(', ') || 'â€”'}
                        </div>
                        {deliveryArtifacts.length > 0 ? deliveryArtifacts.slice(0, 3).map((artifact) => (
                          <div key={artifact.id} style={{ borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '10px 11px', display: 'grid', gap: 4 }}>
                            <div style={{ fontSize: 11, color: TOKENS.cyan, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                              {formatArtifactTypeLabel(artifact.artifactType)} Â· {artifact.lane}
                            </div>
                            <div style={{ fontSize: 12, color: TOKENS.text2 }}>
                              {artifact.path ?? 'kein Pfad gespeichert'}
                            </div>
                            <div style={{ fontSize: 11, color: TOKENS.text3 }}>
                              {formatDate(artifact.createdAt)}
                            </div>
                            {getArtifactPreviewText(artifact) ? (
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.6, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace', maxHeight: 180, overflowY: 'auto' }}>
                                {getArtifactPreviewText(artifact)}
                              </pre>
                            ) : null}
                          </div>
                        )) : null}
                        {latestDialogSnippet ? (
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.6, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace', maxHeight: 220, overflowY: 'auto', borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '10px 11px' }}>
                            {latestDialogSnippet}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                    {(activeTask.requestedOutputKind === 'structured_answer' || activeTask.requestedOutputKind === 'chat_answer' || activeTask.requestedOutputKind === 'markdown_artifact' || activeTask.requestedOutputKind === 'json_artifact' || activeTask.requestedOutputKind === 'presentation_artifact') ? (
                      <div style={{ borderRadius: 16, border: `1px solid ${TOKENS.b2}`, background: 'rgba(255,255,255,0.02)', padding: 12, display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 11, color: TOKENS.green, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                          {activeTask.requestedOutputKind === 'presentation_artifact' ? 'Presentation Surface' : activeTask.requestedOutputKind === 'json_artifact' ? 'Structured Data Surface' : 'Answer Surface'}
                        </div>
                        <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                          {latestStructuredArtifact
                            ? 'Die Delivery Surface zeigt hier das zuletzt persistierte Builder-Artefakt statt nur die Zusammenfassung aus Contract oder Dialog.'
                            : evidencePack?.intent?.user_outcome || activeTask.goal}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {activeTask.contract.output.plannedArtifacts.map((artifact) => (
                            <span key={artifact} style={{ borderRadius: 999, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', color: TOKENS.text3, padding: '4px 8px', fontSize: 11 }}>
                              {artifact}
                            </span>
                          ))}
                        </div>
                        {latestStructuredArtifact ? (
                          <div style={{ borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '10px 11px', display: 'grid', gap: 6 }}>
                            <div style={{ fontSize: 11, color: TOKENS.green, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                              {formatArtifactTypeLabel(latestStructuredArtifact.artifactType)} Â· {latestStructuredArtifact.lane}
                            </div>
                            <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
                              {latestStructuredArtifact.path ?? 'kein Pfad gespeichert'} Â· {formatDate(latestStructuredArtifact.createdAt)}
                            </div>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.6, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace', maxHeight: 260, overflowY: 'auto' }}>
                              {getArtifactPreviewText(latestStructuredArtifact)}
                            </pre>
                          </div>
                        ) : null}
                        {latestDialogSnippet ? (
                          <div style={{ fontSize: 12, color: TOKENS.text2, lineHeight: 1.65, borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '10px 11px' }}>
                            {latestDialogSnippet}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div style={{ borderRadius: 16, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: 12, display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Artifact Stream</div>
                      {deliveryArtifacts.length > 0 ? deliveryArtifacts.map((artifact) => (
                        <div key={artifact.id} style={{ borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '9px 10px', display: 'grid', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: 12, color: TOKENS.text }}>{formatArtifactTypeLabel(artifact.artifactType)}</strong>
                            <span style={{ fontSize: 11, color: TOKENS.text3 }}>{formatDate(artifact.createdAt)}</span>
                          </div>
                          <div style={{ fontSize: 12, color: TOKENS.text2 }}>
                            Lane {artifact.lane} Â· {artifact.path ?? 'kein Pfad'}
                          </div>
                          {getArtifactPayloadString(artifact, 'route') ? (
                            <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
                              Route: {getArtifactPayloadString(artifact, 'route')}
                            </div>
                          ) : null}
                        </div>
                      )) : (
                        <div style={{ fontSize: 13, color: TOKENS.text2 }}>
                          Fuer diese Task liegt noch kein eigener Builder-Artefaktstrom vor.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: TOKENS.text2 }}>Waehle eine Task, um die passende Delivery-Ansicht zu sehen.</div>
                )}
              </BuilderPanel>
            </div>
            ) : null}

            {drawerView === 'output' || compact ? (
            <div data-maya-target="pruefstand">
            <BuilderPanel title="Pruefstand" subtitle="Build- und Runtime-Befunde. Wichtig fuer Operatoren, aber bewusst nicht die Hauptbuehne." accent={TOKENS.cyan}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, padding: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>TSC</div>
                    <div style={{ marginTop: 6, fontSize: 18, color: evidencePack?.checks.tsc === 'pass' ? TOKENS.green : TOKENS.text }}>{evidencePack?.checks.tsc ?? 'â€”'}</div>
                  </div>
                  <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, padding: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Build</div>
                    <div style={{ marginTop: 6, fontSize: 18, color: evidencePack?.checks.build === 'pass' ? TOKENS.green : TOKENS.text }}>{evidencePack?.checks.build ?? 'â€”'}</div>
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
            </div>
            ) : null}

            {drawerView === 'output' || compact ? (
            <div data-maya-target="technical-details">
            <BuilderPanel title="Technische Details" subtitle="Review-, Diff- und Rohdaten zum aktuellen Task. Nur bei Bedarf vertiefen." accent={TOKENS.rose}>
              {evidencePack ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Final Status: <strong style={{ color: STATUS_COLORS[evidencePack.final_status] ?? TOKENS.text }}>{evidencePack.final_status}</strong></div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Intent: {evidencePack.intent_kind} Â· Output: {evidencePack.requested_output_kind}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Format: {evidencePack.requested_output_format}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Execution Channel: {formatExecutionChannelLabel(evidencePack.execution_summary.channel)} Â· Source: {evidencePack.execution_summary.latest_status_source ?? 'â€”'}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Latest Transition: {evidencePack.execution_summary.last_transition_reason ?? 'â€”'} Â· Lane: {evidencePack.execution_summary.last_transition_lane ?? 'â€”'} Â· {formatDate(evidencePack.execution_summary.last_transition_at)}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Transition Count: {evidencePack.execution_summary.transition_count}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Contract Phase: {evidencePack.contract_snapshot.lifecycle_phase} Â· Attention: {evidencePack.contract_snapshot.attention_state}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Active Lanes: {evidencePack.contract_snapshot.active_lanes.join(' Â· ') || 'â€”'} Â· Team: {evidencePack.contract_snapshot.team_instances.join(' Â· ') || 'â€”'}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Planned Artifacts: {evidencePack.contract_snapshot.planned_artifacts.join(', ') || 'â€”'}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Agreement: {evidencePack.agreement_level ?? 'â€”'} Â· Tokens: {evidencePack.total_tokens}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>Counterexamples: {evidencePack.counterexamples_passed}/{evidencePack.counterexamples_tested}</div>
                  <div style={{ fontSize: 12, color: TOKENS.text2 }}>False success detected: {evidencePack.false_success_detected ? 'ja' : 'nein'}</div>
                  <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
                    <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Status Transitions</div>
                    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                      {evidencePack.status_transitions.length > 0 ? evidencePack.status_transitions.slice(-8).map((transition) => (
                        <button
                          type="button"
                          key={`${transition.at}-${transition.to_status}-${transition.reason ?? 'none'}`}
                          onClick={() => handleTransitionJump(transition.lane, transition.reason)}
                          style={{ fontSize: 12.5, color: TOKENS.text2, textAlign: 'left', borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '9px 10px', cursor: 'pointer' }}
                        >
                          <strong style={{ color: TOKENS.text }}>{transition.to_status}</strong> via {transition.lane}
                          {transition.from_status ? ` (von ${transition.from_status})` : ''}
                          {transition.reason ? ` Â· ${transition.reason}` : ''}
                          {` Â· ${transition.lifecycle_phase}`}
                        </button>
                      )) : <div style={{ fontSize: 12.5, color: TOKENS.text2 }}>Noch keine expliziten Transition-Signale gespeichert.</div>}
                    </div>
                  </div>
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
                  <details style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '10px 12px' }}>
                    <summary style={{ cursor: 'pointer', color: TOKENS.text, fontSize: 12.5, fontWeight: 700 }}>
                      Rohdaten anzeigen
                    </summary>
                    <pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.7, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace', maxHeight: 280, overflowY: 'auto' }}>
                      {JSON.stringify(evidencePack, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: TOKENS.text2 }}>FÃ¼r diese Task liegt noch kein Evidence Pack vor.</div>
              )}
            </BuilderPanel>
            </div>
            ) : null}
          </div>
          ) : null}
        </div>

        <footer style={{ marginTop: 18, borderRadius: 22, border: `2px solid ${TOKENS.b1}`, background: TOKENS.card, boxShadow: `${TOKENS.shadow.card}, 0 0 0 1px rgba(255,255,255,0.04) inset`, padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>
            {visibleTasks.map((task) => {
              const queueSignal = deriveTaskQueueSignal(task);
              return (
                <button
                  key={task.id}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setDrawerView('task');
                  }}
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
                  {task.title} Â· {queueSignal.label}
                </button>
              );
            })}
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
