import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { TOKENS } from '../../../design/tokens';
import { useMayaApi, type MayaContext, type MayaChatMessage } from '../hooks/useMayaApi';

const MAYA = '#7c6af7';
const MAYA_DIM = 'rgba(124,106,247,0.12)';

const STATUS_COLORS: Record<string, string> = {
  queued: TOKENS.text2, planning: TOKENS.purple, prototyping: TOKENS.purple,
  prototype_review: TOKENS.gold, reviewing: TOKENS.gold, testing: TOKENS.green,
  push_candidate: TOKENS.green, done: TOKENS.green, blocked: '#ef4444',
  reverted: TOKENS.text3, discarded: TOKENS.rose, success: TOKENS.green,
  failed: '#ef4444', classifying: TOKENS.cyan,
};

interface ParsedAction {
  endpoint: string;
  branch?: string;
  worker?: string;
  risk: string;
  description: string;
}

interface MessagePart {
  type: 'text' | 'action';
  content: string;
  action?: ParsedAction;
}

function parseActionBlocks(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  const re = /\[ACTION:\s*(.*?)\]\s*\n?([\s\S]*?)\[\/ACTION\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index).trim() });
    const params: Record<string, string> = {};
    (m[1] ?? '').split(',').forEach(p => { const [k, v] = p.split('=').map(s => s.trim()); if (k && v) params[k] = v; });
    const desc = (m[2] ?? '').trim();
    parts.push({
      type: 'action',
      content: desc,
      action: { endpoint: params.endpoint || '/self-test', branch: params.branch, worker: params.worker, risk: params.risk || 'safe', description: desc },
    });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last).trim() });
  return parts.filter(p => p.content);
}

const RISK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  safe: { bg: 'rgba(34,197,94,0.08)', border: '#22c55e40', text: '#4ade80' },
  staging: { bg: 'rgba(234,179,8,0.08)', border: '#eab30840', text: '#fbbf24' },
  destructive: { bg: 'rgba(239,68,68,0.08)', border: '#ef444440', text: '#f87171' },
};

interface ChatMsg {
  role: 'user' | 'maya';
  text: string;
  model?: string;
}

function getInitialToken() {
  const p = new URLSearchParams(window.location.search);
  return p.get('opus_token') || p.get('token') || p.get('builderToken') || '';
}

function formatTime(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ fontSize: 10, color: copied ? TOKENS.green : TOKENS.text3, cursor: 'pointer', opacity: 0.6, userSelect: 'none' }}
      title="Kopieren">{copied ? '✓' : '⧉'}</span>
  );
}

// ─── Lightweight Markdown ───
function MayaMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // Tables: detect | ... | pattern
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('|')) {
        tableLines.push(lines[i] ?? '');
        i++;
      }
      const rows = tableLines.filter(l => !/^\|[\s-:|]+\|$/.test(l.trim()));
      elements.push(
        <div key={i} style={{ overflowX: 'auto', margin: '8px 0' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: `1px solid ${TOKENS.b3}` }}>
                  {row.split('|').filter(Boolean).map((cell, ci) => {
                    const Tag = ri === 0 ? 'th' : 'td';
                    return <Tag key={ci} style={{ padding: '4px 8px', textAlign: 'left', color: ri === 0 ? TOKENS.text : TOKENS.text2, fontWeight: ri === 0 ? 600 : 400 }}><InlineFormat text={cell.trim()} /></Tag>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<div key={i} style={{ fontSize: 13, fontWeight: 600, color: TOKENS.text, marginTop: 12, marginBottom: 4 }}><InlineFormat text={line.slice(4)} /></div>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<div key={i} style={{ fontSize: 14, fontWeight: 700, color: TOKENS.text, marginTop: 14, marginBottom: 4 }}><InlineFormat text={line.slice(3)} /></div>);
      i++; continue;
    }

    // Divider
    if (/^-{3,}$/.test(line.trim())) {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: `1px solid ${TOKENS.b3}`, margin: '10px 0' }} />);
      i++; continue;
    }

    // List items
    if (/^[-*]\s/.test(line.trim()) || /^\d+\.\s/.test(line.trim())) {
      const bullet = /^\d+\./.test(line.trim()) ? (line.trim().match(/^\d+/)?.[0] ?? '1') + '.' : '•';
      const content = line.trim().replace(/^[-*]\s|^\d+\.\s/, '');
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 6, padding: '2px 0', fontSize: 13, lineHeight: 1.6 }}>
          <span style={{ color: TOKENS.text3, flexShrink: 0, minWidth: 14 }}>{bullet}</span>
          <span style={{ color: TOKENS.text }}><InlineFormat text={content} /></span>
        </div>
      );
      i++; continue;
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={i} style={{ background: TOKENS.bg2, borderRadius: 8, padding: '10px 12px', margin: '6px 0', fontSize: 11, fontFamily: 'monospace', color: TOKENS.text, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
          {codeLines.join('\n')}
        </pre>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} style={{ height: 6 }} />);
      i++; continue;
    }

    // Normal paragraph
    elements.push(<div key={i} style={{ fontSize: 13, lineHeight: 1.65, color: TOKENS.text, padding: '1px 0' }}><InlineFormat text={line} /></div>);
    i++;
  }

  return <>{elements}</>;
}

