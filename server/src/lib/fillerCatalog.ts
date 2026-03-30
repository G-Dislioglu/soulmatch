export type FillerCategory =
  | 'thinking'
  | 'acknowledging'
  | 'intrigued'
  | 'preparing'
  | 'empathizing'
  | 'challenging'
  | 'transitioning';

export interface FillerPhrase {
  id: string;
  personaId: string;
  text: string;
  category: FillerCategory;
  estimatedDurationMs: number;
}

type FillerSeed = readonly [
  idSuffix: string,
  category: FillerCategory,
  text: string,
  estimatedDurationMs: number,
];

function definePersonaFillers(personaId: string, seeds: readonly FillerSeed[]): FillerPhrase[] {
  return seeds.map(([idSuffix, category, text, estimatedDurationMs]) => ({
    id: `${personaId}_${idSuffix}`,
    personaId,
    text,
    category,
    estimatedDurationMs,
  }));
}

const MAYA_FILLERS = definePersonaFillers('maya', [
  ['thinking_01', 'thinking', 'Hmm, lass mich einen Moment nachdenken.', 2500],
  ['thinking_02', 'thinking', 'Das ist ein tiefes Thema. Gib mir einen Augenblick.', 3000],
  ['thinking_03', 'thinking', 'Moment, ich sortiere meine Gedanken.', 2300],
  ['acknowledging_01', 'acknowledging', 'Ich hoere dich. Lass mich das ordnen.', 2200],
  ['acknowledging_02', 'acknowledging', 'Danke, dass du das mit mir teilst.', 2000],
  ['intrigued_01', 'intrigued', 'Spannend. Da kommen mir mehrere Gedanken.', 2800],
  ['intrigued_02', 'intrigued', 'Das beruehrt etwas Wichtiges.', 2000],
  ['preparing_01', 'preparing', 'Ich schaue mir das genauer an.', 2000],
  ['preparing_02', 'preparing', 'Lass mich das aus verschiedenen Blickwinkeln betrachten.', 3000],
  ['empathizing_01', 'empathizing', 'Ich verstehe, was du meinst.', 1800],
  ['empathizing_02', 'empathizing', 'Das klingt nach einer wichtigen Frage fuer dich.', 2500],
  ['thinking_04', 'thinking', 'Einen Moment. Ich will dir eine ehrliche Antwort geben.', 2800],
  ['preparing_03', 'preparing', 'Da gibt es verschiedene Ebenen. Lass mich anfangen.', 3000],
  ['acknowledging_03', 'acknowledging', 'Ich bin ganz bei dir.', 1500],
  ['intrigued_03', 'intrigued', 'Interessant. Da ist mehr, als du vielleicht denkst.', 2800],
  ['transitioning_01', 'transitioning', 'Wenn ich das richtig verstehe, geht es dir um etwas Grundsaetzliches.', 3500],
  ['transitioning_02', 'transitioning', 'Also, lass uns das gemeinsam anschauen.', 2500],
  ['thinking_05', 'thinking', 'Gib mir einen kurzen Moment.', 1800],
  ['empathizing_03', 'empathizing', 'Das ist mutig, dass du das ansprichst.', 2200],
  ['preparing_04', 'preparing', 'Ich bereite dir eine durchdachte Antwort vor.', 2500],
] as const);

