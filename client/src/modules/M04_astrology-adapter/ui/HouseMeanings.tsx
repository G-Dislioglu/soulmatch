const HOUSES = [
  { num: 1, name: 'Aszendent', area: 'Selbst & Erscheinung', color: '#ef4444', keywords: 'Persönlichkeit, erster Eindruck, der Körper', desc: 'Das Haus der Identität — wie wir uns zeigen und wahrgenommen werden.' },
  { num: 2, name: 'Werte', area: 'Besitz & Ressourcen', color: '#fbbf24', keywords: 'Geld, Selbstwert, materielle Sicherheit', desc: 'Was wir besitzen und was uns Sicherheit gibt — auch innere Ressourcen.' },
  { num: 3, name: 'Kommunikation', area: 'Denken & Umfeld', color: '#22d3ee', keywords: 'Geschwister, kurze Reisen, Lernen, Sprache', desc: 'Der Geist in Aktion — tägliche Kommunikation und direktes Umfeld.' },
  { num: 4, name: 'Ursprung', area: 'Heim & Familie', color: '#22c55e', keywords: 'Elternhaus, Wurzeln, innere Sicherheit', desc: 'Die Grundlage unserer Seele — das Zuhause und die familiären Prägungen.' },
  { num: 5, name: 'Ausdruck', area: 'Kreativität & Liebe', color: '#f97316', keywords: 'Kinder, Romantik, Spiel, Selbstausdruck', desc: 'Das Haus der Freude — wie wir spielen, lieben und uns kreativ entfalten.' },
  { num: 6, name: 'Dienst', area: 'Alltag & Gesundheit', color: '#34d399', keywords: 'Arbeit, Rituale, Körper, Dienst', desc: 'Der heilige Alltag — wie wir unsere Aufgaben erfüllen und den Körper pflegen.' },
  { num: 7, name: 'Partnerschaft', area: 'Beziehungen & Andere', color: '#f472b6', keywords: 'Ehe, offene Feinde, der Spiegel', desc: 'Das Haus des Anderen — alles was wir in Beziehungen spiegeln und suchen.' },
  { num: 8, name: 'Transformation', area: 'Tod & Wiedergeburt', color: '#c026d3', keywords: 'Erbe, Transformation, Sexualität, das Verborgene', desc: 'Das tiefste Haus — Wandel durch Verlust, Intimität und das Unsichtbare.' },
  { num: 9, name: 'Weisheit', area: 'Glaube & Weite', color: '#a3e635', keywords: 'Philosophie, weite Reisen, höhere Bildung', desc: 'Der Horizont der Seele — Glaube, Bedeutung und der Ruf des Fernen.' },
  { num: 10, name: 'Berufung', area: 'Karriere & Status', color: '#d4af37', keywords: 'Ruf, Karriere, gesellschaftliche Rolle', desc: 'Das Haus des Mittelhimmels — unsere Mission in der Welt und unser Erbe.' },
  { num: 11, name: 'Gemeinschaft', area: 'Freunde & Visionen', color: '#818cf8', keywords: 'Freunde, Gruppen, Träume, Zukunft', desc: 'Das Haus der Zugehörigkeit — Visionen, kollektive Ziele und Freundschaft.' },
  { num: 12, name: 'Transzendenz', area: 'Rückzug & Auflösung', color: '#7c3aed', keywords: 'Unbewusstes, Isolation, Spiritualität', desc: 'Das verborgene Haus — was sich hinter dem Schleier verbirgt und uns befreit.' },
];

export function HouseMeanings() {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Die 12 Häuser des Horoskops</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {HOUSES.map(h => (
          <div key={h.num} style={{ padding: '7px 9px', borderRadius: 9, background: `${h.color}07`, border: `1px solid ${h.color}20` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: h.color }}>{h.num}.</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: h.color }}>{h.name}</span>
            </div>
            <div style={{ fontSize: 7, color: '#3a3530', marginBottom: 2 }}>{h.area}</div>
            <p style={{ margin: 0, fontSize: 7, color: '#5a5448', lineHeight: 1.3 }}>{h.keywords}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 9, color: '#5a5448', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>
          Jedes Haus zeigt einen Lebensbereich — die Planeten darin enthüllen die Energie.
        </p>
      </div>
    </div>
  );
}
