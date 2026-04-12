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
  failed: '#ef4444', classifying: TOKENS.cyan, scouted: TOKENS.cyan,
  consensus: TOKENS.gold,
};

interface ParsedAction {
  endpoint: string; branch?: string; worker?: string; risk: string; description: string;
}
interface MessagePart {
  type: 'text' | 'action'; content: string; action?: ParsedAction;
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
      type: 'action', content: desc,
      action: { endpoint: params.endpoint || '/self-test', branch: params.branch, worker: params.worker, risk: params.risk || 'safe', description: desc },
    });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last).trim() });
  return parts.filter(p => p.content);
}

const RISK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  safe: { bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.35)', text: '#4ade80' },
  staging: { bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.35)', text: TOKENS.gold },
  destructive: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.35)', text: '#f87171' },
};

interface ChatMsg { role: 'user' | 'maya'; text: string; model?: string; }

function getInitialToken() {
  const p = new URLSearchParams(window.location.search);
  return p.get('opus_token') || p.get('token') || p.get('builderToken') || '';
}

function formatTime(d: string | null | undefined) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ fontSize: 10, color: copied ? TOKENS.green : TOKENS.text3, cursor: 'pointer', userSelect: 'none', padding: '2px 4px', borderRadius: 4, border: `1px solid ${TOKENS.b3}` }}
      title="Kopieren">{copied ? '\u2713' : '\u29C9'}</span>
  );
}

// Lightweight Markdown
function MayaMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('|')) { tableLines.push(lines[i] ?? ''); i++; }
      const rows = tableLines.filter(l => !/^\|[\s-:|]+\|$/.test(l.trim()));
      elements.push(
        <div key={i} style={{ overflowX: 'auto', margin: '8px 0', borderRadius: 12, border: `1px solid ${TOKENS.b2}`, background: TOKENS.bg2 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: `1px solid ${TOKENS.b3}` }}>
                  {row.split('|').filter(Boolean).map((cell, ci) => {
                    const Tag = ri === 0 ? 'th' : 'td';
                    return <Tag key={ci} style={{ padding: '6px 10px', textAlign: 'left', color: ri === 0 ? TOKENS.gold : TOKENS.text2, fontWeight: ri === 0 ? 600 : 400, fontSize: 11 }}><InlineFormat text={cell.trim()} /></Tag>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (line.startsWith('### ')) { elements.push(<div key={i} style={{ fontSize: 13, fontWeight: 700, color: TOKENS.gold, marginTop: 14, marginBottom: 4, letterSpacing: '0.02em' }}><InlineFormat text={line.slice(4)} /></div>); i++; continue; }
    if (line.startsWith('## ')) { elements.push(<div key={i} style={{ fontSize: 14, fontWeight: 700, color: TOKENS.text, marginTop: 16, marginBottom: 4 }}><InlineFormat text={line.slice(3)} /></div>); i++; continue; }
    if (/^-{3,}$/.test(line.trim())) { elements.push(<hr key={i} style={{ border: 'none', borderTop: `1px solid ${TOKENS.b2}`, margin: '12px 0' }} />); i++; continue; }
    if (/^[-*]\s/.test(line.trim()) || /^\d+\.\s/.test(line.trim())) {
      const bullet = /^\d+\./.test(line.trim()) ? (line.trim().match(/^\d+/)?.[0] ?? '1') + '.' : '\u2022';
      const content = line.trim().replace(/^[-*]\s|^\d+\.\s/, '');
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 6, padding: '2px 0', fontSize: 13, lineHeight: 1.6 }}>
          <span style={{ color: TOKENS.gold, flexShrink: 0, minWidth: 14 }}>{bullet}</span>
          <span style={{ color: TOKENS.text }}><InlineFormat text={content} /></span>
        </div>
      );
      i++; continue;
    }
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = []; i++;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) { codeLines.push(lines[i] ?? ''); i++; }
      i++;
      elements.push(
        <pre key={i} style={{ background: TOKENS.bg, borderRadius: 12, padding: '10px 14px', margin: '8px 0', fontSize: 11, fontFamily: 'monospace', color: TOKENS.text, overflowX: 'auto', whiteSpace: 'pre-wrap', border: `1px solid ${TOKENS.b2}` }}>
          {codeLines.join('\n')}
        </pre>
      );
      continue;
    }
    if (!line.trim()) { elements.push(<div key={i} style={{ height: 6 }} />); i++; continue; }
    elements.push(<div key={i} style={{ fontSize: 13, lineHeight: 1.65, color: TOKENS.text, padding: '1px 0' }}><InlineFormat text={line} /></div>);
    i++;
  }
  return <>{elements}</>;
}

