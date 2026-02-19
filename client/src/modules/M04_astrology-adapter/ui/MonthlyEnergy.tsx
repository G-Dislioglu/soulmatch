const MONTHLY = [
  { theme: 'Neustart', planet: 'Mars', icon: '♈', color: '#ef4444', focus: 'Neue Projekte, Führung', avoid: 'Impulsive Konflikte', affirmation: 'Ich handle mutig.' },
  { theme: 'Beständigkeit', planet: 'Venus', icon: '♉', color: '#22c55e', focus: 'Aufbauen, Werte klären', avoid: 'Starrsinn', affirmation: 'Ich baue auf festem Grund.' },
  { theme: 'Kommunikation', planet: 'Merkur', icon: '♊', color: '#fbbf24', focus: 'Lernen, vernetzen', avoid: 'Oberflächlichkeit', affirmation: 'Meine Worte tragen Kraft.' },
  { theme: 'Fürsorge', planet: 'Mond', icon: '♋', color: '#7c3aed', focus: 'Familie, innere Welt nähren', avoid: 'Rückzug in Angst', affirmation: 'Ich bin Heimat für mich selbst.' },
  { theme: 'Herzöffnung', planet: 'Sonne', icon: '♌', color: '#f97316', focus: 'Kreativität, Liebe zeigen', avoid: 'Arroganz', affirmation: 'Mein Herz strahlt frei.' },
  { theme: 'Reinigung', planet: 'Merkur', icon: '♍', color: '#34d399', focus: 'Ordnung, Dienst, Gesundheit', avoid: 'Perfektionismus', affirmation: 'Ich diene mit Freude.' },
  { theme: 'Balance', planet: 'Venus', icon: '♎', color: '#f472b6', focus: 'Harmonie, Beziehungen', avoid: 'Unentschlossenheit', affirmation: 'Ich finde die Mitte.' },
  { theme: 'Tiefe', planet: 'Pluto', icon: '♏', color: '#c026d3', focus: 'Transformation, Tiefe', avoid: 'Manipulation', affirmation: 'Ich wandle mich mit Vertrauen.' },
  { theme: 'Expansion', planet: 'Jupiter', icon: '♐', color: '#d4af37', focus: 'Weitsicht, Reisen, Lernen', avoid: 'Übertreibung', affirmation: 'Mein Horizont weitet sich.' },
  { theme: 'Struktur', planet: 'Saturn', icon: '♑', color: '#818cf8', focus: 'Disziplin, Karriere', avoid: 'Rigidität', affirmation: 'Ich baue mit Geduld.' },
  { theme: 'Innovation', planet: 'Uranus', icon: '♒', color: '#38bdf8', focus: 'Erneuerung, Gemeinschaft', avoid: 'Rebellion ohne Ziel', affirmation: 'Ich begrüße das Neue.' },
  { theme: 'Spiritualität', planet: 'Neptun', icon: '♓', color: '#a78bfa', focus: 'Träume, Intuition, Auflösung', avoid: 'Selbsttäuschung', affirmation: 'Ich vertraue dem Fluss.' },
];

export function MonthlyEnergy() {
  const month = new Date().getMonth();
  const data = MONTHLY[month]!;
  const monthName = new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Monats-Energie · {monthName}</div>
        <div style={{ fontSize: 28, marginBottom: 4 }}>{data.icon}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: data.color }}>{data.theme}</div>
        <div style={{ fontSize: 9, color: '#5a5448', marginTop: 2 }}>Regiert von {data.planet}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Fokus</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{data.focus}</p>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✗ Meiden</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{data.avoid}</p>
        </div>
      </div>

      <div style={{ padding: '9px 13px', borderRadius: 9, background: `${data.color}08`, border: `1px solid ${data.color}22`, textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: data.color, fontStyle: 'italic' }}>„{data.affirmation}"</p>
      </div>
    </div>
  );
}
