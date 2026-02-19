// Birth sign based on birth date (approximate sun sign)
function getSunSign(birthDate: string): string {
  const p = birthDate.split('-');
  const m = parseInt(p[1] ?? '0', 10);
  const d = parseInt(p[2] ?? '0', 10);
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'Widder';
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'Stier';
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 'Zwillinge';
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 'Krebs';
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'Löwe';
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'Jungfrau';
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'Waage';
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'Skorpion';
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'Schütze';
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'Steinbock';
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'Wassermann';
  return 'Fische';
}

const SIGNS: Record<string, { icon: string; element: string; ruler: string; color: string; strength: string; shadow: string; gift: string }> = {
  'Widder': { icon: '♈', element: 'Feuer', ruler: 'Mars', color: '#ef4444', strength: 'Mut, Pioniertum, Energie', shadow: 'Impulsivität, Ungeduld', gift: 'Die Fähigkeit, als Erster zu handeln' },
  'Stier': { icon: '♉', element: 'Erde', ruler: 'Venus', color: '#22c55e', strength: 'Beständigkeit, Sinnlichkeit, Zuverlässigkeit', shadow: 'Sturheit, Besitzdenken', gift: 'Schönheit und Sicherheit in die Welt bringen' },
  'Zwillinge': { icon: '♊', element: 'Luft', ruler: 'Merkur', color: '#fbbf24', strength: 'Kommunikation, Neugier, Anpassungsfähigkeit', shadow: 'Unbeständigkeit, Oberflächlichkeit', gift: 'Brücken zwischen Ideen und Menschen bauen' },
  'Krebs': { icon: '♋', element: 'Wasser', ruler: 'Mond', color: '#7c3aed', strength: 'Empathie, Fürsorge, Intuition', shadow: 'Überempfindlichkeit, Rückzug', gift: 'Anderen ein Zuhause im Herzen geben' },
  'Löwe': { icon: '♌', element: 'Feuer', ruler: 'Sonne', color: '#f97316', strength: 'Großzügigkeit, Kreativität, Führung', shadow: 'Ego, Dramatik', gift: 'Die Welt zum Strahlen bringen' },
  'Jungfrau': { icon: '♍', element: 'Erde', ruler: 'Merkur', color: '#34d399', strength: 'Analyse, Dienst, Präzision', shadow: 'Kritik, Perfektionismus', gift: 'Das Göttliche im Detail erkennen' },
  'Waage': { icon: '♎', element: 'Luft', ruler: 'Venus', color: '#f472b6', strength: 'Diplomatie, Schönheitssinn, Ausgeglichenheit', shadow: 'Unentschlossenheit, Konfliktvermeidung', gift: 'Harmonie dort schaffen wo Chaos war' },
  'Skorpion': { icon: '♏', element: 'Wasser', ruler: 'Pluto', color: '#c026d3', strength: 'Tiefe, Transformation, Intensität', shadow: 'Misstrauen, Kontrolle', gift: 'In die Tiefe tauchen und als Verwandelter auftauchen' },
  'Schütze': { icon: '♐', element: 'Feuer', ruler: 'Jupiter', color: '#d4af37', strength: 'Optimismus, Weisheit, Freiheit', shadow: 'Übertreibung, Unverbindlichkeit', gift: 'Andere mit Begeisterung in die Weite führen' },
  'Steinbock': { icon: '♑', element: 'Erde', ruler: 'Saturn', color: '#818cf8', strength: 'Disziplin, Ehrgeiz, Ausdauer', shadow: 'Kälte, Rigidität', gift: 'Langfristige Strukturen für Generationen bauen' },
  'Wassermann': { icon: '♒', element: 'Luft', ruler: 'Uranus', color: '#38bdf8', strength: 'Innovation, Humanismus, Unabhängigkeit', shadow: 'Distanz, Rebellion ohne Ziel', gift: 'Die Zukunft antizipieren bevor sie entsteht' },
  'Fische': { icon: '♓', element: 'Wasser', ruler: 'Neptun', color: '#a78bfa', strength: 'Mitgefühl, Intuition, Spiritualität', shadow: 'Flucht, Selbstauflösung', gift: 'Das Unsichtbare sichtbar machen' },
};

interface ZodiacGuideProps { birthDate: string; }

export function ZodiacGuide({ birthDate }: ZodiacGuideProps) {
  const sign = getSunSign(birthDate);
  const data = SIGNS[sign] ?? SIGNS['Fische']!;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Dein Sonnenzeichen</div>
        <div style={{ fontSize: 30, marginBottom: 4 }}>{data.icon}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: data.color }}>{sign}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6 }}>
          <span style={{ fontSize: 8, color: data.color, padding: '1px 7px', borderRadius: 8, background: `${data.color}15` }}>{data.element}</span>
          <span style={{ fontSize: 8, color: data.color, padding: '1px 7px', borderRadius: 8, background: `${data.color}15` }}>♟ {data.ruler}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Stärken</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.strength}</p>
        </div>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◈ Schatten</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.shadow}</p>
        </div>
        <div style={{ padding: '9px 12px', borderRadius: 9, background: `${data.color}08`, border: `1px solid ${data.color}22` }}>
          <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>★ Dein Geschenk</div>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: data.color, lineHeight: 1.5, fontStyle: 'italic' }}>„{data.gift}"</p>
        </div>
      </div>
    </div>
  );
}
