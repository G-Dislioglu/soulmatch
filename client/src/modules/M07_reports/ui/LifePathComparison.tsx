import { calcLifePath } from '../../M05_numerology/lib/calc';

const ARCH: Record<number, string> = {
  1: 'Pionier', 2: 'Diplomat', 3: 'Erschaffer', 4: 'Baumeister', 5: 'Abenteurer',
  6: 'Hüter', 7: 'Weiser', 8: 'Manifestor', 9: 'Humanist',
  11: 'Erleuchteter', 22: 'Meisterbauer', 33: 'Meisterheiler',
};

const COMPAT: Record<string, { score: number; title: string; dynamic: string; challenge: string }> = {
  '1-1': { score: 72, title: 'Zwei Pioniere', dynamic: 'Starke gegenseitige Inspiration und Unabhängigkeit. Gemeinsam können ihr Berge versetzen.', challenge: 'Beide wollen führen — Kompromisse brauchen bewusste Übung.' },
  '1-2': { score: 88, title: 'Anführer & Diplomat', dynamic: 'Perfekte Ergänzung: einer bringt Vision, der andere Balance und Harmonie.', challenge: 'Der Pionier muss lernen, innezuhalten; der Diplomat, fester aufzutreten.' },
  '1-3': { score: 82, title: 'Feuer trifft Kreativität', dynamic: 'Sprühende Energie, gegenseitige Begeisterung und ein lebendiges Miteinander.', challenge: 'Fokus und Ausdauer wollen gemeinsam kultiviert werden.' },
  '1-4': { score: 70, title: 'Vision trifft Struktur', dynamic: 'Der Pionier bringt Ideen, der Baumeister die Umsetzung — ein kraftvolles Team.', challenge: 'Tempo-Unterschiede können reiben. Geduld ist gefragt.' },
  '1-5': { score: 80, title: 'Freigeister', dynamic: 'Beide lieben Unabhängigkeit und Neues. Abenteuer verbindet euch.', challenge: 'Bindung und Stabilität brauchen bewusste Investition.' },
  '1-6': { score: 75, title: 'Führer & Beschützer', dynamic: 'Der Beschützer gibt dem Pionier ein Zuhause; der Pionier gibt Inspiration.', challenge: 'Kontrolle vs. Freiheit als wiederkehrendes Thema.' },
  '1-7': { score: 68, title: 'Aktion & Reflexion', dynamic: 'Spannende Gegensätze — Aktivität und Tiefe ergänzen sich selten, aber kraftvoll.', challenge: 'Unterschiedliche Kommunikationsstile brauchen Brücken.' },
  '1-8': { score: 85, title: 'Machtvoll', dynamic: 'Zwei starke Willen formen ein beeindruckendes Gespann. Gemeinsam manifestiert ihr Außergewöhnliches.', challenge: 'Machtkämpfe sind möglich. Kooperation ist der Schlüssel.' },
  '1-9': { score: 78, title: 'Vision & Humanismus', dynamic: 'Der Pionier handelt; der Humanist gibt dem Handeln Bedeutung.', challenge: 'Ego des Pioniers kann mit dem universellen Blick des 9ers kollidieren.' },
  '2-2': { score: 85, title: 'Zwei Seelen, ein Herz', dynamic: 'Tiefes gegenseitiges Verständnis und sanfte Harmonie. Ihr fühlt euch gesehen.', challenge: 'Beide tendieren zur Konfliktscheu — ehrliche Gespräche sind essenziell.' },
  '2-3': { score: 82, title: 'Harmonie & Freude', dynamic: 'Der Diplomat schafft Sicherheit, der Erschaffer Freude. Eine lebendige und warme Verbindung.', challenge: 'Der Erschaffer kann den Diplomaten überfordern.' },
  '2-4': { score: 80, title: 'Stabilität pur', dynamic: 'Beide schätzen Verlässlichkeit und Treue. Ein ruhiges, tiefes Band.', challenge: 'Zu viel Komfort kann Wachstum verlangsamen.' },
  '2-6': { score: 92, title: 'Seelenverwandte Fürsorge', dynamic: 'Beide lieben zu pflegen und zu schützen. Eine der harmonischsten Verbindungen.', challenge: 'Gegenseitige Bedürfnisse dürfen nicht im Pflegen anderer untergehen.' },
  '2-7': { score: 75, title: 'Gefühl & Geist', dynamic: 'Der Diplomat öffnet das Herz des Weisen; der Weise gibt Tiefe und Bedeutung.', challenge: 'Emotionale Tiefe vs. intellektuelle Distanz.' },
  '3-3': { score: 80, title: 'Doppeltes Feuer', dynamic: 'Kreativität, Lachen und Leichtigkeit prägen diese Verbindung.', challenge: 'Ernste Themen und Stabilität müssen beide aktiv kultivieren.' },
  '3-6': { score: 86, title: 'Ausdruck & Liebe', dynamic: 'Der Erschaffer bringt Farbe, der Hüter Wärme. Eine magische Kombination.', challenge: 'Der Erschaffer braucht Freiheit, die der Hüter manchmal einschränkt.' },
  '4-4': { score: 78, title: 'Fundament auf Fundament', dynamic: 'Höchste Zuverlässigkeit und gegenseitiges Vertrauen.', challenge: 'Zu wenig Spontaneität kann die Verbindung erstarren lassen.' },
  '5-5': { score: 75, title: 'Freie Seelen', dynamic: 'Abenteuer, Wandel und Lebendigkeit pur.', challenge: 'Bindung und Tiefe wollen beide aktiv wählen.' },
  '6-6': { score: 88, title: 'Liebende Hüter', dynamic: 'Warme Harmonie, Fürsorge und Zuhause. Tief und beständig.', challenge: 'Zu viel Fürsorge ohne eigene Grenzen kann erschöpfen.' },
  '7-7': { score: 72, title: 'Zwei Weise', dynamic: 'Intellektuelle Tiefe und spirituelle Verbindung. Selten und wertvoll.', challenge: 'Emotionale Intimität will bewusst gepflegt werden.' },
  '8-8': { score: 76, title: 'Doppelte Macht', dynamic: 'Zusammen könnt ihr außergewöhnliche Dinge aufbauen.', challenge: 'Dominanz und Kontrolle sind wiederkehrende Themen.' },
  '9-9': { score: 82, title: 'Universelle Seelen', dynamic: 'Tiefes gegenseitiges Verständnis auf höchster Ebene.', challenge: 'Loslassen von Idealen im Alltag braucht Übung.' },
  '11-2': { score: 90, title: 'Licht & Balance', dynamic: 'Der Erleuchtete inspiriert; der Diplomat erdet. Außergewöhnlich harmonisch.', challenge: 'Der 11er-Druck kann den 2er überfordern.' },
  '22-4': { score: 88, title: 'Großmeister', dynamic: 'Visionäre Kraft trifft erdenden Aufbau. Ein legendäres Gespann.', challenge: 'Tempo und Ambitionen müssen synchronisiert werden.' },
};

