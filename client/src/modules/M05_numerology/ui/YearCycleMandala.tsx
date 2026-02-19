import { calcLifePath, reduceToNumber } from '../lib/calc';

const YEAR_THEMES: Record<number, { title: string; theme: string; color: string; keywords: string[] }> = {
  1: { title: 'Jahr 1 — Neubeginn', theme: 'Initiierung und Neustart', color: '#ef4444', keywords: ['Anfang', 'Mut', 'Individualität', 'Führung'] },
  2: { title: 'Jahr 2 — Partnerschaft', theme: 'Geduld und Verbindung', color: '#38bdf8', keywords: ['Zusammenarbeit', 'Intuition', 'Harmonie', 'Sensibilität'] },
  3: { title: 'Jahr 3 — Ausdruck', theme: 'Kreativität und Freude', color: '#fbbf24', keywords: ['Kreativität', 'Kommunikation', 'Freude', 'Wachstum'] },
  4: { title: 'Jahr 4 — Aufbau', theme: 'Arbeit und Fundament', color: '#a16207', keywords: ['Disziplin', 'Struktur', 'Ausdauer', 'Sicherheit'] },
  5: { title: 'Jahr 5 — Wandel', theme: 'Freiheit und Veränderung', color: '#22d3ee', keywords: ['Freiheit', 'Abenteuer', 'Veränderung', 'Flexibilität'] },
  6: { title: 'Jahr 6 — Verantwortung', theme: 'Familie und Fürsorge', color: '#22c55e', keywords: ['Fürsorge', 'Heilung', 'Zuhause', 'Balance'] },
  7: { title: 'Jahr 7 — Reflexion', theme: 'Tiefe und Spiritualität', color: '#7c3aed', keywords: ['Rückzug', 'Analyse', 'Spiritualität', 'Weisheit'] },
  8: { title: 'Jahr 8 — Manifestation', theme: 'Macht und Erfolg', color: '#d4af37', keywords: ['Erfolg', 'Überfluss', 'Entscheidungen', 'Karma'] },
  9: { title: 'Jahr 9 — Vollendung', theme: 'Abschluss und Loslassen', color: '#c026d3', keywords: ['Abschluss', 'Loslassen', 'Vergebung', 'Weisheit'] },
};

function getPersonalYear(birthDate: string): number {
  const parts = birthDate.split('-');
  const mm = parseInt(parts[1] ?? '0', 10);
  const dd = parseInt(parts[2] ?? '0', 10);
  const cy = new Date().getFullYear();
  const sum = mm + dd + Math.floor(cy / 1000) + Math.floor((cy % 1000) / 100) + Math.floor((cy % 100) / 10) + (cy % 10);
  return reduceToNumber(sum) || 9;
}

interface YearCycleMandalaProps { name: string; birthDate: string; }

export function YearCycleMandala({ birthDate }: YearCycleMandalaProps) {
  const lp = calcLifePath(birthDate).value;
  const py = getPersonalYear(birthDate);

  // Build the 9-year cycle starting from lp year
  const cycleStart = Math.floor((new Date().getFullYear() - (lp % 9)) / 9) * 9 + (lp % 9 || 9);
  const currentYear = new Date().getFullYear();

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          LP {lp} · Persönliches Jahr {py}
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: (YEAR_THEMES[py] ?? YEAR_THEMES[9]!).color }}>
          {(YEAR_THEMES[py] ?? YEAR_THEMES[9]!).title}
        </div>
        <div style={{ fontSize: 10, color: '#5a5448', marginTop: 2 }}>{(YEAR_THEMES[py] ?? YEAR_THEMES[9]!).theme}</div>
      </div>

      {/* Keywords */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginBottom: 14 }}>
        {(YEAR_THEMES[py] ?? YEAR_THEMES[9]!).keywords.map(kw => (
          <span key={kw} style={{ fontSize: 8, color: (YEAR_THEMES[py] ?? YEAR_THEMES[9]!).color, padding: '2px 8px', borderRadius: 10, background: `${(YEAR_THEMES[py] ?? YEAR_THEMES[9]!).color}15`, border: `1px solid ${(YEAR_THEMES[py] ?? YEAR_THEMES[9]!).color}30` }}>{kw}</span>
        ))}
      </div>

      {/* 9-year cycle wheel */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 8, color: '#3a3530', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>9-Jahres-Zyklus</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 3 }}>
          {Array.from({ length: 9 }, (_, i) => {
            const yearNum = ((py - 1 + i) % 9) + 1;
            const absYear = cycleStart + i;
            const isCurrent = i === 0 || absYear === currentYear;
            const theme = YEAR_THEMES[yearNum] ?? YEAR_THEMES[9]!;
            return (
              <div key={i} style={{ textAlign: 'center', padding: '5px 2px', borderRadius: 7, background: isCurrent ? `${theme.color}18` : 'rgba(255,255,255,0.01)', border: `1px solid ${isCurrent ? theme.color + '50' : 'rgba(255,255,255,0.05)'}` }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: isCurrent ? theme.color : `${theme.color}30`, margin: '0 auto 2px', boxShadow: isCurrent ? `0 0 8px ${theme.color}50` : 'none' }} />
                <div style={{ fontSize: 7, color: isCurrent ? theme.color : '#3a3530', fontWeight: isCurrent ? 700 : 400 }}>{yearNum}</div>
                <div style={{ fontSize: 5, color: '#2a2520', lineHeight: 1 }}>{absYear}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All 9 year themes mini list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {Array.from({ length: 9 }, (_, i) => {
          const n = i + 1;
          const t = YEAR_THEMES[n]!;
          const isCurrent = n === py;
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isCurrent ? '5px 8px' : '3px 8px', borderRadius: 6, background: isCurrent ? `${t.color}10` : 'transparent', border: isCurrent ? `1px solid ${t.color}30` : '1px solid transparent' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
              <span style={{ fontSize: 8, color: isCurrent ? t.color : '#3a3530', fontWeight: isCurrent ? 700 : 400, flex: 1 }}>{t.title}</span>
              <span style={{ fontSize: 7, color: '#2a2520' }}>{t.theme}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
