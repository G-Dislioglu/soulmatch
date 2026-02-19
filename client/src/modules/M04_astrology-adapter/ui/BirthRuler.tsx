// Sun sign ruler based on birth date
const SIGN_DATES: { sign: string; from: [number, number]; to: [number, number]; ruler: string; element: string; quality: string }[] = [
  { sign: 'Widder', from: [3, 21], to: [4, 19], ruler: 'Mars', element: 'Feuer', quality: 'Kardinal' },
  { sign: 'Stier', from: [4, 20], to: [5, 20], ruler: 'Venus', element: 'Erde', quality: 'Fix' },
  { sign: 'Zwillinge', from: [5, 21], to: [6, 20], ruler: 'Merkur', element: 'Luft', quality: 'Beweglich' },
  { sign: 'Krebs', from: [6, 21], to: [7, 22], ruler: 'Mond', element: 'Wasser', quality: 'Kardinal' },
  { sign: 'Löwe', from: [7, 23], to: [8, 22], ruler: 'Sonne', element: 'Feuer', quality: 'Fix' },
  { sign: 'Jungfrau', from: [8, 23], to: [9, 22], ruler: 'Merkur', element: 'Erde', quality: 'Beweglich' },
  { sign: 'Waage', from: [9, 23], to: [10, 22], ruler: 'Venus', element: 'Luft', quality: 'Kardinal' },
  { sign: 'Skorpion', from: [10, 23], to: [11, 21], ruler: 'Pluto', element: 'Wasser', quality: 'Fix' },
  { sign: 'Schütze', from: [11, 22], to: [12, 21], ruler: 'Jupiter', element: 'Feuer', quality: 'Beweglich' },
  { sign: 'Steinbock', from: [12, 22], to: [1, 19], ruler: 'Saturn', element: 'Erde', quality: 'Kardinal' },
  { sign: 'Wassermann', from: [1, 20], to: [2, 18], ruler: 'Uranus', element: 'Luft', quality: 'Fix' },
  { sign: 'Fische', from: [2, 19], to: [3, 20], ruler: 'Neptun', element: 'Wasser', quality: 'Beweglich' },
];

const RULER_THEMES: Record<string, { icon: string; color: string; gifts: string[]; shadows: string[]; day: string }> = {
  Sonne: { icon: '☉', color: '#fbbf24', gifts: ['Vitalität', 'Führung', 'Kreativität', 'Selbstausdruck'], shadows: ['Ego', 'Starrsinn', 'Dramatik'], day: 'Sonntag' },
  Mond: { icon: '☽', color: '#94a3b8', gifts: ['Intuition', 'Fürsorge', 'Empathie', 'Erinnerung'], shadows: ['Stimmungsschwankungen', 'Abhängigkeit', 'Überempfindlichkeit'], day: 'Montag' },
  Merkur: { icon: '☿', color: '#a3e635', gifts: ['Kommunikation', 'Intelligenz', 'Anpassungsfähigkeit', 'Witz'], shadows: ['Überdenken', 'Nervosität', 'Oberflächlichkeit'], day: 'Mittwoch' },
  Venus: { icon: '♀', color: '#f472b6', gifts: ['Schönheit', 'Liebe', 'Harmonie', 'Ästhetik'], shadows: ['Faulheit', 'Eitelkeit', 'Materialismus'], day: 'Freitag' },
  Mars: { icon: '♂', color: '#ef4444', gifts: ['Energie', 'Mut', 'Direktheit', 'Leidenschaft'], shadows: ['Aggressivität', 'Impulsivität', 'Ungeduld'], day: 'Dienstag' },
  Jupiter: { icon: '♃', color: '#d4af37', gifts: ['Weisheit', 'Fülle', 'Optimismus', 'Expansion'], shadows: ['Übertreibung', 'Verschwendung', 'Naivität'], day: 'Donnerstag' },
  Saturn: { icon: '♄', color: '#a78bfa', gifts: ['Disziplin', 'Verantwortung', 'Geduld', 'Struktur'], shadows: ['Starrheit', 'Pessimismus', 'Einschränkung'], day: 'Samstag' },
  Uranus: { icon: '⛢', color: '#22d3ee', gifts: ['Innovation', 'Freiheit', 'Originalität', 'Rebellion'], shadows: ['Unberechenbarkeit', 'Kälte', 'Chaos'], day: 'Samstag' },
  Neptun: { icon: '♆', color: '#818cf8', gifts: ['Spiritualität', 'Intuition', 'Mitgefühl', 'Träume'], shadows: ['Illusion', 'Täuschung', 'Realitätsflucht'], day: 'Freitag' },
  Pluto: { icon: '♇', color: '#7c3aed', gifts: ['Transformation', 'Tiefe', 'Macht', 'Regeneration'], shadows: ['Kontrollzwang', 'Obsession', 'Zerstörung'], day: 'Dienstag' },
};

