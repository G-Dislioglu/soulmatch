import { calcLifePath } from '../lib/calc';

const MEDITATIONS: Record<number, { mantra: string; breath: string; visualization: string; mudra: string; duration: string; color: string }> = {
  1: { mantra: 'Ich BIN. Ich führe. Ich erschaffe.', breath: 'Kraftatmung: 4 ein, 4 halten, 4 aus — 9 Runden', visualization: 'Ein leuchtend roter Punkt im Nabelzentrum, der sich zu einer Flamme ausdehnt', mudra: 'Gyan Mudra: Daumen trifft Zeigefinger', duration: '11 Minuten', color: '#ef4444' },
  2: { mantra: 'Ich fühle. Ich verbinde. Ich vertraue.', breath: 'Mondatmung: 6 ein, 2 halten, 6 aus — 7 Runden', visualization: 'Silbernes Mondlicht, das sanft durch die Herzgegend fließt', mudra: 'Shuni Mudra: Daumen trifft Mittelfinger', duration: '12 Minuten', color: '#93c5fd' },
  3: { mantra: 'Ich spreche. Ich erschaffe. Ich freue mich.', breath: 'Feueratmung: kurze rhythmische Stöße durch die Nase — 3 Minuten', visualization: 'Goldgelbes Licht im Kehlzentrum, das zu Klang wird', mudra: 'Surya Mudra: Daumen über Ringfinger', duration: '9 Minuten', color: '#fbbf24' },
  4: { mantra: 'Ich baue. Ich vertraue. Ich bin Fundament.', breath: 'Erdatmung: 4 ein, 4 halten, 4 aus, 4 halten — 4 Runden', visualization: 'Tiefgrüner Kristall im Wurzelzentrum, fest und unerschütterlich', mudra: 'Prithvi Mudra: Daumen trifft Ringfinger', duration: '14 Minuten', color: '#a16207' },
  5: { mantra: 'Ich bewege mich. Ich bin frei. Ich wähle.', breath: 'Wandelatmung: unregelmäßig und spielerisch — 5 Minuten', visualization: 'Türkisblaues Licht das wie Wind durch den ganzen Körper tanzt', mudra: 'Vayu Mudra: Daumen hält Zeigefinger', duration: '10 Minuten', color: '#22d3ee' },
  6: { mantra: 'Ich liebe. Ich heile. Ich bin Zuhause.', breath: 'Herzatmung: 6 ein, 6 aus, keine Pause — 6 Runden', visualization: 'Smaragdgrünes Licht im Herzzentrum, das sich wie Arme öffnet', mudra: 'Apan Vayu: Zeige- und Mittelfinger gebeugt, Daumen drüber', duration: '15 Minuten', color: '#22c55e' },
  7: { mantra: 'Ich weiß. Ich sehe. Ich vertraue dem Unsichtbaren.', breath: 'Stilles Beobachten: natürlicher Atem ohne Eingriff — 7 Minuten', visualization: 'Violetter Kristall im dritten Auge, der langsam rotiert', mudra: 'Ksepana Mudra: Hände ineinandergelegt, Zeigefinger gestreckt', duration: '21 Minuten', color: '#7c3aed' },
  8: { mantra: 'Ich manifestiere. Ich bin Überfluss. Ich diene.', breath: 'Kraftatmung: 8 ein, 4 halten, 8 aus — 8 Runden', visualization: 'Goldenes Infinity-Symbol, das Bauch und Herzraum verbindet', mudra: 'Kubera Mudra: Daumen, Zeige- und Mittelfinger zusammen', duration: '18 Minuten', color: '#d4af37' },
  9: { mantra: 'Ich vollende. Ich vergebe. Ich lasse los.', breath: 'Loslassatmung: 9 ein, ohne Halten, langer langsamer Ausatem — 9 Runden', visualization: 'Magentafarbenes Licht, das von der Krone ausströmt und die ganze Erde umhüllt', mudra: 'Dhyana Mudra: Hände in Schale übereinander im Schoß', duration: '20 Minuten', color: '#c026d3' },
  11: { mantra: 'Ich leuchte. Ich inspiriere. Ich bin der Weg.', breath: 'Lichtatemung: 11 ein, halten bis Füllung, 11 aus — 3 Runden', visualization: 'Perlweißes Licht von der Krone durch die ganze Wirbelsäule', mudra: 'Gyan Mudra beidseitig nach oben gerichtet', duration: '11 Minuten', color: '#818cf8' },
  22: { mantra: 'Ich baue das Unvorstellbare. Schritt für Schritt.', breath: 'Fundament-Atem: 4-4-4-4 quadratisch — 22 Runden', visualization: 'Platinfarbenes Licht, das sichtbare Brücken in die Zukunft baut', mudra: 'Prithvi Mudra beidseitig, Hände auf die Knie', duration: '22 Minuten', color: '#a78bfa' },
  33: { mantra: 'Ich liebe bedingungslos. Ich bin Licht in Menschenform.', breath: 'Herzöffnungsatem: 6-2-6-2 mit Fokus auf das Herzöffnen — 11 Runden', visualization: 'Rosafarbenes Kristalllicht vom Herzen, das sich zur ganzen Welt ausdehnt', mudra: 'Padma Mudra: Hände wie Lotusblüte vor dem Herzen', duration: '33 Minuten', color: '#f9a8d4' },
};

const DEFAULT_MED = { mantra: 'Ich bin. Ich lerne. Ich wachse.', breath: 'Naturatem: einfach beobachten', visualization: 'Weißes Licht im Herzraum', mudra: 'Hände offen im Schoß', duration: '10 Minuten', color: '#d4af37' };

interface NumberMeditationProps { name: string; birthDate: string; }

export function NumberMeditation({ birthDate }: NumberMeditationProps) {
  const lp = calcLifePath(birthDate).value;
  const med = MEDITATIONS[lp] ?? DEFAULT_MED;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>LP {lp} · Zahlen-Meditation</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 700, color: med.color }}>Deine persönliche Meditationspraxis</div>
        <div style={{ fontSize: 9, color: '#3a3530', marginTop: 2 }}>Empfohlene Dauer: {med.duration}</div>
      </div>

      <div style={{ padding: '10px 13px', borderRadius: 10, background: `${med.color}08`, border: `1px solid ${med.color}22`, marginBottom: 9, textAlign: 'center' }}>
        <div style={{ fontSize: 7, color: med.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>✦ Mantra</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: med.color, fontStyle: 'italic', fontWeight: 600 }}>„{med.mantra}"</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 9 }}>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 7, color: med.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◈ Atemübung</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{med.breath}</p>
        </div>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 7, color: med.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>☽ Mudra</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{med.mudra}</p>
        </div>
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: `${med.color}07`, border: `1px solid ${med.color}18` }}>
        <div style={{ fontSize: 7, color: med.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◉ Visualisierung</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>{med.visualization}</p>
      </div>
    </div>
  );
}
