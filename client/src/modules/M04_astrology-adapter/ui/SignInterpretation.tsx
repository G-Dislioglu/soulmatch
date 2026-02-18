// Static Sonne/Mond sign interpretations — no server needed.

interface SignDef {
  glyph: string;
  element: 'Feuer' | 'Erde' | 'Luft' | 'Wasser';
  mode: 'Kardinal' | 'Fix' | 'Mutable';
  keywords: string[];
  sunDesc: string;
  moonDesc: string;
  color: string;
}

const SIGNS: Record<string, SignDef> = {
  'Widder': { glyph: '♈', element: 'Feuer', mode: 'Kardinal', keywords: ['Pionier', 'Mut', 'Initiative'], sunDesc: 'Du bist eine Pionierin / ein Pionier — impulsiv, mutig, voller Lebensenergie. Du startest Dinge und inspirierst andere mit deiner Direktheit.', moonDesc: 'Deine Gefühle loddern schnell auf und ebenso schnell ab. Du brauchst Raum für deine Emotionen und fühlst dich in Bewegung lebendig.', color: '#ef4444' },
  'Stier': { glyph: '♉', element: 'Erde', mode: 'Fix', keywords: ['Beständigkeit', 'Sinnlichkeit', 'Geduld'], sunDesc: 'Du erschaffst Stabilität und Schönheit. Deine Geduld und Beständigkeit bauen Fundamente, die Generationen überdauern.', moonDesc: 'Du findest emotionale Sicherheit in Beständigkeit, Berührung und sinnlichen Genüssen. Veränderungen kannst du langsam integrieren.', color: '#84cc16' },
  'Zwillinge': { glyph: '♊', element: 'Luft', mode: 'Mutable', keywords: ['Kommunikation', 'Neugier', 'Vielseitigkeit'], sunDesc: 'Dein Geist ist ein Tänzer — neugierig, vielseitig, kommunikativ. Du verbindest Menschen und Ideen wie kein anderer.', moonDesc: 'Deine Emotionen sind leicht und wechselhaft wie Gedanken. Du verarbeitest Gefühle durch Gespräche und intellektuellen Austausch.', color: '#fbbf24' },
  'Krebs': { glyph: '♋', element: 'Wasser', mode: 'Kardinal', keywords: ['Fürsorge', 'Intuition', 'Heimat'], sunDesc: 'Du bist ein Hüter von Herzen und Zuhause. Deine tiefe Empathie und Fürsorge erschaffen sichere Räume für andere.', moonDesc: 'Der Mond ist dein Heimatplanet. Deine Gefühle sind tief, intuitiv und von Zyklen geprägt — du spürst die Stimmungen anderer wie deine eigenen.', color: '#38bdf8' },
  'Löwe': { glyph: '♌', element: 'Feuer', mode: 'Fix', keywords: ['Ausstrahlung', 'Kreativität', 'Großzügigkeit'], sunDesc: 'Du leuchtets wie die Sonne selbst — großzügig, kreativ, mit natürlicher Autorität. Dein Herz liebt mit königlicher Fülle.', moonDesc: 'Deine Gefühle verlangen Ausdruck und Anerkennung. Du liebst mit Drama und Wärme und gibst alles, was du hast.', color: '#f59e0b' },
  'Jungfrau': { glyph: '♍', element: 'Erde', mode: 'Mutable', keywords: ['Analyse', 'Dienst', 'Präzision'], sunDesc: 'Dein Blick erkennt Details, die anderen entgehen. Du dienst mit Präzision und Hingabe und verbesserst alles, was du berührst.', moonDesc: 'Du verarbeitest Gefühle durch Analyse und praktische Fürsorge. Ordnung und nützliche Rituale geben dir emotionalen Halt.', color: '#a3a3a3' },
  'Waage': { glyph: '♎', element: 'Luft', mode: 'Kardinal', keywords: ['Harmonie', 'Gerechtigkeit', 'Schönheit'], sunDesc: 'Du suchst Harmonie und Schönheit in allem. Dein Gespür für Balance und Fairness macht dich zu einem natürlichen Vermittler.', moonDesc: 'Deine Gefühle suchen nach Ausgleich und Verbindung. Du fühlst dich am besten in harmonischen Beziehungen und schönen Umgebungen.', color: '#f472b6' },
  'Skorpion': { glyph: '♏', element: 'Wasser', mode: 'Fix', keywords: ['Tiefe', 'Transformation', 'Intensität'], sunDesc: 'Du tauchst in die Tiefen des Lebens — intensiv, transformierend, unerschrocken. Deine Kraft liegt im Loslassen und Wiedergeboren-werden.', moonDesc: 'Deine Gefühle sind tiefgründig und besitzen eine magnetische Intensität. Du fühlst alles vollständig und kannst Gefühle lange tragen.', color: '#c084fc' },
  'Schütze': { glyph: '♐', element: 'Feuer', mode: 'Mutable', keywords: ['Freiheit', 'Weisheit', 'Abenteuer'], sunDesc: 'Dein Pfeil zeigt immer zur Wahrheit. Du bist ein freier Geist — philosophisch, abenteuerlustig, auf der ewigen Suche nach Sinn.', moonDesc: 'Du brauchst emotionalen Raum und Freiheit. Einengung in Gefühlen ist schwer für dich — du willst das Universelle im Persönlichen finden.', color: '#d4af37' },
  'Steinbock': { glyph: '♑', element: 'Erde', mode: 'Kardinal', keywords: ['Disziplin', 'Ehrgeiz', 'Struktur'], sunDesc: 'Du kletterst den Berg des Lebens mit unnachgiebiger Ausdauer. Deine Ambitionen bauen Dauerhaftes, das die Zeit überdauert.', moonDesc: 'Deine Gefühle schützt du mit Würde und Kontrolle. Emotional öffnest du dich langsam — aber wenn du es tust, mit tiefer Loyalität.', color: '#6b7280' },
  'Wassermann': { glyph: '♒', element: 'Luft', mode: 'Fix', keywords: ['Innovation', 'Freiheit', 'Menschheit'], sunDesc: 'Du bist ein Visionär der Zukunft — originell, unkonventionell, mit dem Herz für die Gemeinschaft. Du denkst, was andere noch nicht denken.', moonDesc: 'Deine Gefühle verarbeitest du durch intellektuelle Distanz. Du liebst das Menschliche im Allgemeinen tief, Nähe im Einzelnen braucht Freiheit.', color: '#818cf8' },
  'Fische': { glyph: '♓', element: 'Wasser', mode: 'Mutable', keywords: ['Mitgefühl', 'Intuition', 'Träume'], sunDesc: 'Du bist ein Kanal für das Universelle — empathisch, träumerisch, spirituell. Deine Grenzen sind fließend wie das Meer.', moonDesc: 'Du spürst alles und jeden. Deine Gefühle sind tief intuitiv und mitfühlend — du brauchst Rückzug, um dich wieder zu finden.', color: '#38bdf8' },
};

