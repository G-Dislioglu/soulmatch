import { useState } from 'react';
import { loadSettings } from '../../M09_settings';
import { calcLifePath, reduceToNumber } from '../../M05_numerology/lib/calc';

const ORION_COLOR = '#38bdf8';

interface InsightResult {
  week: string;
  headline: string;
  insight: string;
  focus: string;
  shadow: string;
  affirmation: string;
}

function personalYear(birthDate: string): number {
  const now = new Date();
  const parts = birthDate.split('-');
  const digits = `${now.getFullYear()}${parts[1] ?? '01'}${parts[2] ?? '01'}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

interface WeeklyInsightCardProps {
  name: string;
  birthDate: string;
}

export function WeeklyInsightCard({ name, birthDate }: WeeklyInsightCardProps) {
  const [result, setResult] = useState<InsightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lp = calcLifePath(birthDate).value;
  const py = personalYear(birthDate);
  const now = new Date();
  const weekNum = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
  const weekLabel = `KW ${weekNum}, ${now.getFullYear()}`;

  async function generate() {
    setLoading(true); setError(null); setResult(null);
    const settings = loadSettings();
    const provider = settings.provider.provider === 'none' ? 'openai' : settings.provider.provider;
    const keyEntry = settings.provider.keys?.[provider];
    const clientApiKey = keyEntry?.apiKey ?? settings.provider.apiKey;
    const model = settings.provider.model ?? keyEntry?.model;
    try {
      const res = await fetch('/api/studio/weekly-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, birthDate, lifePath: lp, personalYear: py, provider, clientApiKey, model }),
      });
      const data = await res.json() as InsightResult & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!result && !loading && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16, color: ORION_COLOR }}>✦</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#d4ccbc' }}>{weekLabel}</div>
              <div style={{ fontSize: 9, color: '#5a5448' }}>LP {lp} · Pers. Jahr {py}</div>
            </div>
          </div>
          <button type="button" onClick={() => { void generate(); }}
            style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${ORION_COLOR}30`, background: `${ORION_COLOR}07`, color: ORION_COLOR, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cormorant Garamond', serif" }}>
            ✦ Wochenbotschaft von Orion empfangen
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 12, color: ORION_COLOR, marginBottom: 4 }}>Orion navigiert…</div>
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: ORION_COLOR, animation: `pulse 1.2s ${i * 0.2}s infinite`, opacity: 0.7 }} />)}
          </div>
        </div>
      )}

      {error && <div style={{ fontSize: 11, color: '#fca5a5', padding: 8 }}>⚠ {error}</div>}

      {result && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: ORION_COLOR }}>✦</span>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: '#f0eadc' }}>{result.headline}</div>
            <div style={{ fontSize: 9, color: '#4a4540', marginLeft: 'auto' }}>{result.week}</div>
          </div>

          {result.insight && (
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.7, color: '#8a8278', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{result.insight}</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
            {result.focus && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: `${ORION_COLOR}08`, border: `1px solid ${ORION_COLOR}20` }}>
                <div style={{ fontSize: 8, color: ORION_COLOR, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>✦ Fokus diese Woche</div>
                <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#6a6458', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{result.focus}</p>
              </div>
            )}
            {result.shadow && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
                <div style={{ fontSize: 8, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>☽ Schatten-Bewusstsein</div>
                <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#6a6458', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{result.shadow}</p>
              </div>
            )}
          </div>

          {result.affirmation && (
            <div style={{ textAlign: 'center', padding: '10px', borderRadius: 9, background: `${ORION_COLOR}0a`, border: `1px dashed ${ORION_COLOR}30` }}>
              <div style={{ fontSize: 9, color: '#5a5448', marginBottom: 3 }}>WOCHEN-AFFIRMATION</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: 'italic', color: ORION_COLOR }}>"{result.affirmation}"</div>
            </div>
          )}

          <button type="button" onClick={() => setResult(null)}
            style={{ marginTop: 10, fontSize: 10, color: '#4a4540', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', display: 'block' }}>
            neue Botschaft empfangen
          </button>
        </div>
      )}
    </div>
  );
}