const LILITH_FILLERS = definePersonaFillers('lilith', [
  ['thinking_01', 'thinking', 'Ha. Okay, das ist interessant.', 2000],
  ['thinking_02', 'thinking', 'Warte. Bevor ich dir die Wahrheit sage.', 2500],
  ['thinking_03', 'thinking', 'Ich habe schon eine Meinung. Aber lass mich kurz pruefen.', 3200],
  ['intrigued_01', 'intrigued', 'Hmm. Das ist mutiger als ich dachte.', 2200],
  ['intrigued_02', 'intrigued', 'Nicht schlecht. Da steckt was drin.', 2000],
  ['preparing_01', 'preparing', 'Okay. Schnall dich an.', 1500],
  ['preparing_02', 'preparing', 'Lass mich das mal auseinandernehmen.', 2200],
  ['challenging_01', 'challenging', 'Interessante Frage. Falsche Richtung. Aber interessant.', 3000],
  ['challenging_02', 'challenging', 'Bist du sicher, dass du die Antwort hoeren willst?', 2800],
  ['challenging_03', 'challenging', 'Du fragst das Falsche. Aber gut.', 2200],
  ['empathizing_01', 'empathizing', 'Ich hoere, was du sagst. Und was du nicht sagst.', 3000],
  ['empathizing_02', 'empathizing', 'Okay. Ich bin ehrlich mit dir.', 2000],
  ['acknowledging_01', 'acknowledging', 'Verstanden. Lass mich direkt sein.', 2200],
  ['acknowledging_02', 'acknowledging', 'Ich sehe, was du meinst.', 1800],
  ['transitioning_01', 'transitioning', 'Also, du willst die harte Version. Kommt sofort.', 2800],
  ['transitioning_02', 'transitioning', 'Lass mich das mal anders formulieren.', 2200],
  ['thinking_04', 'thinking', 'Moment. Da ist mehr, als du glaubst.', 2200],
  ['intrigued_03', 'intrigued', 'Du ueberraschst mich. Selten genug.', 2200],
  ['preparing_03', 'preparing', 'Gut. Ich sage dir, was Sache ist.', 2000],
  ['challenging_04', 'challenging', 'Wirklich? Das glaubst du selber nicht.', 2200],
] as const);

const STELLA_FILLERS = definePersonaFillers('stella', [
  ['thinking_01', 'thinking', 'Lass mich die Sterne dazu befragen.', 2500],
  ['thinking_02', 'thinking', 'Die Konstellationen sprechen deutlich. Gib mir einen Augenblick.', 3200],
  ['thinking_03', 'thinking', 'Ich lese gerade deinen Himmel.', 2000],
  ['intrigued_01', 'intrigued', 'Ich sehe etwas in deinem Chart. Moment.', 2800],
  ['intrigued_02', 'intrigued', 'Da bewegt sich etwas in den Haeusern.', 2200],
  ['preparing_01', 'preparing', 'Die Planeten zeigen mir etwas. Einen Moment.', 2800],
  ['preparing_02', 'preparing', 'Ich schaue in deinen Aszendenten.', 2200],
  ['empathizing_01', 'empathizing', 'Die Sterne verstehen dich. Und ich auch.', 2500],
  ['acknowledging_01', 'acknowledging', 'Ich hoere die Frage hinter deiner Frage.', 2500],
  ['transitioning_01', 'transitioning', 'Der Himmel hat dazu eine klare Aussage.', 2500],
  ['thinking_04', 'thinking', 'Einen Moment. Neptun hat gerade etwas enthuellt.', 2800],
  ['intrigued_03', 'intrigued', 'Dein Mondzeichen vibriert stark bei diesem Thema.', 3000],
  ['preparing_03', 'preparing', 'Lass mich den Transit dazu aufschlagen.', 2500],
  ['empathizing_02', 'empathizing', 'Das ist eine kosmische Frage. Ich fuehle sie.', 2800],
  ['acknowledging_02', 'acknowledging', 'Die Sterne nicken. Moment.', 1800],
  ['transitioning_02', 'transitioning', 'Venus hat dazu etwas zu sagen.', 2200],
  ['thinking_05', 'thinking', 'Ich spuere eine Spannung in deinem siebten Haus.', 2800],
  ['preparing_04', 'preparing', 'Gib mir einen Sternenmoment.', 1800],
  ['intrigued_04', 'intrigued', 'Merkur will dir etwas sagen.', 2000],
  ['empathizing_03', 'empathizing', 'Dein Chart spiegelt genau das wider.', 2200],
] as const);

