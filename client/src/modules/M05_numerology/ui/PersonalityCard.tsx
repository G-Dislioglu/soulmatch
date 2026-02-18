import { calcPersonality } from '../lib/calc';

interface PersonalityDef {
  mask: string;
  impression: string;
  style: string;
  shadow: string;
  color: string;
}

const DEFS: Record<number, PersonalityDef> = {
  1: { mask: 'Der Anführer', impression: 'Du wirkst stark, selbstsicher und unabhängig. Andere sehen dich als jemanden, der weiß, was er will.', style: 'Direkt, zielstrebig, charismatisch', shadow: 'Kann arrogant oder unnahbar wirken', color: '#ef4444' },
  2: { mask: 'Der Diplomat', impression: 'Du wirkst sanft, einfühlsam und kooperativ. Andere fühlen sich sofort sicher und verstanden in deiner Nähe.', style: 'Ruhig, zuhörend, harmonisierend', shadow: 'Kann unentschlossen oder zu nachgiebig erscheinen', color: '#38bdf8' },
  3: { mask: 'Der Entertainer', impression: 'Du wirkst charmant, kreativ und lebendig. Deine Energie zieht andere magisch an.', style: 'Expressiv, witzig, enthusiastisch', shadow: 'Kann oberflächlich oder unbeständig wirken', color: '#fbbf24' },
  4: { mask: 'Der Architekt', impression: 'Du wirkst zuverlässig, ernsthaft und bodenständig. Andere vertrauen dir instinktiv.', style: 'Strukturiert, diszipliniert, praktisch', shadow: 'Kann starr oder emotionslos erscheinen', color: '#a16207' },
  5: { mask: 'Der Abenteurer', impression: 'Du wirkst frei, dynamisch und spannend. Andere wollen in deiner Nähe Neues erleben.', style: 'Energetisch, vielseitig, spontan', shadow: 'Kann unzuverlässig oder rastlos wirken', color: '#22d3ee' },
  6: { mask: 'Der Beschützer', impression: 'Du wirkst warm, fürsorglich und vertrauenswürdig. Andere öffnen sich dir leicht.', style: 'Liebevoll, verantwortungsvoll, harmonisch', shadow: 'Kann kontrollierend oder aufopfernd erscheinen', color: '#22c55e' },
  7: { mask: 'Der Weise', impression: 'Du wirkst geheimnisvoll, tiefgründig und intelligent. Andere sind fasziniert von deiner Stille.', style: 'Analytisch, introspektiv, spirituell', shadow: 'Kann distanziert oder arrogant wirken', color: '#7c3aed' },
  8: { mask: 'Der Macher', impression: 'Du wirkst mächtig, professionell und erfolgsorientiert. Andere respektieren dich instinktiv.', style: 'Autoritär, fokussiert, ehrgeizig', shadow: 'Kann kalt oder materialistisch erscheinen', color: '#d4af37' },
  9: { mask: 'Der Philosoph', impression: 'Du wirkst weise, großzügig und weltgewandt. Andere fühlen, dass du mehr siehst als sie.', style: 'Universell, mitfühlend, charismatisch', shadow: 'Kann distanziert oder überheblich wirken', color: '#c026d3' },
  11: { mask: 'Der Visionär', impression: 'Du wirkst inspirierend, sensibel und fast überirdisch. Andere spüren deine besondere Energie sofort.', style: 'Intuitiv, inspirierend, magnetisch', shadow: 'Kann nervös oder ungreifbar wirken', color: '#c084fc' },
  22: { mask: 'Der Meisterbauer', impression: 'Du wirkst monumental, geerdet und visionär. Andere ahnen, dass du Großes erschaffst.', style: 'Strukturiert, ambitioniert, visionär', shadow: 'Kann überwältigend oder distanziert wirken', color: '#1d4ed8' },
  33: { mask: 'Der Meisterlehrer', impression: 'Du wirkst strahlend, liebevoll und fast heilig. Andere sind von deiner Ausstrahlung bewegt.', style: 'Liebevoll, aufopfernd, inspirierend', shadow: 'Kann sich selbst vergessen oder overwhelmed sein', color: '#fda4af' },
};

const DEFAULT_DEF: PersonalityDef = { mask: 'Der Einzigartige', impression: 'Deine äußere Erscheinung ist eine einzigartige Mischung vieler Qualitäten.', style: 'Vielseitig, authentisch', shadow: 'Im Werden', color: '#a09a8e' };

interface PersonalityCardProps { name: string; }

export function PersonalityCard({ name }: PersonalityCardProps) {
  const result = calcPersonality(name);
  const def = DEFS[result.value] ?? DEFAULT_DEF;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${def.color}15`, border: `1.5px solid ${def.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: def.color }}>{result.value}</span>
        </div>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: def.color, lineHeight: 1.2 }}>{def.mask}</div>
          <div style={{ fontSize: 9, color: '#5a5448', marginTop: 1 }}>Persönlichkeitszahl {result.value}</div>
        </div>
      </div>

      {/* Impression */}
      <div style={{ padding: '9px 12px', borderRadius: 9, background: `${def.color}08`, border: `1px solid ${def.color}20`, marginBottom: 8 }}>
        <div style={{ fontSize: 8, color: def.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>☽ Wie andere dich wahrnehmen</div>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#7a7468', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{def.impression}</p>
      </div>

      {/* Style + Shadow */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 8, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Auftrittsstil</div>
          <div style={{ fontSize: 10, color: '#5a5448' }}>{def.style}</div>
        </div>
        <div style={{ flex: 1, padding: '7px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <div style={{ fontSize: 8, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Schatten</div>
          <div style={{ fontSize: 10, color: '#5a5448' }}>{def.shadow}</div>
        </div>
      </div>
    </div>
  );
}
