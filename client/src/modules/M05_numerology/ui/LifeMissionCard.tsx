import { calcLifePath, calcExpression } from '../lib/calc';

const MISSIONS: Record<number, { core: string; worldTask: string; innerTask: string; obstacles: string; sign: string; color: string }> = {
  1: { core: 'Unabhängigkeit & Führung', worldTask: 'Neue Wege für andere öffnen und als Pionier vorangehen', innerTask: 'Lernen, auf die eigene Stimme zu vertrauen ohne Bestätigung zu brauchen', obstacles: 'Angst vor Ablehnung, Abhängigkeit von Anerkennung', sign: 'Du bist bereit wenn du alleine entscheidest und dabei ruhig bist', color: '#ef4444' },
  2: { core: 'Zusammenarbeit & Frieden', worldTask: 'Als stille Kraft hinter den Kulissen Brücken bauen', innerTask: 'Eigene Bedürfnisse erkennen und aussprechen', obstacles: 'Selbstverleugnung, Angst vor Konflikten', sign: 'Du bist bereit wenn du Nein sagst und dich dabei gut fühlst', color: '#93c5fd' },
  3: { core: 'Kreativität & Freude', worldTask: 'Durch Kunst, Sprache und Ausdruck andere inspirieren', innerTask: 'Die eigene Tiefe zulassen statt alles leicht erscheinen zu lassen', obstacles: 'Selbstzweifel, Verstreuung der Energie', sign: 'Du bist bereit wenn du dich ausdrückst ohne Perfektion zu erwarten', color: '#fbbf24' },
  4: { core: 'Ordnung & Fundament', worldTask: 'Dauerhafte Strukturen für andere erschaffen', innerTask: 'Flexibilität und Vertrauen in das Unbekannte entwickeln', obstacles: 'Starrheit, übermäßige Kontrolle', sign: 'Du bist bereit wenn du ein Fundament baust und dann loslässt', color: '#a16207' },
  5: { core: 'Freiheit & Abenteuer', worldTask: 'Als lebendiger Beweis für die Kraft der Veränderung wirken', innerTask: 'Tiefe Verbindungen eingehen trotz Freiheitsdrang', obstacles: 'Unverbindlichkeit, Flucht vor Verantwortung', sign: 'Du bist bereit wenn Freiheit sich in dir anfühlt und nicht von außen kommt', color: '#22d3ee' },
  6: { core: 'Liebe & Heilung', worldTask: 'Familien, Gemeinschaften und Einzelne durch Fürsorge heilen', innerTask: 'Die eigenen Grenzen kennen und die Selbstliebe pflegen', obstacles: 'Aufopferung, Kontrollbedürfnis durch Helfen', sign: 'Du bist bereit wenn du dir selbst gibst was du anderen gibst', color: '#22c55e' },
  7: { core: 'Weisheit & Wahrheit', worldTask: 'Verborgenes Wissen für andere zugänglich machen', innerTask: 'Vertrauen in das Leben und in andere Menschen entwickeln', obstacles: 'Isolation, Überanalyse, Zynismus', sign: 'Du bist bereit wenn du Vertrauen als Intelligenz erkennst', color: '#7c3aed' },
  8: { core: 'Manifestation & Kraft', worldTask: 'Materielle und spirituelle Ressourcen im Dienst des Großen einsetzen', innerTask: 'Macht als Verantwortung und nicht als Besitz begreifen', obstacles: 'Gier, Kontrollsucht, Workaholic-Tendenzen', sign: 'Du bist bereit wenn Erfolg dich nicht mehr definiert', color: '#d4af37' },
  9: { core: 'Vollendung & universale Liebe', worldTask: 'Die Menschheit durch bedingungslose Liebe und Beispiel erheben', innerTask: 'Loslassen als Stärke und nicht als Versagen begreifen', obstacles: 'Überwältigung, Selbstaufopferung, Bitterkeit', sign: 'Du bist bereit wenn Vergeben sich wie Befreiung anfühlt', color: '#c026d3' },
  11: { core: 'Inspiration & spirituelle Führung', worldTask: 'Als Kanal für höhere Weisheit anderen Licht bringen', innerTask: 'Intensive Energie erden und kanalisieren ohne zu verbrennen', obstacles: 'Nervosität, zu hohe Erwartungen, innere Zerrissenheit', sign: 'Du bist bereit wenn Vision und Erdung gleichzeitig existieren', color: '#818cf8' },
  22: { core: 'Meisterschaft & großes Werk', worldTask: 'Utopische Visionen in dauerhafte Realität umwandeln', innerTask: 'Bescheidenheit üben und die eigene Größe annehmen', obstacles: 'Überwältigung durch die eigene Vision, Perfektionismus', sign: 'Du bist bereit wenn du klein anfängst und dabei das Ganze siehst', color: '#a78bfa' },
  33: { core: 'Meisterliebe & Heilung der Welt', worldTask: 'Durch bedingungslose Liebe und Opfer das Kollektiv heilen', innerTask: 'Persönliche Grenzen halten ohne das Herz zu schließen', obstacles: 'Martyrertum, emotionale Erschöpfung', sign: 'Du bist bereit wenn Liebe aus Fülle kommt und nicht aus Pflicht', color: '#f9a8d4' },
};

const DEFAULT_MISSION = { core: 'Einzigartiger Pfad', worldTask: 'Den eigenen unverwechselbaren Weg bewusst gehen', innerTask: 'Sich selbst als Lehrmeister erkennen', obstacles: 'Zweifel an der eigenen Berufung', sign: 'Du bist bereit wenn du aufhörst zu fragen "Warum ich?"', color: '#d4af37' };

interface LifeMissionCardProps { name: string; birthDate: string; }

export function LifeMissionCard({ name, birthDate }: LifeMissionCardProps) {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const mission = MISSIONS[lp] ?? DEFAULT_MISSION;
  const exMission = MISSIONS[ex] ?? DEFAULT_MISSION;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>LP {lp} · Lebensaufgabe</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: mission.color }}>{mission.core}</div>
      </div>

      <div style={{ padding: '9px 12px', borderRadius: 9, background: `${mission.color}08`, border: `1px solid ${mission.color}22`, marginBottom: 9 }}>
        <div style={{ fontSize: 7, color: mission.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◉ Weltaufgabe</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: '#c8b870', lineHeight: 1.6, fontStyle: 'italic' }}>{mission.worldTask}</p>
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 9 }}>
        <div style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◈ Innere Aufgabe</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{mission.innerTask}</p>
      </div>

      <div style={{ padding: '7px 11px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', marginBottom: 9 }}>
        <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✗ Haupthindernisse</div>
        <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{mission.obstacles}</p>
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: `${mission.color}07`, border: `1px solid ${mission.color}18`, marginBottom: 9 }}>
        <div style={{ fontSize: 7, color: mission.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>★ Zeichen der Bereitschaft</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: mission.color, lineHeight: 1.5, fontStyle: 'italic' }}>„{mission.sign}"</p>
      </div>

      {ex !== lp && (
        <div style={{ padding: '7px 11px', borderRadius: 8, background: `${exMission.color}06`, border: `1px solid ${exMission.color}18` }}>
          <div style={{ fontSize: 7, color: exMission.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>EX {ex} · Ausdrucksaufgabe</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{exMission.worldTask}</p>
        </div>
      )}
    </div>
  );
}
