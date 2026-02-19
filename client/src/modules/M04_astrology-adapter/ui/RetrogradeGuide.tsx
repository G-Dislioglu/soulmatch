const RETRO_GUIDES = [
  { planet: 'Merkur', icon: '☿', color: '#fbbf24', freq: '3-4× / Jahr, je ~3 Wochen', do: ['Überarbeiten, revidieren, reflektieren', 'Alte Kontakte wieder aufnehmen', 'Verträge prüfen, nicht neu unterzeichnen'], avoid: ['Wichtige Verträge unterzeichnen', 'Neue Kommunikationsprojekte starten', 'Technik-Neukauf ohne Prüfung'], meaning: 'Zeit der Überprüfung von Kommunikation, Denken und kurzfristigen Plänen.' },
  { planet: 'Venus', icon: '♀', color: '#f472b6', freq: '1× alle 1.5 Jahre, ~6 Wochen', do: ['Beziehungen evaluieren', 'Vergangene Beziehungen reflektieren', 'Eigene Werte klären'], avoid: ['Neue Liebesbeziehungen beginnen', 'Große Schönheitsinvestitionen', 'Wichtige Beziehungsentscheidungen'], meaning: 'Zeit der Überprüfung von Werten, Beziehungen und dem, was wir lieben.' },
  { planet: 'Mars', icon: '♂', color: '#ef4444', freq: '1× alle 2 Jahre, ~2.5 Monate', do: ['Alte Projekte vollenden', 'Eigene Motivation hinterfragen', 'Überarbeiten statt neu beginnen'], avoid: ['Konfrontationen suchen', 'Neue große Projekte starten', 'Impulsive Handlungen'], meaning: 'Zeit der Überprüfung von Energie, Antrieb und wie wir kämpfen.' },
  { planet: 'Jupiter', icon: '♃', color: '#a3e635', freq: '1× / Jahr, ~4 Monate', do: ['Wachstumspläne überdenken', 'Innere Weisheit vertiefen', 'Alte Chancen re-evaluieren'], avoid: ['Übertriebene Expansion', 'Übermäßigen Optimismus ohne Basis', 'Glücksspiel'], meaning: 'Zeit der Überprüfung von Wachstum, Glaubenssätzen und Expansion.' },
  { planet: 'Saturn', icon: '♄', color: '#818cf8', freq: '1× / Jahr, ~4.5 Monate', do: ['Strukturen prüfen und verbessern', 'Lektionen integrieren', 'Verantwortung übernehmen'], avoid: ['Neue langfristige Verpflichtungen', 'Wichtige Karriereschritte', 'Autoritätskonflikte'], meaning: 'Zeit der Überprüfung von Strukturen, Karma und Lektionen.' },
];

export function RetrogradeGuide() {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rückläufer-Leitfaden</div>
        <div style={{ fontSize: 9, color: '#3a3530', marginTop: 2 }}>Was bedeutet jede Retrograde wirklich?</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {RETRO_GUIDES.map(g => (
          <div key={g.planet} style={{ padding: '9px 12px', borderRadius: 10, background: `${g.color}07`, border: `1px solid ${g.color}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>{g.icon}</span>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: g.color }}>{g.planet} Retrograde</span>
                <span style={{ fontSize: 7, color: '#3a3530', marginLeft: 6 }}>{g.freq}</span>
              </div>
            </div>
            <p style={{ margin: '0 0 5px', fontSize: 9, color: '#5a5448', lineHeight: 1.4, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>{g.meaning}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              <div>
                <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, marginBottom: 2 }}>✦ Nutze es für</div>
                {g.do.map(d => <div key={d} style={{ fontSize: 7, color: '#3a3530', paddingLeft: 4 }}>· {d}</div>)}
              </div>
              <div>
                <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, marginBottom: 2 }}>✗ Vermeide</div>
                {g.avoid.map(a => <div key={a} style={{ fontSize: 7, color: '#3a3530', paddingLeft: 4 }}>· {a}</div>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
