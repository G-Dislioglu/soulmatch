import { calcLifePath, reduceToNumber } from '../lib/calc';

const PINNACLE_THEMES: Record<number, { title: string; desc: string; color: string }> = {
  1: { title: 'Neue Anfänge & Führung', desc: 'Selbstständigkeit und Pioniergeist prägen diese Phase.', color: '#ef4444' },
  2: { title: 'Harmonie & Partnerschaft', desc: 'Kooperation und emotionale Reife wachsen hier.', color: '#f472b6' },
  3: { title: 'Kreativität & Ausdruck', desc: 'Kreative Entfaltung und Kommunikation blühen auf.', color: '#fbbf24' },
  4: { title: 'Aufbau & Struktur', desc: 'Fundamente werden gelegt — Arbeit, Disziplin, Stabilität.', color: '#a3a3a3' },
  5: { title: 'Wandel & Freiheit', desc: 'Veränderungen, Reisen und Abenteuer prägen diese Zeit.', color: '#38bdf8' },
  6: { title: 'Verantwortung & Familie', desc: 'Fürsorge, Heimat und Heilung stehen im Mittelpunkt.', color: '#34d399' },
  7: { title: 'Innenschau & Weisheit', desc: 'Spirituelles Wachstum und tiefe Reflexion.', color: '#818cf8' },
  8: { title: 'Fülle & Erfolg', desc: 'Materielle Ernte und kraftvolle Manifestation.', color: '#d4af37' },
  9: { title: 'Abschluss & Vollendung', desc: 'Loslassen, Vollendung und universelle Liebe.', color: '#c084fc' },
  11: { title: 'Erleuchtung & Inspiration', desc: 'Hohe Intuition und spirituelle Führungskraft.', color: '#c084fc' },
  22: { title: 'Meisterbau & Vision', desc: 'Monumentale Errungenschaften im Dienst der Welt.', color: '#d4af37' },
};

const DEFAULT_THEME = { title: 'Persönliche Reife', desc: 'Eine Phase tiefer innerer Entwicklung.', color: '#a09a8e' };

interface Pinnacle { num: number; startAge: number; endAge: number | null; }

function calcPinnacles(birthDate: string): Pinnacle[] {
  const [year, month, day] = birthDate.split('-').map(Number) as [number, number, number];
  const lp = calcLifePath(birthDate).value;
  const lpBase = [11, 22, 33].includes(lp) ? (lp === 11 ? 2 : lp === 22 ? 4 : 6) : lp;

  const p1 = reduceToNumber((month ?? 1) + (day ?? 1));
  const p2 = reduceToNumber((day ?? 1) + (year ?? 2000));
  const p3 = reduceToNumber(p1 + p2);
  const p4 = reduceToNumber((month ?? 1) + (year ?? 2000));

  const d1 = 36 - lpBase;
  return [
    { num: p1, startAge: 0, endAge: d1 },
    { num: p2, startAge: d1, endAge: d1 + 9 },
    { num: p3, startAge: d1 + 9, endAge: d1 + 18 },
    { num: p4, startAge: d1 + 18, endAge: null },
  ];
}

function currentAge(birthDate: string): number {
  const now = new Date();
  const [year, month, day] = birthDate.split('-').map(Number) as [number, number, number];
  const born = new Date(year, (month ?? 1) - 1, day ?? 1);
  return Math.floor((now.getTime() - born.getTime()) / (365.25 * 86400000));
}

interface LifePinnaclesProps { birthDate: string; }

export function LifePinnacles({ birthDate }: LifePinnaclesProps) {
  const pinnacles = calcPinnacles(birthDate);
  const age = currentAge(birthDate);

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        4 Lebens-Pinnakel · Jetzt: Alter {age}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {pinnacles.map((p, i) => {
          const theme = PINNACLE_THEMES[p.num] ?? DEFAULT_THEME;
          const isActive = age >= p.startAge && (p.endAge === null || age < p.endAge);
          const isPast = p.endAge !== null && age >= p.endAge;
          const label = p.endAge !== null ? `${p.startAge}–${p.endAge} J.` : `ab ${p.startAge} J.`;

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: isActive ? '10px 12px' : '6px 12px', borderRadius: 10,
              background: isActive ? `${theme.color}12` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isActive ? theme.color + '40' : 'rgba(255,255,255,0.05)'}`,
              opacity: isPast ? 0.45 : 1,
            }}>
              {/* Pinnacle number */}
              <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isActive ? 22 : 16, fontWeight: 700, color: theme.color, lineHeight: 1, textShadow: isActive ? `0 0 10px ${theme.color}55` : 'none' }}>
                  {p.num}
                </div>
                <div style={{ fontSize: 8, color: '#4a4540', marginTop: 1 }}>P{i + 1}</div>
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: isActive ? 12 : 11, fontWeight: isActive ? 700 : 400, color: isActive ? '#f0eadc' : '#7a7468' }}>
                  {theme.title}
                  {isActive && <span style={{ fontSize: 8, color: theme.color, marginLeft: 6, padding: '1px 5px', borderRadius: 4, background: `${theme.color}18`, border: `1px solid ${theme.color}30` }}>AKTIV</span>}
                </div>
                {isActive && <div style={{ fontSize: 10, color: '#5a5448', marginTop: 2 }}>{theme.desc}</div>}
              </div>

              {/* Age range */}
              <div style={{ fontSize: 9, color: '#3a3530', textAlign: 'right', flexShrink: 0 }}>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
