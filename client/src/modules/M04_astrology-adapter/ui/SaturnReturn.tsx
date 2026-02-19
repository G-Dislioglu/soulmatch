// Saturn return occurs approximately at ages 27-30, 57-60, 87-90
function getSaturnPhase(birthDate: string): { age: number; phase: string; nextReturn: number; yearsUntil: number; yearsAgo: number } {
  const birthYear = parseInt(birthDate.split('-')[0] ?? '1990', 10);
  const today = new Date();
  const age = today.getFullYear() - birthYear;
  const firstReturn = 29;
  const secondReturn = 58;
  const thirdReturn = 87;

  let phase = '';
  let nextReturn = 0;
  let yearsUntil = 0;
  let yearsAgo = 0;

  if (age < firstReturn - 3) {
    phase = 'vor-ersten-Rückkehr';
    nextReturn = firstReturn;
    yearsUntil = firstReturn - age;
    yearsAgo = 0;
  } else if (age >= firstReturn - 3 && age <= firstReturn + 3) {
    phase = 'erste-Rückkehr';
    nextReturn = secondReturn;
    yearsUntil = secondReturn - age;
    yearsAgo = age - firstReturn;
  } else if (age > firstReturn + 3 && age < secondReturn - 3) {
    phase = 'zwischen-Rückkehren';
    nextReturn = secondReturn;
    yearsUntil = secondReturn - age;
    yearsAgo = age - firstReturn;
  } else if (age >= secondReturn - 3 && age <= secondReturn + 3) {
    phase = 'zweite-Rückkehr';
    nextReturn = thirdReturn;
    yearsUntil = thirdReturn - age;
    yearsAgo = age - secondReturn;
  } else {
    phase = 'nach-zweiter-Rückkehr';
    nextReturn = thirdReturn;
    yearsUntil = Math.max(0, thirdReturn - age);
    yearsAgo = age - secondReturn;
  }

  return { age, phase, nextReturn, yearsUntil, yearsAgo };
}

const PHASE_DATA: Record<string, { title: string; desc: string; theme: string; challenge: string; gift: string; mantra: string; color: string; icon: string }> = {
  'vor-ersten-Rückkehr': {
    title: 'Vor der ersten Saturn-Rückkehr',
    desc: 'Du bist noch in der Aufbauphase deines Lebens. Saturn beobachtet, was du erschaffst.',
    theme: 'Fundamente legen, Identität formen, Richtung finden',
    challenge: 'Die Versuchung, Verantwortung zu vermeiden und die Zukunft aufzuschieben',
    gift: 'Noch ist alles möglich — nutze diese Zeit bewusst',
    mantra: 'Ich baue heute das Fundament für mein zukünftiges Selbst',
    color: '#818cf8', icon: '🪐',
  },
  'erste-Rückkehr': {
    title: 'Erste Saturn-Rückkehr (27–30)',
    desc: 'Die große Abrechnung. Saturn kehrt zu seiner Geburtsposition zurück und fordert Rechenschaft.',
    theme: 'Wer bist du wirklich? Was willst du wirklich? Was muss enden?',
    challenge: 'Loslassen was nicht mehr zu dir gehört — Beziehungen, Jobs, Identitäten',
    gift: 'Nach dieser Prüfung weißt du wer du wirklich bist',
    mantra: 'Ich nehme mein Leben vollständig in die eigene Hand',
    color: '#d4af37', icon: '⚖️',
  },
  'zwischen-Rückkehren': {
    title: 'Zwischen den Saturn-Rückkehren',
    desc: 'Du hast die erste Prüfung bestanden. Jetzt erntest du was du gesät hast.',
    theme: 'Aufbau, Reife, Verantwortung tragen, Früchte ernten',
    challenge: 'Nicht in Routine erstarren — Saturn belohnt Wachstum, nicht Stagnation',
    gift: 'Diese Phase ist die produktivste deines Lebens wenn du sie bewusst nutzt',
    mantra: 'Ich wachse durch Disziplin und Beständigkeit',
    color: '#22c55e', icon: '🌱',
  },
  'zweite-Rückkehr': {
    title: 'Zweite Saturn-Rückkehr (57–60)',
    desc: 'Die Weisheits-Rückkehr. Saturn fragt: Hast du deine Lektionen gelernt?',
    theme: 'Vermächtnis, Weisheit weitergeben, Lebenswerk vollenden',
    challenge: 'Bedauern loslassen und das Gelebte annehmen',
    gift: 'Tiefe Weisheit die nur durch gelebtes Leben entsteht',
    mantra: 'Ich bin die Summe meiner Erfahrungen — und das ist genug',
    color: '#c026d3', icon: '🌕',
  },
  'nach-zweiter-Rückkehr': {
    title: 'Nach der zweiten Saturn-Rückkehr',
    desc: 'Du hast beide großen Saturn-Prüfungen gemeistert. Jetzt bist du Zeuge und Weiser.',
    theme: 'Erbe, Spiritualität, Loslassen, Vollendung',
    challenge: 'Den Übergang mit Würde und Frieden zu gestalten',
    gift: 'Deine bloße Anwesenheit ist Weisheit für andere',
    mantra: 'Ich lebe vollständig und lasse los was kommen mag',
    color: '#7c3aed', icon: '✨',
  },
};

interface SaturnReturnProps { birthDate: string; }

export function SaturnReturn({ birthDate }: SaturnReturnProps) {
  const { age, phase, nextReturn, yearsUntil } = getSaturnPhase(birthDate);
  const data = PHASE_DATA[phase] ?? PHASE_DATA['zwischen-Rückkehren']!;
  const isActive = phase === 'erste-Rückkehr' || phase === 'zweite-Rückkehr';

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Alter {age} · Saturn-Zyklus</div>
        <div style={{ fontSize: 26, marginBottom: 4 }}>{data.icon}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: data.color }}>{data.title}</div>
        {isActive && (
          <div style={{ display: 'inline-block', marginTop: 5, padding: '2px 10px', borderRadius: 10, background: `${data.color}20`, border: `1px solid ${data.color}40`, fontSize: 7, color: data.color, fontWeight: 700 }}>
            ◉ AKTIVE SATURN-RÜCKKEHR
          </div>
        )}
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: `${data.color}07`, border: `1px solid ${data.color}20`, marginBottom: 9 }}>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.5, fontStyle: 'italic' }}>{data.desc}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 9 }}>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(129,140,248,0.05)', border: '1px solid rgba(129,140,248,0.15)' }}>
          <div style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>◈ Lebensthema jetzt</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{data.theme}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✗ Herausforderung</div>
            <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{data.challenge}</p>
          </div>
          <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✦ Geschenk</div>
            <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{data.gift}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: `${data.color}08`, border: `1px solid ${data.color}22`, textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>✧ Saturn-Mantra</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: data.color, lineHeight: 1.6, fontStyle: 'italic' }}>„{data.mantra}"</p>
      </div>

      {yearsUntil > 0 && (
        <div style={{ textAlign: 'center', fontSize: 8, color: '#5a5448' }}>
          Nächste Saturn-Rückkehr (Alter {nextReturn}) in <strong style={{ color: data.color }}>{yearsUntil} Jahren</strong>
        </div>
      )}
    </div>
  );
}
