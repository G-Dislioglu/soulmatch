// Visual explainer for the 6 Soulmatch connection archetypes.

interface ConnectionDef {
  key: string;
  title: string;
  subtitle: string;
  glyph: string;
  color: string;
  accent2: string;
  description: string;
  strengths: string[];
  challenges: string[];
  guidance: string;
}

const CONNECTIONS: Record<string, ConnectionDef> = {
  spiegel: {
    key: 'spiegel',
    title: 'Spiegel-Verbindung',
    subtitle: 'Die Resonanzseele',
    glyph: '◈',
    color: '#a855f7',
    accent2: '#c084fc',
    description: 'Ihr teilt dieselbe Lebensweg-Energie. Diese Verbindung ist ein tiefer Spiegel — ihr seht in der anderen Person das Potential und die Schatten eurer eigenen Seele.',
    strengths: ['Tiefes gegenseitiges Verstehen', 'Gemeinsame Lebensmission', 'Intuitive Kommunikation'],
    challenges: ['Gleiche blinde Flecken', 'Konkurrenz statt Synergie', 'Identitätsverschmelzung'],
    guidance: 'Bewahrt eure Individualität. Nutzt den Spiegel, um zu wachsen — nicht, um euch zu verlieren.',
  },
  katalysator: {
    key: 'katalysator',
    title: 'Katalysator-Verbindung',
    subtitle: 'Die Wachstumsseele',
    glyph: '⚡',
    color: '#f59e0b',
    accent2: '#fbbf24',
    description: 'Karmische Dynamik prägt diese Verbindung. Ihr seid füreinander wie Funken — intensiv, transformierend, manchmal reibungsvoll. Diese Seele spiegelt euch, was ihr noch nicht integriert habt.',
    strengths: ['Tiefe Transformation', 'Gegenseitige Heilung', 'Schnelles Wachstum'],
    challenges: ['Intensive Reibung', 'Alte Wunden werden aktiviert', 'Machtkämpfe möglich'],
    guidance: 'Diese Verbindung ist ein Geschenk — auch wenn sie sich nicht immer so anfühlt. Waltet mit Bewusstheit und Mitgefühl.',
  },
  heiler: {
    key: 'heiler',
    title: 'Heiler-Verbindung',
    subtitle: 'Die nährende Seele',
    glyph: '♡',
    color: '#10b981',
    accent2: '#34d399',
    description: 'Eine der sanftesten und nährendsten Verbindungsformen. Hier entsteht ein Raum der Sicherheit, in dem beide Seelen heilen und wachsen können — bedingungslos und tief verständnisvoll.',
    strengths: ['Bedingungslose Unterstützung', 'Emotionale Tiefe', 'Gemeinsame Heilung'],
    challenges: ['Abhängigkeit kann entstehen', 'Grenzen setzen fällt schwer', 'Eigene Bedürfnisse übersehen'],
    guidance: 'Heilt gemeinsam — aber vergesst nicht, euch auch selbst zu heilen. Gesunde Grenzen stärken die Liebe.',
  },
  harmonisch: {
    key: 'harmonisch',
    title: 'Harmonische Verbindung',
    subtitle: 'Die Gleichklang-Seele',
    glyph: '≋',
    color: '#d4af37',
    accent2: '#fbbf24',
    description: 'Eure Seelenenergien ergänzen sich auf natürliche und schöne Weise. Hier fließt das Leben leichter — Harmonie, Freude und gemeinsames Wachstum sind die Grundmelodie.',
    strengths: ['Natürliche Kompatibilität', 'Leichtigkeit und Freude', 'Gemeinsame Werte'],
    challenges: ['Weniger Wachstumsdruck', 'Komfortzone kann begrenzen', 'Tiefere Konflikte werden vermieden'],
    guidance: 'Genießt die Harmonie — und ladet einander ein, auch in die tieferen Schichten zu tauchen.',
  },
  expansiv: {
    key: 'expansiv',
    title: 'Expansive Verbindung',
    subtitle: 'Die Horizontseele',
    glyph: '↗',
    color: '#38bdf8',
    accent2: '#7dd3fc',
    description: 'Diese Verbindung weitet euren Horizont. Ihr inspiriert einander, über Grenzen hinauszugehen — in Gedanken, Gefühlen und Erfahrungen. Eine Seele der Abenteuer und des gemeinsamen Entdeckens.',
    strengths: ['Gegenseitige Inspiration', 'Offenheit und Neugier', 'Gemeinsames Wachstum'],
    challenges: ['Unstabilität möglich', 'Zu viel Veränderung', 'Wurzeln fehlen manchmal'],
    guidance: 'Erschafft gemeinsam einen Anker — ein Zuhause in der Bewegung, das euch beide trägt.',
  },
  komplementaer: {
    key: 'komplementaer',
    title: 'Komplementäre Verbindung',
    subtitle: 'Die Ergänzungsseele',
    glyph: '⊕',
    color: '#f472b6',
    accent2: '#fb7185',
    description: 'Yin und Yang — ihr seid wie zwei Hälften eines Ganzen. Was die eine Seele besitzt, fehlt der anderen, und genau das macht diese Verbindung so kraftvoll und vollständig.',
    strengths: ['Perfekte Ergänzung', 'Stärken des anderen nutzen', 'Gegenseitiges Lernen'],
    challenges: ['Unterschiede können reiben', 'Balance halten', 'Abhängigkeit von Stärken des anderen'],
    guidance: 'Feiert eure Unterschiede — sie sind keine Schwäche, sondern euer größtes gemeinsames Geschenk.',
  },
};

