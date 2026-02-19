import { calcSoulUrge } from '../lib/calc';

const SOUL_URGE: Record<number, { title: string; core_need: string; deepest_desire: string; inner_fear: string; fulfillment: string; shadow: string; color: string; icon: string }> = {
  1: { title: 'Die Seele des Anführers', core_need: 'Unabhängigkeit und Anerkennung als Einzigartiger', deepest_desire: 'Der Erste sein — in allem was du tust', inner_fear: 'Unsichtbar zu sein oder kontrolliert zu werden', fulfillment: 'Wenn du deinen eigenen Weg gehst ohne Erlaubnis zu brauchen', shadow: 'Arroganz und das Gefühl, immer allein kämpfen zu müssen', color: '#ef4444', icon: '👑' },
  2: { title: 'Die Seele des Verbinders', core_need: 'Tiefe Verbindung, Harmonie und gegenseitiges Verständnis', deepest_desire: 'Wirklich gesehen und geliebt zu werden', inner_fear: 'Allein gelassen zu werden oder Konflikte zu verursachen', fulfillment: 'In einer Beziehung wo du vollständig du selbst sein kannst', shadow: 'Selbstverlust durch übermäßige Anpassung an andere', color: '#93c5fd', icon: '🤍' },
  3: { title: 'Die Seele des Ausdrucks', core_need: 'Kreative Selbstentfaltung und Freude am Leben', deepest_desire: 'Deine innere Welt durch Kunst, Worte oder Musik teilen', inner_fear: 'Nicht kreativ genug zu sein oder ignoriert zu werden', fulfillment: 'Wenn dein Ausdruck andere berührt und inspiriert', shadow: 'Zerstreuung und Oberflächlichkeit als Schutz vor Tiefe', color: '#fbbf24', icon: '🎨' },
  4: { title: 'Die Seele des Erbauers', core_need: 'Sicherheit, Ordnung und das Erschaffen von Dauerhaftem', deepest_desire: 'Etwas Bleibendes hinterlassen das anderen Halt gibt', inner_fear: 'Chaos, Instabilität und das Gefühl, auf Sand zu bauen', fulfillment: 'Wenn deine Arbeit solide Grundlagen für andere schafft', shadow: 'Starrheit und das Festhalten an Kontrolle aus Angst', color: '#a16207', icon: '🏛' },
  5: { title: 'Die Seele der Freiheit', core_need: 'Abenteuer, Veränderung und grenzenlose Möglichkeiten', deepest_desire: 'Das Leben in seiner ganzen Fülle erleben', inner_fear: 'Eingesperrt, langweilig oder festgefahren zu sein', fulfillment: 'Wenn du frei bist zu gehen wohin dein Herz dich ruft', shadow: 'Flucht vor Verantwortung und Tiefe durch ständigen Wandel', color: '#22d3ee', icon: '🌊' },
  6: { title: 'Die Seele der Liebe', core_need: 'Lieben, gebraucht werden und Harmonie erschaffen', deepest_desire: 'Eine Welt voller Schönheit, Fürsorge und Geborgenheit', inner_fear: 'Nicht geliebt zu werden oder anderen zu schaden', fulfillment: 'Wenn deine Fürsorge wirklich angenommen und geschätzt wird', shadow: 'Martyrertum und das Aufopfern des eigenen Glücks für andere', color: '#f472b6', icon: '💗' },
  7: { title: 'Die Seele des Suchers', core_need: 'Wahrheit, Tiefe und das Verstehen des Lebensgeheimnisses', deepest_desire: 'Die verborgene Wahrheit hinter allem zu entdecken', inner_fear: 'Oberflächlichkeit, Lügen und missverstanden zu werden', fulfillment: 'In stiller Kontemplation oder tiefem Gespräch mit einem Gleichgesinnten', shadow: 'Isolation und Zynismus als Schutz vor Enttäuschung', color: '#7c3aed', icon: '🔮' },
  8: { title: 'Die Seele der Macht', core_need: 'Erfolg, Einfluss und materielle wie spirituelle Fülle', deepest_desire: 'Großes erschaffen und einen bleibenden Eindruck hinterlassen', inner_fear: 'Machtlosigkeit, Armut oder als Versager zu gelten', fulfillment: 'Wenn deine Kraft anderen dient und Gutes in der Welt bewirkt', shadow: 'Gier und das Verwechseln von Wert mit Leistung', color: '#d4af37', icon: '💎' },
  9: { title: 'Die Seele des Humanisten', core_need: 'Die Welt besser zu machen und universelle Liebe zu geben', deepest_desire: 'Alle Wesen in ihrer Würde zu sehen und zu ehren', inner_fear: 'Gleichgültigkeit, Grausamkeit und sinnloses Leiden', fulfillment: 'Wenn dein Mitgefühl die Welt tatsächlich verändert', shadow: 'Selbstverleugnung und das Tragen aller Schmerzen der Welt', color: '#c026d3', icon: '🌍' },
  11: { title: 'Die Seele des Illuminierten (11)', core_need: 'Spirituelle Wahrheit zu verkörpern und andere zu erwecken', deepest_desire: 'Ein Kanal für höheres Licht und Weisheit zu sein', inner_fear: 'Die eigene Intensität und das Gefühl, zu viel zu sein', fulfillment: 'Wenn deine Präsenz andere transformiert ohne Worte', shadow: 'Überwältigung durch die eigene Tiefe und Sensibilität', color: '#f472b6', icon: '✨' },
  22: { title: 'Die Seele des Meisterbauers (22)', core_need: 'Monumentales erschaffen das Generationen überdauert', deepest_desire: 'Den Traum einer besseren Welt in Realität zu verwandeln', inner_fear: 'Die Größe der eigenen Vision und das Scheitern daran', fulfillment: 'Wenn dein Werk die Welt dauerhaft zum Besseren verändert', shadow: 'Lähmung durch die Schwere des eigenen Auftrags', color: '#38bdf8', icon: '🌐' },
};

const DEFAULT_SU = { title: 'Einzigartige Seele', core_need: 'Dein Seelenweg ist einzigartig', deepest_desire: 'Dein tiefster Wunsch entfaltet sich auf deinem eigenen Weg', inner_fear: 'Die Angst vor dem Unbekannten', fulfillment: 'Im vollständigen Annehmen deiner Einzigartigkeit', shadow: 'Das Verstecken deiner wahren Natur', color: '#d4af37', icon: '🌟' };

interface SoulUrgeCardProps { name: string; }

export function SoulUrgeCard({ name }: SoulUrgeCardProps) {
  const su = calcSoulUrge(name);
  const num = su.value;
  const data = SOUL_URGE[num] ?? DEFAULT_SU;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Seelendrang-Zahl {num}</div>
        <div style={{ fontSize: 26, marginBottom: 4 }}>{data.icon}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: data.color }}>{data.title}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: `${data.color}07`, border: `1px solid ${data.color}20` }}>
          <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◉ Tiefster Kern-Bedarf</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.core_need}</p>
        </div>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <div style={{ fontSize: 7, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>★ Tiefster Wunsch</div>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: '#c8b870', lineHeight: 1.5, fontStyle: 'italic' }}>„{data.deepest_desire}"</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✗ Innere Angst</div>
            <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{data.inner_fear}</p>
          </div>
          <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✦ Erfüllung</div>
            <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{data.fulfillment}</p>
          </div>
        </div>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(129,140,248,0.05)', border: '1px solid rgba(129,140,248,0.15)' }}>
          <div style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>◈ Seelen-Schatten</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{data.shadow}</p>
        </div>
      </div>
    </div>
  );
}
