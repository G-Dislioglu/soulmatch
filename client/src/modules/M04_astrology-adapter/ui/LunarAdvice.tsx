const KNOWN_NEW_MOON = new Date('2024-01-11T11:57:00Z');
const SYNODIC = 29.530588853;

function getMoonAge(): number {
  const diffD = (Date.now() - KNOWN_NEW_MOON.getTime()) / 86400000;
  return ((diffD % SYNODIC) + SYNODIC) % SYNODIC;
}

const ADVICE: { range: [number, number]; phase: string; icon: string; color: string; do: string; avoid: string; affirmation: string }[] = [
  { range: [0, 3.7], phase: 'Neumond', icon: '🌑', color: '#5a5468', do: 'Neue Vorhaben beginnen, Absichten setzen, Samen pflanzen', avoid: 'Abschlüsse erzwingen, große Käufe', affirmation: 'Ich öffne mich dem Neubeginn.' },
  { range: [3.7, 7.4], phase: 'Zunehmende Sichel', icon: '🌒', color: '#38bdf8', do: 'Aufbau, Networking, erste Schritte umsetzen', avoid: 'Passivität und Abwarten', affirmation: 'Ich handle mutig in Richtung meiner Ziele.' },
  { range: [7.4, 11.1], phase: 'Erstes Viertel', icon: '🌓', color: '#818cf8', do: 'Entscheidungen treffen, Hindernisse überwinden', avoid: 'Unentschlossenheit', affirmation: 'Ich entscheide klar und vertraue mir.' },
  { range: [11.1, 14.8], phase: 'Zunehmend Gibbous', icon: '🌔', color: '#c084fc', do: 'Verfeinern, überarbeiten, letzter Krafteinsatz', avoid: 'Völlig Neues beginnen', affirmation: 'Ich verfeinere meine Vision.' },
  { range: [14.8, 18.5], phase: 'Vollmond', icon: '🌕', color: '#fbbf24', do: 'Manifestieren, feiern, emotionale Gespräche führen', avoid: 'Wichtige Operationen, impulsive Entscheidungen', affirmation: 'Ich empfange, was ich erschaffen habe.' },
  { range: [18.5, 22.2], phase: 'Abnehmend Gibbous', icon: '🌖', color: '#f97316', do: 'Dankbarkeit, Weitergabe, Lehrmomente', avoid: 'Neue Projekte starten', affirmation: 'Ich teile meine Weisheit großzügig.' },
  { range: [22.2, 25.9], phase: 'Letztes Viertel', icon: '🌗', color: '#a78bfa', do: 'Loslassen, bereinigen, abschließen', avoid: 'Festhalten, Eskalation', affirmation: 'Ich lasse los was nicht mehr dient.' },
  { range: [25.9, 29.5], phase: 'Abnehmende Sichel', icon: '🌘', color: '#64748b', do: 'Ruhe, Stille, Rückzug, Träume notieren', avoid: 'Überaktivität, Entscheidungsdruck', affirmation: 'In der Stille finde ich Erneuerung.' },
];

export function LunarAdvice() {
  const age = getMoonAge();
  const day = Math.floor(age) + 1;
  const entry = ADVICE.find(a => age >= a.range[0] && age < a.range[1]) ?? ADVICE[0]!;
  const pct = Math.round((age / SYNODIC) * 100);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '10px 14px', borderRadius: 11, background: `${entry.color}09`, border: `1px solid ${entry.color}28` }}>
        <span style={{ fontSize: 28 }}>{entry.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 8, color: '#5a5448', marginBottom: 2 }}>Mondtag {day} · {pct}% des Zyklus</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: entry.color }}>{entry.phase}</div>
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.05)', marginTop: 5 }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: entry.color }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Heute förderlich</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{entry.do}</p>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✗ Heute meiden</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{entry.avoid}</p>
        </div>
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: `${entry.color}07`, border: `1px solid ${entry.color}20`, textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: entry.color, fontStyle: 'italic' }}>„{entry.affirmation}"</p>
      </div>
    </div>
  );
}
