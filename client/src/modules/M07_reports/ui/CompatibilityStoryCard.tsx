import { useState } from 'react';
import { loadSettings } from '../../M09_settings';
import { calcLifePath } from '../../M05_numerology/lib/calc';

interface Props {
  nameA: string; birthDateA: string;
  nameB: string; birthDateB: string;
  connectionType: string;
  score: number;
}

const LUNA_COLOR = '#f472b6';
const ORION_COLOR = '#38bdf8';

export function CompatibilityStoryCard({ nameA, birthDateA, nameB, birthDateB, connectionType, score }: Props) {
  const [result, setResult] = useState<{ story: string; luna: string; orion: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function channel() {
    setLoading(true);
    setError(null);
    setResult(null);

    const settings = loadSettings();
    const provider = settings.provider.provider === 'none' ? 'openai' : settings.provider.provider;
    const keyEntry = settings.provider.keys?.[provider];
    const clientApiKey = keyEntry?.apiKey ?? settings.provider.apiKey;
    const model = settings.provider.model ?? keyEntry?.model;

    try {
      const res = await fetch('/api/studio/compatibility-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameA, nameB, connectionType, score,
          lifepathA: calcLifePath(birthDateA).value,
          lifepathB: calcLifePath(birthDateB).value,
          provider, clientApiKey, model,
        }),
      });
      const data = await res.json() as { story?: string; luna?: string; orion?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult({ story: data.story ?? '', luna: data.luna ?? '', orion: data.orion ?? '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!result && !loading && (
        <button type="button" onClick={() => { void channel(); }}
          style={{
            width: '100%', padding: '12px', borderRadius: 12,
            border: `1px solid rgba(244,114,182,0.3)`,
            background: 'rgba(244,114,182,0.06)',
            color: LUNA_COLOR, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Cormorant Garamond', serif",
          }}>
          ♡ Liebesgeschichte channeln — Luna & Orion
        </button>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 12, color: LUNA_COLOR, marginBottom: 4 }}>Luna & Orion channeln…</div>
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i % 2 === 0 ? LUNA_COLOR : ORION_COLOR, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`, opacity: 0.8 }} />
            ))}
          </div>
        </div>
      )}

      {error && <div style={{ fontSize: 11, color: '#fca5a5', padding: 8 }}>⚠ {error}</div>}

      {result && (
        <div>
          {/* Story */}
          {result.story && (
            <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.7, color: '#d4ccbc', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', textAlign: 'center' }}>
              "{result.story}"
            </p>
          )}

          {/* Luna */}
          {result.luna && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, padding: '10px 12px', borderRadius: 10, background: `${LUNA_COLOR}09`, border: `1px solid ${LUNA_COLOR}25` }}>
              <div style={{ fontSize: 14, color: LUNA_COLOR, flexShrink: 0 }}>☽</div>
              <div>
                <div style={{ fontSize: 9, color: LUNA_COLOR, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Luna</div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: '#a09a8e', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{result.luna}</p>
              </div>
            </div>
          )}

          {/* Orion */}
          {result.orion && (
            <div style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10, background: `${ORION_COLOR}09`, border: `1px solid ${ORION_COLOR}25` }}>
              <div style={{ fontSize: 14, color: ORION_COLOR, flexShrink: 0 }}>✦</div>
              <div>
                <div style={{ fontSize: 9, color: ORION_COLOR, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Orion</div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: '#a09a8e', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{result.orion}</p>
              </div>
            </div>
          )}

          <button type="button" onClick={() => setResult(null)}
            style={{ marginTop: 10, fontSize: 10, color: '#4a4540', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', display: 'block' }}>
            neu channeln
          </button>
        </div>
      )}
    </div>
  );
}
