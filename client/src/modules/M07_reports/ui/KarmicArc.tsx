import { calcLifePath, calcExpression, calcSoulUrge, reduceToNumber } from '../../M05_numerology/lib/calc';

const KARMIC_ARCS: Record<number, { title: string; pastLife: string; currentLesson: string; resolution: string; sharedMission: string }> = {
  1: { title: 'Bogen der Führung', pastLife: 'Ihr habt gemeinsam Neues erschaffen und dabei gelernt, dass Pioniergeist ohne Demut zerstört.', currentLesson: 'Führung durch Beispiel statt durch Dominanz', resolution: 'Wenn einer führt und der andere unterstützt ohne sich zu verlieren', sharedMission: 'Anderen den Mut geben, ihren eigenen Weg zu gehen' },
  2: { title: 'Bogen der Verbindung', pastLife: 'Ihr ward durch Abhängigkeit verbunden — nun lernt ihr echte Partnerschaft.', currentLesson: 'Verbindung die stärkt statt bindet', resolution: 'Wenn beide vollständig sind und trotzdem wählen zusammen zu sein', sharedMission: 'Anderen zeigen wie tiefe Verbindung und Freiheit koexistieren' },
  3: { title: 'Bogen des Ausdrucks', pastLife: 'Eure kreative Kraft wurde unterdrückt — nun kommt sie in vollen Zügen.', currentLesson: 'Authentizität gegenüber Zustimmung zu wählen', resolution: 'Wenn eure gemeinsame Freude andere ansteckt', sharedMission: 'Die Welt durch euren gemeinsamen Ausdruck zu verschönern' },
  4: { title: 'Bogen des Aufbaus', pastLife: 'Ihr habt Fundamente gelegt die zerfielen — nun baut ihr dauerhafter.', currentLesson: 'Stabilität durch Vertrauen statt Kontrolle', resolution: 'Wenn das gemeinsam Gebaute anderen als Heimat dient', sharedMission: 'Ein stabiles Nest für die nächste Generation zu erschaffen' },
  5: { title: 'Bogen der Freiheit', pastLife: 'Gefangenheit in Rollen die nicht stimmten — nun tragt ihr die Freiheit als Fackel.', currentLesson: 'Freiheit zu ehren ohne Verantwortung zu fliehen', resolution: 'Wenn Abenteuer und Verlässlichkeit kein Widerspruch mehr sind', sharedMission: 'Anderen zeigen dass Wandel kein Verlust sondern Gewinn ist' },
  6: { title: 'Bogen der Heilung', pastLife: 'Ihr habt gegeben bis zur Erschöpfung — nun lernt ihr Fürsorge mit Grenzen.', currentLesson: 'Heilen aus Fülle statt aus Pflicht', resolution: 'Wenn eure Liebe andere heilt ohne euch zu erschöpfen', sharedMission: 'Ein Ort der Heilung und Geborgenheit für andere zu sein' },
  7: { title: 'Bogen der Weisheit', pastLife: 'Ihr habt Wahrheiten bewacht die geteilt werden sollten — nun öffnet ihr euch.', currentLesson: 'Wissen durch Verbindung zu vertiefen', resolution: 'Wenn eure gemeinsame Stille tiefer ist als jedes Gespräch', sharedMission: 'Wissen als Brücke zwischen Seelen zu nutzen' },
  8: { title: 'Bogen der Fülle', pastLife: 'Macht wurde missbraucht — nun tragt ihr sie mit Würde.', currentLesson: 'Reichtum als Werkzeug des Dienens', resolution: 'Wenn materielle Fülle spirituelle Tiefe nicht verdrängt', sharedMission: 'Ressourcen in den Dienst einer besseren Welt stellen' },
  9: { title: 'Bogen der Vollendung', pastLife: 'Unvollendete Zyklen folgen euch — nun schließt ihr sie bewusst ab.', currentLesson: 'Mit Würde loslassen was vollendet ist', resolution: 'Wenn das Loslassen leichter wird als das Festhalten', sharedMission: 'Den Kreislauf des Lebens durch vollständige Anwesenheit zu ehren' },
};

const DEFAULT_ARC = {
  title: 'Bogen der Seele',
  pastLife: 'Eure Seelen sind sich bekannt — diese Begegnung ist keine zufällige.',
  currentLesson: 'Das Muster, das sich wiederholt, bewusst zu durchbrechen',
  resolution: 'Wenn beide füreinander und für sich selbst sorgen können',
  sharedMission: 'Gemeinsam zu wachsen und andere durch euer Wachstum zu inspirieren',
};

function getKarmicNumber(lpA: number, lpB: number, exA: number, exB: number): number {
  return reduceToNumber(lpA + lpB + exA + exB) || 9;
}

interface KarmicArcProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function KarmicArc({ nameA, birthDateA, nameB, birthDateB }: KarmicArcProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const exA = calcExpression(nameA).value;
  const exB = calcExpression(nameB).value;
  const suA = calcSoulUrge(nameA).value;
  const suB = calcSoulUrge(nameB).value;
  const kNum = getKarmicNumber(lpA, lpB, exA, exB);
  const arc = KARMIC_ARCS[kNum] ?? DEFAULT_ARC;
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const GOLD = '#d4af37';
  const PURPLE = '#c084fc';

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Karmische Verbindungszahl {kNum}
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: GOLD }}>{arc.title}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Past life context */}
        <div style={{ padding: '9px 12px', borderRadius: 9, background: `${PURPLE}06`, border: `1px solid ${PURPLE}18` }}>
          <div style={{ fontSize: 8, color: PURPLE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>☽ Vergangenes Echo</div>
          <p style={{ margin: 0, fontSize: 11, color: '#5a5448', lineHeight: 1.5, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>{arc.pastLife}</p>
        </div>

        {/* Current lesson */}
        <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
          <div style={{ fontSize: 8, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>◈ Aktuelle Lektion</div>
          <p style={{ margin: 0, fontSize: 11, color: '#5a5448', lineHeight: 1.5 }}>{arc.currentLesson}</p>
        </div>

        {/* Resolution */}
        <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 8, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>✦ Auflösung</div>
          <p style={{ margin: 0, fontSize: 11, color: '#5a5448', lineHeight: 1.5 }}>{arc.resolution}</p>
        </div>

        {/* Shared mission */}
        <div style={{ padding: '9px 12px', borderRadius: 9, background: `${GOLD}07`, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 8, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Gemeinsame Mission</div>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: '#d4ccbc', lineHeight: 1.6, fontStyle: 'italic' }}>„{arc.sharedMission}"</p>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 8, color: '#2a2520', textAlign: 'center' }}>
        LP {lpA}+{lpB} · EX {exA}+{exB} · SU {suA}+{suB} → K{kNum}
      </div>
    </div>
  );
}
