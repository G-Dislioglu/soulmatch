import { calcLifePath, calcExpression, calcSoulUrge, calcPersonality, calcBirthday, reduceToNumber } from '../lib/calc';

// ── Meanings ──────────────────────────────────────────────────────────────────

const NUMBER_MEANING: Record<number, { title: string; essence: string }> = {
  1:  { title: 'Der Pionier',        essence: 'Führung, Unabhängigkeit, Willenskraft' },
  2:  { title: 'Der Diplomat',       essence: 'Partnerschaft, Empathie, Harmonie' },
  3:  { title: 'Der Ausdruck',       essence: 'Kreativität, Kommunikation, Freude' },
  4:  { title: 'Der Baumeister',     essence: 'Struktur, Disziplin, Zuverlässigkeit' },
  5:  { title: 'Der Freigeist',      essence: 'Freiheit, Abenteuer, Wandel' },
  6:  { title: 'Der Heiler',         essence: 'Fürsorge, Verantwortung, Schönheit' },
  7:  { title: 'Der Weise',          essence: 'Spiritualität, Analyse, inneres Wissen' },
  8:  { title: 'Der Macher',         essence: 'Macht, Erfolg, materielle Meisterschaft' },
  9:  { title: 'Der Humanist',       essence: 'Mitgefühl, Universalliebe, Vollendung' },
  11: { title: 'Die Erleuchtung',    essence: 'Intuition, Inspiration, spirituelle Berufung' },
  22: { title: 'Der Meisterbauer',   essence: 'Großes Manifest, universelle Transformation' },
  33: { title: 'Der Meisterheiler',  essence: 'Selbstlose Liebe, Unterrichtung, Hingabe' },
};

const KARMIC_NUMBERS = new Set([13, 14, 16, 19]);
const KARMIC_MEANING: Record<number, string> = {
  13: 'Karmische Schuld 13/4 — Faulheit überwinden',
  14: 'Karmische Schuld 14/5 — Überindulgenz transformieren',
  16: 'Karmische Schuld 16/7 — Ego und Hochmut auflösen',
  19: 'Karmische Schuld 19/1 — Machtmissbrauch heilen',
};

const GOLD = '#d4af37';
const MASTER_COLOR = '#c084fc';

// ── Helpers ───────────────────────────────────────────────────────────────────

function personalYear(birthDate: string): number {
  const now = new Date();
  const year = now.getFullYear();
  const parts = birthDate.split('-');
  const mm = parts[1] ?? '01';
  const dd = parts[2] ?? '01';
  const synth = `${year}-${mm}-${dd}`;
  const digits = synth.replace(/\D/g, '').split('').map(Number);
  const sum = digits.reduce((a, b) => a + b, 0);
  return reduceToNumber(sum);
}

function rawBirthdaySum(birthDate: string): number {
  const dd = parseInt(birthDate.split('-')[2] ?? '1', 10);
  return dd;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface NumerologyCardProps {
  name: string;
  birthDate: string;
}

interface NumRow {
  key: string;
  label: string;
  sublabel: string;
  value: number;
  isMaster: boolean;
  color: string;
}

export function NumerologyCard({ name, birthDate }: NumerologyCardProps) {
  const lp = calcLifePath(birthDate);
  const ex = calcExpression(name);
  const su = calcSoulUrge(name);
  const pe = calcPersonality(name);
  const bd = calcBirthday(birthDate);
  const py = personalYear(birthDate);

  const isMaster = (n: number) => n === 11 || n === 22 || n === 33;

  const rows: NumRow[] = [
    { key: 'lp', label: 'Lebenspfad', sublabel: 'Deine Seelenmission',     value: lp.value, isMaster: isMaster(lp.value), color: GOLD },
    { key: 'ex', label: 'Ausdruckszahl', sublabel: 'Deine Bestimmung',     value: ex.value, isMaster: isMaster(ex.value), color: '#38bdf8' },
    { key: 'su', label: 'Seelendrang',  sublabel: 'Dein innerstes Verlangen', value: su.value, isMaster: isMaster(su.value), color: '#c084fc' },
    { key: 'pe', label: 'Persönlichkeit', sublabel: 'Wie die Welt dich sieht', value: pe.value, isMaster: isMaster(pe.value), color: '#34d399' },
    { key: 'bd', label: 'Geburtstagszahl', sublabel: 'Deine Gabe',         value: bd, isMaster: false, color: '#f472b6' },
  ];

  // Karmic check from raw sum before reduction
  const rawSum = rawBirthdaySum(birthDate);
  const karmicDebt = KARMIC_NUMBERS.has(rawSum) ? KARMIC_MEANING[rawSum] : null;

  return (
    <div>
      {/* Header */}
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>Pythagorean System</div>

      {/* Number rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row) => {
          const meaning = NUMBER_MEANING[row.value];
          return (
            <div key={row.key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: `${row.color}0e`,
              border: `1px solid ${row.color}28`,
            }}>
              {/* Number badge */}
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${row.color}18`, border: `1px solid ${row.color}50`, flexShrink: 0,
                fontFamily: "'Cormorant Garamond', serif", fontSize: row.isMaster ? 18 : 22, fontWeight: 700,
                color: row.isMaster ? MASTER_COLOR : row.color,
              }}>
                {row.value}
                {row.isMaster && <span style={{ fontSize: 8, color: MASTER_COLOR, verticalAlign: 'super', marginLeft: 1 }}>M</span>}
              </div>
              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f0eadc' }}>{row.label}</span>
                  {row.isMaster && (
                    <span style={{ fontSize: 8, color: MASTER_COLOR, fontWeight: 600, padding: '1px 5px', borderRadius: 5, background: `${MASTER_COLOR}18`, border: `1px solid ${MASTER_COLOR}40` }}>MEISTER</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: row.color, opacity: 0.7, marginTop: 1 }}>{row.sublabel}</div>
                {meaning && (
                  <div style={{ fontSize: 11, color: '#a09a8e', marginTop: 3 }}>
                    <span style={{ color: '#c8c0b0', fontWeight: 600 }}>{meaning.title}</span>
                    <span style={{ color: '#6a6458' }}> — {meaning.essence}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Personal Year */}
      <div style={{
        marginTop: 12, padding: '10px 14px', borderRadius: 10,
        background: 'rgba(212,175,55,0.06)', border: '1px dashed rgba(212,175,55,0.25)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 18, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: GOLD }}>{py}</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: GOLD }}>Persönliches Jahr {new Date().getFullYear()}</div>
          <div style={{ fontSize: 10, color: '#7a7468' }}>{NUMBER_MEANING[py]?.essence ?? ''}</div>
        </div>
      </div>

      {/* Karmic Debt */}
      {karmicDebt && (
        <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#fca5a5' }}>
          ⚠ {karmicDebt}
        </div>
      )}
    </div>
  );
}
