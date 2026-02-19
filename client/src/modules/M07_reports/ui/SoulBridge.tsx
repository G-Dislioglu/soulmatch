import { calcLifePath, calcExpression, reduceToNumber } from '../../M05_numerology/lib/calc';

const BRIDGE_MESSAGES: Record<number, { title: string; message: string; gift: string; challenge: string }> = {
  1: { title: 'Brücke der Führung', message: 'Eure Seelen haben sich gefunden, um gemeinsam voranzugehen. Einer führt, der andere inspiriert — und zusammen schafft ihr Neues.', gift: 'Mut und Pioniergeist', challenge: 'Ego loslassen und den anderen wirklich sehen' },
  2: { title: 'Brücke der Harmonie', message: 'Zwischen euch liegt ein stilles Band des Verstehens. Ihr spürt einander ohne Worte — eine seltene, tiefe Verbindung.', gift: 'Einfühlungsvermögen und Geduld', challenge: 'Eigene Bedürfnisse nicht vergessen' },
  3: { title: 'Brücke der Freude', message: 'Eure Verbindung trägt das Licht des Ausdrucks. Lachen, Kreativität und Lebensfreude verbinden eure Seelen.', gift: 'Kreativität und Begeisterung', challenge: 'Tiefe zulassen neben der Leichtigkeit' },
  4: { title: 'Brücke des Vertrauens', message: 'Ihr baut gemeinsam etwas Dauerhaftes. Eure Seelen haben sich gefunden, um feste Wurzeln zu legen.', gift: 'Verlässlichkeit und Aufbau', challenge: 'Flexibilität und Spontaneität üben' },
  5: { title: 'Brücke der Freiheit', message: 'Eure Verbindung atmet Weite. Ihr gebt einander Raum — und findet euch immer wieder, freier und reicher.', gift: 'Abenteuergeist und Offenheit', challenge: 'Beständigkeit in Freiheit finden' },
  6: { title: 'Brücke der Fürsorge', message: 'Eure Seelen haben sich gefunden, um füreinander zu heilen. Diese Liebe trägt — sie schützt und nährt.', gift: 'Liebe, Wärme und Geborgenheit', challenge: 'Geben und Nehmen in Balance halten' },
  7: { title: 'Brücke der Weisheit', message: 'Ihr begegnet euch in der Tiefe. Eure Verbindung ist philosophisch, spirituell — eine Begegnung der Seelen.', gift: 'Tiefe und Erkenntnis', challenge: 'Emotionale Nähe trotz innerer Welt' },
  8: { title: 'Brücke der Kraft', message: 'Eure Seelen streben gemeinsam nach dem Großen. Diese Verbindung hat Macht — und die Pflicht, sie weise zu nutzen.', gift: 'Ambition und gegenseitige Stärkung', challenge: 'Kontrolle und Vertrauen balancieren' },
  9: { title: 'Brücke der Vollendung', message: 'Eure Verbindung trägt das Licht der ganzen Menschheit. Ihr liebt nicht nur einander — ihr liebt die Welt.', gift: 'Mitgefühl und Weitblick', challenge: 'Nächstes auch das Erste sein lassen' },
};

const DEFAULT_BRIDGE = { title: 'Brücke der Seelen', message: 'Eure Verbindung ist einzigartig — sie trägt Licht in beide Leben.', gift: 'Gegenseitige Stärkung', challenge: 'Offenheit füreinander bewahren' };

interface SoulBridgeProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function SoulBridge({ nameA, birthDateA, nameB, birthDateB }: SoulBridgeProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const exA = calcExpression(nameA).value;
  const exB = calcExpression(nameB).value;
  const bridgeNum = reduceToNumber(lpA + lpB) || 9;
  const giftNum = reduceToNumber(exA + exB) || 6;

  const bridge = BRIDGE_MESSAGES[bridgeNum] ?? DEFAULT_BRIDGE;
  const giftBridge = BRIDGE_MESSAGES[giftNum] ?? DEFAULT_BRIDGE;
  const GOLD = '#d4af37';
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Seelen-Brücke {bridgeNum}
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: GOLD }}>{bridge.title}</div>
      </div>

      {/* Bridge visual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: '10px 14px', borderRadius: 11, background: `${GOLD}07`, border: `1px solid ${GOLD}20` }}>
        <div style={{ textAlign: 'center', minWidth: 40 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#ef444420', border: '1.5px solid #ef444460', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 3px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>{lpA}</span>
          </div>
          <div style={{ fontSize: 7, color: '#3a3530' }}>{firstA}</div>
        </div>
        <div style={{ flex: 1, position: 'relative', height: 18 }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: `linear-gradient(90deg, #ef4444, ${GOLD}, #818cf8)`, borderRadius: 1, transform: 'translateY(-50%)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 22, height: 22, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 10px ${GOLD}60` }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#1a1510' }}>{bridgeNum}</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 40 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#818cf820', border: '1.5px solid #818cf860', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 3px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8' }}>{lpB}</span>
          </div>
          <div style={{ fontSize: 7, color: '#3a3530' }}>{firstB}</div>
        </div>
      </div>

      {/* Bridge message */}
      <div style={{ padding: '10px 13px', borderRadius: 10, background: `${GOLD}06`, border: `1px solid ${GOLD}18`, marginBottom: 10 }}>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: '#c8b870', lineHeight: 1.6, fontStyle: 'italic' }}>
          „{bridge.message}"
        </p>
      </div>

      {/* Gift & Challenge */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Euer Geschenk</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{bridge.gift}</p>
        </div>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(192,132,252,0.05)', border: '1px solid rgba(192,132,252,0.15)' }}>
          <div style={{ fontSize: 7, color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◈ Eure Aufgabe</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{bridge.challenge}</p>
        </div>
      </div>

      {/* Expression bridge */}
      <div style={{ padding: '7px 11px', borderRadius: 8, background: 'rgba(129,140,248,0.05)', border: '1px solid rgba(129,140,248,0.15)' }}>
        <div style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Ausdrucks-Brücke {giftNum}</div>
        <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{giftBridge.gift} — {giftBridge.challenge}</p>
      </div>
    </div>
  );
}