const FALLBACK: ConnectionDef = {
  key: 'harmonisch',
  title: 'Seelen-Verbindung',
  subtitle: 'Eine besondere Begegnung',
  glyph: '✦',
  color: '#d4af37',
  accent2: '#fbbf24',
  description: 'Jede Seelenbegegnung trägt eine einzigartige Energie in sich. Diese Verbindung hält Geschenke bereit, die sich erst im Erleben enthüllen.',
  strengths: ['Einzigartigkeit', 'Wachstumspotenzial', 'Tiefe Begegnung'],
  challenges: ['Unbekanntes navigieren', 'Offen bleiben'],
  guidance: 'Begegnet euch mit Offenheit und Neugier — die Seele weiß den Weg.',
};

interface ConnectionTypeCardProps {
  connectionType: string;
  nameA: string;
  nameB: string;
}

export function ConnectionTypeCard({ connectionType, nameA, nameB }: ConnectionTypeCardProps) {
  const def = CONNECTIONS[connectionType] ?? FALLBACK;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: `${def.color}15`, border: `1.5px solid ${def.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
          boxShadow: `0 0 18px ${def.color}25`,
        }}>
          {def.glyph}
        </div>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: def.color, lineHeight: 1.2 }}>{def.title}</div>
          <div style={{ fontSize: 10, color: '#7a7468', marginTop: 2 }}>{nameA} & {nameB} · {def.subtitle}</div>
        </div>
      </div>

      {/* Description */}
      <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.7, color: '#c8c0b0', fontFamily: "'Cormorant Garamond', serif" }}>
        {def.description}
      </p>

      {/* Strengths + Challenges */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: `${def.color}08`, border: `1px solid ${def.color}20` }}>
          <div style={{ fontSize: 9, color: def.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Stärken</div>
          {def.strengths.map((s, i) => (
            <div key={i} style={{ fontSize: 11, color: '#a09a8e', marginBottom: 3, display: 'flex', gap: 5 }}>
              <span style={{ color: def.color, flexShrink: 0 }}>+</span> {s}
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 9, color: '#7a7468', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Wachstum</div>
          {def.challenges.map((c, i) => (
            <div key={i} style={{ fontSize: 11, color: '#6a6458', marginBottom: 3, display: 'flex', gap: 5 }}>
              <span style={{ color: '#4a4540', flexShrink: 0 }}>△</span> {c}
            </div>
          ))}
        </div>
      </div>

      {/* Guidance */}
      <div style={{ padding: '10px 14px', borderRadius: 10, background: `${def.color}0a`, border: `1px solid ${def.color}25`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 14, color: def.color, flexShrink: 0 }}>✦</span>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: '#a09a8e', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>
          {def.guidance}
        </p>
      </div>
    </div>
  );
}