function InlineFormat({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let last = 0; let m: RegExpExecArray | null; let ki = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={ki++}>{text.slice(last, m.index)}</span>);
    if (m[2]) parts.push(<strong key={ki++} style={{ fontWeight: 600, color: TOKENS.text }}>{m[2]}</strong>);
    if (m[3]) parts.push(<code key={ki++} style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: '0.9em', fontFamily: 'monospace', border: `1px solid ${TOKENS.b3}` }}>{m[3]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(<span key={ki++}>{text.slice(last)}</span>);
  return <>{parts}</>;
}

// Auth Gate
function AuthGate({ onAuth }: { onAuth: (t: string) => void }) {
  const [val, setVal] = useState(() => { try { return localStorage.getItem('maya-token') || ''; } catch { return ''; } });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  useEffect(() => { if (val) submit(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!val.trim()) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch(`/api/builder/maya/context?token=${encodeURIComponent(val)}`);
      if (!r.ok) throw new Error('Ung\u00fcltiger Token');
      try { localStorage.setItem('maya-token', val); } catch { /* noop */ }
      onAuth(val);
    } catch (e) { setErr(String(e instanceof Error ? e.message : e)); }
    setLoading(false);
  };
  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(circle at top, rgba(124,106,247,0.08), transparent 32%), ${TOKENS.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 'min(480px, 90%)', border: `1.5px solid ${TOKENS.b2}`, borderRadius: 24, background: TOKENS.card, boxShadow: TOKENS.shadow.card, padding: 28 }}>
        <div style={{ fontSize: 11, color: MAYA, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: TOKENS.font.body }}>Maya Command Center</div>
        <div style={{ marginTop: 8, fontFamily: TOKENS.font.display, fontSize: 28, color: TOKENS.text, letterSpacing: '0.05em' }}>Builder Studio</div>
        <p style={{ fontSize: 13, color: TOKENS.text2, marginTop: 8, lineHeight: 1.6 }}>Builder-Token eingeben um Maya zu starten.</p>
        {err && <div style={{ marginTop: 12, padding: 10, borderRadius: 14, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(127,29,29,0.32)', color: '#fecaca', fontSize: 13 }}>{err}</div>}
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
              type={showPw ? 'text' : 'password'} placeholder="Token" autoFocus
              style={{ width: '100%', boxSizing: 'border-box', background: TOKENS.bg2, border: `1.5px solid ${TOKENS.b1}`, borderRadius: 14, padding: '12px 40px 12px 14px', color: TOKENS.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
            <span onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 16, color: TOKENS.text3, userSelect: 'none' }}>
              {showPw ? '\uD83D\uDC41' : '\uD83D\uDC41\u200D\uD83D\uDDE8'}
            </span>
          </div>
          <button onClick={submit} disabled={loading}
            style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.14)', color: TOKENS.text, padding: '12px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? '...' : 'Verbinden'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Section Panel
function SectionPanel({ title, accent = TOKENS.gold, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1.5px solid ${TOKENS.b1}`, borderRadius: 18, background: TOKENS.card, boxShadow: TOKENS.shadow.card, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: `2px solid ${TOKENS.b1}`, background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))' }}>
        <div style={{ fontSize: 10, color: accent, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600, fontFamily: TOKENS.font.body }}>{title}</div>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

// Left Sidebar

// All available AI models
const ALL_MODELS = [
  { id: 'opus', label: 'Opus 4.6', provider: 'anthropic', quality: 95, speed: 'slow', color: MAYA },
  { id: 'sonnet', label: 'Sonnet 4.6', provider: 'anthropic', quality: 85, speed: 'fast', color: '#a78bfa' },
  { id: 'gpt-5.4', label: 'GPT-5.4', provider: 'openai', quality: 88, speed: 'medium', color: TOKENS.cyan },
  { id: 'gpt-5-nano', label: 'GPT-5 Nano', provider: 'openai', quality: 65, speed: 'fast', color: '#22d3ee' },
  { id: 'deepseek-r', label: 'DeepSeek R1', provider: 'deepseek', quality: 82, speed: 'medium', color: '#4ade80' },
  { id: 'deepseek-v3', label: 'DeepSeek V3', provider: 'deepseek', quality: 70, speed: 'fast', color: '#4ade80' },
  { id: 'gemini', label: 'Gemini Flash', provider: 'google', quality: 78, speed: 'fast', color: TOKENS.gold },
  { id: 'glm-flash', label: 'GLM Flash', provider: 'zhipu', quality: 72, speed: 'fast', color: TOKENS.green },
  { id: 'glm-turbo', label: 'GLM Turbo', provider: 'zhipu', quality: 68, speed: 'fast', color: TOKENS.green },
  { id: 'minimax', label: 'MiniMax M1', provider: 'minimax', quality: 60, speed: 'medium', color: '#fbbf24' },
  { id: 'kimi', label: 'Kimi K2', provider: 'moonshot', quality: 65, speed: 'medium', color: '#f472b6' },
  { id: 'qwen', label: 'Qwen Coder', provider: 'openrouter', quality: 58, speed: 'fast', color: '#a78bfa' },
];

type PoolType = 'master' | 'worker' | 'scout';

// Pool dropdown panel
function PoolPanel({ poolType, accent, activeIds, onToggle, workerStats, onClose }: {
  poolType: PoolType; accent: string; activeIds: string[];
  onToggle: (id: string) => void; workerStats: Array<{ worker: string; avg_quality: number; task_count: number }>;
  onClose: () => void;
}) {
  const activeModels = ALL_MODELS.filter(m => activeIds.includes(m.id));
  const avg = activeModels.length > 0 ? Math.round(activeModels.reduce((s, m) => s + m.quality, 0) / activeModels.length) : 0;
  const avgCol = avg >= 80 ? TOKENS.green : avg >= 60 ? TOKENS.gold : '#ef4444';

  return (
    <div style={{ background: TOKENS.card, borderBottom: `1.5px solid ${TOKENS.b1}`, boxShadow: TOKENS.shadow.dropdown, padding: '16px 24px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: accent, fontWeight: 700 }}>
            {poolType === 'master' ? 'Master Pool' : poolType === 'worker' ? 'Worker Pool' : 'Scout Pool'}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: avgCol, fontFamily: 'monospace' }}>{avg}%</span>
          <div style={{ width: 120, height: 6, background: TOKENS.bg, borderRadius: 3, overflow: 'hidden', border: `1px solid ${TOKENS.b2}` }}>
            <div style={{ width: `${avg}%`, height: '100%', background: `linear-gradient(90deg, ${avgCol}, ${avgCol}80)`, borderRadius: 3, boxShadow: `0 0 8px ${avgCol}40` }} />
          </div>
        </div>
        <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 16, color: TOKENS.text3, padding: '2px 6px' }}>{'\u2715'}</span>
      </div>

      {/* Model chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {ALL_MODELS.map(m => {
          const on = activeIds.includes(m.id);
          return (
            <button key={m.id} onClick={() => onToggle(m.id)}
              style={{
                fontSize: 10, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontFamily: 'monospace',
                border: `1.5px solid ${on ? accent + '70' : TOKENS.b3}`,
                background: on ? accent + '18' : 'transparent',
                color: on ? accent : TOKENS.text3,
                transition: 'all 0.15s ease',
              }}>{m.label}</button>
          );
        })}
      </div>

      {/* Performance bars for active models */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px 24px' }}>
        {ALL_MODELS.filter(m => activeIds.includes(m.id)).map(m => {
          // Try to find real stats
          const stat = workerStats.find(w => String(w.worker).toLowerCase().includes(m.id.split('-')[0] ?? ''));
          const pct = stat ? Math.min(100, Number(stat.avg_quality) || 0) : m.quality;
          const tasks = stat ? stat.task_count : 0;
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 11 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: m.color, flexShrink: 0, boxShadow: `0 0 8px ${m.color}60` }} />
              <span style={{ minWidth: 80, fontFamily: 'monospace', color: TOKENS.text, fontSize: 11 }}>{m.label}</span>
              <div style={{ flex: 1, height: 6, background: TOKENS.bg, borderRadius: 3, overflow: 'hidden', border: `1px solid ${TOKENS.b2}`, minWidth: 60 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: m.color, borderRadius: 3, boxShadow: `0 0 6px ${m.color}40` }} />
              </div>
              <span style={{ minWidth: 28, textAlign: 'right', fontFamily: 'monospace', fontSize: 10, color: TOKENS.text3 }}>{pct}%</span>
              <span style={{ fontSize: 9, color: TOKENS.text3, fontFamily: 'monospace' }}>{m.speed}</span>
              {tasks > 0 && <span style={{ fontSize: 8, color: TOKENS.text3, fontFamily: 'monospace' }}>{'\u00D7'}{tasks}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Left Sidebar — Tasks only
function LeftSidebar({ ctx, collapsed, onToggle, onTaskClick }: {
  ctx: MayaContext | null; collapsed: boolean; onToggle: () => void; onTaskClick?: (id: string, title: string) => void;
}) {
  if (collapsed) {
    return (
      <div style={{ width: 48, background: TOKENS.bg2, borderRight: `1.5px solid ${TOKENS.b2}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14, flexShrink: 0 }}>
        <span onClick={onToggle} style={{ cursor: 'pointer', fontSize: 16, color: TOKENS.text3, marginBottom: 16, padding: 4 }} title="Sidebar \u00f6ffnen">{'\u00BB'}</span>
        <span style={{ fontSize: 11, color: MAYA, writingMode: 'vertical-rl', letterSpacing: 2, fontWeight: 600 }}>TASKS</span>
      </div>
    );
  }

  return (
    <div style={{ width: 260, background: TOKENS.bg2, borderRight: `1.5px solid ${TOKENS.b2}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1.5px solid ${TOKENS.b2}`, background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent)' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: TOKENS.gold, fontWeight: 600 }}>Tasks ({ctx?.tasks.length ?? 0})</div>
        <span onClick={onToggle} style={{ cursor: 'pointer', fontSize: 14, color: TOKENS.text3, padding: 4 }} title="Einklappen">{'\u00AB'}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {ctx?.tasks.slice(0, 30).map(t => (
          <button key={t.id} onClick={() => onTaskClick?.(t.id, t.title)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
              padding: '8px 10px', borderRadius: 12, marginBottom: 4, fontSize: 11,
              cursor: 'pointer', border: `1.5px solid ${TOKENS.b2}`, background: TOKENS.card2, color: TOKENS.text,
            }}
            onMouseEnter={e => { (e.currentTarget).style.borderColor = TOKENS.gold; (e.currentTarget).style.background = 'rgba(212,175,55,0.10)'; }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = TOKENS.b2; (e.currentTarget).style.background = TOKENS.card2; }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[t.status] || TOKENS.text2, flexShrink: 0, boxShadow: `0 0 4px ${STATUS_COLORS[t.status] || TOKENS.text2}50` }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title.slice(0, 45)}</span>
            <span style={{ fontSize: 9, color: STATUS_COLORS[t.status] || TOKENS.text3, fontFamily: 'monospace', borderRadius: 999, border: `1px solid ${TOKENS.b3}`, padding: '1px 6px', flexShrink: 0 }}>{t.status.slice(0, 8)}</span>
          </button>
        ))}
        {(!ctx || ctx.tasks.length === 0) && <div style={{ fontSize: 11, color: TOKENS.text3, fontStyle: 'italic', padding: 8 }}>Keine Tasks.</div>}
      </div>
    </div>
  );
}

