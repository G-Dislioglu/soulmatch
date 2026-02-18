import { reduceToNumber } from '../lib/calc';

type ThemeDef = { title: string; desc: string; icon: string; color: string; type: 'seed' | 'build' | 'harvest' | 'rest' };

const DEFAULT_THEME: ThemeDef = { title: 'Neubeginn & Gründung', desc: 'Ein Zyklus beginnt. Zeit für mutige neue Starts.', icon: '🌱', color: '#22c55e', type: 'seed' };

const YEAR_THEMES: Record<number, ThemeDef> = {
  1: { title: 'Neubeginn & Gründung', desc: 'Ein Zyklus beginnt. Zeit für mutige neue Starts, Initiativen und Selbstfindung.', icon: '🌱', color: '#22c55e', type: 'seed' },
  2: { title: 'Partnerschaft & Geduld', desc: 'Vertrauen wächst langsam. Beziehungen, Kooperation und innere Balance stehen im Vordergrund.', icon: '♡', color: '#f472b6', type: 'build' },
  3: { title: 'Ausdruck & Kreativität', desc: 'Kommunikation und Freude blühen. Kreative Projekte und soziale Verbindungen gedeihen.', icon: '✨', color: '#fbbf24', type: 'build' },
  4: { title: 'Aufbau & Disziplin', desc: 'Harte Arbeit legt Fundamente. Struktur, Planung und Beständigkeit zahlen sich aus.', icon: '🏗', color: '#a3a3a3', type: 'build' },
  5: { title: 'Freiheit & Veränderung', desc: 'Abenteuer und Wandel prägen das Jahr. Flexibilität und Offenheit sind gefragt.', icon: '🌊', color: '#38bdf8', type: 'seed' },
  6: { title: 'Verantwortung & Harmonie', desc: 'Familie, Zuhause und Fürsorge rücken ins Zentrum. Heilung und Schönheit gedeihen.', icon: '🌸', color: '#34d399', type: 'harvest' },
  7: { title: 'Innenschau & Weisheit', desc: 'Ein Jahr der Stille und tiefen Reflexion. Spirituelles Wachstum und Selbsterkenntnis.', icon: '🔮', color: '#818cf8', type: 'rest' },
  8: { title: 'Fülle & Erfolg', desc: 'Ernte-Jahr schlechthin. Materielle Ziele, Führung und kraftvolle Manifestation.', icon: '♾', color: '#d4af37', type: 'harvest' },
  9: { title: 'Abschluss & Loslassen', desc: 'Ein Zyklus endet. Loslassen, Vollendung und Vorbereitung für das nächste Kapitel.', icon: '🌅', color: '#c084fc', type: 'rest' },
  11: { title: 'Erleuchtung & Inspiration', desc: 'Meisterzahl. Intuition, spirituelle Führung und transformierende Visionen.', icon: '⚡', color: '#c084fc', type: 'seed' },
  22: { title: 'Meisterbau & Vision', desc: 'Meisterzahl. Monumentale Projekte, weltverändernde Pläne und Führung.', icon: '🌍', color: '#d4af37', type: 'harvest' },
};

function personalYear(birthDate: string, year: number): number {
  const parts = birthDate.split('-');
  const mm = parts[1] ?? '01';
  const dd = parts[2] ?? '01';
  const digits = `${year}${mm}${dd}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

interface YearForecastProps {
  birthDate: string;
  yearsAhead?: number;
}

export function YearForecast({ birthDate, yearsAhead = 5 }: YearForecastProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: yearsAhead }, (_, i) => currentYear + i);

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
        Persönliches Jahr · {currentYear}–{currentYear + yearsAhead - 1}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {years.map((year) => {
          const pyNum = personalYear(birthDate, year);
          const theme: ThemeDef = YEAR_THEMES[pyNum] ?? DEFAULT_THEME;
          const isCurrent = year === currentYear;
          return (
            <div key={year} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: isCurrent ? '10px 12px' : '7px 12px',
              borderRadius: 10,
              background: isCurrent ? `${theme.color}14` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isCurrent ? theme.color + '40' : 'rgba(255,255,255,0.05)'}`,
              transition: 'all 0.2s',
            }}>
              {/* Year + PY badge */}
              <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 36 }}>
                <div style={{ fontSize: 9, color: '#4a4540' }}>{year}</div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: isCurrent ? 22 : 17,
                  fontWeight: 700,
                  color: theme.color,
                  lineHeight: 1,
                  textShadow: isCurrent ? `0 0 12px ${theme.color}60` : 'none',
                }}>
                  {pyNum}
                </div>
              </div>

              {/* Icon */}
              <div style={{ fontSize: isCurrent ? 18 : 14, flexShrink: 0 }}>{theme.icon}</div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: isCurrent ? 12 : 11, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? '#f0eadc' : '#7a7468' }}>
                  {theme.title}
                  {isCurrent && <span style={{ fontSize: 8, color: theme.color, marginLeft: 6, padding: '1px 5px', borderRadius: 4, background: `${theme.color}18`, border: `1px solid ${theme.color}30` }}>JETZT</span>}
                </div>
                {isCurrent && (
                  <div style={{ fontSize: 10, color: '#6a6458', marginTop: 2, lineHeight: 1.4 }}>{theme.desc}</div>
                )}
              </div>

              {/* Type badge */}
              <div style={{ fontSize: 8, color: theme.color, padding: '2px 6px', borderRadius: 4, background: `${theme.color}10`, border: `1px solid ${theme.color}20`, flexShrink: 0 }}>
                {theme.type === 'seed' ? 'Saat' : theme.type === 'build' ? 'Aufbau' : theme.type === 'harvest' ? 'Ernte' : 'Ruhe'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