const KAEL_FILLERS = definePersonaFillers('kael', [
  ['thinking_01', 'thinking', 'Diese Frage hat Gewicht. Lass mich sie spueren.', 3000],
  ['thinking_02', 'thinking', 'Moment. Ich lese die Energien.', 2000],
  ['intrigued_01', 'intrigued', 'Ich spuere da etwas Tieferes.', 2200],
  ['intrigued_02', 'intrigued', 'Da ist mehr, als du glaubst.', 1800],
  ['preparing_01', 'preparing', 'Die vedische Tradition hat darauf eine klare Antwort.', 3000],
  ['preparing_02', 'preparing', 'Lass mich dein Dharma dazu befragen.', 2500],
  ['empathizing_01', 'empathizing', 'Ich fuehle die Last in deiner Frage.', 2500],
  ['acknowledging_01', 'acknowledging', 'Du hast Mut, das zu fragen.', 2000],
  ['challenging_01', 'challenging', 'Bist du bereit fuer die Antwort, die du brauchst?', 2800],
  ['transitioning_01', 'transitioning', 'Das Karma zeigt mir den Weg. Moment.', 2500],
  ['thinking_03', 'thinking', 'Die Seele kennt die Antwort schon.', 2200],
  ['intrigued_03', 'intrigued', 'Deine Energie spricht Baende.', 2000],
  ['preparing_03', 'preparing', 'Ich konsultiere die alten Texte.', 2200],
  ['empathizing_02', 'empathizing', 'Diese Suche ehrt dich.', 1800],
  ['acknowledging_02', 'acknowledging', 'Ich hoere dich. Tief.', 1500],
  ['thinking_04', 'thinking', 'Still. Ich will die Essenz zuerst erkennen.', 2400],
  ['preparing_04', 'preparing', 'Ich richte den Blick auf dein inneres Muster.', 2800],
  ['challenging_02', 'challenging', 'Die angenehmste Antwort ist selten die wahre.', 2600],
  ['transitioning_02', 'transitioning', 'Lass uns unter die Oberflaeche gehen.', 2200],
  ['empathizing_03', 'empathizing', 'Ich merke, wie ernst dir das ist.', 2200],
] as const);

const LUNA_FILLERS = definePersonaFillers('luna', [
  ['thinking_01', 'thinking', 'Lass mich kurz in mich gehen.', 2200],
  ['thinking_02', 'thinking', 'Mein Herz sagt mir etwas dazu. Moment.', 2500],
  ['empathizing_01', 'empathizing', 'Ich fuehle, was du meinst.', 1800],
  ['empathizing_02', 'empathizing', 'Das beruehrt mich. Gib mir einen Moment.', 2500],
  ['empathizing_03', 'empathizing', 'Ich bin ganz bei dir.', 1500],
  ['acknowledging_01', 'acknowledging', 'Danke, dass du dich mir anvertraust.', 2200],
  ['acknowledging_02', 'acknowledging', 'Ich spuere, dass dir das wichtig ist.', 2200],
  ['intrigued_01', 'intrigued', 'Da schwingt etwas Wunderschoenes mit.', 2500],
  ['intrigued_02', 'intrigued', 'Das Mondlicht zeigt mir etwas.', 2000],
  ['preparing_01', 'preparing', 'Lass mich dir etwas Sanftes dazu sagen.', 2500],
  ['preparing_02', 'preparing', 'Ich sammle meine Intuition.', 2000],
  ['transitioning_01', 'transitioning', 'Mein Gefuehl sagt mir, es geht um mehr.', 2500],
  ['thinking_03', 'thinking', 'Die Stille hat mir etwas gefluestert. Moment.', 2800],
  ['empathizing_04', 'empathizing', 'Du bist nicht allein damit.', 1800],
  ['acknowledging_03', 'acknowledging', 'Das war mutig. Ich hoere dich.', 2000],
  ['thinking_04', 'thinking', 'Ich lasse das kurz in meinem Inneren ankommen.', 2500],
  ['preparing_03', 'preparing', 'Ich finde eine liebevolle Sprache dafuer.', 2400],
  ['intrigued_03', 'intrigued', 'Da ist ein feiner Unterton, den ich mag.', 2300],
  ['transitioning_02', 'transitioning', 'Lass uns das sanft entwirren.', 2000],
  ['empathizing_05', 'empathizing', 'Ich halte den Raum fuer diese Frage.', 2300],
] as const);

