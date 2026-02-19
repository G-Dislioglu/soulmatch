import { reduceToNumber } from '../../M05_numerology/lib/calc';

const YEAR_THEMES: Record<number, { theme: string; color: string; q1: string; q2: string; q3: string; q4: string }> = {
  1: { theme: 'Jahr der gemeinsamen Neustarts', color: '#ef4444', q1: 'Neue Richtung setzen, Pläne schmieden', q2: 'Mutige erste Schritte gemeinsam wagen', q3: 'Eigenständigkeit stärken, Ich+Wir balancieren', q4: 'Fundament des Neubeginns vollenden' },
  2: { theme: 'Jahr der Vertiefung', color: '#93c5fd', q1: 'Vertrauen aufbauen, Füreinander öffnen', q2: 'Tiefe Gespräche und emotionale Verbindung', q3: 'Grenzen und Bedürfnisse klar benennen', q4: 'Innige Verbundenheit festigen' },
  3: { theme: 'Jahr des gemeinsamen Ausdrucks', color: '#fbbf24', q1: 'Kreative Projekte gemeinsam beginnen', q2: 'Freude und Leichtigkeit kultivieren', q3: 'Kommunikationsmuster bewusst gestalten', q4: 'Gemeinsame Kreation feiern' },
  4: { theme: 'Jahr des Aufbaus', color: '#a16207', q1: 'Gemeinsame Ziele und Strukturen klären', q2: 'Diszipliniert auf Fundament bauen', q3: 'Herausforderungen als Prüfung des Fundaments', q4: 'Erreichtes mit Stolz betrachten' },
  5: { theme: 'Jahr des Wandels', color: '#22d3ee', q1: 'Veränderung willkommen heißen', q2: 'Abenteuer und neue Erfahrungen', q3: 'Freiheit und Verbindlichkeit balancieren', q4: 'Gewachsene Flexibilität integrieren' },
  6: { theme: 'Jahr der Fürsorge', color: '#22c55e', q1: 'Heim und Geborgenheit gestalten', q2: 'Verantwortung füreinander klären', q3: 'Heilungsmomente und Fürsorge vertiefen', q4: 'Liebe in den Alltag weben' },
  7: { theme: 'Jahr der inneren Arbeit', color: '#7c3aed', q1: 'Rückzug und gemeinsame Stille', q2: 'Tiefe Selbstreflexion und Ehrlichkeit', q3: 'Spirituelle Reise gemeinsam gehen', q4: 'Weisheit und Vertrauen vertiefen' },
  8: { theme: 'Jahr der Manifestation', color: '#d4af37', q1: 'Große gemeinsame Ziele setzen', q2: 'Entschlossen in Richtung Erfolg handeln', q3: 'Macht und Ressourcen weise einsetzen', q4: 'Erntedankfest der gemeinsamen Schöpfung' },
  9: { theme: 'Jahr des Abschlusses', color: '#c026d3', q1: 'Loslassen was nicht mehr dient', q2: 'Abschließen, vergeben, befreien', q3: 'Raum für Neues schaffen', q4: 'Dem gemeinsamen Erbe Ehre erweisen' },
};

const DEFAULT_YEAR = { theme: 'Jahr der Entwicklung', color: '#818cf8', q1: 'Gemeinsam reflektieren', q2: 'Mutig vorangehen', q3: 'Herausforderungen meistern', q4: 'Errungenes feiern' };

interface SharedYearForecastProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function SharedYearForecast({ nameA, birthDateA, nameB, birthDateB }: SharedYearForecastProps) {
  function getPY(bd: string): number {
    const p = bd.split('-');
    const mm = parseInt(p[1] ?? '0', 10);
    const dd = parseInt(p[2] ?? '0', 10);
    const cy = new Date().getFullYear();
    return reduceToNumber(mm + dd + Math.floor(cy / 1000) + Math.floor((cy % 1000) / 100) + Math.floor((cy % 100) / 10) + (cy % 10)) || 9;
  }

  const pyA = getPY(birthDateA);
  const pyB = getPY(birthDateB);
  const sharedYear = reduceToNumber(pyA + pyB) || 9;
  const data = YEAR_THEMES[sharedYear] ?? DEFAULT_YEAR;
  const year = new Date().getFullYear();
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  const quarters = [
    { label: 'Q1 Jan–Mär', text: data.q1 },
    { label: 'Q2 Apr–Jun', text: data.q2 },
    { label: 'Q3 Jul–Sep', text: data.q3 },
    { label: 'Q4 Okt–Dez', text: data.q4 },
  ];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} (PJ {pyA}) & {firstB} (PJ {pyB}) · {year}
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: data.color }}>{data.theme}</div>
        <div style={{ fontSize: 9, color: '#5a5448', marginTop: 2 }}>Gemeinsames Jahresenergie-Feld {sharedYear}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {quarters.map(({ label, text }) => (
          <div key={label} style={{ padding: '8px 10px', borderRadius: 9, background: `${data.color}07`, border: `1px solid ${data.color}20` }}>
            <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
            <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{text}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 9, background: `${data.color}07`, border: `1px solid ${data.color}20`, textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 11, color: data.color, fontStyle: 'italic', lineHeight: 1.5 }}>
          Euer {year} steht im Zeichen des Gemeinsamen — nutzt diese Energie bewusst.
        </p>
      </div>
    </div>
  );
}
