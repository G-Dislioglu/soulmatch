import { calcLifePath, calcExpression, reduceToNumber } from '../../M05_numerology/lib/calc';

const CONTRACT_THEMES: Record<number, { title: string; clause1: string; clause2: string; clause3: string; seal: string; color: string }> = {
  1: { title: 'Vertrag der Pioniere', clause1: 'Wir verpflichten uns, gegenseitig Raum für Unabhängigkeit zu schaffen', clause2: 'Wir erschaffen gemeinsam etwas das die Welt noch nicht gesehen hat', clause3: 'Wir führen abwechselnd ohne den anderen zu dominieren', seal: 'Im Dienst des Neuen', color: '#ef4444' },
  2: { title: 'Vertrag der Verbindung', clause1: 'Wir verpflichten uns, die feinen Bedürfnisse des anderen wahrzunehmen', clause2: 'Wir bauen gemeinsam Brücken wo andere Mauern sehen', clause3: 'Wir wählen Frieden über Recht-haben', seal: 'Im Dienst des Friedens', color: '#93c5fd' },
  3: { title: 'Vertrag der Schöpfer', clause1: 'Wir verpflichten uns, die Freude des anderen zu nähren', clause2: 'Wir erschaffen gemeinsam Schönheit und Bedeutung', clause3: 'Wir feiern die Einzigartigkeit des anderen', seal: 'Im Dienst der Freude', color: '#fbbf24' },
  4: { title: 'Vertrag der Baumeister', clause1: 'Wir verpflichten uns, gemeinsam ein dauerhaftes Fundament zu errichten', clause2: 'Wir halten unsere Vereinbarungen als heilig', clause3: 'Wir bauen Schritt für Schritt, gemeinsam und beständig', seal: 'Im Dienst des Dauerhaften', color: '#a16207' },
  5: { title: 'Vertrag der Freiheit', clause1: 'Wir verpflichten uns, dem anderen Raum zum Atmen zu lassen', clause2: 'Wir reisen gemeinsam durch das Leben ohne den anderen einzuengen', clause3: 'Wir wachsen durch gemeinsame Abenteuer', seal: 'Im Dienst der Freiheit', color: '#22d3ee' },
  6: { title: 'Vertrag der Heilung', clause1: 'Wir verpflichten uns, füreinander ein sicherer Hafen zu sein', clause2: 'Wir heilen gemeinsam alte Wunden durch neue Liebe', clause3: 'Wir sorgen füreinander ohne uns zu verlieren', seal: 'Im Dienst der Heilung', color: '#22c55e' },
  7: { title: 'Vertrag der Weisheit', clause1: 'Wir verpflichten uns, gemeinsam in die Tiefe zu gehen', clause2: 'Wir teilen unsere wahren Gedanken auch wenn sie schwer sind', clause3: 'Wir ehren die Stille des anderen als heiligen Raum', seal: 'Im Dienst der Wahrheit', color: '#7c3aed' },
  8: { title: 'Vertrag der Manifestation', clause1: 'Wir verpflichten uns, gemeinsam zu manifestieren was alleine nicht möglich wäre', clause2: 'Wir nutzen unsere Kraft im Dienst des Großen', clause3: 'Wir teilen Erfolg und Verantwortung gleichermaßen', seal: 'Im Dienst des Möglichen', color: '#d4af37' },
  9: { title: 'Vertrag der Vollendung', clause1: 'Wir verpflichten uns, gegenseitig zur Vollendung zu inspirieren', clause2: 'Wir vergeben einander immer wieder als spirituelle Praxis', clause3: 'Wir dienen gemeinsam der Welt durch unsere Liebe', seal: 'Im Dienst der Liebe', color: '#c026d3' },
};

const DEFAULT_CONTRACT = { title: 'Einzigartiger Seelenbund', clause1: 'Wir verpflichten uns, den anderen so zu sehen wie er wirklich ist', clause2: 'Wir wachsen gemeinsam über das hinaus was wir alleine sein könnten', clause3: 'Wir halten unseren Bund heilig und erneuern ihn täglich', seal: 'Im Dienst des Lebens', color: '#818cf8' };

interface SoulContract2Props { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function SoulContract2({ nameA, birthDateA, nameB, birthDateB: _birthDateB }: SoulContract2Props) {
  const lpA = calcLifePath(birthDateA).value;
  const exB = calcExpression(nameB).value;

  const contractNum = reduceToNumber(lpA + exB) || 9;
  const contract = CONTRACT_THEMES[contractNum] ?? DEFAULT_CONTRACT;
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB}
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: contract.color }}>{contract.title}</div>
        <div style={{ fontSize: 7, color: '#3a3530', marginTop: 2 }}>LP {lpA} + EX {exB} = Vertrags-Zahl {contractNum}</div>
      </div>

      <div style={{ padding: '11px 14px', borderRadius: 10, background: `${contract.color}06`, border: `1px solid ${contract.color}20`, marginBottom: 10 }}>
        <div style={{ fontSize: 7, color: contract.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>§ Die drei Klauseln</div>
        {[contract.clause1, contract.clause2, contract.clause3].map((clause, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 8, color: contract.color, minWidth: 14, fontWeight: 700 }}>{i + 1}.</span>
            <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{clause}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: `${contract.color}08`, border: `1px solid ${contract.color}22`, textAlign: 'center' }}>
        <div style={{ fontSize: 7, color: contract.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Siegel</div>
        <p style={{ margin: '0 0 4px', fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: contract.color, fontStyle: 'italic', fontWeight: 600 }}>„{contract.seal}"</p>
        <div style={{ fontSize: 7, color: '#2a2520' }}>{firstA} & {firstB} · {today}</div>
      </div>
    </div>
  );
}
