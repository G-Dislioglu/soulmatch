type Planet = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

const CHALDEAN: Planet[] = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'];
const DAY_START: Record<number, Planet> = { 0: 'sun', 1: 'moon', 2: 'mars', 3: 'mercury', 4: 'jupiter', 5: 'venus', 6: 'saturn' };

const JOURNAL_PROMPTS: Record<Planet, string[]> = {
  sun: [
    'Wo habe ich heute meinen vollen Ausdruck gezeigt — und wo habe ich mich zurückgehalten?',
    'Was gibt mir heute das Gefühl, lebendig und vital zu sein?',
    'Welche Entscheidung würde mein authentischstes Ich heute treffen?',
  ],
  moon: [
    'Welches Gefühl begleitet mich heute am stärksten, ohne dass ich es benennen konnte?',
    'Was brauche ich gerade, um mich wirklich geborgen zu fühlen?',
    'Welche alte Emotion möchte heute Gehör finden?',
  ],
  mercury: [
    'Was haben meine Gedanken heute besonders beschäftigt — und warum?',
    'Gibt es ein Gespräch, das ich führen müsste, es aber hinausgezögert habe?',
    'Welcher Gedanke kreist immer wieder zurück zu mir?',
  ],
  venus: [
    'Was hat mich heute berührt, bewegt oder begeistert?',
    'Wie habe ich heute Liebe gegeben — und empfangen?',
    'Was finde ich gerade besonders schön in meinem Leben?',
  ],
  mars: [
    'Wo habe ich heute meine Energie eingesetzt — war es das wert?',
    'Was möchte ich mit voller Kraft anpacken, aber traue mich noch nicht?',
    'Wie gehe ich gerade mit meiner Ungeduld oder Frustration um?',
  ],
  jupiter: [
    'Wofür bin ich heute dankbar — auch wenn es klein erscheint?',
    'Welche Möglichkeit liegt gerade vor mir, die ich noch nicht ergriffen habe?',
    'Was würde mein Leben bereichern, wenn ich es heute beginnen würde?',
  ],
  saturn: [
    'Was muss ich loslassen, das mich zwar bindet, aber nicht mehr dient?',
    'Welche Grenze möchte ich mir heute setzen — und warum?',
    'Wo brauche ich mehr Struktur, um wirklich frei zu sein?',
  ],
};

const PLANET_DE: Record<Planet, string> = {
  sun: 'Sonne', moon: 'Mond', mercury: 'Merkur', venus: 'Venus',
  mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
};
const PLANET_COLOR: Record<Planet, string> = {
  sun: '#fbbf24', moon: '#38bdf8', mercury: '#a3e635', venus: '#f472b6',
  mars: '#ef4444', jupiter: '#d4af37', saturn: '#a78bfa',
};
const PLANET_ICON: Record<Planet, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
};
const PLANET_THEME: Record<Planet, string> = {
  sun: 'Identität & Ausdruck', moon: 'Gefühle & Intuition', mercury: 'Gedanken & Kommunikation',
  venus: 'Liebe & Schönheit', mars: 'Energie & Wille', jupiter: 'Wachstum & Dankbarkeit', saturn: 'Grenzen & Reife',
};

function getCurrentPlanet(): Planet {
  const now = new Date();
  const dow = now.getDay();
  const hour = now.getHours();
  const startIdx = CHALDEAN.indexOf(DAY_START[dow]!);
  return CHALDEAN[(startIdx + hour) % 7]!;
}

function getPromptIndex(): number {
  const d = new Date();
  return (d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate()) % 3;
}

export function PlanetJournal() {
  const planet = getCurrentPlanet();
  const color = PLANET_COLOR[planet];
  const prompts = JOURNAL_PROMPTS[planet];
  const idx = getPromptIndex();
  const prompt = prompts[idx % prompts.length]!;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      {/* Planet header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '8px 12px', borderRadius: 10, background: `${color}0a`, border: `1px solid ${color}25` }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}15`, border: `1.5px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>{PLANET_ICON[planet]}</span>
        </div>
        <div>
          <div style={{ fontSize: 8, color: '#5a5448', marginBottom: 1 }}>{timeStr} · Planetenstunde</div>
          <div style={{ fontSize: 13, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color }}>{PLANET_DE[planet]}</div>
          <div style={{ fontSize: 9, color: color + 'bb' }}>{PLANET_THEME[planet]}</div>
        </div>
      </div>

      {/* Journal prompt */}
      <div style={{ padding: '14px 16px', borderRadius: 11, background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}18`, marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          ✦ Tages-Journalfrage
        </div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, lineHeight: 1.8, color: '#d4ccbc', fontStyle: 'italic' }}>
          „{prompt}"
        </p>
      </div>

      {/* Reflection space indicator */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ flex: 1, height: 1, background: `${color}15` }} />
        <span style={{ fontSize: 9, color: '#3a3530' }}>Schreibe 3–5 Minuten frei</span>
        <div style={{ flex: 1, height: 1, background: `${color}15` }} />
      </div>
    </div>
  );
}
