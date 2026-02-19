import { calcLifePath, calcExpression, calcSoulUrge, calcPersonality, calcBirthday, reduceToNumber } from '../lib/calc';

function personalYear(birthDate: string): number {
  const now = new Date();
  const parts = birthDate.split('-');
  const digits = `${now.getFullYear()}${parts[1] ?? '01'}${parts[2] ?? '01'}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

const ARCHETYPE: Record<number, string> = {
  1: 'Pionier', 2: 'Diplomat', 3: 'Erschaffer', 4: 'Baumeister', 5: 'Abenteurer',
  6: 'Hüter', 7: 'Weiser', 8: 'Manifestor', 9: 'Humanist',
  11: 'Erleuchteter', 22: 'Meisterbauer', 33: 'Meisterheiler',
};

const ELEMENT: Record<number, { el: string; color: string }> = {
  1: { el: 'Feuer', color: '#ef4444' }, 2: { el: 'Wasser', color: '#38bdf8' },
  3: { el: 'Feuer', color: '#fbbf24' }, 4: { el: 'Erde', color: '#a16207' },
  5: { el: 'Luft', color: '#22d3ee' }, 6: { el: 'Erde', color: '#22c55e' },
  7: { el: 'Wasser', color: '#7c3aed' }, 8: { el: 'Erde', color: '#d4af37' },
  9: { el: 'Feuer', color: '#c026d3' }, 11: { el: 'Äther', color: '#c084fc' },
  22: { el: 'Äther', color: '#1d4ed8' }, 33: { el: 'Äther', color: '#fda4af' },
};

interface SoulDossierProps { name: string; birthDate: string; }

export function SoulDossier({ name, birthDate }: SoulDossierProps) {
  const lp = calcLifePath(birthDate);
  const ex = calcExpression(name);
  const su = calcSoulUrge(name);
  const pe = calcPersonality(name);
  const bd = calcBirthday(birthDate);
  const py = personalYear(birthDate);

  const arch = ARCHETYPE[lp.value] ?? 'Seelenwesen';
  const elem = ELEMENT[lp.value] ?? { el: '—', color: '#a09a8e' };

  const rows: { label: string; value: number; desc: string; color: string }[] = [
    { label: 'Lebenspfad', value: lp.value, desc: arch, color: elem.color },
    { label: 'Ausdruckszahl', value: ex.value, desc: 'Deine Gaben & Talente', color: '#38bdf8' },
    { label: 'Seelendrang', value: su.value, desc: 'Was deine Seele begehrt', color: '#c084fc' },
    { label: 'Persönlichkeit', value: pe.value, desc: 'Wie andere dich wahrnehmen', color: '#f472b6' },
    { label: 'Geburtstagszahl', value: bd, desc: 'Dein besonderes Talent', color: '#fbbf24' },
    { label: 'Persönliches Jahr', value: py, desc: `Energie ${new Date().getFullYear()}`, color: '#22c55e' },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: elem.color, lineHeight: 1 }}>{arch}</div>
        <div style={{ fontSize: 9, color: '#5a5448', marginTop: 2 }}>Element: {elem.el} · LP {lp.value}</div>
      </div>

      {/* Number table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {rows.map(({ label, value, desc, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', borderRadius: 8, background: `${color}07`, border: `1px solid ${color}18` }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color, width: 28, textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>{value}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#7a7468' }}>{label}</div>
              <div style={{ fontSize: 9, color: '#4a4540' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Trace info */}
      <div style={{ fontSize: 8, color: '#3a3530', textAlign: 'center', lineHeight: 1.4 }}>
        LP {lp.trace} · EX {ex.trace}
      </div>
    </div>
  );
}
