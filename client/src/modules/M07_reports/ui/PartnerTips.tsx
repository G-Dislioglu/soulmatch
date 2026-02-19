import { calcLifePath } from '../../M05_numerology/lib/calc';

const LP_TIPS: Record<number, string[]> = {
  1: ['Gib ihr/ihm Raum für eigene Entscheidungen', 'Anerkenne Leistungen aktiv und ausdrücklich', 'Vermeide direkte Befehle — frage stattdessen', 'Feiere gemeinsame Siege'],
  2: ['Höre aktiv zu ohne zu unterbrechen', 'Zeige Gefühle offen — Stille wird als Kälte wahrgenommen', 'Schaffe Rituale der Verbindung', 'Gib Entscheidungen Zeit — kein Druck'],
  3: ['Zeige Begeisterung für ihre/seine Ideen', 'Lache zusammen — Humor ist Liebe', 'Überrasche mit kreativen Gesten', 'Hör zu auch wenn die Geschichte lang wird'],
  4: ['Halte Versprechen penibel ein', 'Planbare gemeinsame Zeit ist wichtiger als Spontaneität', 'Schätze die kleinen Verlässlichkeiten', 'Veränderungen langsam und schrittweise einführen'],
  5: ['Überrasche mit Abenteuern und Unbekanntem', 'Gib Freiheit ohne Eifersucht', 'Variiere euren Alltag bewusst', 'Respektiere das Bedürfnis nach eigenem Raum'],
  6: ['Zeige Wertschätzung für all die Fürsorge', 'Übernimm Verantwortung — sie/er gibt viel', 'Schätze Harmonie im Zuhause', 'Teile Haushalt und Pflichten aktiv'],
  7: ['Gib Zeit zur Stille und Reflexion', 'Führe tiefgründige Gespräche — kein Small Talk', 'Respektiere Grenzen ohne Erklärung', 'Teile intellektuelle Neugierde'],
  8: ['Zeige Ehrgeiz und Zielstrebigkeit', 'Respektiere berufliche Ambitionen', 'Sei effizient in Absprachen', 'Feiere materielle und berufliche Erfolge'],
  9: ['Zeige Mitgefühl für die Welt', 'Unterstütze ihre/seine gemeinnützigen Impulse', 'Habe Geduld mit Idealismus', 'Praktische Erdung schenken ohne Träume zu zerreißen'],
  11: ['Höre auf die Intuition — sie spürt viel', 'Gib spirituellen Austausch Raum', 'Verurteile Sensitivität nicht', 'Schaffe ruhige Räume für Regeneration'],
  22: ['Unterstütze große Visionen aktiv', 'Nimm Ambitionen ernst — sie sind real', 'Sei Stabilitätsanker in turbulenten Phasen', 'Celebrate intermediate milestones'],
  33: ['Nimm die Fürsorge an ohne Schuld', 'Sorge auch für sie/ihn — Gegenseitigkeit', 'Erkenne spirituelle Tiefe als Stärke', 'Grenzen sanft aber klar schützen'],
};

const DEFAULT_TIPS = ['Zeige tägliche Wertschätzung', 'Höre aktiv zu', 'Schaffe gemeinsame Rituale', 'Kommuniziere ehrlich und offen'];

const ICONS = ['✦', '☽', '◈', '✶'];

interface PartnerTipsProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function PartnerTips({ nameA, birthDateA, nameB, birthDateB }: PartnerTipsProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const tipsA = LP_TIPS[lpA] ?? DEFAULT_TIPS;
  const tipsB = LP_TIPS[lpB] ?? DEFAULT_TIPS;

  const GOLD = '#d4af37';
  const PURPLE = '#c084fc';

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[{ name: firstA, lp: lpA, tips: tipsA, color: GOLD }, { name: firstB, lp: lpB, tips: tipsB, color: PURPLE }].map(({ name, lp, tips, color }) => (
          <div key={name}>
            <div style={{ fontSize: 9, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Tipps für den Umgang mit {name} (LP {lp})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tips.slice(0, 4).map((tip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 9px', borderRadius: 7, background: `${color}07`, border: `1px solid ${color}18` }}>
                  <span style={{ color, fontSize: 9, flexShrink: 0, marginTop: 1 }}>{ICONS[i] ?? '·'}</span>
                  <span style={{ fontSize: 10, color: '#5a5448', lineHeight: 1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
