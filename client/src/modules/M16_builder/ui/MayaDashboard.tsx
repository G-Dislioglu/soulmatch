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
    m[1].split(',').forEach(p => { const [k, v] = p.split('=').map(s => s.trim()); if (k && v) params[k] = v; });
    parts.push({
      type: 'action',
      content: m[2].trim(),
      action: { endpoint: params.endpoint || '/self-test', branch: params.branch, worker: params.worker, risk: params.risk || 'safe', description: m[2].trim() },
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

// ─── Auth Gate ───
function AuthGate({ onAuth }: { onAuth: (t: string) => void }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!val.trim()) return;
    setLoading(true);
    setErr('');
    try {
      const r = await fetch(`/api/builder/maya/context?token=${encodeURIComponent(val)}`);
      if (!r.ok) throw new Error('Ungültiger Token');
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
          <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="opus_token" autoFocus
            style={{ flex: 1, background: TOKENS.bg2, border: `1px solid ${TOKENS.b1}`, borderRadius: 12, padding: '12px 14px', color: TOKENS.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
          <button onClick={submit} disabled={loading}
            style={{ borderRadius: 12, border: `1.5px solid ${MAYA}`, background: MAYA_DIM, color: TOKENS.text, padding: '12px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? '...' : 'Verbinden'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Context Panel (right 35%) ───
function ContextPanel({ ctx, loading }: { ctx: MayaContext | null; loading: boolean }) {
  if (!ctx && loading) return <div style={{ padding: 20, color: TOKENS.text2, fontSize: 13 }}>Lade Kontext...</div>;
  if (!ctx) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
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
          <div key={i} style={{ padding: '4px 0', fontSize: 11, color: TOKENS.text2, lineHeight: 1.5 }}>
            <span style={{ color: TOKENS.text3, fontFamily: 'monospace', fontSize: 10 }}>{formatTime(e.updatedAt)}</span>{' '}
            {e.summary.slice(0, 80)}{e.summary.length > 80 ? '...' : ''}
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [actionStatus, setActionStatus] = useState<Record<string, 'idle' | 'pending' | 'confirm' | 'success' | 'error'>>({});

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

  const { getContext, chat, executeAction } = useMayaApi(token || null);

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
    <div style={{ minHeight: '100vh', background: TOKENS.bg, color: TOKENS.text, fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
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

      {/* Main 2-column */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Chat 65% */}
        <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${TOKENS.b3}` }}>
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
                <div style={{ maxWidth: 560 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: m.role === 'maya' ? MAYA : TOKENS.cyan, marginBottom: 3 }}>
                    {m.role === 'maya' ? 'Maya' : 'Gürcan'}
                    {m.model && <span style={{ fontSize: 9, color: TOKENS.text3, marginLeft: 6, fontWeight: 400 }}>{m.model}</span>}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: TOKENS.text, whiteSpace: 'pre-wrap' }}>
                    {m.role === 'maya' ? parseActionBlocks(m.text).map((part, pi) => {
                      if (part.type === 'text') return <span key={pi}>{part.content}</span>;
                      const a = part.action!;
                      const rc = RISK_COLORS[a.risk] || RISK_COLORS.safe;
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
                    }) : m.text}
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
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${TOKENS.b3}`, display: 'flex', gap: 10, background: TOKENS.card }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Maya fragen, Tasks erstellen, Builds starten..."
              style={{ flex: 1, background: TOKENS.bg, border: `1px solid ${TOKENS.b2}`, borderRadius: 10, padding: '11px 14px', color: TOKENS.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={sendMessage} disabled={chatLoading || !input.trim()}
              style={{ background: MAYA, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: chatLoading ? 0.5 : 1 }}>
              Senden
            </button>
          </div>
        </div>

        {/* Context 35% */}
        <div style={{ flex: '0 0 35%', background: TOKENS.card }}>
          <ContextPanel ctx={ctx} loading={ctxLoading} />
        </div>
      </div>
    </div>
  );
}