function ContextPanel({ ctx, loading, onDeleteMemory, onAddNote }: {
  ctx: MayaContext | null; loading: boolean;
  onDeleteMemory?: (id: string) => void; onAddNote?: (s: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newNote, setNewNote] = useState('');
  if (loading) return <div style={{ padding: 20, color: TOKENS.text3, fontSize: 12 }}>Lade Kontext...</div>;
  if (!ctx) return <div style={{ padding: 20, color: TOKENS.text3, fontSize: 12 }}>Nicht verbunden.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14 }}>
      <SectionPanel title="Continuity Notes" accent={TOKENS.gold}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: TOKENS.text3 }}>{ctx.continuityNotes.length} Notes</span>
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ fontSize: 10, padding: '3px 10px', borderRadius: 999, border: `1px solid ${TOKENS.gold}40`, background: 'transparent', color: TOKENS.gold, cursor: 'pointer', fontWeight: 600 }}>+ Notiz</button>
        </div>
        {showAdd && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Session-Notiz..."
              onKeyDown={e => { if (e.key === 'Enter' && newNote.trim()) { onAddNote?.(newNote.trim()); setNewNote(''); setShowAdd(false); } }}
              style={{ flex: 1, background: TOKENS.bg, border: `1.5px solid ${TOKENS.b1}`, borderRadius: 10, padding: '6px 10px', color: TOKENS.text, fontSize: 11, outline: 'none' }} />
            <button onClick={() => { if (newNote.trim()) { onAddNote?.(newNote.trim()); setNewNote(''); setShowAdd(false); } }}
              style={{ fontSize: 10, padding: '6px 12px', borderRadius: 10, border: 'none', background: TOKENS.gold, color: '#000', cursor: 'pointer', fontWeight: 600 }}>OK</button>
          </div>
        )}
        {ctx.continuityNotes.map((n, i) => (
          <div key={n.id || i} style={{ display: 'flex', gap: 6, padding: '5px 0', fontSize: 11, color: TOKENS.text2, lineHeight: 1.5, borderBottom: `1px solid ${TOKENS.b3}` }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: TOKENS.text3, fontFamily: 'monospace', fontSize: 9 }}>{formatTime(n.updatedAt)}</span>{' '}
              {n.summary.slice(0, 120)}{n.summary.length > 120 ? '...' : ''}
            </div>
            {n.id && onDeleteMemory && (
              <span onClick={() => onDeleteMemory(n.id!)} style={{ color: TOKENS.text3, cursor: 'pointer', fontSize: 10, opacity: 0.6, flexShrink: 0, padding: '0 2px' }} title="L\u00f6schen">{'\u2715'}</span>
            )}
          </div>
        ))}
        {ctx.continuityNotes.length === 0 && <div style={{ fontSize: 11, color: TOKENS.text3, fontStyle: 'italic' }}>Keine Continuity Notes.</div>}
      </SectionPanel>
      <SectionPanel title="Memory Episodes" accent={TOKENS.purple}>
        {ctx.memory.episodes.slice(0, 4).map((e, i) => (
          <div key={e.id || i} style={{ display: 'flex', gap: 6, padding: '4px 0', fontSize: 11, color: TOKENS.text2, lineHeight: 1.5 }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: TOKENS.text3, fontFamily: 'monospace', fontSize: 9 }}>{formatTime(e.updatedAt)}</span>{' '}
              {e.summary.slice(0, 80)}{e.summary.length > 80 ? '...' : ''}
            </div>
            {e.id && onDeleteMemory && (
              <span onClick={() => onDeleteMemory(e.id!)} style={{ color: TOKENS.text3, cursor: 'pointer', fontSize: 10, opacity: 0.5, flexShrink: 0 }} title="L\u00f6schen">{'\u2715'}</span>
            )}
          </div>
        ))}
        {ctx.memory.episodes.length === 0 && <div style={{ fontSize: 11, color: TOKENS.text3, fontStyle: 'italic' }}>Keine Episoden.</div>}
      </SectionPanel>
      <SectionPanel title="System" accent={TOKENS.cyan}>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'monospace', color: TOKENS.text2, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: TOKENS.green, boxShadow: `0 0 8px ${TOKENS.green}60`, display: 'inline-block' }} />
            Render
          </span>
          <span style={{ border: `1px solid ${TOKENS.b3}`, borderRadius: 999, padding: '2px 8px' }}>{ctx.tasks.length} Tasks</span>
          <span style={{ border: `1px solid ${TOKENS.b3}`, borderRadius: 999, padding: '2px 8px' }}>{ctx.workerStats.length} Worker</span>
        </div>
      </SectionPanel>
    </div>
  );
}

