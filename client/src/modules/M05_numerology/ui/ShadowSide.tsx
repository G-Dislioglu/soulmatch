import { calcLifePath } from '../lib/calc';

interface ShadowDef {
  shadow: string[];
  trigger: string;
  integration: string;
}

const SHADOWS: Record<number, ShadowDef> = {
  1: {
    shadow: ['Übermäßige Sturheit und Dickköpfigkeit', 'Angst vor Abhängigkeit oder Schwäche', 'Tendenz, andere zu dominieren oder zu unterdrücken'],
    trigger: 'Wenn jemand deine Autorität in Frage stellt oder deine Ideen ablehnt',
    integration: 'Wahre Stärke zeigt sich in der Fähigkeit, um Hilfe zu bitten und Schwäche zuzulassen.',
  },
  2: {
    shadow: ['Überanpassung und Verlust des eigenen Willens', 'Manipulation durch Passivität', 'Chronische Unentschlossenheit aus Angst vor Konflikten'],
    trigger: 'Wenn Harmonie bedroht ist oder du das Gefühl hast, nicht gebraucht zu werden',
    integration: 'Deine Bedürfnisse sind genauso wichtig wie die anderer. Ehrlichkeit ist die tiefste Form der Fürsorge.',
  },
  3: {
    shadow: ['Oberflächlichkeit als Schutz vor echter Tiefe', 'Übertreibung und Dramatisierung', 'Zerstreutheit, die Projekte unbeendet lässt'],
    trigger: 'Wenn du dich gelangweilt oder nicht gesehen fühlst',
    integration: 'Die Tiefe deiner Erfahrungen ist genauso wertvoll wie ihre Breite. Beende, was du begonnen hast.',
  },
  4: {
    shadow: ['Rigidität und Widerstand gegen Veränderung', 'Workaholic-Muster und emotionale Verdrängung', 'Kleinlichkeit und übertriebene Kontrolle'],
    trigger: 'Wenn Unvorhersehbarkeit oder Unordnung dein System bedrohen',
    integration: 'Kontrolle ist Illusion. Das Leben gedeiht am besten in bewusster Flexibilität.',
  },
  5: {
    shadow: ['Flucht vor Verantwortung und Verbindlichkeit', 'Suchtmuster als Ausweichen vor dem Stillstand', 'Chronische Ruhelosigkeit und Reizsuche'],
    trigger: 'Wenn du dich eingeschränkt, gelangweilt oder festgehalten fühlst',
    integration: 'Wahre Freiheit entsteht nicht aus Flucht, sondern aus bewusster Wahl — auch innerhalb von Grenzen.',
  },
  6: {
    shadow: ['Märtyrertum und selbstverleugnende Aufopferung', 'Kontrolle durch übertriebene Fürsorge', 'Perfektionismus, der andere erdrückt'],
    trigger: 'Wenn deine Fürsorge nicht anerkannt wird oder jemand deine Hilfe ablehnt',
    integration: 'Du kannst nur wirklich geben, wenn du dich selbst nicht leer machst. Selbstliebe ist kein Egoismus.',
  },
  7: {
    shadow: ['Isolation und emotionale Kälte als Selbstschutz', 'Zynismus und intellektueller Hochmut', 'Paralysis by analysis — endloses Grübeln ohne Handeln'],
    trigger: 'Wenn du dich missverstanden fühlst oder emotionale Nähe gefordert wird',
    integration: 'Das Herz hat seine eigene Logik. Lass es manchmal sprechen, ohne es vorher zu analysieren.',
  },
  8: {
    shadow: ['Gier und Besessenheit von Status und Macht', 'Rücksichtslosigkeit im Streben nach Erfolg', 'Unfähigkeit, Erfolg zu genießen — immer auf dem nächsten Ziel'],
    trigger: 'Wenn du Kontrolle verlierst oder dein Status bedroht wird',
    integration: 'Wahrer Reichtum entsteht aus Großzügigkeit, nicht aus Anhäufung. Teilen multipliziert Fülle.',
  },
  9: {
    shadow: ['Selbstaufopferung bis zur eigenen Auflösung', 'Bitterkeit, wenn Geben nicht zurückkommt', 'Festhalten an dem, was eigentlich losgelassen werden sollte'],
    trigger: 'Wenn du das Gefühl hast, ausgenutzt zu werden, oder ein Abschluss sich unmöglich anfühlt',
    integration: 'Loslassen ist keine Niederlage — es ist die höchste Form der Weisheit und der Liebe.',
  },
  11: {
    shadow: ['Überwältigung durch Sensitivität und Energieverlust', 'Selbstzweifel und das Gefühl, zu viel zu sein', 'Messias-Komplex oder spiritueller Bypassing'],
    trigger: 'Wenn du dich für andere verantwortlich fühlst oder deine Vision nicht anerkannt wird',
    integration: 'Du musst die Welt nicht retten. Dein Licht zu sein reicht vollkommen aus.',
  },
  22: {
    shadow: ['Lähmung durch die Größe der eigenen Vision', 'Überforderung und Burnout aus übermenschlichen Ansprüchen', 'Rücksichtslosigkeit im Dienst der großen Sache'],
    trigger: 'Wenn die Lücke zwischen Vision und Realität überwältigend erscheint',
    integration: 'Große Dinge entstehen Schritt für Schritt. Teile die Vision in menschliche Portionen.',
  },
  33: {
    shadow: ['Grenzlosigkeit und emotionale Erschöpfung', 'Codependenz und aufgelöste Ich-Grenzen', 'Selbstbestrafung wenn die Liebe nicht "perfekt" ist'],
    trigger: 'Wenn deine Liebe nicht zurückkommt oder wenn du Grenzen setzen musst',
    integration: 'Bedingungslose Liebe beginnt bei dir. Du kannst nicht aus einem leeren Herzen geben.',
  },
};

const DEFAULT_SHADOW: ShadowDef = {
  shadow: ['Unbewusste Muster, die aus Angst entstehen', 'Reaktivität in Stressphasen', 'Vermeidung von dem, was am meisten gebraucht wird'],
  trigger: 'Wenn du dich unwohl oder bedroht fühlst',
  integration: 'Jeder Schatten enthüllt ein Geschenk, wenn du bereit bist, hinzuschauen.',
};

interface ShadowSideProps { name: string; birthDate: string; }

export function ShadowSide({ name: _name, birthDate }: ShadowSideProps) {
  const lp = calcLifePath(birthDate).value;
  const def = SHADOWS[lp] ?? DEFAULT_SHADOW;

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        LP {lp} · Schattenprofil
      </div>

      {/* Shadow aspects */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          ◈ Schattenmuster
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {def.shadow.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', padding: '5px 9px', borderRadius: 7, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)' }}>
              <span style={{ fontSize: 9, color: '#7c3aed', flexShrink: 0, marginTop: 1 }}>{'◈'}</span>
              <span style={{ fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trigger */}
      <div style={{ marginBottom: 12, padding: '8px 11px', borderRadius: 9, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <div style={{ fontSize: 8, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Auslöser
        </div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.5 }}>{def.trigger}</p>
      </div>

      {/* Integration path */}
      <div style={{ padding: '8px 11px', borderRadius: 9, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div style={{ fontSize: 8, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          ✦ Integrationsweg
        </div>
        <p style={{ margin: 0, fontSize: 11, color: '#7a7468', lineHeight: 1.5, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>
          {def.integration}
        </p>
      </div>
    </div>
  );
}
