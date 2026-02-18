import { useState } from 'react';
import { loadSettings } from '../../M09_settings';
import type { UserProfile } from '../../../shared/types/profile';

type OracleQuestion = 'purpose' | 'soulperson' | 'turning_point';

const ORACLE_QUESTIONS: { type: OracleQuestion; symbol: string; title: string; subtitle: string }[] = [
  { type: 'purpose',       symbol: '✦', title: 'Wofür bin ich hier?',     subtitle: 'Deine Seelenmission' },
  { type: 'soulperson',    symbol: '♡', title: 'Wer ist meine Seelenperson?', subtitle: 'Kosmische Verbindung' },
  { type: 'turning_point', symbol: '◈', title: 'Wann verändert sich alles?', subtitle: 'Der nächste Wandel' },
];

const MAYA_PURPLE = '#c084fc';

function buildProfileExcerpt(profile: UserProfile): string {
  const parts: string[] = [];
  parts.push(`Name: ${profile.name}`);
  parts.push(`Geburtsdatum: ${profile.birthDate}`);
  if (profile.birthTime) parts.push(`Geburtszeit: ${profile.birthTime}`);
  if (profile.birthLocation?.label) parts.push(`Geburtsort: ${profile.birthLocation.label}`);
  return parts.join('\n');
}

interface OracleModeProps {
  profile: UserProfile | null;
}

export function OracleMode({ profile }: OracleModeProps) {
  const [activeQuestion, setActiveQuestion] = useState<OracleQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dots, setDots] = useState('');

  async function askOracle(question: OracleQuestion) {
    if (!profile) return;
    setActiveQuestion(question);
    setAnswer(null);
    setError(null);
    setLoading(true);

    // Animate dots while loading
    let dotCount = 0;
    const dotInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      setDots('.'.repeat(dotCount));
    }, 400);

    try {
      const settings = loadSettings();
      const provider = settings.features.llmEnabled ? settings.provider.provider : 'openai';
      const keyEntry = settings.provider.keys?.[provider as keyof typeof settings.provider.keys];
      const clientApiKey = (keyEntry as { apiKey?: string } | undefined)?.apiKey ?? settings.provider.apiKey;
      const model = settings.provider.model ?? undefined;

      const response = await fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          profileExcerpt: buildProfileExcerpt(profile),
          provider: provider === 'none' ? 'openai' : provider,
          clientApiKey,
          model,
        }),
      });

      const data = await response.json().catch(() => null) as { answer?: string; error?: string } | null;
      if (!response.ok || !data?.answer) {
        throw new Error(data?.error ?? `Oracle API Fehler (HTTP ${response.status})`);
      }
      setAnswer(data.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      clearInterval(dotInterval);
      setDots('');
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Maya</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: MAYA_PURPLE, lineHeight: 1 }}>
          Die drei heiligen Fragen
        </div>
      </div>

      {/* Question buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ORACLE_QUESTIONS.map((q) => {
          const isActive = activeQuestion === q.type;
          return (
            <button
              key={q.type}
              type="button"
              onClick={() => { void askOracle(q.type); }}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', textAlign: 'left',
                padding: '12px 16px',
                borderRadius: 12,
                border: `1px solid ${isActive ? MAYA_PURPLE + '66' : 'rgba(192,132,252,0.15)'}`,
                background: isActive ? 'rgba(192,132,252,0.10)' : 'rgba(255,255,255,0.02)',
                cursor: loading ? 'default' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading && !isActive ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 18, width: 24, textAlign: 'center', color: isActive ? MAYA_PURPLE : '#7a7468', flexShrink: 0 }}>{q.symbol}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? MAYA_PURPLE : '#f0eadc' }}>{q.title}</div>
                <div style={{ fontSize: 10, color: '#7a7468', marginTop: 1 }}>{q.subtitle}</div>
              </div>
              {isActive && loading && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: MAYA_PURPLE, opacity: 0.7 }}>
                  Channeling{dots}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && !loading && (
        <div style={{ marginTop: 12, borderRadius: 10, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(127,29,29,0.2)', padding: '10px 12px', fontSize: 12, color: '#fecaca' }}>
          {error}
        </div>
      )}

      {/* Oracle Answer */}
      {answer && !loading && (
        <div style={{
          marginTop: 14,
          borderRadius: 14,
          border: `1px solid ${MAYA_PURPLE}33`,
          background: `linear-gradient(135deg, rgba(192,132,252,0.07), rgba(8,6,15,0.8))`,
          boxShadow: `0 0 24px ${MAYA_PURPLE}18`,
          padding: '18px 18px 14px',
        }}>
          {/* Question label */}
          <div style={{ fontSize: 10, color: MAYA_PURPLE, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, opacity: 0.8 }}>
            {ORACLE_QUESTIONS.find(q => q.type === activeQuestion)?.title}
          </div>
          {/* Maya's answer */}
          <div style={{ fontSize: 13, color: '#e8e0d0', lineHeight: 1.8, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 500 }}>
            {answer}
          </div>
          {/* Footer */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: MAYA_PURPLE, opacity: 0.5 }}>✦</span>
            <span style={{ fontSize: 9, color: '#4a4540', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Maya · Kosmisches Orakel</span>
          </div>
        </div>
      )}

      {/* No profile guard */}
      {!profile && (
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#7a7468' }}>
          Erstelle zuerst ein Profil, um das Orakel zu befragen.
        </div>
      )}
    </div>
  );
}
