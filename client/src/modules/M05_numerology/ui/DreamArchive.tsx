import { calcLifePath, calcSoulUrge } from '../lib/calc';

interface DreamSymbol { symbol: string; icon: string; meaning: string; message: string }

const LP_DREAMS: Record<number, { archetype: string; symbols: DreamSymbol[]; practice: string }> = {
  1: {
    archetype: 'Der Held im Traum',
    symbols: [
      { symbol: 'Feuer', icon: '🔥', meaning: 'Transformation, Wille, Neubeginn', message: 'Dein inneres Feuer möchte entfacht werden.' },
      { symbol: 'Gipfel', icon: '⛰️', meaning: 'Ziele, Ambitionen, Überwindung', message: 'Du stehst kurz vor einem Durchbruch.' },
      { symbol: 'Löwe', icon: '🦁', meaning: 'Mut, Führung, Selbstausdruck', message: 'Deine Führungskraft wartet auf Entfaltung.' },
    ],
    practice: 'Halte beim Aufwachen sofort deine Träume fest — deine ersten Gedanken sind Gold.',
  },
  2: {
    archetype: 'Der Brückenbauer im Traum',
    symbols: [
      { symbol: 'Wasser', icon: '💧', meaning: 'Emotionen, Fließen, Heilung', message: 'Tief empfundene Gefühle suchen Ausdruck.' },
      { symbol: 'Brücke', icon: '🌉', meaning: 'Verbindung, Übergang, Versöhnung', message: 'Eine wichtige Verbindung will geheilt werden.' },
      { symbol: 'Schmetterling', icon: '🦋', meaning: 'Wandel, Sanftheit, Schönheit', message: 'Eine innere Verwandlung ist im Gange.' },
    ],
    practice: 'Schreibe vor dem Schlafen eine Frage auf — deine Träume geben Antworten.',
  },
  3: {
    archetype: 'Der Schöpfer im Traum',
    symbols: [
      { symbol: 'Farben', icon: '🎨', meaning: 'Kreativität, Ausdruck, Emotion', message: 'Deine kreative Kraft sucht einen Kanal.' },
      { symbol: 'Musik', icon: '🎵', meaning: 'Harmonie, Ausdruck, Freude', message: 'Lass die innere Melodie deines Lebens erklingen.' },
      { symbol: 'Vogel', icon: '🕊️', meaning: 'Freiheit, Botschaft, Seele', message: 'Deine Seele möchte frei und ungezügelt sein.' },
    ],
    practice: 'Zeichne oder male deine Traumbilder — Worte erfassen sie oft nicht vollständig.',
  },
  4: {
    archetype: 'Der Baumeister im Traum',
    symbols: [
      { symbol: 'Erde', icon: '🌍', meaning: 'Grundlage, Sicherheit, Beständigkeit', message: 'Du baust etwas Dauerhaftes — bewusst oder unbewusst.' },
      { symbol: 'Haus', icon: '🏠', meaning: 'Selbst, Fundament, Familie', message: 'Dein inneres Zuhause verlangt Aufmerksamkeit.' },
      { symbol: 'Baum', icon: '🌳', meaning: 'Wachstum, Wurzeln, Verbindung', message: 'Deine Wurzeln tragen dich mehr als du weißt.' },
    ],
    practice: 'Führe ein strukturiertes Traumtagebuch — kategorisiere nach Themen.',
  },
  5: {
    archetype: 'Der Reisende im Traum',
    symbols: [
      { symbol: 'Reise', icon: '🗺️', meaning: 'Wandel, Entdeckung, Freiheit', message: 'Eine neue Reise — äußerlich oder innerlich — ruft.' },
      { symbol: 'Wind', icon: '💨', meaning: 'Veränderung, Bewegung, Geist', message: 'Lass dich vom Wind des Wandels tragen.' },
      { symbol: 'Schlüssel', icon: '🗝️', meaning: 'Geheimnis, Zugang, Möglichkeit', message: 'Du hast bereits den Schlüssel — such nach ihm.' },
    ],
    practice: 'Träume als Reiseziele betrachten — wohin führen sie dich gerade?',
  },
  6: {
    archetype: 'Der Hüter im Traum',
    symbols: [
      { symbol: 'Garten', icon: '🌸', meaning: 'Pflege, Wachstum, Schönheit', message: 'Was pflegst du — und was vernachlässigst du?' },
      { symbol: 'Kind', icon: '👶', meaning: 'Inneres Kind, Reinheit, Kreativität', message: 'Dein inneres Kind möchte gesehen werden.' },
      { symbol: 'Herz', icon: '💚', meaning: 'Liebe, Mitgefühl, Heilung', message: 'Dein Herz heilt sich gerade selbst.' },
    ],
    practice: 'Frage dich nach jedem Traum: "Für wen oder was trage ich Verantwortung?"',
  },
  7: {
    archetype: 'Der Weise im Traum',
    symbols: [
      { symbol: 'Sterne', icon: '✨', meaning: 'Weisheit, Führung, Höheres Selbst', message: 'Das Universum sendet dir eine Botschaft.' },
      { symbol: 'Spiegel', icon: '🪞', meaning: 'Selbstkenntnis, Reflektion, Wahrheit', message: 'Was zeigt dir dein innerer Spiegel?' },
      { symbol: 'Labyrinth', icon: '🌀', meaning: 'Suche, Innenschau, Weg', message: 'Der Weg nach innen ist gerade richtig.' },
    ],
    practice: 'Meditiere 5 Minuten vor dem Schlafen — deine Traumweisheit vertieft sich.',
  },
  8: {
    archetype: 'Der Manifestor im Traum',
    symbols: [
      { symbol: 'Gold', icon: '🏆', meaning: 'Erfolg, Fülle, Macht', message: 'Was du dir vorstellst beginnt sich zu manifestieren.' },
      { symbol: 'Berg', icon: '🗻', meaning: 'Herausforderung, Kraft, Gipfel', message: 'Die Kraft, die du brauchst, ist bereits in dir.' },
      { symbol: 'Adler', icon: '🦅', meaning: 'Perspektive, Freiheit, Macht', message: 'Steige auf und sieh das große Bild.' },
    ],
    practice: 'Visualisiere vor dem Schlafen dein Ziel — Träume werden zu Blaupausen.',
  },
  9: {
    archetype: 'Der Vollender im Traum',
    symbols: [
      { symbol: 'Ozean', icon: '🌊', meaning: 'Universalität, Tiefe, Vollendung', message: 'Du träumst von dem, was über dich hinausgeht.' },
      { symbol: 'Abschied', icon: '🌅', meaning: 'Loslassen, Vollendung, Neubeginn', message: 'Etwas will beendet werden — mit Würde.' },
      { symbol: 'Licht', icon: '☀️', meaning: 'Erleuchtung, Heilung, Höheres', message: 'Dein Licht leuchtet auch dann wenn du schläfst.' },
    ],
    practice: 'Frage dich morgens: "Was darf ich heute loslassen?"',
  },
  11: {
    archetype: 'Der Visionär im Traum',
    symbols: [
      { symbol: 'Portal', icon: '🌌', meaning: 'Zugang zu anderen Welten, Vision', message: 'Du empfängst kosmische Botschaften im Schlaf.' },
      { symbol: 'Kristall', icon: '💎', meaning: 'Klarheit, Wahrheit, Licht', message: 'Die Wahrheit kristallisiert sich gerade heraus.' },
      { symbol: 'Engel', icon: '👼', meaning: 'Führung, Schutz, Botschaft', message: 'Du wirst geführt — auch wenn du es nicht siehst.' },
    ],
    practice: 'Schreibe prophhetische Träume sofort auf — sie können sich erfüllen.',
  },
  22: {
    archetype: 'Der Architekt im Traum',
    symbols: [
      { symbol: 'Pyramide', icon: '🔺', meaning: 'Struktur, Macht, Dauerhaftigkeit', message: 'Was du baust, wird Jahrhunderte überdauern.' },
      { symbol: 'Brücke', icon: '🌉', meaning: 'Verbindung zwischen Welten', message: 'Du überbrückst das Sichtbare und Unsichtbare.' },
      { symbol: 'Uhr', icon: '⌚', meaning: 'Zeit, Geduld, Masterplan', message: 'Der richtige Zeitpunkt kommt.' },
    ],
    practice: 'Halte architektonische Traumbilder fest — sie sind Blaupausen deiner Vision.',
  },
  33: {
    archetype: 'Der Heiler im Traum',
    symbols: [
      { symbol: 'Heilung', icon: '💚', meaning: 'Transformation durch Liebe', message: 'Deine Träume heilen Wunden die du nicht siehst.' },
      { symbol: 'Regenbogen', icon: '🌈', meaning: 'Versprechen, Hoffnung, Einheit', message: 'Nach jedem Sturm kommt das Licht.' },
      { symbol: 'Mutter', icon: '🤱', meaning: 'Fürsorge, Schutz, bedingungslose Liebe', message: 'Du bist getragen — immer.' },
    ],
    practice: 'Schicke Heilungsabsichten in deine Träume — sie reichen weiter als du weißt.',
  },
};

