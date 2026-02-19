const ASPECTS = [
  { name: 'Konjunktion', deg: '0°', icon: '☌', color: '#fbbf24', type: 'neutral', meaning: 'Verschmelzung zweier Energien — intensiv, fokussiert, kraftvoll', shadow: 'Kann Energie überladen oder blind machen', gift: 'Volle Kraft in eine Richtung' },
  { name: 'Opposition', deg: '180°', icon: '☍', color: '#ef4444', type: 'tension', meaning: 'Spannung zwischen zwei Polen — Bewusstwerdung durch Gegensatz', shadow: 'Innere Zerrissenheit, Projektionen auf andere', gift: 'Integration scheinbarer Gegensätze' },
  { name: 'Trigon', deg: '120°', icon: '△', color: '#22c55e', type: 'harmony', meaning: 'Harmonischer Fluss — Talente die sich leicht entfalten', shadow: 'Faulheit durch zu leichten Fluss', gift: 'Natürliche Begabung und Unterstützung' },
  { name: 'Quadrat', deg: '90°', icon: '□', color: '#f97316', type: 'tension', meaning: 'Reibung als Wachstumsmotor — Herausforderung die stärkt', shadow: 'Frustrationen, Konflikte, blockierte Energie', gift: 'Stärke die durch Überwindung entsteht' },
  { name: 'Sextil', deg: '60°', icon: '⚹', color: '#38bdf8', type: 'harmony', meaning: 'Harmonische Chance — Möglichkeit die genutzt werden will', shadow: 'Chance wird nicht wahrgenommen ohne Aktion', gift: 'Leichte Synergien die aktiviert werden können' },
];

export function AspectMeaning() {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Aspekte-Bedeutungen</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ASPECTS.map(a => (
          <div key={a.name} style={{ padding: '9px 12px', borderRadius: 10, background: `${a.color}07`, border: `1px solid ${a.color}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 16, minWidth: 20, textAlign: 'center' }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: a.color }}>{a.name}</span>
                  <span style={{ fontSize: 8, color: a.color, padding: '1px 5px', borderRadius: 4, background: `${a.color}15` }}>{a.deg}</span>
                </div>
              </div>
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 10, color: '#7a7468', lineHeight: 1.4, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>{a.meaning}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1, fontSize: 8, color: '#ef4444' }}>◈ {a.shadow}</div>
              <div style={{ flex: 1, fontSize: 8, color: '#22c55e' }}>✦ {a.gift}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
