import { calcLifePath } from '../../M05_numerology/lib/calc';

interface CommStyle { style: string; speaks: string; needs: string; avoid: string; color: string; }

const COMM_STYLES: Record<number, CommStyle> = {
  1: { style: 'Direkt & Führend', speaks: 'Klar, bestimmt, zielorientiert', needs: 'Respekt und Anerkennung für Ideen', avoid: 'Bevormundung oder Kritik ohne Lob', color: '#ef4444' },
  2: { style: 'Einfühlsam & Harmonisch', speaks: 'Sanft, diplomatisch, nachdenklich', needs: 'Geduld und emotionaler Raum', avoid: 'Direkte Konfrontation und Druck', color: '#38bdf8' },
  3: { style: 'Expressiv & Spielerisch', speaks: 'Lebendig, humorvoll, bildhaft', needs: 'Aufmerksamkeit und Begeisterung', avoid: 'Ignoranz oder Kritik ohne Kreativität', color: '#fbbf24' },
  4: { style: 'Präzise & Verlässlich', speaks: 'Sachlich, strukturiert, geplant', needs: 'Klare Vereinbarungen und Pünktlichkeit', avoid: 'Unverbindlichkeit und Chaos', color: '#a16207' },
  5: { style: 'Dynamisch & Spontan', speaks: 'Enthusiastisch, variierend, kreativ', needs: 'Freiheit und Abwechslung', avoid: 'Einschränkungen und Wiederholungen', color: '#22d3ee' },
  6: { style: 'Fürsorglich & Wärmend', speaks: 'Liebevoll, verantwortungsbewusst, schützend', needs: 'Wertschätzung und Gegenseitigkeit', avoid: 'Undankbarkeit und Kälte', color: '#22c55e' },
  7: { style: 'Tiefgründig & Analytisch', speaks: 'Durchdacht, präzise, weise', needs: 'Verständnis und intellektuelle Tiefe', avoid: 'Oberflächlichkeit und Lärm', color: '#7c3aed' },
  8: { style: 'Autoritär & Ergebnisorientiert', speaks: 'Direkt, effizient, zielorientiert', needs: 'Effizienz und Respekt für Zeit', avoid: 'Zeitverschwendung und Unentschlossenheit', color: '#d4af37' },
  9: { style: 'Universell & Mitfühlend', speaks: 'Weise, großzügig, inspirierend', needs: 'Verbindung zu einem größeren Sinn', avoid: 'Egoismus und Kleinlichkeit', color: '#c026d3' },
  11: { style: 'Intuitiv & Inspirierend', speaks: 'Visionär, sensitiv, metaphorisch', needs: 'Tiefe spirituelle Verbindung', avoid: 'Rationalismus ohne Gefühl', color: '#c084fc' },
  22: { style: 'Visionär & Strukturiert', speaks: 'Umfassend, zukunftsorientiert, klar', needs: 'Große Ziele und praktische Schritte', avoid: 'Kleindenkerei und Trägheit', color: '#1d4ed8' },
  33: { style: 'Heilend & Bedingungslos', speaks: 'Liebevoll, nährend, aufopfernd', needs: 'Dankbarkeit und gegenseitige Fürsorge', avoid: 'Egoismus und Grausamkeit', color: '#fda4af' },
};

const DEFAULT_STYLE: CommStyle = { style: 'Authentisch & Einzigartig', speaks: 'Auf eigene Weise', needs: 'Verständnis und Akzeptanz', avoid: 'Unehrlichkeit', color: '#a09a8e' };

interface CommunicationGuideProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function CommunicationGuide({ nameA, birthDateA, nameB, birthDateB }: CommunicationGuideProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const csA = COMM_STYLES[lpA] ?? DEFAULT_STYLE;
  const csB = COMM_STYLES[lpB] ?? DEFAULT_STYLE;
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  // Synergy tip based on combo
  const bothDirect = [1, 8].includes(lpA) && [1, 8].includes(lpB);
  const bothSensitive = [2, 6, 9].includes(lpA) && [2, 6, 9].includes(lpB);
  const deepThinkers = [7, 11].includes(lpA) || [7, 11].includes(lpB);

  let synergyTip = 'Respektiert gegenseitig eure unterschiedlichen Ausdrucksweisen — Unterschiede bereichern die Verbindung.';
  if (bothDirect) synergyTip = 'Beide kommuniziert direkt — was Stärke ist, kann auch zu Machtkämpfen führen. Hört aktiv zu, bevor ihr antwortet.';
  if (bothSensitive) synergyTip = 'Beide seid sensibel — schafft sichere Räume für ehrliche Gespräche ohne Angst vor Verletzung.';
  if (deepThinkers) synergyTip = 'Tiefe Gespräche sind euer gemeinsames Fundament. Gebt einander Zeit zum Nachdenken und Reflektieren.';

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[{ name: firstA, lp: lpA, cs: csA }, { name: firstB, lp: lpB, cs: csB }].map(({ name, lp, cs }) => (
          <div key={name} style={{ flex: 1, padding: '10px', borderRadius: 10, background: `${cs.color}08`, border: `1px solid ${cs.color}20` }}>
            <div style={{ fontSize: 9, color: '#7a7468', marginBottom: 2 }}>{name} · LP {lp}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: cs.color, marginBottom: 6 }}>{cs.style}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>
                <div style={{ fontSize: 7, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Spricht</div>
                <div style={{ fontSize: 9, color: '#4a4540' }}>{cs.speaks}</div>
              </div>
              <div>
                <div style={{ fontSize: 7, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Braucht</div>
                <div style={{ fontSize: 9, color: '#4a4540' }}>{cs.needs}</div>
              </div>
              <div>
                <div style={{ fontSize: 7, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Vermeide</div>
                <div style={{ fontSize: 9, color: '#4a4540' }}>{cs.avoid}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Synergy tip */}
      <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div style={{ fontSize: 8, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>✦ Kommunikations-Synergie</div>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#7a7468', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>{synergyTip}</p>
      </div>
    </div>
  );
}
