import { useState } from 'react';

import { TOKENS } from '../../../design/tokens';
import type { MayaContext } from '../hooks/useMayaApi';

interface BuilderContextPanelProps {
  ctx: MayaContext | null;
  formatDate: (value: string | null | undefined) => string;
  onDeleteMemory: (id: string) => void;
  onAddNote: (summary: string) => void;
}

export function BuilderContextPanel(props: BuilderContextPanelProps) {
  const { ctx, formatDate, onDeleteMemory, onAddNote } = props;
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
              {note.id ? <button onClick={() => onDeleteMemory(note.id!)} style={{ border: 'none', background: 'transparent', color: TOKENS.text3, cursor: 'pointer', fontSize: 10 }}>x</button> : null}
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