const EL_COLOR: Record<string, string> = { Feuer: '#f97316', Erde: '#84cc16', Luft: '#38bdf8', Wasser: '#818cf8' };

interface SignInterpretationProps {
  sunSign?: string;
  moonSign?: string;
}

function normalize(s?: string): string {
  if (!s) return '';
  return s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase();
}

export function SignInterpretation({ sunSign, moonSign }: SignInterpretationProps) {
  const sun = SIGNS[normalize(sunSign) ?? ''];
  const moon = SIGNS[normalize(moonSign) ?? ''];

  if (!sun && !moon) {
    return (
      <div style={{ fontSize: 11, color: '#4a4540', textAlign: 'center', padding: '12px 0' }}>
        Berechne dein Geburtshoroskop, um Sonne & Mond zu sehen.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sun && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: `${sun.color}0a`, border: `1px solid ${sun.color}25` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18, color: sun.color }}>{sun.glyph}</span>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: sun.color }}>☉ Sonne im {normalize(sunSign)}</span>
              <span style={{ fontSize: 9, color: EL_COLOR[sun.element], marginLeft: 7, padding: '1px 6px', borderRadius: 5, background: `${EL_COLOR[sun.element]}15`, border: `1px solid ${EL_COLOR[sun.element]}30` }}>{sun.element} · {sun.mode}</span>
            </div>
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 12, lineHeight: 1.6, color: '#c8c0b0', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
            {sun.sunDesc}
          </p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {sun.keywords.map((kw) => (
              <span key={kw} style={{ fontSize: 9, color: '#6a6458', padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>{kw}</span>
            ))}
          </div>
        </div>
      )}

      {moon && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: `${moon.color}0a`, border: `1px solid ${moon.color}25` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18, color: moon.color }}>{moon.glyph}</span>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: moon.color }}>☽ Mond im {normalize(moonSign)}</span>
              <span style={{ fontSize: 9, color: EL_COLOR[moon.element], marginLeft: 7, padding: '1px 6px', borderRadius: 5, background: `${EL_COLOR[moon.element]}15`, border: `1px solid ${EL_COLOR[moon.element]}30` }}>{moon.element} · {moon.mode}</span>
            </div>
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 12, lineHeight: 1.6, color: '#c8c0b0', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
            {moon.moonDesc}
          </p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {moon.keywords.map((kw) => (
              <span key={kw} style={{ fontSize: 9, color: '#6a6458', padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>{kw}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