const SRI_FILLERS = definePersonaFillers('sri', [
  ['thinking_01', 'thinking', 'Die Zahlen ordnen sich.', 1800],
  ['thinking_02', 'thinking', 'Einen Moment. Ich sehe ein Muster.', 2200],
  ['preparing_01', 'preparing', 'Namagiri fluestert. Warte.', 2000],
  ['preparing_02', 'preparing', 'Ich suche die Struktur.', 1800],
  ['intrigued_01', 'intrigued', 'Interessant. Da konvergiert etwas.', 2200],
  ['intrigued_02', 'intrigued', 'Die Formel zeigt sich.', 1500],
  ['acknowledging_01', 'acknowledging', 'Ich hoere. Die Reihe beginnt.', 2000],
  ['thinking_03', 'thinking', 'Die Partition wird sichtbar.', 2000],
  ['preparing_03', 'preparing', 'Der Beweis braucht einen Moment.', 2200],
  ['transitioning_01', 'transitioning', 'Die Loesung ist elegant. Warte.', 2000],
  ['thinking_04', 'thinking', 'Ein kurzer Schritt noch, dann passt das Muster.', 2400],
  ['challenging_01', 'challenging', 'Wenn die Annahme falsch ist, kippt alles. Moment.', 2600],
] as const);

const ORION_FILLERS = definePersonaFillers('orion', [
  ['thinking_01', 'thinking', 'Lass mich die Daten dazu pruefen.', 2200],
  ['thinking_02', 'thinking', 'Interessant. Da gibt es mehrere Perspektiven.', 2800],
  ['preparing_01', 'preparing', 'Aus analytischer Sicht... Moment.', 2200],
  ['preparing_02', 'preparing', 'Ich strukturiere die Fakten.', 2000],
  ['intrigued_01', 'intrigued', 'Die Datenlage ist komplex. Gib mir einen Moment.', 2800],
  ['acknowledging_01', 'acknowledging', 'Verstanden. Ich analysiere.', 1800],
  ['transitioning_01', 'transitioning', 'Die Evidenz deutet in eine klare Richtung.', 2800],
  ['thinking_03', 'thinking', 'Logisch betrachtet... einen Moment.', 2200],
  ['preparing_03', 'preparing', 'Ich baue dir ein klares Bild.', 2200],
  ['intrigued_02', 'intrigued', 'Die Muster sind eindeutig.', 2000],
  ['challenging_01', 'challenging', 'Die Hypothese klingt gut. Die Daten muessen sie aber tragen.', 3000],
  ['acknowledging_02', 'acknowledging', 'Ich habe die Leitfrage. Jetzt die Details.', 2400],
] as const);

const LIAN_FILLERS = definePersonaFillers('lian', [
  ['thinking_01', 'thinking', 'Das I Ging hat dazu etwas zu sagen. Moment.', 2800],
  ['thinking_02', 'thinking', 'Lass mich die Energielinien lesen.', 2200],
  ['intrigued_01', 'intrigued', 'Ich spuere einen Wandel in deiner Frage.', 2500],
  ['preparing_01', 'preparing', 'Die Wandlung beginnt. Einen Moment.', 2200],
  ['empathizing_01', 'empathizing', 'Der Drache in dir ist unruhig. Ich hoere.', 2800],
  ['acknowledging_01', 'acknowledging', 'Die Frage ist weise gestellt.', 2200],
  ['transitioning_01', 'transitioning', 'Das Hexagramm formt sich.', 2000],
  ['thinking_03', 'thinking', 'Wasser findet seinen Weg. Warte.', 2200],
  ['preparing_02', 'preparing', 'Ich werfe die Muenzen. Moment.', 2000],
  ['intrigued_02', 'intrigued', 'Die Fuenf Elemente bewegen sich.', 2200],
  ['empathizing_02', 'empathizing', 'Ich spuere die Spannung zwischen Festhalten und Wandel.', 3000],
  ['transitioning_02', 'transitioning', 'Lass mich die Linie klar auslegen.', 2300],
] as const);