const DEFAULT_DREAMS = {
  archetype: 'Der Träumer',
  symbols: [
    { symbol: 'Licht', icon: '✨', meaning: 'Klarheit, Führung, Wahrheit', message: 'Das Licht zeigt dir den Weg.' },
    { symbol: 'Wasser', icon: '💧', meaning: 'Gefühle, Fließen, Reinigung', message: 'Lass deine Emotionen fließen.' },
    { symbol: 'Weg', icon: '🛤️', meaning: 'Reise, Entwicklung, Zukunft', message: 'Du bist auf dem richtigen Weg.' },
  ],
  practice: 'Schreibe täglich drei Traumbilder auf — ohne zu interpretieren.',
};

interface DreamArchiveProps { name: string; birthDate: string; }

export function DreamArchive({ name: _name, birthDate }: DreamArchiveProps) {
  const lp = calcLifePath(birthDate).value;
  const su = calcSoulUrge(_name).value;
  const dreams = LP_DREAMS[lp] ?? DEFAULT_DREAMS;
  const GOLD = '#d4af37';

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>LP {lp} · SU {su} · Seelen-Traumsymbole</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: GOLD }}>{dreams.archetype}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {dreams.symbols.map((sym, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{sym.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: GOLD }}>{sym.symbol}</span>
                <span style={{ fontSize: 8, color: '#3a3530' }}>{sym.meaning}</span>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>{sym.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: `${GOLD}07`, border: `1px solid ${GOLD}22` }}>
        <div style={{ fontSize: 8, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>✦ Traumpraxis</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.5 }}>{dreams.practice}</p>
      </div>
    </div>
  );
}