// Main Dashboard
// Main Dashboard
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionStatus, setActionStatus] = useState<Record<string, 'idle' | 'pending' | 'confirm' | 'success' | 'error'>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Pool state
  const [openPool, setOpenPool] = useState<PoolType | null>(null);
  const [masterIds, setMasterIds] = useState<string[]>(['opus', 'gemini']);
  const [workerIds, setWorkerIds] = useState<string[]>(['glm-turbo', 'minimax', 'kimi', 'qwen', 'deepseek']);
  const [scoutIds, setScoutIds] = useState<string[]>(['deepseek-v3', 'gpt-5-nano', 'gemini']);

  const togglePool = (pool: PoolType) => setOpenPool(prev => prev === pool ? null : pool);
  const toggleId = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

  const poolAvg = (ids: string[]) => {
    const models = ALL_MODELS.filter(m => ids.includes(m.id));
    return models.length > 0 ? Math.round(models.reduce((s, m) => s + m.quality, 0) / models.length) : 0;
  };
  const avgColor = (avg: number) => avg >= 80 ? TOKENS.green : avg >= 60 ? TOKENS.gold : '#ef4444';

  const { getContext, chat, chatWithFile, executeAction, createMemory, deleteMemory, getTaskDialog, getTaskEvidence } = useMayaApi(token || null);

  const runAction = async (key: string, action: ParsedAction, confirmed?: boolean) => {
    setActionStatus(p => ({ ...p, [key]: confirmed ? 'pending' : 'confirm' }));
    if (!confirmed) return;
    try {
      const res = await executeAction({ endpoint: action.endpoint, branch: action.branch, worker: action.worker }, true);
      if (res.needsConfirmation) { setActionStatus(p => ({ ...p, [key]: 'confirm' })); return; }
      setActionStatus(p => ({ ...p, [key]: res.success ? 'success' : 'error' }));
      setMessages(prev => [...prev, { role: 'maya', text: res.success ? `\u2705 ${action.endpoint} erfolgreich.` : `\u274C ${action.endpoint} fehlgeschlagen: ${JSON.stringify(res.result)}` }]);
      if (res.success) loadContext();
    } catch (e) {
      setActionStatus(p => ({ ...p, [key]: 'error' }));
      setMessages(prev => [...prev, { role: 'maya', text: `\u274C Fehler: ${e instanceof Error ? e.message : String(e)}` }]);
    }
  };

  useEffect(() => {
    if (token) {
      fetch(`/api/builder/maya/context?token=${encodeURIComponent(token)}`)
        .then(r => { if (r.ok) setAuthenticated(true); }).catch(() => {});
    }
  }, [token]);

  const loadContext = useCallback(async () => {
    setCtxLoading(true);
    try {
      const data = await getContext();
      setCtx(data);
      if (messages.length === 0 && data.continuityNotes[0]) {
        const note = data.continuityNotes[0].summary;
        setMessages([{ role: 'maya', text: `Builder Studio bereit. Letzte Session: ${note.slice(0, 150)}${note.length > 150 ? '...' : ''}\n\n${data.tasks.length} aktive Tasks, ${data.workerStats.length} Worker im Pool. Was steht an?` }]);
      } else if (messages.length === 0) {
        setMessages([{ role: 'maya', text: `Builder Studio bereit. ${data.tasks.length} Tasks geladen. Was m\u00f6chtest du bauen?` }]);
      }
    } catch (e) { console.error('Context load failed:', e); }
    setCtxLoading(false);
  }, [getContext, messages.length]);

  useEffect(() => { if (authenticated) loadContext(); }, [authenticated]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setChatLoading(true);
    try {
      const history: MayaChatMessage[] = messages.slice(-16).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const result = await chat(text, history);
      setMessages(prev => [...prev, { role: 'maya', text: result.response, model: result.model }]);
      if (/build|push|deploy|task|status/i.test(text)) loadContext();
    } catch (e) {
      setMessages(prev => [...prev, { role: 'maya', text: `Fehler: ${e instanceof Error ? e.message : String(e)}` }]);
    }
    setChatLoading(false);
    inputRef.current?.focus();
  };

  const openTaskDetail = async (taskId: string, taskTitle: string) => {
    setChatLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: `\uD83D\uDCCB Task-Detail: ${taskTitle}` }]);
    try {
      const [dialog, evidence] = await Promise.all([getTaskDialog(taskId), getTaskEvidence(taskId)]);
      let detailText = `### Task: ${taskTitle}\n\n`;
      if (dialog && dialog.length > 0) {
        detailText += `**Dialog (${dialog.length} Schritte):**\n\n`;
        for (const action of dialog.slice(-8)) {
          const time = formatTime(action.createdAt);
          const text = (action.text ?? '').slice(0, 300);
          detailText += `**${action.actionType}** (${time}):\n${text}${(action.text ?? '').length > 300 ? '...' : ''}\n\n---\n\n`;
        }
      } else { detailText += '*Kein Dialog vorhanden.*\n\n'; }
      if (evidence) {
        detailText += `### Evidence Pack\n`;
        const ev = evidence as Record<string, unknown>;
        if (ev.testResults) detailText += `\n**Tests:** ${JSON.stringify(ev.testResults).slice(0, 200)}`;
        if (ev.patches) detailText += `\n**Patches:** ${Array.isArray(ev.patches) ? ev.patches.length + ' Dateien' : 'vorhanden'}`;
        if (ev.summary) detailText += `\n**Summary:** ${String(ev.summary).slice(0, 200)}`;
      }
      setMessages(prev => [...prev, { role: 'maya', text: detailText }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'maya', text: `\u274C Task-Details konnten nicht geladen werden: ${e instanceof Error ? e.message : String(e)}` }]);
    }
    setChatLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 10 * 1024 * 1024) { setMessages(prev => [...prev, { role: 'maya', text: '\u274C Datei zu gro\u00DF (max 10MB).' }]); return; }
    setChatLoading(true);
    const userMsg = input.trim() || `\uD83D\uDCCE ${file.name}`;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => { const result = reader.result as string; resolve(result.split(',')[1] ?? ''); };
        reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
        reader.readAsDataURL(file);
      });
      const history: MayaChatMessage[] = messages.slice(-12).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const result = await chatWithFile(userMsg, base64, file.type, file.name, history);
      setMessages(prev => [...prev, { role: 'maya', text: result.response, model: result.model }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'maya', text: `\u274C Datei-Verarbeitung fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}` }]);
    }
    setChatLoading(false);
  };

  if (!authenticated) return <AuthGate onAuth={t => { setToken(t); setAuthenticated(true); }} />;

  const continuityText = ctx?.continuityNotes?.[0]?.summary || null;
  const mAvg = poolAvg(masterIds);
  const wAvg = poolAvg(workerIds);
  const sAvg = poolAvg(scoutIds);

  const poolBtn = (label: string, pool: PoolType, accent: string, avg: number, count: number) => (
    <button key={pool} onClick={() => togglePool(pool)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        border: `1.5px solid ${openPool === pool ? accent : TOKENS.b1}`,
        background: openPool === pool ? accent + '18' : 'transparent',
        color: openPool === pool ? accent : TOKENS.text2,
      }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: avgColor(avg) }}>{avg}%</span>
      <span style={{ fontSize: 9, color: TOKENS.text3 }}>({count})</span>
    </button>
  );

  return (
    <div style={{ height: '100vh', background: `radial-gradient(circle at top, rgba(124,106,247,0.06), transparent 32%), ${TOKENS.bg}`, color: TOKENS.text, fontFamily: TOKENS.font.body, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar with pool buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px', borderBottom: `1.5px solid ${TOKENS.b2}`, background: TOKENS.card, boxShadow: TOKENS.shadow.topbar, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <span style={{ fontSize: 10, color: MAYA, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600 }}>Maya</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: TOKENS.text, marginLeft: 8 }}>Builder Studio</span>
          </div>
          <div style={{ width: 1, height: 24, background: TOKENS.b2 }} />
          {poolBtn('Master', 'master', MAYA, mAvg, masterIds.length)}
          {poolBtn('Worker', 'worker', TOKENS.cyan, wAvg, workerIds.length)}
          {poolBtn('Scout', 'scout', TOKENS.gold, sAvg, scoutIds.length)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={loadContext} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.14)', color: TOKENS.text, padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{'\u21BB'} Refresh</button>
          <button onClick={() => navigate('/builder')} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.b1}`, background: 'transparent', color: TOKENS.text2, padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Old UI</button>
        </div>
      </div>

      {/* Pool panel (expands below top bar) */}
      {openPool === 'master' && <PoolPanel poolType="master" accent={MAYA} activeIds={masterIds} onToggle={id => setMasterIds(toggleId(masterIds, id))} workerStats={ctx?.workerStats ?? []} onClose={() => setOpenPool(null)} />}
      {openPool === 'worker' && <PoolPanel poolType="worker" accent={TOKENS.cyan} activeIds={workerIds} onToggle={id => setWorkerIds(toggleId(workerIds, id))} workerStats={ctx?.workerStats ?? []} onClose={() => setOpenPool(null)} />}
      {openPool === 'scout' && <PoolPanel poolType="scout" accent={TOKENS.gold} activeIds={scoutIds} onToggle={id => setScoutIds(toggleId(scoutIds, id))} workerStats={ctx?.workerStats ?? []} onClose={() => setOpenPool(null)} />}

      {/* Continuity banner */}
      {continuityText && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', background: 'rgba(212,175,55,0.06)', borderBottom: `1px solid ${TOKENS.gold}25`, fontSize: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: TOKENS.gold, whiteSpace: 'nowrap', borderRadius: 999, border: `1px solid ${TOKENS.gold}40`, padding: '2px 8px' }}>Session</span>
          <span style={{ color: TOKENS.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{continuityText.slice(0, 200)}</span>
        </div>
      )}

      {/* Main 3-column */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <LeftSidebar ctx={ctx} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} onTaskClick={openTaskDetail} />

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2,
                  background: m.role === 'maya' ? MAYA_DIM : 'rgba(212,175,55,0.10)',
                  color: m.role === 'maya' ? MAYA : TOKENS.gold,
                  border: `1.5px solid ${m.role === 'maya' ? MAYA + '50' : TOKENS.gold + '40'}`,
                }}>{m.role === 'maya' ? 'M' : 'G'}</div>
                <div style={{ maxWidth: 620, flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: m.role === 'maya' ? MAYA : TOKENS.gold, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.role === 'maya' ? 'Maya' : 'G\u00FCrcan'}
                    {m.model && <span style={{ fontSize: 9, color: TOKENS.text3, fontWeight: 400, borderRadius: 999, border: `1px solid ${TOKENS.b3}`, padding: '1px 6px' }}>{m.model}</span>}
                    <CopyBtn text={m.text} />
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: TOKENS.text }}>
                    {m.role === 'maya' ? parseActionBlocks(m.text).map((part, pi) => {
                      if (part.type === 'text') return <MayaMarkdown key={pi} text={part.content} />;
                      const a = part.action!;
                      const rcFallback = { bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.35)', text: '#4ade80' };
                      const rc = RISK_COLORS[a.risk] ?? rcFallback;
                      const key = `${i}-${pi}`;
                      const st = actionStatus[key] || 'idle';
                      return (
                        <div key={pi} style={{ margin: '10px 0', padding: '14px 16px', borderRadius: 16, background: rc.bg, border: `1.5px solid ${rc.border}`, boxShadow: `0 4px 12px ${rc.border}20` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: rc.text, borderRadius: 999, border: `1px solid ${rc.border}`, padding: '2px 8px' }}>{a.risk}</span>
                            <code style={{ fontSize: 11, color: TOKENS.text, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6, border: `1px solid ${TOKENS.b3}` }}>{a.endpoint}{a.branch ? ` \u2192 ${a.branch}` : ''}</code>
                          </div>
                          <div style={{ fontSize: 12, color: TOKENS.text2, marginBottom: 10, lineHeight: 1.5 }}>{a.description}</div>
                          {st === 'idle' && <button onClick={() => runAction(key, a)} style={{ fontSize: 11, fontWeight: 600, padding: '7px 16px', borderRadius: 999, border: `1.5px solid ${rc.border}`, background: 'transparent', color: rc.text, cursor: 'pointer' }}>Ausf\u00FChren</button>}
                          {st === 'confirm' && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: rc.text }}>Bist du sicher?</span>
                              <button onClick={() => runAction(key, a, true)} style={{ fontSize: 11, fontWeight: 600, padding: '7px 16px', borderRadius: 999, border: 'none', background: rc.text, color: '#000', cursor: 'pointer' }}>Best\u00E4tigen</button>
                              <button onClick={() => setActionStatus(p => ({ ...p, [key]: 'idle' }))} style={{ fontSize: 11, padding: '7px 16px', borderRadius: 999, border: `1px solid ${TOKENS.b2}`, background: 'transparent', color: TOKENS.text3, cursor: 'pointer' }}>Abbrechen</button>
                            </div>
                          )}
                          {st === 'pending' && <span style={{ fontSize: 11, color: TOKENS.text3 }}>{'\u23F3'} L\u00E4uft...</span>}
                          {st === 'success' && <span style={{ fontSize: 11, color: TOKENS.green, fontWeight: 600 }}>{'\u2705'} Erledigt</span>}
                          {st === 'error' && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{'\u274C'} Fehlgeschlagen</span>}
                        </div>
                      );
                    }) : <span style={{ whiteSpace: 'pre-wrap' }}>{m.text}</span>}
                  </div>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: MAYA_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: MAYA, border: `1.5px solid ${MAYA}50` }}>M</div>
                <div style={{ fontSize: 13, color: TOKENS.text3, paddingTop: 7 }}>Maya denkt...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: '14px 22px', borderTop: `1.5px solid ${TOKENS.b2}`, display: 'flex', gap: 10, alignItems: 'flex-end', background: TOKENS.card }}>
            <input ref={fileInputRef} type="file" accept="image/*,.zip,.pdf,.txt,.ts,.tsx,.js,.json,.md" style={{ display: 'none' }} onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} disabled={chatLoading}
              title="Datei anh\u00E4ngen"
              style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.b1}`, background: 'transparent', padding: '12px 14px', fontSize: 14, color: TOKENS.text3, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>
              {'\uD83D\uDCCE'}
            </button>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Maya fragen, Tasks erstellen, Builds starten..."
              rows={2}
              style={{ flex: 1, background: TOKENS.bg2, border: `1.5px solid ${TOKENS.b1}`, borderRadius: 14, padding: '14px 16px', color: TOKENS.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5 }} />
            <button onClick={sendMessage} disabled={chatLoading || !input.trim()}
              style={{ borderRadius: 999, background: MAYA, color: '#fff', border: 'none', padding: '14px 26px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: chatLoading ? 0.5 : 1 }}>
              Senden
            </button>
          </div>
        </div>

        <div style={{ width: 300, background: TOKENS.bg2, borderLeft: `1.5px solid ${TOKENS.b2}`, flexShrink: 0, overflowY: 'auto' }}>
          <ContextPanel ctx={ctx} loading={ctxLoading}
            onDeleteMemory={async (id) => { await deleteMemory(id); loadContext(); }}
            onAddNote={async (summary) => { await createMemory('continuity', `note-${Date.now()}`, summary); loadContext(); }} />
        </div>
      </div>
    </div>
  );
}
