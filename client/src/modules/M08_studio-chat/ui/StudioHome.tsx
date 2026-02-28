import { useEffect, useMemo, useRef, useState } from 'react';
import { PERSONA_COLORS, PERSONA_NAMES } from '../lib/personaColors';
import { useSpeechToText } from '../../../hooks/useSpeechToText';
import { SpeechConsentDialog } from './SpeechConsentDialog';

interface StudioHomeProps {
  onStartSession: (question: string, personaId: string) => void;
}

interface RealmChip {
  id: string;
  icon: string;
  label: string;
  question: string;
  personaId: string;
}

const REALM_CHIPS: RealmChip[] = [
  { id: 'astro', icon: '☽', label: 'Horoskop lesen', question: 'Analysiere mein Geburtshoroskop', personaId: 'stella' },
  { id: 'tarot', icon: '🂱', label: 'Tarot befragen', question: 'Was sagt das Tarot zu meiner Situation?', personaId: 'lilith' },
  { id: 'bazi', icon: '☯', label: 'BaZi & Elemente', question: 'Welche Energie habe ich laut BaZi?', personaId: 'lian' },
  { id: 'num', icon: '∞', label: 'Numerologie', question: 'Was ist meine Lebenspfadzahl?', personaId: 'sibyl' },
  { id: 'hd', icon: '◈', label: 'Human Design', question: 'Erkläre mir mein Human Design', personaId: 'amara' },
  { id: 'vedic', icon: '🕉', label: 'Vedisch', question: 'Was zeigt mein vedisches Kundali?', personaId: 'kael' },
];

interface RecentSession {
  id: string;
  personaName: string;
  topic: string;
  color: string;
}

function loadRecentSessions(): RecentSession[] {
  try {
    const raw = localStorage.getItem('soulmatch_discuss_history');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{ id: string; role: string; persona?: string; text?: string }>;
    const recent = parsed
      .filter((item) => item.role === 'persona' && item.persona && item.text)
      .slice(-6)
      .reverse()
      .map((item) => {
        const personaId = item.persona ?? 'maya';
        return {
          id: item.id,
          personaName: PERSONA_NAMES[personaId] ?? personaId,
          topic: (item.text ?? '').slice(0, 42),
          color: PERSONA_COLORS[personaId] ?? '#d4af37',
        };
      });
    return recent;
  } catch {
    return [];
  }
}

function inferPersonaFromQuestion(question: string): string {
  const lower = question.toLowerCase();
  if (lower.includes('tarot') || lower.includes('schatten')) return 'lilith';
  if (lower.includes('bazi') || lower.includes('element')) return 'lian';
  if (lower.includes('numerologie') || lower.includes('lebenspfad') || lower.includes('zahl')) return 'sibyl';
  if (lower.includes('human design')) return 'amara';
  if (lower.includes('vedisch') || lower.includes('kundali')) return 'kael';
  if (lower.includes('horoskop') || lower.includes('astrologie')) return 'stella';
  return 'maya';
}

function OracleSymbolSVG() {
  return (
    <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
      <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth="1.5" />
      <circle cx="36" cy="36" r="17" fill="none" stroke="rgba(212,175,55,0.25)" strokeWidth="1" />
      <path d="M36 12 L40 30 L60 36 L40 42 L36 60 L32 42 L12 36 L32 30 Z" fill="rgba(212,175,55,0.12)" stroke="rgba(212,175,55,0.55)" strokeWidth="1" />
      <circle cx="36" cy="36" r="4" fill="rgba(212,175,55,0.7)" />
    </svg>
  );
}

