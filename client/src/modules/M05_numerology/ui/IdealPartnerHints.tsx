import { calcLifePath } from '../lib/calc';

interface CompatGroup { numbers: number[]; label: string; desc: string; color: string; }

const LP_COMPAT: Record<number, CompatGroup[]> = {
  1: [
    { numbers: [3, 5], label: 'Tiefe Harmonie', desc: '3 inspiriert deine Vision; 5 matcht deine Energie & Freiheitsdrang.', color: '#22c55e' },
    { numbers: [2, 9], label: 'Ergänzend', desc: '2 bringt die Wärme, die du brauchst; 9 teilt dein Feuer.', color: '#fbbf24' },
    { numbers: [1, 8], label: 'Herausfordernd', desc: 'Ähnliche Dominanz kann Reibung erzeugen — starke Verbindung möglich.', color: '#f59e0b' },
  ],
  2: [
    { numbers: [8, 9], label: 'Tiefe Harmonie', desc: '8 gibt dir Sicherheit; 9 teilt deine universelle Liebe.', color: '#22c55e' },
    { numbers: [6, 1], label: 'Ergänzend', desc: '6 nährt dich wie du andere nährst; 1 gibt dir Richtung.', color: '#fbbf24' },
    { numbers: [2, 5], label: 'Herausfordernd', desc: '2+2 kann co-abhängig werden; 5 ist zu ungebunden für deine Bedürfnisse.', color: '#f59e0b' },
  ],
  3: [
    { numbers: [6, 9], label: 'Tiefe Harmonie', desc: '6 schätzt deine Kreativität; 9 versteht deine Seele.', color: '#22c55e' },
    { numbers: [1, 5], label: 'Ergänzend', desc: '1 inspiriert dich zur Tat; 5 matcht deine Energie.', color: '#fbbf24' },
    { numbers: [4, 7], label: 'Herausfordernd', desc: '4 findet dich unstrukturiert; 7 zieht sich zurück wenn du glänzen willst.', color: '#f59e0b' },
  ],
  4: [
    { numbers: [8, 1], label: 'Tiefe Harmonie', desc: '8 teilt deine Ergebnisorientierung; 1 respektiert deine Disziplin.', color: '#22c55e' },
    { numbers: [6, 7], label: 'Ergänzend', desc: '6 schätzt deine Stabilität; 7 ergänzt deine Tiefe.', color: '#fbbf24' },
    { numbers: [3, 5], label: 'Herausfordernd', desc: '3 & 5 sind zu ungebunden für deinen Ordnungssinn.', color: '#f59e0b' },
  ],
  5: [
    { numbers: [1, 7], label: 'Tiefe Harmonie', desc: '1 matcht deine Energie; 7 fasziniert dich intellektuell.', color: '#22c55e' },
    { numbers: [3, 9], label: 'Ergänzend', desc: '3 teilt deine Lebenslust; 9 versteht deinen Freiheitsdrang.', color: '#fbbf24' },
    { numbers: [4, 2], label: 'Herausfordernd', desc: '4 ist zu starr; 2 braucht mehr Stabilität als du gibst.', color: '#f59e0b' },
  ],
  6: [
    { numbers: [2, 9], label: 'Tiefe Harmonie', desc: '2 ergänzt deine Fürsorge perfekt; 9 teilt deine humanitäre Seele.', color: '#22c55e' },
    { numbers: [3, 1], label: 'Ergänzend', desc: '3 bringt Freude; 1 schätzt dein Nest-Bau-Talent.', color: '#fbbf24' },
    { numbers: [6, 5], label: 'Herausfordernd', desc: '6+6 kann kontrollierend werden; 5 flüchtet vor deiner Wärme.', color: '#f59e0b' },
  ],
  7: [
    { numbers: [4, 5], label: 'Tiefe Harmonie', desc: '4 gibt dir Erdung; 5 stimuliert deinen Geist.', color: '#22c55e' },
    { numbers: [9, 2], label: 'Ergänzend', desc: '9 versteht deine Tiefe; 2 gibt dir emotionale Sicherheit.', color: '#fbbf24' },
    { numbers: [1, 8], label: 'Herausfordernd', desc: '1 & 8 sind zu oberflächlich für deine Innerlichkeit.', color: '#f59e0b' },
  ],
  8: [
    { numbers: [4, 2], label: 'Tiefe Harmonie', desc: '4 teilt deinen Aufbausinn; 2 gibt dir emotionale Balance.', color: '#22c55e' },
    { numbers: [6, 9], label: 'Ergänzend', desc: '6 erdet dich; 9 weitet deine Seele über Erfolg hinaus.', color: '#fbbf24' },
    { numbers: [8, 3], label: 'Herausfordernd', desc: '8+8 kämpft um Kontrolle; 3 ist zu leichtherzig für dich.', color: '#f59e0b' },
  ],
  9: [
    { numbers: [3, 6], label: 'Tiefe Harmonie', desc: '3 teilt deine Kreativität; 6 teilt dein Herz für andere.', color: '#22c55e' },
    { numbers: [1, 2], label: 'Ergänzend', desc: '1 inspiriert dich; 2 gibt dir Geborgenheit.', color: '#fbbf24' },
    { numbers: [9, 4], label: 'Herausfordernd', desc: '9+9 kann zu idealistisch werden; 4 versteht deine Weitblick nicht immer.', color: '#f59e0b' },
  ],
  11: [
    { numbers: [2, 6], label: 'Tiefe Harmonie', desc: '2 (dein Basis-LP) bietet Geborgenheit; 6 versteht dein Herz.', color: '#22c55e' },
    { numbers: [7, 9], label: 'Ergänzend', desc: '7 versteht deine Tiefe; 9 teilt deine spirituelle Vision.', color: '#fbbf24' },
    { numbers: [1, 5], label: 'Herausfordernd', desc: 'Zu viel Feuer kann deine Sensitivität überfluten.', color: '#f59e0b' },
  ],
  22: [
    { numbers: [4, 8], label: 'Tiefe Harmonie', desc: '4 (Basis-LP) teilt deinen Aufbausinn; 8 versteht deine Ambition.', color: '#22c55e' },
    { numbers: [6, 2], label: 'Ergänzend', desc: '6 nährt dich; 2 gibt dir emotionale Intelligenz.', color: '#fbbf24' },
    { numbers: [5, 3], label: 'Herausfordernd', desc: 'Zu viel Ungebundenheit stört deine monumentalen Pläne.', color: '#f59e0b' },
  ],
  33: [
    { numbers: [6, 9], label: 'Tiefe Harmonie', desc: '6 & 9 teilen dein Herz für bedingungslose Liebe.', color: '#22c55e' },
    { numbers: [2, 3], label: 'Ergänzend', desc: '2 gibt dir Geborgenheit; 3 bringt Ausdruck in dein Geben.', color: '#fbbf24' },
    { numbers: [1, 8], label: 'Herausfordernd', desc: 'Macht-orientierte Partner können deine Aufopferung ausnutzen.', color: '#f59e0b' },
  ],
};

const DEFAULT_COMPAT: CompatGroup[] = [
  { numbers: [2, 6, 9], label: 'Harmonisch', desc: 'Liebevolle, fürsorgende Energien ergänzen dich gut.', color: '#22c55e' },
  { numbers: [1, 3, 5], label: 'Stimulierend', desc: 'Dynamische Partner bringen Wachstum.', color: '#fbbf24' },
];

interface IdealPartnerHintsProps { birthDate: string; }

export function IdealPartnerHints({ birthDate }: IdealPartnerHintsProps) {
  const lp = calcLifePath(birthDate);
  const groups = LP_COMPAT[lp.value] ?? DEFAULT_COMPAT;

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        Idealpartner für LP {lp.value}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {groups.map((g, i) => (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: `${g.color}08`, border: `1px solid ${g.color}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {g.numbers.map((n) => (
                  <span key={n} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: g.color, width: 22, height: 22, borderRadius: '50%', background: `${g.color}15`, border: `1px solid ${g.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}>
                    {n}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: g.color }}>{g.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: 10, lineHeight: 1.5, color: '#5a5448' }}>{g.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
