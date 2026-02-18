import { calcLifePath } from '../lib/calc';

interface SoulType {
  archetype: string;
  element: string;
  elementIcon: string;
  elementColor: string;
  quality: string;
  polarity: string;
  polarityIcon: string;
  keywords: string[];
  shadow: string;
  gift: string;
}

const SOUL_TYPES: Record<number, SoulType> = {
  1: { archetype: 'Der Pionier', element: 'Feuer', elementIcon: '🔥', elementColor: '#ef4444', quality: 'Kardinal', polarity: 'Yang', polarityIcon: '☀', keywords: ['Initiative', 'Originalität', 'Mut', 'Unabhängigkeit'], shadow: 'Egozentrik, Ungeduld', gift: 'Du entzündest Feuer in anderen durch dein bloßes Erscheinen.' },
  2: { archetype: 'Der Diplomat', element: 'Wasser', elementIcon: '🌊', elementColor: '#38bdf8', quality: 'Mutable', polarity: 'Yin', polarityIcon: '☽', keywords: ['Harmonie', 'Einfühlsamkeit', 'Kooperation', 'Geduld'], shadow: 'Überanpassung, Co-Abhängigkeit', gift: 'Du siehst das Unsichtbare zwischen Menschen und schaffst Brücken.' },
  3: { archetype: 'Der Erschaffer', element: 'Feuer', elementIcon: '🔥', elementColor: '#fbbf24', quality: 'Mutable', polarity: 'Yang', polarityIcon: '☀', keywords: ['Kreativität', 'Ausdruck', 'Freude', 'Kommunikation'], shadow: 'Zerstreutheit, Oberflächlichkeit', gift: 'Du verwandelst das Gewöhnliche durch dein schöpferisches Licht.' },
  4: { archetype: 'Der Baumeister', element: 'Erde', elementIcon: '🌍', elementColor: '#a16207', quality: 'Fest', polarity: 'Yin', polarityIcon: '☽', keywords: ['Beständigkeit', 'Disziplin', 'Ordnung', 'Verlässlichkeit'], shadow: 'Starrheit, Kontrolle', gift: 'Du schaffst bleibende Fundamente, auf denen andere aufbauen können.' },
  5: { archetype: 'Der Abenteurer', element: 'Luft', elementIcon: '🌬', elementColor: '#22d3ee', quality: 'Kardinal', polarity: 'Yang', polarityIcon: '☀', keywords: ['Freiheit', 'Wandel', 'Neugier', 'Anpassung'], shadow: 'Bindungsangst, Unbeständigkeit', gift: 'Du bringst frischen Wind in erstarrte Strukturen.' },
  6: { archetype: 'Der Hüter', element: 'Erde', elementIcon: '🌿', elementColor: '#22c55e', quality: 'Mutable', polarity: 'Yin', polarityIcon: '☽', keywords: ['Fürsorge', 'Verantwortung', 'Schönheit', 'Harmonie'], shadow: 'Kontrollbedürfnis, Aufopferung', gift: 'Deine Liebe heilt und verwandelt alles, was sie berührt.' },
  7: { archetype: 'Der Weise', element: 'Wasser', elementIcon: '💧', elementColor: '#7c3aed', quality: 'Fest', polarity: 'Yin', polarityIcon: '☽', keywords: ['Tiefe', 'Spiritualität', 'Analyse', 'Innenschau'], shadow: 'Isolation, Misstrauen', gift: 'Du siehst hinter die Schleier der Wirklichkeit und bringst Wahrheit ans Licht.' },
  8: { archetype: 'Der Manifestor', element: 'Erde', elementIcon: '💎', elementColor: '#d4af37', quality: 'Kardinal', polarity: 'Yang', polarityIcon: '☀', keywords: ['Macht', 'Fülle', 'Autorität', 'Ambition'], shadow: 'Materialismus, Kontrollsucht', gift: 'Du manifestierst Träume in konkrete Realität durch deinen unerschütterlichen Willen.' },
  9: { archetype: 'Der Humanist', element: 'Feuer', elementIcon: '✨', elementColor: '#c026d3', quality: 'Mutable', polarity: 'Yang', polarityIcon: '☀', keywords: ['Mitgefühl', 'Weisheit', 'Vollendung', 'Universalität'], shadow: 'Martyrertum, Loslassenprobleme', gift: 'Deine Liebe kennt keine Grenzen — du liebst die ganze Menschheit.' },
  11: { archetype: 'Der Erleuchtete', element: 'Äther', elementIcon: '⚡', elementColor: '#c084fc', quality: 'Inspiriert', polarity: 'Yang/Yin', polarityIcon: '☯', keywords: ['Intuition', 'Inspiration', 'Erleuchtung', 'Channeling'], shadow: 'Nervosität, emotionale Überflutung', gift: 'Du bist ein Kanal des göttlichen Lichts — deine Inspiration weckt andere.' },
  22: { archetype: 'Der Meisterbauer', element: 'Äther', elementIcon: '🌐', elementColor: '#1d4ed8', quality: 'Meister', polarity: 'Yang/Yin', polarityIcon: '☯', keywords: ['Vision', 'Manifestation', 'Dienst', 'Monument'], shadow: 'Überwältigung, Selbstzweifel', gift: 'Du baust das Ewige im Dienst der Menschheit — für Generationen.' },
  33: { archetype: 'Der Meisterheiler', element: 'Äther', elementIcon: '❤️', elementColor: '#fda4af', quality: 'Meister', polarity: 'Yang/Yin', polarityIcon: '☯', keywords: ['Bedingungslose Liebe', 'Opfer', 'Heilung', 'Licht'], shadow: 'Selbstverlust, Grenzenlosigkeit', gift: 'Deine Liebe heilt Wunden, die andere nicht einmal sehen können.' },
};