export function StudioHome({ onStartSession }: StudioHomeProps) {
  const [question, setQuestion] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const selectedPersonaRef = useRef<string | null>(selectedPersonaId);
  const [showConsent, setShowConsent] = useState(false);

  const suggestedPersonaId = selectedPersonaId ?? (question.trim() ? inferPersonaFromQuestion(question) : null);
  const suggestedPersonaName = suggestedPersonaId ? (PERSONA_NAMES[suggestedPersonaId] ?? suggestedPersonaId) : null;
  const suggestedPersonaColor = suggestedPersonaId ? (PERSONA_COLORS[suggestedPersonaId] ?? '#d4af37') : null;

  const speech = useSpeechToText('de', (text) => {
    const spoken = text.trim();
    if (!spoken) return;
    const personaId = selectedPersonaRef.current ?? inferPersonaFromQuestion(spoken);
    setQuestion(spoken);
    onStartSession(spoken, personaId);
  });

  useEffect(() => {
    selectedPersonaRef.current = selectedPersonaId;
  }, [selectedPersonaId]);

  useEffect(() => {
    if (!speech.isListening) return;
    if (!speech.transcript) return;
    setQuestion(speech.transcript);
  }, [speech.isListening, speech.transcript]);

  const recentSessions = useMemo(() => loadRecentSessions(), []);

  function startRouting() {
    const trimmed = question.trim();
    if (!trimmed) return;
    onStartSession(trimmed, selectedPersonaId ?? inferPersonaFromQuestion(trimmed));
  }

  return (
    <div className="oracle-entrance">
      <div className="oracle-symbol">
        <OracleSymbolSVG />
      </div>

      <h1 className="oracle-headline">
        Was bewegt dich<br />
        <em>gerade wirklich?</em>
      </h1>
      <p className="oracle-sub">Stelle deine Frage. Der richtige Analyst findet dich.</p>

      <div className="oracle-input-wrap">
        <input
          className="oracle-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              startRouting();
            }
          }}
          placeholder="Ich frage mich, ob ich die richtige Entscheidung treffe..."
        />
        <button
          className="oracle-send-btn"
          type="button"
          onClick={() => question.trim() && startRouting()}
          disabled={!question.trim()}
        >
          →
        </button>
      </div>

      {suggestedPersonaId && (
        <div className="persona-hint">
          <span className="persona-hint-dot" style={{ background: suggestedPersonaColor ?? '#d4af37' }} />
          <span className="persona-hint-text" style={{ color: suggestedPersonaColor ?? '#d4af37' }}>
            {suggestedPersonaName}
          </span>
          <span className="persona-hint-label">antwortet dir</span>
        </div>
      )}

      <div className="oracle-chips">
        {REALM_CHIPS.map((chip) => (
          <button
            key={chip.id}
            className={`realm-chip${selectedPersonaId === chip.personaId ? ' selected' : ''}`}
            type="button"
            onClick={() => {
              setQuestion(chip.question);
              setSelectedPersonaId(chip.personaId);
            }}
          >
            {chip.icon} {chip.label}
          </button>
        ))}
      </div>

      {speech.isSupported && (
        <button
          className={`oracle-live-talk-btn${speech.isListening ? ' active' : ''}`}
          type="button"
          onClick={() => {
            if (speech.isListening) {
              speech.stopListening();
              return;
            }
            if (!speech.hasConsent) {
              setShowConsent(true);
              return;
            }
            speech.startListening();
          }}
        >
          <span style={{ fontSize: 18 }}>{speech.isListening ? '⏹' : '🎙️'}</span>
          <span>{speech.isListening ? 'Stopp' : 'Live-Talk'}</span>
        </button>
      )}

      {recentSessions.length > 0 && (
        <div className="recent-sessions">
          <span className="recent-label">ZULETZT</span>
          {recentSessions.map((session) => (
            <button key={session.id} className="session-pill" type="button" onClick={() => setQuestion(session.topic)}>
              <span className="session-dot" style={{ background: session.color }} />
              {session.personaName} · {session.topic}
            </button>
          ))}
        </div>
      )}

      {showConsent && (
        <SpeechConsentDialog
          onAccept={() => {
            speech.grantConsent();
            setShowConsent(false);
            speech.startListening();
          }}
          onCancel={() => setShowConsent(false)}
        />
      )}

      <style>{`\n        .oracle-entrance {\n          display: flex;\n          flex-direction: column;\n          align-items: center;\n          justify-content: center;\n          min-height: 80vh;\n          padding: 40px 32px;\n          text-align: center;\n        }\n\n        .oracle-symbol {\n          width: 72px;\n          height: 72px;\n          margin-bottom: 36px;\n          animation: oracleFloat 6s ease-in-out infinite;\n          opacity: 0.7;\n        }\n\n        @keyframes oracleFloat {\n          0%, 100% { transform: translateY(0); }\n          50% { transform: translateY(-8px); }\n        }\n\n        .oracle-headline {\n          font-size: clamp(32px, 4vw, 52px);\n          font-weight: 400;\n          line-height: 1.15;\n          margin-bottom: 12px;\n          letter-spacing: 0.01em;\n        }\n\n        .oracle-headline em {\n          font-style: italic;\n          color: var(--accent-gold, #c9a84c);\n        }\n\n        .oracle-sub {\n          font-size: 15px;\n          font-weight: 300;\n          color: rgba(255, 255, 255, 0.4);\n          margin-bottom: 44px;\n          letter-spacing: 0.02em;\n        }\n\n        .oracle-input-wrap {\n          position: relative;\n          width: 100%;\n          max-width: 600px;\n          margin-bottom: 24px;\n        }\n\n        .oracle-input {\n          width: 100%;\n          padding: 20px 28px;\n          border-radius: 60px;\n          font-style: italic;\n          font-size: 17px;\n          background: rgba(255, 255, 255, 0.04);\n          border: 1px solid rgba(255, 255, 255, 0.12);\n          color: #f0eadc;\n          outline: none;\n        }\n\n        .oracle-input:focus {\n          border-color: rgba(212, 175, 55, 0.5);\n          box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.15);\n        }\n\n        .oracle-live-talk-btn {\n          display: flex;\n          align-items: center;\n          gap: 8px;\n          padding: 12px 28px;\n          border-radius: 999px;\n          border: 1px solid rgba(255, 255, 255, 0.12);\n          background: rgba(255, 255, 255, 0.04);\n          color: #d4c9b0;\n          cursor: pointer;\n          font-size: 14px;\n          font-weight: 500;\n          margin-bottom: 32px;\n          transition: all 0.2s;\n        }\n\n        .oracle-live-talk-btn.active {\n          border-color: rgba(80, 220, 120, 0.55);\n          background: rgba(80, 220, 120, 0.12);\n          color: #50dc78;\n        }\n\n        .oracle-live-talk-btn:hover {\n          border-color: rgba(255, 255, 255, 0.28);\n        }\n\n        .oracle-send-btn {\n          position: absolute;\n          right: 12px;\n          top: 50%;\n          transform: translateY(-50%);\n          width: 40px;\n          height: 40px;\n          border-radius: 50%;\n          border: 1px solid rgba(212, 175, 55, 0.35);\n          background: rgba(212, 175, 55, 0.16);\n          color: #d4af37;\n          cursor: pointer;\n          font-size: 18px;\n        }\n\n        .oracle-send-btn:disabled {\n          opacity: 0.35;\n          cursor: not-allowed;\n        }\n\n        .persona-hint {\n          display: flex;\n          align-items: center;\n          gap: 8px;\n          margin-bottom: 20px;\n          font-size: 13px;\n          opacity: 0;\n          transform: translateY(-4px);\n          animation: hintFadeIn 0.3s ease forwards;\n        }\n        @keyframes hintFadeIn {\n          to { opacity: 1; transform: translateY(0); }\n        }\n        .persona-hint-dot {\n          width: 7px;\n          height: 7px;\n          border-radius: 50%;\n          flex-shrink: 0;\n        }\n        .persona-hint-text {\n          font-weight: 500;\n        }\n        .persona-hint-label {\n          color: rgba(255,255,255,0.35);\n        }\n\n        .oracle-chips {\n          display: flex;\n          gap: 8px;\n          justify-content: flex-start;\n          flex-wrap: nowrap;\n          overflow-x: auto;\n          max-width: 600px;\n          width: 100%;\n          margin-bottom: 28px;\n          padding-bottom: 4px;\n          scrollbar-width: none;\n        }\n        .oracle-chips::-webkit-scrollbar { display: none; }\n\n        .realm-chip {\n          font-size: 12px;\n          letter-spacing: 0.04em;\n          transition: all 0.2s;\n          padding: 7px 14px;\n          border-radius: 999px;\n          border: 1px solid rgba(255, 255, 255, 0.12);\n          background: rgba(255, 255, 255, 0.03);\n          color: #d4c9b0;\n          cursor: pointer;\n          white-space: nowrap;\n          flex-shrink: 0;\n        }\n\n        .realm-chip:hover {\n          opacity: 1;\n          border-color: rgba(255, 255, 255, 0.25);\n        }\n\n        .realm-chip.selected {\n          border-color: rgba(212,175,55,0.6);\n          background: rgba(212,175,55,0.1);\n          color: #e8c96a;\n        }\n\n        .recent-sessions {\n          display: flex;\n          align-items: center;\n          gap: 10px;\n          flex-wrap: wrap;\n          justify-content: center;\n        }\n\n        .recent-label {\n          font-size: 10px;\n          letter-spacing: 0.2em;\n          color: rgba(255, 255, 255, 0.25);\n          margin-right: 4px;\n        }\n\n        .session-pill {\n          display: flex;\n          align-items: center;\n          gap: 8px;\n          font-size: 12px;\n          color: #b5aca0;\n          border-radius: 999px;\n          border: 1px solid rgba(255, 255, 255, 0.1);\n          background: rgba(255, 255, 255, 0.03);\n          padding: 7px 11px;\n          cursor: pointer;\n          max-width: 280px;\n          overflow: hidden;\n          text-overflow: ellipsis;\n          white-space: nowrap;\n        }\n\n        .session-dot {\n          width: 7px;\n          height: 7px;\n          border-radius: 50%;\n          flex-shrink: 0;\n        }\n      `}</style>
    </div>
  );
}
