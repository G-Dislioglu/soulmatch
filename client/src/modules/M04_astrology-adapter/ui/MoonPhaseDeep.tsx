// Approximate birth moon phase from birth date
function getBirthMoonPhase(birthDate: string): string {
  const parts = birthDate.split('-');
  const y = parseInt(parts[0] ?? '1990', 10);
  const m = parseInt(parts[1] ?? '1', 10);
  const d = parseInt(parts[2] ?? '1', 10);
  // Simplified lunar cycle calculation
  const jd = 367 * y - Math.floor(7 * (y + Math.floor((m + 9) / 12)) / 4) + Math.floor(275 * m / 9) + d + 1721013.5;
  const cycle = ((jd - 2451550.1) / 29.53058867) % 1;
  const normalized = cycle < 0 ? cycle + 1 : cycle;
  if (normalized < 0.0625) return 'Neumond';
  if (normalized < 0.1875) return 'Zunehmende Sichel';
  if (normalized < 0.3125) return 'Erstes Viertel';
  if (normalized < 0.4375) return 'Zunehmender Mond';
  if (normalized < 0.5625) return 'Vollmond';
  if (normalized < 0.6875) return 'Abnehmender Mond';
  if (normalized < 0.8125) return 'Letztes Viertel';
  if (normalized < 0.9375) return 'Abnehmende Sichel';
  return 'Neumond';
}

const MOON_PHASES: Record<string, { icon: string; title: string; soul_type: string; gift: string; shadow: string; love_style: string; life_theme: string; mantra: string; color: string }> = {
  'Neumond': {
    icon: '🌑', title: 'Die Neumond-Seele',
    soul_type: 'Visionär und Neuanfänger — du trägst das Potenzial von allem in dir',
    gift: 'Fähigkeit zu radikalen Neuanfängen und das Erschaffen aus dem Nichts',
    shadow: 'Schwierigkeit, Dinge abzuschließen und im Jetzt zu bleiben',
    love_style: 'Du liebst mit frischer, unverbrauchter Energie — jede Begegnung ist ein Neuanfang',
    life_theme: 'Dein Leben ist eine Abfolge von Neuanfängen — jeder Zyklus bringt eine neue Version von dir',
    mantra: 'Ich bin der Same der alles Mögliche in sich trägt',
    color: '#1e293b',
  },
  'Zunehmende Sichel': {
    icon: '🌒', title: 'Die Sichel-Seele',
    soul_type: 'Kämpfer und Pionier — du brichst durch alte Muster',
    gift: 'Unerschütterlicher Wille und die Kraft, gegen den Strom zu schwimmen',
    shadow: 'Ungeduld und das Gefühl, immer kämpfen zu müssen',
    love_style: 'Du liebst leidenschaftlich und mit vollem Einsatz — du gibst alles',
    life_theme: 'Dein Leben ist ein Aufbruch aus alten Strukturen hin zu deiner eigenen Wahrheit',
    mantra: 'Ich breche durch was mich begrenzt und erschaffe meinen eigenen Weg',
    color: '#475569',
  },
  'Erstes Viertel': {
    icon: '🌓', title: 'Die Entscheidungs-Seele',
    soul_type: 'Handelnder und Entscheider — du bist zum Handeln geboren',
    gift: 'Entschlossenheit, Mut und die Fähigkeit, in Krisen klar zu denken',
    shadow: 'Impulsivität und das Bereuen von Entscheidungen',
    love_style: 'Du liebst aktiv und zeigst Liebe durch Taten, nicht Worte',
    life_theme: 'Dein Leben ist eine Serie von mutigen Entscheidungen die dich formen',
    mantra: 'Ich handle mit Mut und vertraue meiner inneren Führung',
    color: '#64748b',
  },
  'Zunehmender Mond': {
    icon: '🌔', title: 'Die Aufbau-Seele',
    soul_type: 'Erschaffer und Vollender — du bringst Dinge zur Blüte',
    gift: 'Ausdauer, Kreativität und die Fähigkeit, Ideen in Realität zu verwandeln',
    shadow: 'Überengagement und das Vergessen der eigenen Grenzen',
    love_style: 'Du liebst wachsend und nährend — du baust Beziehungen mit Geduld auf',
    life_theme: 'Dein Leben ist ein kontinuierliches Wachstum und Erschaffen von Bedeutung',
    mantra: 'Ich erschaffe mit Freude und bringe meine Träume zur Blüte',
    color: '#94a3b8',
  },
  'Vollmond': {
    icon: '🌕', title: 'Die Vollmond-Seele',
    soul_type: 'Illuminierter und Vollender — du bist zum Strahlen und Teilen geboren',
    gift: 'Charisma, emotionale Tiefe und die Fähigkeit, andere zu erleuchten',
    shadow: 'Emotionale Intensität und das Gefühl, immer im Rampenlicht zu stehen',
    love_style: 'Du liebst vollständig und intensiv — du gibst und erwartest dasselbe zurück',
    life_theme: 'Dein Leben ist ein Ausdruck von Fülle — du bist hier um zu leuchten',
    mantra: 'Ich strahle mein volles Licht ohne Angst vor meiner eigenen Helligkeit',
    color: '#f8fafc',
  },
  'Abnehmender Mond': {
    icon: '🌖', title: 'Die Weisheits-Seele',
    soul_type: 'Weiser und Lehrer — du teilst was du gelernt hast',
    gift: 'Tiefe Weisheit, Fähigkeit zur Analyse und das Teilen von Erkenntnissen',
    shadow: 'Melancholie und das Festhalten an vergangenen Erfolgen',
    love_style: 'Du liebst mit Tiefe und Weisheit — du bringst Reife in Beziehungen',
    life_theme: 'Dein Leben ist ein Prozess des Destillierens von Erfahrungen zu Weisheit',
    mantra: 'Ich teile meine Weisheit großzügig und lasse los was nicht mehr dient',
    color: '#cbd5e1',
  },
  'Letztes Viertel': {
    icon: '🌗', title: 'Die Transformations-Seele',
    soul_type: 'Revolutionär und Transformator — du brichst alte Strukturen auf',
    gift: 'Mut zur Transformation und die Fähigkeit, das Alte loszulassen',
    shadow: 'Innere Konflikte und das Gefühl, zwischen zwei Welten zu stehen',
    love_style: 'Du liebst transformativ — Beziehungen mit dir verändern beide',
    life_theme: 'Dein Leben ist ein Prozess der ständigen Transformation und Erneuerung',
    mantra: 'Ich lasse los was nicht mehr dient und öffne mich für das Neue',
    color: '#94a3b8',
  },
  'Abnehmende Sichel': {
    icon: '🌘', title: 'Die Vollendungs-Seele',
    soul_type: 'Mystiker und Vollender — du schließt Zyklen ab und bereitest Neues vor',
    gift: 'Tiefe Spiritualität, Fähigkeit zur Stille und das Erkennen von Mustern',
    shadow: 'Isolation und das Gefühl, zwischen den Welten zu leben',
    love_style: 'Du liebst tief und spirituell — du suchst Seelenverbindung über Oberflächlichkeit',
    life_theme: 'Dein Leben ist ein spiritueller Weg der Vertiefung und des Abschlusses',
    mantra: 'Ich vollende mit Würde und bereite den Boden für neue Anfänge',
    color: '#334155',
  },
};

