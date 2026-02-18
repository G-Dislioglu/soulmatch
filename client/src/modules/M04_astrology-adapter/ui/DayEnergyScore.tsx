// Composite daily energy score — pure client-side.
// Combines: moon phase age, planetary hour ruler, day of week, personal year.

import { reduceToNumber } from '../../M05_numerology/lib/calc';

const SYNODIC = 29.530588853;
const NEW_MOON_REF = new Date('2000-01-06T18:14:00Z');

function moonAge(): number {
  const diff = (Date.now() - NEW_MOON_REF.getTime()) / 86400000;
  return ((diff % SYNODIC) + SYNODIC) % SYNODIC;
}

function moonScore(): number {
  const age = moonAge();
  // Peak energy around full moon (day 14-15), low at new moon (0-1)
  const phase = age / SYNODIC; // 0..1
  // Sinusoidal: full=1, new=0.3, quarters=0.65
  return Math.round(0.3 + 0.7 * Math.abs(Math.sin(phase * Math.PI)));
}

const CHALDEAN = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'];
const DAY_RULER_IDX = [3, 6, 2, 5, 1, 4, 0];
const PLANET_ENERGY: Record<string, number> = { sun: 95, moon: 70, mercury: 75, venus: 85, mars: 80, jupiter: 90, saturn: 60 };
const PLANET_DE: Record<string, string> = { sun: 'Sonne', moon: 'Mond', mercury: 'Merkur', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };
const PLANET_COLOR: Record<string, string> = { sun: '#fbbf24', moon: '#c084fc', mercury: '#38bdf8', venus: '#f472b6', mars: '#ef4444', jupiter: '#d4af37', saturn: '#a3a3a3' };

function currentPlanetaryHourRuler(): string {
  const now = new Date();
  const dow = now.getDay();
  const h = now.getHours() + now.getMinutes() / 60;
  const rulerIdx = DAY_RULER_IDX[dow] ?? 0;
  const isDaytime = h >= 6 && h < 18;
  const offset = isDaytime ? Math.floor((h - 6) / 1) : Math.floor((h < 6 ? h + 6 : h - 18) / 1);
  const pIdx = (rulerIdx + offset) % 7;
  return CHALDEAN[pIdx] ?? 'sun';
}

const PY_ENERGY: Record<number, number> = { 1: 88, 2: 65, 3: 90, 4: 60, 5: 82, 6: 78, 7: 55, 8: 95, 9: 72, 11: 92, 22: 97, 33: 85 };

function personalYear(birthDate: string): number {
  const now = new Date();
  const parts = birthDate.split('-');
  const digits = `${now.getFullYear()}${parts[1] ?? '01'}${parts[2] ?? '01'}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

const DAY_ENERGY: Record<number, number> = { 0: 68, 1: 80, 2: 72, 3: 85, 4: 78, 5: 90, 6: 75 };
const DAY_DE: Record<number, string> = { 0: 'Sonntag', 1: 'Montag', 2: 'Dienstag', 3: 'Mittwoch', 4: 'Donnerstag', 5: 'Freitag', 6: 'Samstag' };

function scoreLabel(s: number): { label: string; color: string } {
  if (s >= 88) return { label: 'Außergewöhnlich', color: '#d4af37' };
  if (s >= 76) return { label: 'Sehr günstig', color: '#22c55e' };
  if (s >= 64) return { label: 'Günstig', color: '#38bdf8' };
  if (s >= 50) return { label: 'Ausgewogen', color: '#a09a8e' };
  return { label: 'Ruhig & Reflektiv', color: '#818cf8' };
}

interface DayEnergyScoreProps { birthDate: string; }

export function DayEnergyScore({ birthDate }: DayEnergyScoreProps) {
  const now = new Date();
  const ruler = currentPlanetaryHourRuler();
  const py = personalYear(birthDate);
  const dow = now.getDay();

  const moonPct = moonScore() * 100;
  const rulerPct = PLANET_ENERGY[ruler] ?? 75;
  const pyPct = PY_ENERGY[py] ?? 75;
  const dayPct = DAY_ENERGY[dow] ?? 75;

  const total = Math.round((moonPct * 0.25 + rulerPct * 0.3 + pyPct * 0.25 + dayPct * 0.2));
  const { label, color } = scoreLabel(total);

  const bars = [
    { label: 'Mondphase', pct: moonPct, color: '#c084fc' },
    { label: `Pers.Stunde (${PLANET_DE[ruler] ?? ruler})`, pct: rulerPct, color: PLANET_COLOR[ruler] ?? '#d4af37' },
    { label: `Pers. Jahr ${py}`, pct: pyPct, color: '#d4af37' },
    { label: DAY_DE[dow] ?? 'Heute', pct: dayPct, color: '#38bdf8' },
  ];

  return (
    <div>
      {/* Score ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
          background: `conic-gradient(${color} ${total * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 20px ${color}30`,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#08060f',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{total}</div>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color, lineHeight: 1.2 }}>{label}</div>
          <div style={{ fontSize: 10, color: '#6a6458', marginTop: 2 }}>Kosmische Tages-Energie</div>
        </div>
      </div>

      {/* Component bars */}
      {bars.map((b) => (
        <div key={b.label} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 9, color: '#5a5448' }}>{b.label}</span>
            <span style={{ fontSize: 9, color: b.color }}>{Math.round(b.pct)}%</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${b.pct}%`, background: b.color, borderRadius: 2, boxShadow: `0 0 6px ${b.color}60` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