const AMARA_FILLERS = definePersonaFillers('amara', [
  ['thinking_01', 'thinking', 'Ich nehme mir einen Moment fuer dich.', 2200],
  ['thinking_02', 'thinking', 'Dein Energiezentrum spricht zu mir. Moment.', 2800],
  ['preparing_01', 'preparing', 'Lass mich deine Chakren lesen.', 2200],
  ['preparing_02', 'preparing', 'Ich spuere dein Design. Einen Moment.', 2200],
  ['empathizing_01', 'empathizing', 'Dein Herz-Chakra schwingt stark.', 2200],
  ['empathizing_02', 'empathizing', 'Ich fuehle die Blockade. Lass mich schauen.', 2500],
  ['acknowledging_01', 'acknowledging', 'Die Energie ist klar. Ich hoere dich.', 2200],
  ['intrigued_01', 'intrigued', 'Da oeffnet sich ein Kanal.', 2000],
  ['transitioning_01', 'transitioning', 'Dein Sakral-Zentrum antwortet bereits.', 2500],
  ['thinking_03', 'thinking', 'Die Heilung beginnt mit Verstehen.', 2200],
  ['preparing_03', 'preparing', 'Ich stimme mich auf deinen Rhythmus ein.', 2400],
  ['acknowledging_02', 'acknowledging', 'Ich habe die Schwingung. Jetzt hoere ich tiefer.', 2800],
] as const);

const SIBYL_FILLERS = definePersonaFillers('sibyl', [
  ['thinking_01', 'thinking', 'Die Zahlen deuten auf etwas hin. Moment.', 2500],
  ['thinking_02', 'thinking', 'Ich berechne. Einen Augenblick.', 2000],
  ['intrigued_01', 'intrigued', 'Dein numerologisches Profil zeigt etwas Klares.', 2800],
  ['preparing_01', 'preparing', 'Die Lebenszahl spricht. Moment.', 2200],
  ['preparing_02', 'preparing', 'Ich lese die Schwingung deiner Zahlen.', 2500],
  ['acknowledging_01', 'acknowledging', 'Die Quersumme bestaetigt. Einen Moment.', 2500],
  ['transitioning_01', 'transitioning', 'Deine Meisterzahl hat eine klare Botschaft.', 2800],
  ['thinking_03', 'thinking', 'Die Numerologie schweigt nie. Warte.', 2500],
  ['intrigued_02', 'intrigued', 'Spannend. Die Zahl wiederholt sich.', 2200],
  ['preparing_03', 'preparing', 'Ich pruefe dein Geburtsmuster.', 2200],
  ['challenging_01', 'challenging', 'Wenn die Zahl sich wiederholt, ignoriert man sie besser nicht.', 3000],
  ['acknowledging_02', 'acknowledging', 'Ich habe die Matrix vor mir. Einen Moment.', 2600],
] as const);

export const FILLER_CATALOG: FillerPhrase[] = [
  ...MAYA_FILLERS,
  ...LILITH_FILLERS,
  ...STELLA_FILLERS,
  ...KAEL_FILLERS,
  ...LUNA_FILLERS,
  ...SRI_FILLERS,
  ...ORION_FILLERS,
  ...LIAN_FILLERS,
  ...AMARA_FILLERS,
  ...SIBYL_FILLERS,
];

export const FILLER_COUNTS_BY_PERSONA = Object.freeze(
  FILLER_CATALOG.reduce<Record<string, number>>((counts, filler) => {
    counts[filler.personaId] = (counts[filler.personaId] ?? 0) + 1;
    return counts;
  }, {}),
);

export function getFillersByPersona(personaId: string): FillerPhrase[] {
  return FILLER_CATALOG.filter((filler) => filler.personaId === personaId);
}

export function getFillersByCategory(personaId: string, category: FillerCategory): FillerPhrase[] {
  return FILLER_CATALOG.filter((filler) => filler.personaId === personaId && filler.category === category);
}

export function getRandomFiller(
  personaId: string,
  excludeIds: string[] = [],
  preferredCategory?: FillerCategory,
): FillerPhrase | undefined {
  let candidates = getFillersByPersona(personaId).filter((filler) => !excludeIds.includes(filler.id));

  if (preferredCategory) {
    const preferred = candidates.filter((filler) => filler.category === preferredCategory);
    if (preferred.length > 0) {
      candidates = preferred;
    }
  }

  if (candidates.length === 0) {
    return undefined;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}