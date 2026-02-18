import { useState } from 'react';
import { loadSettings } from '../../M09_settings';
import { calcLifePath, calcExpression, calcSoulUrge } from '../../M05_numerology/lib/calc';

interface SoulPortraitCardProps {
  name: string;
  birthDate: string;
  sunSign?: string;
  moonSign?: string;
}

const MAYA_PURPLE = '#c084fc';

export function SoulPortraitCard({ name, birthDate, sunSign, moonSign }: SoulPortraitCardProps) {
  const [portrait, setPortrait] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function channelPortrait() {
    setLoading(true);
    setError(null);
    setPortrait(null);

    const settings = loadSettings();
    const provider = settings.provider.provider === 'none' ? 'openai' : settings.provider.provider;
    const keyEntry = settings.provider.keys?.[provider];
    const clientApiKey = keyEntry?.apiKey ?? settings.provider.apiKey;
    const model = settings.provider.model ?? keyEntry?.model;

    const lifePath = calcLifePath(birthDate).value;
    const expression = calcExpression(name).value;
    const soulUrge = calcSoulUrge(name).value;

    try {
      const res = await fetch('/api/studio/soul-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, birthDate,
          lifePath, expression, soulUrge,
          sunSign, moonSign,
          provider, clientApiKey, model,
        }),
      });
      const data = await res.json() as { portrait?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      setPortrait(data.portrait ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!portrait && !loading && (
        <button
          type="button"
          onClick={() => { void channelPortrait(); }}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 12,
            border: `1px solid ${MAYA_PURPLE}40`,
            background: `${MAYA_PURPLE}0a`,
            color: MAYA_PURPLE, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.04em',
          }}
        >
          ✦ Seelenporträt channeln
        </button>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '18px 0' }}>
          <div style={{ fontSize: 12, color: MAYA_PURPLE, marginBottom: 6 }}>Maya channelt …</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 5 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%', background: MAYA_PURPLE,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                opacity: 0.7,
              }} />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: '#fca5a5', padding: '8px 0' }}>
          ⚠ {error}
        </div>
      )}

      {portrait && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: MAYA_PURPLE, boxShadow: `0 0 8px ${MAYA_PURPLE}` }} />
            <span style={{ fontSize: 10, color: MAYA_PURPLE, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Maya's Seelenlesung für {name}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {portrait.split('\n\n').filter(Boolean).map((para, i) => (
              <p key={i} style={{
                margin: 0, fontSize: 13, lineHeight: 1.7, color: '#d4ccbc',
                fontFamily: "'Cormorant Garamond', serif",
                borderLeft: `2px solid ${MAYA_PURPLE}30`,
                paddingLeft: 12,
              }}>
                {para}
              </p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setPortrait(null); }}
            style={{ marginTop: 14, fontSize: 10, color: '#4a4540', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            neu channeln
          </button>
        </div>
      )}
    </div>
  );
}
