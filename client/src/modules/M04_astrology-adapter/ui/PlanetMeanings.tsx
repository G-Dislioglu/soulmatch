const PLANETS = [
  { name: 'Sonne', icon: '☀', color: '#f97316', rules: 'Löwe', area: 'Identität & Lebenskraft', light: 'Selbstausdruck, Vitalität, Wille, Bewusstsein', shadow: 'Ego, Arroganz, Selbstbezogenheit', question: 'Wo will ich wirklich strahlen?' },
  { name: 'Mond', icon: '☽', color: '#93c5fd', rules: 'Krebs', area: 'Gefühle & Unterbewusstsein', light: 'Intuition, Fürsorge, Empfindsamkeit, Gedächtnis', shadow: 'Stimmungsschwankungen, Überempfindlichkeit', question: 'Was brauche ich um mich sicher zu fühlen?' },
  { name: 'Merkur', icon: '☿', color: '#fbbf24', rules: 'Zwillinge / Jungfrau', area: 'Denken & Kommunikation', light: 'Intellekt, Sprache, Analyse, Lernfähigkeit', shadow: 'Nervosität, Überdenken, Geschwätzigkeit', question: 'Wie denke ich und wie teile ich das mit?' },
  { name: 'Venus', icon: '♀', color: '#f472b6', rules: 'Stier / Waage', area: 'Liebe & Werte', light: 'Schönheitssinn, Harmonie, Anziehungskraft, Genuss', shadow: 'Oberflächlichkeit, Besitzdenken, Faulheit', question: 'Was liebe ich wirklich und was bin ich wert?' },
  { name: 'Mars', icon: '♂', color: '#ef4444', rules: 'Widder', area: 'Antrieb & Begehren', light: 'Mut, Energie, Initiative, Leidenschaft', shadow: 'Aggression, Impulsivität, Ungeduld', question: 'Wofür kämpfe ich und was begehre ich?' },
  { name: 'Jupiter', icon: '♃', color: '#a3e635', rules: 'Schütze', area: 'Wachstum & Weisheit', light: 'Optimismus, Expansion, Glück, Philosophie', shadow: 'Übertreibung, Selbstgefälligkeit, Verschwendung', question: 'Wo wachse ich und wohin strebe ich?' },
  { name: 'Saturn', icon: '♄', color: '#818cf8', rules: 'Steinbock', area: 'Struktur & Karma', light: 'Disziplin, Ausdauer, Verantwortung, Reife', shadow: 'Rigidität, Angst, Beschränkung', question: 'Was muss ich lernen und welche Grenzen dienen mir?' },
  { name: 'Uranus', icon: '⛢', color: '#38bdf8', rules: 'Wassermann', area: 'Wandel & Rebellion', light: 'Originalität, Freiheit, Innovation, Erwachen', shadow: 'Chaos, Unberechenbarkeit, Sturheit', question: 'Wo muss ich mich befreien und neu erfinden?' },
  { name: 'Neptun', icon: '♆', color: '#a78bfa', rules: 'Fische', area: 'Träume & Spiritualität', light: 'Intuition, Mitgefühl, Inspiration, Transzendenz', shadow: 'Täuschung, Flucht, Illusionen', question: 'Was ist meine tiefste spirituelle Vision?' },
  { name: 'Pluto', icon: '♇', color: '#c026d3', rules: 'Skorpion', area: 'Transformation & Macht', light: 'Tiefe, Wiedergeburt, Macht, Heilung', shadow: 'Kontrollzwang, Zerstörung, Obsession', question: 'Was muss sterben damit ich neu geboren werden kann?' },
];

export function PlanetMeanings() {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Die 10 Planeten</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {PLANETS.map(p => (
          <div key={p.name} style={{ padding: '8px 11px', borderRadius: 9, background: `${p.color}07`, border: `1px solid ${p.color}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 14 }}>{p.icon}</span>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: p.color }}>{p.name}</span>
                <span style={{ fontSize: 7, color: '#3a3530', marginLeft: 5 }}>♟ {p.rules} · {p.area}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 3 }}>
              <div>
                <div style={{ fontSize: 6, color: '#22c55e', fontWeight: 700, marginBottom: 1 }}>Licht</div>
                <div style={{ fontSize: 7, color: '#5a5448' }}>{p.light}</div>
              </div>
              <div>
                <div style={{ fontSize: 6, color: '#ef4444', fontWeight: 700, marginBottom: 1 }}>Schatten</div>
                <div style={{ fontSize: 7, color: '#5a5448' }}>{p.shadow}</div>
              </div>
            </div>
            <div style={{ fontSize: 7, color: p.color, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>„{p.question}"</div>
          </div>
        ))}
      </div>
    </div>
  );
}