// Inline formatting: **bold**, `code`, emoji preservation
function InlineFormat({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let ki = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={ki++}>{text.slice(last, m.index)}</span>);
    if (m[2]) parts.push(<strong key={ki++} style={{ fontWeight: 600, color: TOKENS.text }}>{m[2]}</strong>);
    if (m[3]) parts.push(<code key={ki++} style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4, fontSize: '0.92em', fontFamily: 'monospace' }}>{m[3]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(<span key={ki++}>{text.slice(last)}</span>);
  return <>{parts}</>;
}

// ─── Auth Gate ───
function AuthGate({ onAuth }: { onAuth: (t: string) => void }) {
  const [val, setVal] = useState(() => {
    try { return localStorage.getItem('maya-token') || ''; } catch { return ''; }
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Auto-login if saved token exists
  useEffect(() => {
    if (val) submit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!val.trim()) return;
    setLoading(true);
    setErr('');
    try {
      const r = await fetch(`/api/builder/maya/context?token=${encodeURIComponent(val)}`);
      if (!r.ok) throw new Error('Ungültiger Token');
      try { localStorage.setItem('maya-token', val); } catch { /* noop */ }
      onAuth(val);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 'min(440px, 90%)', background: TOKENS.card, border: `1.5px solid ${TOKENS.b2}`, borderRadius: 20, padding: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: TOKENS.text, fontFamily: 'system-ui' }}>Maya Command Center</div>
        <p style={{ fontSize: 13, color: TOKENS.text2, marginTop: 8, lineHeight: 1.6 }}>Builder-Token eingeben um Maya zu starten.</p>
        {err && <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: 'rgba(239,68,68,0.12)', color: '#fca5a5', fontSize: 13 }}>{err}</div>}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
              type={showPw ? 'text' : 'password'} placeholder="Token" autoFocus
              style={{ width: '100%', boxSizing: 'border-box', background: TOKENS.bg2, border: `1px solid ${TOKENS.b1}`, borderRadius: 12, padding: '12px 40px 12px 14px', color: TOKENS.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
            <span onClick={() => setShowPw(!showPw)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 16, color: TOKENS.text3, userSelect: 'none' }}>
              {showPw ? '👁' : '👁‍🗨'}
            </span>
          </div>
          <button onClick={submit} disabled={loading}
            style={{ borderRadius: 12, border: `1.5px solid ${MAYA}`, background: MAYA_DIM, color: TOKENS.text, padding: '12px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? '...' : 'Verbinden'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Left Sidebar: Workers + Tasks ───
function LeftSidebar({ ctx, collapsed, onToggle }: {
  ctx: MayaContext | null; collapsed: boolean; onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <div style={{ width: 48, background: TOKENS.bg2, borderRight: `1px solid ${TOKENS.b3}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, flexShrink: 0 }}>
        <span onClick={onToggle} style={{ cursor: 'pointer', fontSize: 16, color: TOKENS.text3, marginBottom: 16 }} title="Sidebar öffnen">»</span>
        <span style={{ fontSize: 11, color: MAYA, writingMode: 'vertical-rl', letterSpacing: 2, fontWeight: 600 }}>MAYA</span>
      </div>
    );
  }
  return (
    <div style={{ width: 240, background: TOKENS.bg2, borderRight: `1px solid ${TOKENS.b3}`, display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
      <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${TOKENS.b3}` }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TOKENS.text, fontFamily: 'system-ui' }}>Builder Studio</div>
          <div style={{ fontSize: 10, color: MAYA, marginTop: 2 }}>maya command center</div>
        </div>
        <span onClick={onToggle} style={{ cursor: 'pointer', fontSize: 14, color: TOKENS.text3 }} title="Einklappen">«</span>
      </div>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${TOKENS.b3}` }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: TOKENS.text3, fontWeight: 600, marginBottom: 8 }}>Tasks</div>
        {ctx?.tasks.slice(0, 8).map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, marginBottom: 2, fontSize: 11 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[t.status] || TOKENS.text2, flexShrink: 0 }} />
            <span style={{ flex: 1, color: TOKENS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title.slice(0, 35)}</span>
            <span style={{ fontSize: 8, color: TOKENS.text3, fontFamily: 'monospace' }}>{t.status.slice(0, 6)}</span>
          </div>
        ))}
        {(!ctx || ctx.tasks.length === 0) && <div style={{ fontSize: 11, color: TOKENS.text3 }}>Keine Tasks.</div>}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: TOKENS.text3, fontWeight: 600, marginBottom: 8 }}>Worker</div>
        {ctx?.workerStats.slice(0, 5).map((w, i) => {
          const pct = Math.min(100, Number(w.avg_quality) || 0);
          const color = pct >= 80 ? TOKENS.green : pct >= 60 ? TOKENS.gold : '#ef4444';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: 'monospace', color: TOKENS.text }}>{String(w.worker).split('/').pop()?.split('-').slice(0, 2).join('-') || w.worker}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: TOKENS.text3 }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Context Panel (right 35%) ───
function ContextPanel({ ctx, loading, onDeleteMemory, onAddNote }: {
  ctx: MayaContext | null; loading: boolean;
  onDeleteMemory?: (id: string) => void;
  onAddNote?: (summary: string) => void;
}) {
  const [newNote, setNewNote] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  if (!ctx && loading) return <div style={{ padding: 20, color: TOKENS.text2, fontSize: 13 }}>Lade Kontext...</div>;
  if (!ctx) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Continuity Notes */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${TOKENS.b3}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: TOKENS.gold, fontWeight: 600 }}>Continuity Notes</div>
          <span onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 10, color: MAYA, cursor: 'pointer', fontWeight: 600 }}>+ Notiz</span>
        </div>
        {showAdd && (
          <div style={{ marginBottom: 10, display: 'flex', gap: 6 }}>
            <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Session-Notiz..."
              onKeyDown={e => { if (e.key === 'Enter' && newNote.trim()) { onAddNote?.(newNote.trim()); setNewNote(''); setShowAdd(false); } }}
              style={{ flex: 1, background: TOKENS.bg, border: `1px solid ${TOKENS.b2}`, borderRadius: 8, padding: '6px 10px', color: TOKENS.text, fontSize: 11, outline: 'none' }} />
            <button onClick={() => { if (newNote.trim()) { onAddNote?.(newNote.trim()); setNewNote(''); setShowAdd(false); } }}
              style={{ fontSize: 10, padding: '6px 10px', borderRadius: 8, border: 'none', background: MAYA, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>OK</button>
          </div>
        )}
        {ctx.continuityNotes.map((n, i) => (
          <div key={n.id || i} style={{ display: 'flex', gap: 6, padding: '4px 0', fontSize: 11, color: TOKENS.text2, lineHeight: 1.5 }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: TOKENS.text3, fontFamily: 'monospace', fontSize: 10 }}>{formatTime(n.updatedAt)}</span>{' '}
              {n.summary.slice(0, 120)}{n.summary.length > 120 ? '...' : ''}
            </div>
            {n.id && onDeleteMemory && (
              <span onClick={() => onDeleteMemory(n.id!)} style={{ color: TOKENS.text3, cursor: 'pointer', fontSize: 10, opacity: 0.5, flexShrink: 0 }} title="Löschen">✕</span>
            )}
          </div>
        ))}
        {ctx.continuityNotes.length === 0 && <div style={{ fontSize: 12, color: TOKENS.text3 }}>Keine Continuity Notes.</div>}
      </div>

      {/* Tasks */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${TOKENS.b3}` }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: TOKENS.text3, fontWeight: 600, marginBottom: 10 }}>Aktive tasks</div>
        {ctx.tasks.slice(0, 6).map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[t.status] || TOKENS.text2, flexShrink: 0 }} />
            <span style={{ flex: 1, color: TOKENS.text }}>{t.title}</span>
            <span style={{ fontSize: 10, color: TOKENS.text3, fontFamily: 'monospace' }}>{t.status}</span>
          </div>
        ))}
        {ctx.tasks.length === 0 && <div style={{ fontSize: 12, color: TOKENS.text3 }}>Keine Tasks.</div>}
      </div>

      {/* Worker Stats */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${TOKENS.b3}` }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: TOKENS.text3, fontWeight: 600, marginBottom: 10 }}>Worker performance</div>
        {ctx.workerStats.slice(0, 5).map((w, i) => {
          const pct = Math.min(100, Number(w.avg_quality) || 0);
          const color = pct >= 80 ? TOKENS.green : pct >= 60 ? TOKENS.gold : '#ef4444';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 11 }}>
              <span style={{ minWidth: 80, fontFamily: 'monospace', color: TOKENS.text }}>{String(w.worker).split('/').pop()?.split('-').slice(0, 2).join('-') || w.worker}</span>
              <div style={{ flex: 1, height: 5, background: TOKENS.bg2, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
              </div>
              <span style={{ minWidth: 28, textAlign: 'right', fontFamily: 'monospace', fontSize: 10, color: TOKENS.text3 }}>{pct}%</span>
            </div>
          );
        })}
        {ctx.workerStats.length === 0 && <div style={{ fontSize: 12, color: TOKENS.text3 }}>Keine Worker-Daten.</div>}
      </div>

      {/* Memory Episodes */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${TOKENS.b3}` }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: TOKENS.text3, fontWeight: 600, marginBottom: 10 }}>Memory</div>
        {ctx.memory.episodes.slice(0, 4).map((e, i) => (
          <div key={e.id || i} style={{ display: 'flex', gap: 6, padding: '4px 0', fontSize: 11, color: TOKENS.text2, lineHeight: 1.5 }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: TOKENS.text3, fontFamily: 'monospace', fontSize: 10 }}>{formatTime(e.updatedAt)}</span>{' '}
              {e.summary.slice(0, 80)}{e.summary.length > 80 ? '...' : ''}
            </div>
            {e.id && onDeleteMemory && (
              <span onClick={() => onDeleteMemory(e.id!)} style={{ color: TOKENS.text3, cursor: 'pointer', fontSize: 10, opacity: 0.5, flexShrink: 0 }} title="Löschen">✕</span>
            )}
          </div>
        ))}
      </div>

      {/* System */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: TOKENS.text3, fontWeight: 600, marginBottom: 10 }}>System</div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'monospace', color: TOKENS.text2 }}>
          <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: TOKENS.green, marginRight: 4, boxShadow: `0 0 6px ${TOKENS.green}60` }} />Render</span>
          <span>{ctx.tasks.length} Tasks</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───
