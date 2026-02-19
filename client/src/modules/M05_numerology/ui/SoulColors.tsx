import { calcLifePath, calcExpression, calcSoulUrge } from '../lib/calc';

const NUM_COLORS: Record<number, { primary: string; secondary: string; name: string; meaning: string }> = {
  1: { primary: '#ef4444', secondary: '#fca5a5', name: 'Kraftrot', meaning: 'Pioniergeist, Stärke, Durchsetzungskraft' },
  2: { primary: '#38bdf8', secondary: '#7dd3fc', name: 'Mondblau', meaning: 'Sensibilität, Harmonie, Kooperation' },
  3: { primary: '#fbbf24', secondary: '#fde68a', name: 'Sonnengold', meaning: 'Kreativität, Freude, Ausdruck' },
  4: { primary: '#92400e', secondary: '#d97706', name: 'Erdbraun', meaning: 'Stabilität, Zuverlässigkeit, Fundament' },
  5: { primary: '#22d3ee', secondary: '#67e8f9', name: 'Türkis', meaning: 'Freiheit, Wandel, Abenteuer' },
  6: { primary: '#22c55e', secondary: '#86efac', name: 'Smaragd', meaning: 'Liebe, Heilung, Harmonie' },
  7: { primary: '#7c3aed', secondary: '#a78bfa', name: 'Tiefviolett', meaning: 'Spiritualität, Weisheit, Mystik' },
  8: { primary: '#d4af37', secondary: '#fef08a', name: 'Kaisersgold', meaning: 'Fülle, Macht, Manifestation' },
  9: { primary: '#c026d3', secondary: '#e879f9', name: 'Magentalicht', meaning: 'Universalliebe, Vollendung, Hingabe' },
  11: { primary: '#c084fc', secondary: '#e9d5ff', name: 'Silberlila', meaning: 'Inspiration, Intuition, Erleuchtung' },
  22: { primary: '#1d4ed8', secondary: '#60a5fa', name: 'Königsblau', meaning: 'Meisterbewusstsein, Vision, Struktur' },
  33: { primary: '#fda4af', secondary: '#fecdd3', name: 'Rosenquarz', meaning: 'Bedingungslose Liebe, Heilung, Gnade' },
};

const DEFAULT_COLOR = { primary: '#a09a8e', secondary: '#d6d0c8', name: 'Perlweiß', meaning: 'Reinheit, Offenheit, Möglichkeit' };

interface SoulColorsProps { name: string; birthDate: string; }

export function SoulColors({ name, birthDate }: SoulColorsProps) {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const su = calcSoulUrge(name).value;

  const lpC = NUM_COLORS[lp] ?? DEFAULT_COLOR;
  const exC = NUM_COLORS[ex] ?? DEFAULT_COLOR;
  const suC = NUM_COLORS[su] ?? DEFAULT_COLOR;

  // Blend primary colors (simple average in hex)
  function blendHex(colors: string[]): string {
    const rgbs = colors.map((c) => {
      const h = c.replace('#', '');
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    });
    const avg = rgbs[0]!.map((_, i) => Math.round(rgbs.reduce((s, r) => s + r[i]!, 0) / rgbs.length));
    return `#${avg.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }

  const blended = blendHex([lpC.primary, exC.primary, suC.primary]);

  const chips = [
    { label: 'LP', num: lp, c: lpC },
    { label: 'EX', num: ex, c: exC },
    { label: 'SU', num: su, c: suC },
  ];

  return (
    <div>
      {/* Palette swatches */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {chips.map(({ label, num, c }) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ height: 48, borderRadius: 10, background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, marginBottom: 5, boxShadow: `0 2px 12px ${c.primary}30` }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: '#7a7468', textTransform: 'uppercase', marginBottom: 1 }}>{label} {num}</div>
              <div style={{ fontSize: 9, color: c.primary, fontWeight: 600 }}>{c.name}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Blended aura color */}
      <div style={{ marginBottom: 12, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `radial-gradient(circle, ${blended}, ${blended}88)`,
            boxShadow: `0 0 24px ${blended}60`,
          }} />
          <div style={{ fontSize: 9, color: '#7a7468' }}>Seelen-Aura-Farbe</div>
          <div style={{ fontSize: 10, color: blended, fontWeight: 600, fontFamily: 'monospace' }}>{blended.toUpperCase()}</div>
        </div>
      </div>

      {/* Color meanings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {chips.map(({ label, c }) => (
          <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 8px', borderRadius: 7, background: `${c.primary}08`, border: `1px solid ${c.primary}18` }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.primary, flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, color: c.primary }}>{label} · {c.name}</div>
              <div style={{ fontSize: 9, color: '#4a4540' }}>{c.meaning}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