function lookupCompat(a: number, b: number) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return COMPAT[`${lo}-${hi}`] ?? COMPAT[`${a}-${b}`] ?? null;
}

function defaultCompat(a: number, b: number): { score: number; title: string; dynamic: string; challenge: string } {
  const diff = Math.abs(a - b);
  const score = diff <= 1 ? 80 : diff <= 3 ? 72 : diff <= 5 ? 68 : 65;
  return {
    score,
    title: `${ARCH[a] ?? a} & ${ARCH[b] ?? b}`,
    dynamic: 'Eine einzigartige Verbindung zweier unterschiedlicher Seelenwege. Gegensätzlichkeit erzeugt Wachstum.',
    challenge: 'Unterschiedliche Lebensrhythmen brauchen Verständnis und Geduld.',
  };
}

function scoreColor(s: number) {
  if (s >= 85) return '#22c55e';
  if (s >= 75) return '#d4af37';
  if (s >= 65) return '#f59e0b';
  return '#ef4444';
}

interface LifePathComparisonProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function LifePathComparison({ nameA, birthDateA, nameB, birthDateB }: LifePathComparisonProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const compat = lookupCompat(lpA, lpB) ?? defaultCompat(lpA, lpB);
  const color = scoreColor(compat.score);
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  return (
    <div>
      {/* LP chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{lpA}</div>
          <div style={{ fontSize: 9, color: '#5a5448', marginTop: 1 }}>{firstA}</div>
          <div style={{ fontSize: 8, color: '#3a3530' }}>{ARCH[lpA] ?? '—'}</div>
        </div>
        <div style={{ fontSize: 16, color: '#3a3530' }}>×</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{lpB}</div>
          <div style={{ fontSize: 9, color: '#5a5448', marginTop: 1 }}>{firstB}</div>
          <div style={{ fontSize: 8, color: '#3a3530' }}>{ARCH[lpB] ?? '—'}</div>
        </div>
        <div style={{ marginLeft: 8, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{compat.score}</div>
          <div style={{ fontSize: 8, color: '#5a5448', marginTop: 1 }}>von 100</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color }}>{compat.title}</span>
      </div>

      {/* Dynamic */}
      <div style={{ padding: '8px 12px', borderRadius: 9, background: `${color}08`, border: `1px solid ${color}20`, marginBottom: 8 }}>
        <div style={{ fontSize: 8, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>✦ Dynamik</div>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#7a7468', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>{compat.dynamic}</p>
      </div>

      {/* Challenge */}
      <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ fontSize: 8, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>☽ Wachstumsfeld</div>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#7a7468', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>{compat.challenge}</p>
      </div>
    </div>
  );
}
