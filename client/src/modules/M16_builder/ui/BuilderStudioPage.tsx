import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';

import { CosmicTrail } from '../../M02_ui-kit/CosmicTrail';
import { TOKENS } from '../../../design/tokens';
import {
  useBuilderApi,
  type BuilderAction,
  type BuilderChatMessage,
  type BuilderCreateTaskInput,
  type BuilderEvidencePack,
  type BuilderTask,
} from '../hooks/useBuilderApi';

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

function getInitialToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('builderToken') || params.get('token') || params.get('opus_token') || '';
}

async function validateBuilderToken(token: string) {
  const response = await fetch(`/api/builder/opus-bridge/pipeline-info?opus_token=${encodeURIComponent(token)}`);

  if (response.status === 401) {
    throw new Error('Ungültiger Token');
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json() as { canonicalExecutor?: string };
  if (typeof payload.canonicalExecutor !== 'string') {
    throw new Error('Builder-Authentifizierung fehlgeschlagen');
  }

  return payload;
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

function toLines(text: string) {
  return text.split(/\r?\n/).filter(Boolean).slice(0, 18);
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
  const [token, setToken] = useState(() => getInitialToken());
  const [tokenInput, setTokenInput] = useState(() => getInitialToken());
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
  const [chatMessages, setChatMessages] = useState<BuilderChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [commitHash, setCommitHash] = useState('');
  const [draft, setDraft] = useState<BuilderCreateTaskInput>({
    title: '',
    goal: '',
    risk: 'low',
    taskType: 'A',
  });

  const {
    listFiles: listBuilderFiles,
    readFile: readBuilderFile,
    getTasks: getBuilderTasks,
    createTask: createBuilderTask,
    getTask: getBuilderTask,
    runTask: runBuilderTask,
    getDialog: getBuilderDialog,
    getEvidence: getBuilderEvidence,
    approveTask: approveBuilderTask,
    approvePrototype: approveBuilderPrototype,
    revisePrototype: reviseBuilderPrototype,
    discardPrototype: discardBuilderPrototype,
    revertTask: revertBuilderTask,
    deleteTask: deleteBuilderTask,
    sendChat,
  } = useBuilderApi(token || null);
  const groupedFiles = useMemo(() => groupFiles(files), [files]);
  const activeTask = useMemo(() => taskDetail ?? tasks.find((task) => task.id === selectedTaskId) ?? null, [taskDetail, tasks, selectedTaskId]);
  const dialogBubbles = useMemo(() => groupDialog(dialogActions, dialogFormat), [dialogActions, dialogFormat]);
  const compact = viewportWidth < 1180;
  const isPrototypeReview = activeTask?.status === 'prototype_review';
  const isRunDisabled = isBusy || !selectedTaskId || isPrototypeReview;
  const previewUrl = activeTask
    ? `/api/builder/preview/${encodeURIComponent(activeTask.id)}?t=${encodeURIComponent(activeTask.updatedAt)}&token=${encodeURIComponent(token)}&opus_token=${encodeURIComponent(token)}`
    : null;
  const bootstrappedTokenRef = useRef<string | null>(null);
  const dialogFormatRef = useRef(dialogFormat);
  const confirmDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dialogFormatRef.current = dialogFormat;
  }, [dialogFormat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLoading, chatMessages]);

  useEffect(() => () => {
    if (confirmDeleteTimer.current) {
      clearTimeout(confirmDeleteTimer.current);
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
  }, [token]);

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

  const handleSendChat = useCallback(async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) {
      return;
    }

    const userMessage: BuilderChatMessage = { role: 'user', content: message };
    setChatMessages((current) => [...current, userMessage]);
    setChatInput('');
    setChatLoading(true);
    setPageError(null);

    try {
      const response = await sendChat(message, chatMessages);
      const assistantMessage: BuilderChatMessage = { role: 'assistant', content: response.message };
      setChatMessages((current) => [...current, assistantMessage]);

      if (response.type === 'task_created' && response.taskId) {
        await refreshTasks();
        setSelectedTaskId(response.taskId);
      }
    } catch {
      setChatMessages((current) => [...current, { role: 'assistant', content: 'Fehler bei der Verbindung.' }]);
    } finally {
      setChatLoading(false);
      window.setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [chatInput, chatLoading, chatMessages, refreshTasks, sendChat]);

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
      <div style={{ maxWidth: 1680, margin: '0 auto', padding: compact ? '18px 16px 28px' : '22px 22px 32px' }}>
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
              <button onClick={() => { void refreshTasks(); void refreshFiles(); }} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.14)', color: TOKENS.text, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Refresh
              </button>
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

        <div
          style={{
            display: 'grid',
            gap: 18,
            gridTemplateColumns: compact ? '1fr' : '280px minmax(0, 1fr) 340px',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'grid', gap: 18 }}>
            <BuilderPanel title="Task-Liste" subtitle="Aktive Builder-Queues und Statusfarben." accent={TOKENS.cyan}>
              <div style={{ display: 'grid', gap: 10 }}>
                {tasks.map((task) => {
                  const selected = task.id === selectedTaskId;
                  return (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      style={{
                        textAlign: 'left',
                        borderRadius: 18,
                        border: `1.5px solid ${selected ? TOKENS.gold : TOKENS.b2}`,
                        background: selected ? 'rgba(212,175,55,0.10)' : TOKENS.card2,
                        padding: '12px 14px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.text }}>{task.title}</div>
                        <span style={{ borderRadius: 999, border: `1px solid ${TOKENS.b1}`, color: STATUS_COLORS[task.status] ?? TOKENS.text2, padding: '3px 8px', fontSize: 11, textTransform: 'uppercase' }}>
                          {task.status}
                        </span>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.55, color: TOKENS.text2 }}>{task.goal}</div>
                    </button>
                  );
                })}
                {tasks.length === 0 ? <div style={{ fontSize: 13, color: TOKENS.text2 }}>Noch keine Builder-Tasks vorhanden.</div> : null}
              </div>
            </BuilderPanel>

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

          <BuilderPanel title="Dialog Viewer" subtitle="BDL oder Textansicht mit Bubble-Gruppierung pro Akteur und Runde." accent={TOKENS.gold}>
            <div
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
                Gemini Chat
              </div>
              <div
                style={{
                  maxHeight: 240,
                  overflowY: 'auto',
                  marginBottom: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {chatMessages.length === 0 ? (
                  <div style={{ color: TOKENS.text3, fontSize: 13, fontStyle: 'italic' }}>
                    Beschreibe was du aendern willst — Gemini erstellt den Task automatisch.
                  </div>
                ) : null}
                {chatMessages.map((message, index) => (
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
                    {message.content}
                  </div>
                ))}
                {chatLoading ? (
                  <div style={{ color: TOKENS.gold, fontSize: 12, fontStyle: 'italic' }}>
                    Gemini denkt nach...
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>
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
                  placeholder="z.B. 'Erstelle einen Health-Check Endpoint'"
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

          <div style={{ display: 'grid', gap: 18 }}>
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
                  <div style={{ fontFamily: TOKENS.font.display, fontSize: 22, color: TOKENS.text }}>{activeTask?.title ?? 'Keine Task gewählt'}</div>
                  <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>{activeTask?.goal ?? 'Links eine Task wählen oder oben eine neue erstellen.'}</div>
                  <div style={{ display: 'grid', gap: 6, fontSize: 12, color: TOKENS.text2 }}>
                    <span>Status: <strong style={{ color: STATUS_COLORS[activeTask?.status ?? ''] ?? TOKENS.text }}>{activeTask?.status ?? '—'}</strong></span>
                    <span>Risk: {activeTask?.risk ?? '—'} · Type: {activeTask?.taskType ?? '—'}</span>
                    <span>Policy: {activeTask?.policyProfile ?? '—'}</span>
                    <span>Updated: {formatDate(activeTask?.updatedAt)}</span>
                  </div>
                  <input value={commitHash} onChange={(event) => setCommitHash(event.target.value)} placeholder="Commit-Hash für Approve" style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '11px 12px', fontSize: 13 }} />
                  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0,1fr))' }}>
                    <button onClick={() => { void handleRunTask(); }} disabled={isRunDisabled} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.cyan}`, background: 'rgba(34,211,238,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: isPrototypeReview ? 'not-allowed' : 'pointer', opacity: isPrototypeReview ? 0.45 : 1 }}>Run</button>
                    <button onClick={() => { void handleApproveTask(); }} disabled={isBusy || !selectedTaskId || isPrototypeReview} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.green}`, background: 'rgba(74,222,128,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: isPrototypeReview ? 'not-allowed' : 'pointer', opacity: isPrototypeReview ? 0.45 : 1 }}>Approve</button>
                    <button onClick={() => { void handleRevertTask(); }} disabled={isBusy || !selectedTaskId} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.rose}`, background: 'rgba(244,114,182,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{isPrototypeReview ? 'Discard' : 'Revert'}</button>
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
                        <button onClick={() => { void handleApprovePrototype(); }} disabled={isBusy || !selectedTaskId} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.green}`, background: 'rgba(74,222,128,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Approve Prototype</button>
                        <button onClick={() => { void handleRevisePrototype(); }} disabled={isBusy || !selectedTaskId} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Revise</button>
                        <button onClick={() => { void handleRevertTask(); }} disabled={isBusy || !selectedTaskId} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.rose}`, background: 'rgba(244,114,182,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Discard</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
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
      </div>
    </div>
  );
}