const DEFAULT_MOON = { icon: '🌙', title: 'Die Mondseele', soul_type: 'Einzigartig und geheimnisvoll', gift: 'Deine Mondenergie ist einzigartig', shadow: 'Das Unbekannte', love_style: 'Du liebst auf deine eigene Art', life_theme: 'Dein Leben folgt dem Mondrhythmus', mantra: 'Ich vertraue dem Rhythmus meiner Seele', color: '#818cf8' };

interface MoonPhaseDeepProps { birthDate: string; }

export function MoonPhaseDeep({ birthDate }: MoonPhaseDeepProps) {
  const phase = getBirthMoonPhase(birthDate);
  const data = MOON_PHASES[phase] ?? DEFAULT_MOON;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Geburts-Mondphase</div>
        <div style={{ fontSize: 32, marginBottom: 4 }}>{data.icon}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: data.color === '#1e293b' || data.color === '#334155' ? '#818cf8' : data.color }}>{data.title}</div>
        <div style={{ display: 'inline-block', marginTop: 5, padding: '2px 10px', borderRadius: 10, background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)', fontSize: 8, color: '#818cf8' }}>{phase}</div>
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(129,140,248,0.05)', border: '1px solid rgba(129,140,248,0.15)', marginBottom: 8 }}>
        <div style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◉ Dein Seelen-Typ</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.soul_type}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✦ Geschenk</div>
            <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{data.gift}</p>
          </div>
          <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✗ Schatten</div>
            <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{data.shadow}</p>
          </div>
        </div>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(244,114,182,0.05)', border: '1px solid rgba(244,114,182,0.15)' }}>
          <div style={{ fontSize: 7, color: '#f472b6', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>♡ Liebesstil</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{data.love_style}</p>
        </div>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <div style={{ fontSize: 7, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>★ Lebensthema</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{data.life_theme}</p>
        </div>
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>✧ Mond-Mantra</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: '#818cf8', lineHeight: 1.6, fontStyle: 'italic' }}>„{data.mantra}"</p>
      </div>
    </div>
  );
}