export function MayaDashboard() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState(() => getInitialToken());
  const [authenticated, setAuthenticated] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [ctx, setCtx] = useState<MayaContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [actionStatus, setActionStatus] = useState<Record<string, 'idle' | 'pending' | 'confirm' | 'success' | 'error'>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const runAction = async (key: string, action: ParsedAction, confirmed?: boolean) => {
    setActionStatus(p => ({ ...p, [key]: confirmed ? 'pending' : 'confirm' }));
    if (!confirmed) return;
    try {
      const res = await executeAction({ endpoint: action.endpoint, branch: action.branch, worker: action.worker }, true);
      if (res.needsConfirmation) { setActionStatus(p => ({ ...p, [key]: 'confirm' })); return; }
      setActionStatus(p => ({ ...p, [key]: res.success ? 'success' : 'error' }));
      setMessages(prev => [...prev, { role: 'maya', text: res.success ? `✅ ${action.endpoint} erfolgreich.` : `❌ ${action.endpoint} fehlgeschlagen: ${JSON.stringify(res.result)}` }]);
      if (res.success) loadContext();
    } catch (e) {
      setActionStatus(p => ({ ...p, [key]: 'error' }));
      setMessages(prev => [...prev, { role: 'maya', text: `❌ Fehler: ${e instanceof Error ? e.message : String(e)}` }]);
    }
  };

  const { getContext, chat, executeAction, createMemory, deleteMemory } = useMayaApi(token || null);

  // Auto-auth if token in URL
  useEffect(() => {
    if (token) {
      fetch(`/api/builder/maya/context?token=${encodeURIComponent(token)}`)
        .then(r => { if (r.ok) setAuthenticated(true); })
        .catch(() => {});
    }
  }, [token]);

  // Load context on auth
  const loadContext = useCallback(async () => {
    setCtxLoading(true);
    try {
      const data = await getContext();
      setCtx(data);
      const firstContinuityNote = data.continuityNotes[0];

      // Auto-greeting with continuity note
      if (messages.length === 0 && firstContinuityNote) {
        const note = firstContinuityNote.summary;
        setMessages([{
          role: 'maya',
          text: `Builder Studio bereit. Letzte Session: ${note.slice(0, 150)}${note.length > 150 ? '...' : ''}\n\n${data.tasks.length} aktive Tasks, ${data.workerStats.length} Worker im Pool. Was steht an?`,
        }]);
      } else if (messages.length === 0) {
        setMessages([{ role: 'maya', text: `Builder Studio bereit. ${data.tasks.length} Tasks geladen. Was möchtest du bauen?` }]);
      }
    } catch (e) {
      console.error('Context load failed:', e);
    }
    setCtxLoading(false);
  }, [getContext, messages.length]);

  useEffect(() => {
    if (authenticated) loadContext();
  }, [authenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setChatLoading(true);

    try {
      const history: MayaChatMessage[] = messages.slice(-16).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const result = await chat(text, history);
      setMessages(prev => [...prev, { role: 'maya', text: result.response, model: result.model }]);

      // Refresh context after certain messages
      if (/build|push|deploy|task|status/i.test(text)) loadContext();
    } catch (e) {
      setMessages(prev => [...prev, { role: 'maya', text: `Fehler: ${e instanceof Error ? e.message : String(e)}` }]);
    }
    setChatLoading(false);
    inputRef.current?.focus();
  };

  if (!authenticated) {
    return <AuthGate onAuth={t => { setToken(t); setAuthenticated(true); }} />;
  }

  const continuityText = ctx?.continuityNotes?.[0]?.summary || null;

  return (
    <div style={{ height: '100vh', background: TOKENS.bg, color: TOKENS.text, fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: `1px solid ${TOKENS.b3}`, background: TOKENS.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: TOKENS.text }}>Builder Studio</span>
          <span style={{ fontSize: 12, color: MAYA, fontWeight: 400 }}>maya command center</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, fontFamily: 'monospace', color: TOKENS.text3 }}>
          <span style={{ cursor: 'pointer' }} onClick={loadContext}>↻ Refresh</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/builder')}>Old UI</span>
        </div>
      </div>

      {/* Continuity Note */}
      {continuityText && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: TOKENS.bg2, borderBottom: `1px solid ${TOKENS.b3}`, fontSize: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: TOKENS.gold, whiteSpace: 'nowrap' }}>Letzte session</span>
          <span style={{ color: TOKENS.text2 }}>{continuityText.slice(0, 200)}{continuityText.length > 200 ? '...' : ''}</span>
        </div>
      )}

      {/* Main 3-column */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left Sidebar */}
        <LeftSidebar ctx={ctx} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, flexShrink: 0, marginTop: 2,
                  background: m.role === 'maya' ? MAYA_DIM : 'rgba(34,211,238,0.08)',
                  color: m.role === 'maya' ? MAYA : TOKENS.cyan,
                  border: `1px solid ${m.role === 'maya' ? MAYA + '40' : TOKENS.cyan + '30'}`,
                }}>{m.role === 'maya' ? 'M' : 'G'}</div>
                <div style={{ maxWidth: 560, flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: m.role === 'maya' ? MAYA : TOKENS.cyan, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {m.role === 'maya' ? 'Maya' : 'Gürcan'}
                    {m.model && <span style={{ fontSize: 9, color: TOKENS.text3, fontWeight: 400 }}>{m.model}</span>}
                    <CopyBtn text={m.text} />
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: TOKENS.text }}>
                    {m.role === 'maya' ? parseActionBlocks(m.text).map((part, pi) => {
                      if (part.type === 'text') return <MayaMarkdown key={pi} text={part.content} />;
                      const a = part.action!;
                      const rc = RISK_COLORS[a.risk] ?? { bg: 'rgba(34,197,94,0.08)', border: '#22c55e40', text: '#4ade80' };
                      const key = `${i}-${pi}`;
                      const st = actionStatus[key] || 'idle';
                      return (
                        <div key={pi} style={{ margin: '10px 0', padding: '12px 14px', borderRadius: 12, background: rc.bg, border: `1.5px solid ${rc.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: rc.text }}>{a.risk}</span>
                            <code style={{ fontSize: 11, color: TOKENS.text, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>{a.endpoint}{a.branch ? ` → ${a.branch}` : ''}</code>
                          </div>
                          <div style={{ fontSize: 12, color: TOKENS.text2, marginBottom: 8 }}>{a.description}</div>
                          {st === 'idle' && <button onClick={() => runAction(key, a)} style={{ fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 8, border: `1px solid ${rc.border}`, background: 'transparent', color: rc.text, cursor: 'pointer' }}>Ausführen</button>}
                          {st === 'confirm' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span style={{ fontSize: 11, color: rc.text, alignSelf: 'center' }}>Bist du sicher?</span>
                              <button onClick={() => runAction(key, a, true)} style={{ fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 8, border: 'none', background: rc.text, color: '#000', cursor: 'pointer' }}>Bestätigen</button>
                              <button onClick={() => setActionStatus(p => ({ ...p, [key]: 'idle' }))} style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, border: `1px solid ${TOKENS.b2}`, background: 'transparent', color: TOKENS.text3, cursor: 'pointer' }}>Abbrechen</button>
                            </div>
                          )}
                          {st === 'pending' && <span style={{ fontSize: 11, color: TOKENS.text3 }}>⏳ Läuft...</span>}
                          {st === 'success' && <span style={{ fontSize: 11, color: TOKENS.green }}>✅ Erledigt</span>}
                          {st === 'error' && <span style={{ fontSize: 11, color: '#ef4444' }}>❌ Fehlgeschlagen</span>}
                        </div>
                      );
                    }) : <span style={{ whiteSpace: 'pre-wrap' }}>{m.text}</span>}
                  </div>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: MAYA_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: MAYA, border: `1px solid ${MAYA}40` }}>M</div>
                <div style={{ fontSize: 13, color: TOKENS.text3, paddingTop: 6 }}>Maya denkt...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${TOKENS.b3}`, display: 'flex', gap: 10, alignItems: 'flex-end', background: TOKENS.card }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Maya fragen, Tasks erstellen, Builds starten..."
              rows={2}
              style={{ flex: 1, background: TOKENS.bg, border: `1px solid ${TOKENS.b2}`, borderRadius: 12, padding: '14px 16px', color: TOKENS.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5 }} />
            <button onClick={sendMessage} disabled={chatLoading || !input.trim()}
              style={{ background: MAYA, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: chatLoading ? 0.5 : 1 }}>
              Senden
            </button>
          </div>
        </div>

        {/* Context Panel */}
        <div style={{ width: 280, background: TOKENS.card, borderLeft: `1px solid ${TOKENS.b3}`, flexShrink: 0, overflowY: 'auto' }}>
          <ContextPanel ctx={ctx} loading={ctxLoading}
            onDeleteMemory={async (id) => { await deleteMemory(id); loadContext(); }}
            onAddNote={async (summary) => { await createMemory('continuity', `note-${Date.now()}`, summary); loadContext(); }} />
        </div>
      </div>
    </div>
  );
}
