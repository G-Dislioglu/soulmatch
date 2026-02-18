import { useState } from 'react';
import { loadSettings } from '../../M09_settings';
import { calcLifePath, reduceToNumber } from '../../M05_numerology/lib/calc';

const LUNA_COLOR = '#f472b6';

interface HoroResult { month: string; opening: string; love: string; growth: string; mantra: string; }

function personalYear(birthDate: string): number {
  const now = new Date();
  const parts = birthDate.split('-');
  const digits = `${now.getFullYear()}${parts[1] ?? '01'}${parts[2] ?? '01'}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

interface MonthlyHoroscopeProps {
  name: string;
  birthDate: string;
  sunSign?: string;
}

export function MonthlyHoroscope({ name, birthDate, sunSign }: MonthlyHoroscopeProps) {
  const [result, setResult] = useState<HoroResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sign = sunSign ?? `Lebenspfad ${calcLifePath(birthDate).value}`;
  const py = personalYear(birthDate);
  const now = new Date();
  const monthName = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  async function generate() {
    setLoading(true); setError(null); setResult(null);
    const settings = loadSettings();
    const provider = settings.provider.provider === 'none' ? 'openai' : settings.provider.provider;
    const keyEntry = settings.provider.keys?.[provider];
    const clientApiKey = keyEntry?.apiKey ?? settings.provider.apiKey;
    const model = settings.provider.model ?? keyEntry?.model;
    try {
      const res = await fetch('/api/studio/monthly-horoscope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, birthDate, sunSign: sign, personalYear: py, provider, clientApiKey, model }),
      });
      const data = await res.json() as HoroResult & { error?: string };
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
            <span style={{ fontSize: 18, color: LUNA_COLOR }}>☽</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#d4ccbc' }}>{monthName}</div>
              <div style={{ fontSize: 9, color: '#5a5448' }}>{sign} · Pers. Jahr {py}</div>
            </div>
          </div>
          <button type="button" onClick={() => { void generate(); }}
            style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${LUNA_COLOR}30`, background: `${LUNA_COLOR}07`, color: LUNA_COLOR, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cormorant Garamond', serif" }}>
            ☽ Monatshoroskop von Luna channeln
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 12, color: LUNA_COLOR, marginBottom: 4 }}>Luna channelt…</div>
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: LUNA_COLOR, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`, opacity: 0.7 }} />
            ))}
          </div>
        </div>
      )}

      {error && <div style={{ fontSize: 11, color: '#fca5a5', padding: 8 }}>⚠ {error}</div>}

      {result && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18, color: LUNA_COLOR }}>☽</span>
            <div style={{ fontSize: 11, fontWeight: 600, color: LUNA_COLOR }}>{result.month}</div>
          </div>

          {result.opening && (
            <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.7, color: '#c8c0b0', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
              {result.opening}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {result.love && (
              <div style={{ padding: '9px 12px', borderRadius: 9, background: `${LUNA_COLOR}08`, border: `1px solid ${LUNA_COLOR}20` }}>
                <div style={{ fontSize: 9, color: LUNA_COLOR, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>♡ Liebe & Beziehungen</div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#8a8278', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{result.love}</p>
              </div>
            )}
            {result.growth && (
              <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)' }}>
                <div style={{ fontSize: 9, color: '#d4af37', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>✦ Wachstum & Chancen</div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#8a8278', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{result.growth}</p>
              </div>
            )}
          </div>

          {result.mantra && (
            <div style={{ textAlign: 'center', padding: '10px', borderRadius: 9, background: `${LUNA_COLOR}0a`, border: `1px dashed ${LUNA_COLOR}30` }}>
              <div style={{ fontSize: 9, color: '#5a5448', marginBottom: 3 }}>MONATS-MANTRA</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: 'italic', color: LUNA_COLOR }}>"{result.mantra}"</div>
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
