import { calcLifePath, reduceToNumber } from '../../M05_numerology/lib/calc';

const VISIONS: Record<number, { headline: string; year1: string; year3: string; year7: string; legacy: string; color: string }> = {
  1: { headline: 'Pioniere des Neuen', year1: 'Ihr etabliert eure gemeinsame Identität und erste Strukturen', year3: 'Euer gemeinsames Projekt nimmt Form an und wird sichtbar', year7: 'Ihr habt etwas Bleibendes erschaffen das andere inspiriert', legacy: 'Ein Leuchtturm für alle die nach euch kommen', color: '#ef4444' },
  2: { headline: 'Tiefe stille Verbindung', year1: 'Ihr lernt euch auf der tiefsten Ebene kennen', year3: 'Eure Verbindung ist zum sicheren Hafen für euch und andere geworden', year7: 'Ihr seid das Beispiel für eine Liebe die wächst statt verblasst', legacy: 'Eine Beziehung die Generationen überdauert', color: '#93c5fd' },
  3: { headline: 'Kreative Schöpfungsgemeinschaft', year1: 'Ihr entdeckt eure gemeinsame kreative Sprache', year3: 'Euer gemeinsames Schaffen hat eine eigene Stimme und ein Publikum', year7: 'Ihr habt Kunst und Freude in die Welt gebracht die bleibt', legacy: 'Schönheit die ihr als Paar hinterlasst', color: '#fbbf24' },
  4: { headline: 'Fundament für Generationen', year1: 'Ihr baut gemeinsam das erste solide Fundament', year3: 'Eure Strukturen tragen und ermöglichen Wachstum für beide', year7: 'Ihr habt ein Zuhause oder Lebenswerk das beständig ist', legacy: 'Ein Fundament auf dem andere stehen können', color: '#a16207' },
  5: { headline: 'Lebendiges Abenteuerpaar', year1: 'Ihr entdeckt die Welt mit frischen Augen zusammen', year3: 'Eure Abenteuer haben euch geformt und gemeinsame Weisheit geschaffen', year7: 'Ihr seid gereiste Seelen die Freiheit und Tiefe vereinen', legacy: 'Die Geschichten die ihr erzählt werden andere beflügeln', color: '#22d3ee' },
  6: { headline: 'Heiler und Hüter', year1: 'Ihr erschafft gemeinsam ein heilendes Zuhause', year3: 'Eure Fürsorge füreinander hat Kreise gezogen und andere berührt', year7: 'Ihr seid eine Gemeinschaft des Herzens geworden', legacy: 'Ein Zuhause das heilte wer immer eintrat', color: '#22c55e' },
  7: { headline: 'Hüter des Wissens', year1: 'Ihr taucht gemeinsam in Tiefen die andere scheuen', year3: 'Eure gemeinsame Suche nach Wahrheit hat euch weise gemacht', year7: 'Ihr habt Wissen und Weisheit geteilt die andere transformiert hat', legacy: 'Die Wahrheit die ihr gemeinsam gefunden habt', color: '#7c3aed' },
  8: { headline: 'Manifestationspaar', year1: 'Ihr setzt gemeinsame finanzielle und berufliche Ziele', year3: 'Eure Manifestation trägt Früchte — Wohlstand und Einfluss', year7: 'Ihr habt Großes aufgebaut und mit Würde geführt', legacy: 'Ein Werk das Generationen trägt', color: '#d4af37' },
  9: { headline: 'Vollender und Heiler der Welt', year1: 'Ihr schließt alte Kapitel und öffnet gemeinsam neue Türen', year3: 'Eure Liebe hat anderen Heilung gebracht durch eure Gegenwart', year7: 'Ihr seid ein Geschenk an die Welt geworden durch eure Liebe', legacy: 'Die Liebe die ihr gegeben habt lebt weiter', color: '#c026d3' },
};

const DEFAULT_VISION = { headline: 'Einzigartiger gemeinsamer Weg', year1: 'Die ersten Schritte eurer gemeinsamen Reise formen sich', year3: 'Ihr habt euren einzigartigen Rhythmus gefunden', year7: 'Ihr habt gemeinsam etwas Einzigartiges erschaffen', legacy: 'Die Geschichte eurer Liebe', color: '#818cf8' };

interface FutureVisionCardProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function FutureVisionCard({ nameA, birthDateA, nameB, birthDateB }: FutureVisionCardProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const visionNum = reduceToNumber(lpA + lpB) || 9;
  const vision = VISIONS[visionNum] ?? DEFAULT_VISION;
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Zukunfts-Vision
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: vision.color }}>{vision.headline}</div>
        <div style={{ fontSize: 7, color: '#3a3530', marginTop: 2 }}>Visions-Zahl {visionNum}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
        {[
          { label: '1 Jahr', value: vision.year1, icon: '🌱' },
          { label: '3 Jahre', value: vision.year3, icon: '🌿' },
          { label: '7 Jahre', value: vision.year7, icon: '🌳' },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{ display: 'flex', gap: 8, padding: '7px 10px', borderRadius: 8, background: `${vision.color}06`, border: `1px solid ${vision.color}18` }}>
            <span style={{ fontSize: 14, minWidth: 20 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 7, color: vision.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
              <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '9px 12px', borderRadius: 9, background: `${vision.color}08`, border: `1px solid ${vision.color}22`, textAlign: 'center' }}>
        <div style={{ fontSize: 7, color: vision.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>★ Euer Vermächtnis</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: vision.color, lineHeight: 1.5, fontStyle: 'italic' }}>„{vision.legacy}"</p>
      </div>
    </div>
  );
}
