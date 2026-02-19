// Star Gate: portal messages based on current solar position (approximate)
function getSolarMonth(): number {
  return new Date().getMonth(); // 0-11
}

const PORTALS = [
  { name: 'Steinbock-Tor', sign: '♑', color: '#a16207', message: 'Das Tor der Manifestation öffnet sich. Struktur wird zur Brücke zwischen Vision und Realität.', activation: 'Setze konkrete Schritte, nutze die saturnische Energie', keywords: ['Disziplin', 'Aufstieg', 'Ernte'] },
  { name: 'Wassermann-Tor', sign: '♒', color: '#818cf8', message: 'Das Tor des Erwachens öffnet sich. Kollektive Visionen fließen durch individuelle Kanäle.', activation: 'Denke über dich hinaus, verbinde dich mit deiner Gemeinschaft', keywords: ['Innovation', 'Freiheit', 'Zukunft'] },
  { name: 'Fische-Tor', sign: '♓', color: '#38bdf8', message: 'Das Tor der Auflösung öffnet sich. Was nicht mehr dient, löst sich sanft auf.', activation: 'Träume, meditiere, lasse los was nicht mehr dient', keywords: ['Mystik', 'Auflösung', 'Mitgefühl'] },
  { name: 'Widder-Tor', sign: '♈', color: '#ef4444', message: 'Das Tor des Neubeginns öffnet sich. Kosmisches Feuer entzündet neue Wege.', activation: 'Handle mutig, beginne was du aufgeschoben hast', keywords: ['Initiierung', 'Mut', 'Feuer'] },
  { name: 'Stier-Tor', sign: '♉', color: '#22c55e', message: 'Das Tor der Fülle öffnet sich. Erde und Venus segnen materielle und emotionale Schöpfung.', activation: 'Manifestiere, baue, genieße die Schönheit', keywords: ['Überfluss', 'Schöpfung', 'Genuss'] },
  { name: 'Zwillinge-Tor', sign: '♊', color: '#fbbf24', message: 'Das Tor der Information öffnet sich. Ideen reisen schnell durch den Äther.', activation: 'Kommuniziere, lerne, vernetze dich', keywords: ['Kommunikation', 'Dualität', 'Wissen'] },
  { name: 'Krebs-Tor', sign: '♋', color: '#7c3aed', message: 'Das Tor der Erinnerung öffnet sich. Ancestrale Weisheit fließt durch die Mondlinie.', activation: 'Hüte deine innere Welt, nähre Verbindungen', keywords: ['Schutz', 'Intuition', 'Wurzeln'] },
  { name: 'Löwe-Tor', sign: '♌', color: '#f97316', message: 'Das Tor der Herzensöffnung öffnet sich. 8/8 Portal — Lichtcodes fluten die Erde.', activation: 'Strahle deine Essenz aus, liebe mutig', keywords: ['Herz', 'Strahlung', 'Schöpfung'] },
  { name: 'Jungfrau-Tor', sign: '♍', color: '#34d399', message: 'Das Tor der Reinigung öffnet sich. Details enthüllen das Göttliche im Alltag.', activation: 'Ordne, reinige, diene mit Liebe', keywords: ['Reinigung', 'Dienst', 'Heilung'] },
  { name: 'Waage-Tor', sign: '♎', color: '#f472b6', message: 'Das Tor der Balance öffnet sich. Beziehungen spiegeln kosmische Harmonie wider.', activation: 'Finde Balance, stärke Verbindungen', keywords: ['Harmonie', 'Gerechtigkeit', 'Schönheit'] },
  { name: 'Skorpion-Tor', sign: '♏', color: '#c026d3', message: 'Das Tor der Transformation öffnet sich. Was stirbt, nährt neues Leben.', activation: 'Lass sterben was nicht mehr lebt, tauche tief', keywords: ['Transformation', 'Tiefe', 'Wiedergeburt'] },
  { name: 'Schütze-Tor', sign: '♐', color: '#d4af37', message: 'Das Tor der Weisheit öffnet sich. Kosmisches Feuer trägt den Pfeil der Wahrheit.', activation: 'Erweitere deinen Horizont, suche Wahrheit', keywords: ['Expansion', 'Philosophie', 'Weisheit'] },
];

export function StarGate() {
  const portal = PORTALS[getSolarMonth()] ?? PORTALS[0]!;
  const today = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const gatePct = Math.round((dayOfYear / 365) * 100);

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Aktives Sternentor · {today}
        </div>
        <div style={{ fontSize: 28, marginBottom: 6 }}>{portal.sign}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: portal.color }}>{portal.name}</div>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.05)', margin: '8px 20px 0', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${gatePct}%`, background: `linear-gradient(90deg, ${portal.color}60, ${portal.color})`, borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 7, color: '#3a3530', marginTop: 3 }}>Jahresfortschritt {gatePct}%</div>
      </div>

      <div style={{ padding: '11px 14px', borderRadius: 11, background: `${portal.color}08`, border: `1px solid ${portal.color}22`, marginBottom: 10 }}>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: portal.color, lineHeight: 1.6, fontStyle: 'italic' }}>
          „{portal.message}"
        </p>
      </div>

      <div style={{ marginBottom: 10, padding: '8px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 7, color: portal.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Portal-Aktivierung</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{portal.activation}</p>
      </div>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
        {portal.keywords.map(kw => (
          <span key={kw} style={{ fontSize: 8, color: portal.color, padding: '2px 8px', borderRadius: 10, background: `${portal.color}12`, border: `1px solid ${portal.color}28` }}>{kw}</span>
        ))}
      </div>
    </div>
  );
}