const ELEMENT_COLOR: Record<string, string> = { Feuer: '#ef4444', Erde: '#a16207', Luft: '#22d3ee', Wasser: '#38bdf8' };
const ELEMENT_ICON: Record<string, string> = { Feuer: '🔥', Erde: '🌍', Luft: '💨', Wasser: '💧' };

function getSunSign(birthDate: string) {
  const parts = birthDate.split('-');
  const month = parseInt(parts[1] ?? '1', 10);
  const day = parseInt(parts[2] ?? '1', 10);
  for (const s of SIGN_DATES) {
    const [fm, fd] = s.from, [tm, td] = s.to;
    if (fm <= tm) {
      if ((month === fm && day >= fd) || (month === tm && day <= td) || (month > fm && month < tm)) return s;
    } else {
      if ((month === fm && day >= fd) || (month === tm && day <= td) || month > fm || month < tm) return s;
    }
  }
  return SIGN_DATES[0]!;
}

interface BirthRulerProps { birthDate: string; }

export function BirthRuler({ birthDate }: BirthRulerProps) {
  const sign = getSunSign(birthDate);
  const rulerData = RULER_THEMES[sign.ruler];
  if (!rulerData) return null;

  const elemColor = ELEMENT_COLOR[sign.element] ?? '#d4af37';

  return (
    <div>
      {/* Sign + ruler hero */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, padding: '10px 14px', borderRadius: 11, background: `${rulerData.color}09`, border: `1px solid ${rulerData.color}25` }}>
        <div style={{ textAlign: 'center', minWidth: 44 }}>
          <div style={{ fontSize: 26 }}>{rulerData.icon}</div>
          <div style={{ fontSize: 8, color: rulerData.color, fontWeight: 700 }}>{sign.ruler}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 8, color: '#5a5448', marginBottom: 2 }}>Geburtsherrscher</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: rulerData.color, marginBottom: 3 }}>{sign.sign}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: `${elemColor}18`, color: elemColor }}>
              {ELEMENT_ICON[sign.element]} {sign.element}
            </span>
            <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', color: '#5a5448' }}>
              {sign.quality}
            </span>
            <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', color: '#5a5448' }}>
              {rulerData.day}
            </span>
          </div>
        </div>
      </div>

      {/* Gifts */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 8, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>✦ Herrscherqualitäten</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {rulerData.gifts.map(g => (
            <span key={g} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, background: `${rulerData.color}10`, border: `1px solid ${rulerData.color}25`, color: rulerData.color }}>
              {g}
            </span>
          ))}
        </div>
      </div>

      {/* Shadows */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 8, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>◈ Herausforderungen</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {rulerData.shadows.map(s => (
            <span key={s} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#ef4444bb' }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 9, color: '#3a3530', textAlign: 'center' }}>
        Dein Herrscherplanet prägt deinen Stil, deine Stärken und dein Wachstumsfeld
      </div>
    </div>
  );
}