const DEFAULT_TYPE: SoulType = { archetype: 'Der Suchende', element: 'Äther', elementIcon: '✦', elementColor: '#a09a8e', quality: 'Wandelnd', polarity: 'Neutral', polarityIcon: '◈', keywords: ['Offenheit', 'Wachstum', 'Potenzial', 'Wandel'], shadow: 'Orientierungslosigkeit', gift: 'Dein größtes Geschenk ist noch im Werden.' };

interface SoulTypeCardProps { birthDate: string; }

export function SoulTypeCard({ birthDate }: SoulTypeCardProps) {
  const lp = calcLifePath(birthDate);
  const st: SoulType = SOUL_TYPES[lp.value] ?? DEFAULT_TYPE;

  return (
    <div>
      {/* Archetype header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{st.elementIcon}</div>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: st.elementColor, lineHeight: 1.2 }}>{st.archetype}</div>
          <div style={{ fontSize: 9, color: '#5a5448', marginTop: 1 }}>Lebenspfad {lp.value}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 18, color: st.elementColor }}>{st.polarityIcon}</div>
          <div style={{ fontSize: 8, color: '#4a4540' }}>{st.polarity}</div>
        </div>
      </div>

      {/* Element + Quality row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <div style={{ flex: 1, padding: '6px 10px', borderRadius: 8, background: `${st.elementColor}10`, border: `1px solid ${st.elementColor}25`, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#5a5448' }}>Element</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: st.elementColor }}>{st.element}</div>
        </div>
        <div style={{ flex: 1, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#5a5448' }}>Qualität</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7a7468' }}>{st.quality}</div>
        </div>
        <div style={{ flex: 1, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#5a5448' }}>Polarität</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7a7468' }}>{st.polarity}</div>
        </div>
      </div>

      {/* Keywords */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {st.keywords.map((k) => (
          <span key={k} style={{ fontSize: 9, color: st.elementColor, padding: '2px 7px', borderRadius: 5, background: `${st.elementColor}0d`, border: `1px solid ${st.elementColor}22` }}>{k}</span>
        ))}
      </div>

      {/* Gift */}
      <div style={{ padding: '9px 12px', borderRadius: 9, background: `${st.elementColor}08`, border: `1px solid ${st.elementColor}20`, marginBottom: 8 }}>
        <div style={{ fontSize: 8, color: st.elementColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>✦ Seelengabe</div>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#7a7468', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{st.gift}</p>
      </div>

      {/* Shadow */}
      <div style={{ fontSize: 9, color: '#3a3530', padding: '0 4px' }}>
        <span style={{ color: '#f59e0b' }}>☽ Schatten: </span>{st.shadow}
      </div>
    </div>
  );
}
