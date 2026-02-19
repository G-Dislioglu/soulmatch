import { calcLifePath, calcExpression, calcSoulUrge } from '../../M05_numerology/lib/calc';

const NUM_COLORS: Record<number, { hex: string; name: string }> = {
  1: { hex: '#ef4444', name: 'Rubinrot' },
  2: { hex: '#38bdf8', name: 'Mondblau' },
  3: { hex: '#fbbf24', name: 'Goldgelb' },
  4: { hex: '#a16207', name: 'Erdbraun' },
  5: { hex: '#22d3ee', name: 'Türkis' },
  6: { hex: '#22c55e', name: 'Smaragd' },
  7: { hex: '#7c3aed', name: 'Amethyst' },
  8: { hex: '#d4af37', name: 'Gold' },
  9: { hex: '#c026d3', name: 'Magenta' },
  11: { hex: '#818cf8', name: 'Perlblau' },
  22: { hex: '#a78bfa', name: 'Lavendel' },
  33: { hex: '#f472b6', name: 'Rosé' },
};

const DEFAULT_COLOR = { hex: '#a09a8e', name: 'Grau' };

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function blendColors(hexA: string, hexB: string, ratio = 0.5): string {
  const [ra, ga, ba] = hexToRgb(hexA);
  const [rb, gb, bb] = hexToRgb(hexB);
  const r = Math.round(ra * ratio + rb * (1 - ratio));
  const g = Math.round(ga * ratio + gb * (1 - ratio));
  const b = Math.round(ba * ratio + bb * (1 - ratio));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const BLEND_NAMES: Record<string, string> = {
  '#ef4444-#38bdf8': 'Feuer & Wasser', '#fbbf24-#7c3aed': 'Licht & Tiefe',
  '#22c55e-#c026d3': 'Natur & Magie', '#d4af37-#818cf8': 'Gold & Stern',
  '#22d3ee-#f472b6': 'Ozean & Blüte', '#a16207-#22c55e': 'Erde & Leben',
};

function getBlendName(hexA: string, hexB: string): string {
  return BLEND_NAMES[`${hexA}-${hexB}`] ?? BLEND_NAMES[`${hexB}-${hexA}`] ?? 'Einzigartige Fusion';
}

interface SoulColorFusionProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function SoulColorFusion({ nameA, birthDateA, nameB, birthDateB }: SoulColorFusionProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const exA = calcExpression(nameA).value;
  const exB = calcExpression(nameB).value;
  const suA = calcSoulUrge(nameA).value;
  const suB = calcSoulUrge(nameB).value;

  const cLpA = NUM_COLORS[lpA] ?? DEFAULT_COLOR;
  const cLpB = NUM_COLORS[lpB] ?? DEFAULT_COLOR;
  const cExA = NUM_COLORS[exA] ?? DEFAULT_COLOR;
  const cExB = NUM_COLORS[exB] ?? DEFAULT_COLOR;
  const cSuA = NUM_COLORS[suA] ?? DEFAULT_COLOR;
  const cSuB = NUM_COLORS[suB] ?? DEFAULT_COLOR;

  const fusionLp = blendColors(cLpA.hex, cLpB.hex);
  const fusionEx = blendColors(cExA.hex, cExB.hex);
  const fusionSu = blendColors(cSuA.hex, cSuB.hex);
  const masterFusion = blendColors(blendColors(fusionLp, fusionEx), fusionSu);
  const blendName = getBlendName(cLpA.hex, cLpB.hex);

  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          Seelenfarben-Fusion
        </div>
        {/* Master fusion swatch */}
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: masterFusion, margin: '0 auto 6px', boxShadow: `0 0 24px ${masterFusion}60, 0 0 8px ${masterFusion}40` }} />
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 700, color: masterFusion }}>{blendName}</div>
        <div style={{ fontSize: 8, color: '#3a3530' }}>Eure gemeinsame Seelenfarbe</div>
      </div>

      {/* LP fusion row */}
      {[
        { label: 'Lebenspfad', numA: lpA, numB: lpB, cA: cLpA, cB: cLpB, fusion: fusionLp },
        { label: 'Ausdruck', numA: exA, numB: exB, cA: cExA, cB: cExB, fusion: fusionEx },
        { label: 'Seelenimpuls', numA: suA, numB: suB, cA: cSuA, cB: cSuB, fusion: fusionSu },
      ].map(({ label, numA, numB, cA, cB, fusion }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 54, flexShrink: 0 }}>
            <div style={{ fontSize: 7, color: '#3a3530', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1 }}>
            <div style={{ textAlign: 'center', minWidth: 28 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: cA.hex, margin: '0 auto 1px', boxShadow: `0 0 6px ${cA.hex}50` }} />
              <div style={{ fontSize: 6, color: cA.hex }}>{numA}</div>
            </div>
            <div style={{ fontSize: 7, color: '#2a2520' }}>{firstA}</div>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${cA.hex}, ${fusion}, ${cB.hex})` }} />
            <div style={{ fontSize: 7, color: '#2a2520' }}>{firstB}</div>
            <div style={{ textAlign: 'center', minWidth: 28 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: cB.hex, margin: '0 auto 1px', boxShadow: `0 0 6px ${cB.hex}50` }} />
              <div style={{ fontSize: 6, color: cB.hex }}>{numB}</div>
            </div>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: fusion, flexShrink: 0, boxShadow: `0 0 6px ${fusion}50` }} />
          </div>
        </div>
      ))}

      <div style={{ marginTop: 8, padding: '7px 11px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.5 }}>
          Eure Seelenfarben mischen sich zu einem einzigartigen Spektrum — es existiert nur einmal im Universum.
        </p>
      </div>
    </div>
  );
}
