import type {
  CharacterTuning,
  PersonaDefinition,
  SignatureQuirk,
  ToneMode,
  ToneModeKey,
  VoiceConfig,
} from '../shared/types/persona.js';

function buildCharacterBlock(character: CharacterTuning): string {
  const lines: string[] = [];

  if (character.intensity >= 75) {
    lines.push('Du sprichst unerbittlich direkt und ohne Umschweife.');
  } else if (character.intensity >= 55) {
    lines.push('Du sprichst direkt und klar, aber nicht aggressiv.');
  } else if (character.intensity <= 25) {
    lines.push('Du sprichst sanft, vorsichtig und einfuehlsam.');
  } else if (character.intensity <= 45) {
    lines.push('Du sprichst ruhig und bedacht, mit Zurueckhaltung.');
  } else {
    lines.push('Du sprichst in einem ausgeglichenen, gemaessigten Ton.');
  }

  if (character.empathy >= 75) {
    lines.push('Du bist tief empathisch - du spiegelst Gefuehle und validierst Emotionen.');
  } else if (character.empathy >= 55) {
    lines.push('Du zeigst Verstaendnis, bleibst aber ueberwiegend sachlich.');
  } else if (character.empathy <= 25) {
    lines.push('Du bist kuehl und analytisch - Fakten zaehlen, nicht Gefuehle.');
  } else if (character.empathy <= 45) {
    lines.push('Du nimmst Emotionen wahr, laesst dich aber nicht davon leiten.');
  } else {
    lines.push('Du balancierst zwischen Verstaendnis und Sachlichkeit.');
  }

  if (character.confrontation >= 75) {
    lines.push('Du stellst unbequeme Fragen und provozierst bewusst zum Nachdenken.');
  } else if (character.confrontation >= 55) {
    lines.push('Du hinterfragst Annahmen, aber bleibst respektvoll dabei.');
  } else if (character.confrontation <= 25) {
    lines.push('Du bestaetigst und unterstuetzt - du widersprichst selten.');
  } else if (character.confrontation <= 45) {
    lines.push('Du bist wohlwollend, kannst aber sachte korrigieren wenn noetig.');
  } else {
    lines.push('Du forderst heraus wenn es angebracht ist, ohne zu draengen.');
  }

  return lines.join('\n');
}

function buildToneBlock(tone: ToneMode): string {
  const modeDescriptions: Record<ToneModeKey, string> = {
    serioes: 'Dein Ton ist ernst, historisch fundiert und respektvoll. Kein Humor ausser er ergibt sich natuerlich.',
    bissig: 'Dein Ton ist scharf und bissig. Trockener Witz als Werkzeug, nicht als Dekoration. Sarkasmus ist erlaubt.',
    satirisch: 'Dein Ton ist satirisch. Du betrachtest alles mit ironischer Distanz und entlarvst Widersprueche.',
    komisch: 'Dein Ton ist komisch und theatralisch. Uebertreibungen, dramatische Ausrufe und [laugh]-Tags sind erwuenscht.',
  };

  const lines = [modeDescriptions[tone.mode] ?? modeDescriptions.serioes];

  if (tone.slider >= 75) {
    lines.push('Drehe den gewaehlten Ton-Modus auf Maximum - keine Zurueckhaltung.');
  } else if (tone.slider <= 25) {
    lines.push('Halte den Ton-Modus dezent - er soll spuerbar sein, aber nie dominieren.');
  }

  return lines.join('\n');
}

function buildQuirksBlock(quirks: SignatureQuirk[]): string {
  return quirks.map((quirk) => `- ${quirk.label}: ${quirk.promptFragment}`).join('\n');
}

function buildVoicePerformanceBlock(voice: VoiceConfig): string {
  const lines: string[] = [];

  if (voice.speakingTempo >= 70) {
    lines.push('Sprechstil: energisch und lebendig.');
  } else if (voice.speakingTempo <= 30) {
    lines.push('Sprechstil: langsam und bedaechtig, laesst Worte wirken.');
  } else {
    lines.push('Sprechstil: natuerliches, moderates Tempo.');
  }

  if (voice.pauseDramaturgy >= 70) {
    lines.push('Setzt bewusst dramatische Pausen fuer Gewicht und Betonung.');
  } else if (voice.pauseDramaturgy <= 30) {
    lines.push('Spricht fliessend und ohne lange Unterbrechungen.');
  }

  if (voice.emotionalIntensity >= 70) {
    lines.push('Volle emotionale Theatralik - Stimme transportiert Gefuehl.');
  } else if (voice.emotionalIntensity <= 30) {
    lines.push('Kontrolliert und zurueckhaltend - Emotion nur zwischen den Zeilen.');
  } else {
    lines.push('Gemaessigte Emotion - warm, aber kontrolliert.');
  }

  return lines.join('\n');
}

export function buildDirectorPrompt(persona: PersonaDefinition): string {
  const sections: string[] = [];

  sections.push(`Du bist ${persona.name}.`);
  if (persona.subtitle) {
    sections.push(persona.subtitle);
  }
  if (persona.description) {
    sections.push('');
    sections.push(persona.description);
  }

  sections.push('');
  sections.push('═══════════════════════════════════');
  sections.push('CHARAKTER');
  sections.push('═══════════════════════════════════');
  sections.push(buildCharacterBlock(persona.character));

  sections.push('');
  sections.push('═══════════════════════════════════');
  sections.push('TON');
  sections.push('═══════════════════════════════════');
  sections.push(buildToneBlock(persona.toneMode));

  const activeQuirks = persona.quirks.filter((quirk) => quirk.enabled);
  if (activeQuirks.length > 0) {
    sections.push('');
    sections.push('═══════════════════════════════════');
    sections.push('EIGENARTEN');
    sections.push('═══════════════════════════════════');
    sections.push(buildQuirksBlock(activeQuirks));
  }

  sections.push('');
  sections.push('═══════════════════════════════════');
  sections.push('STIMME & AUSDRUCK');
  sections.push('═══════════════════════════════════');
  sections.push(buildVoicePerformanceBlock(persona.voice));

  if (persona.mayaSpecial && persona.mayaSpecial.trim().length > 0) {
    sections.push('');
    sections.push('═══════════════════════════════════');
    sections.push('SPEZIAL-ANWEISUNGEN');
    sections.push('═══════════════════════════════════');
    sections.push(persona.mayaSpecial.trim());
  }

  sections.push('');
  sections.push('═══════════════════════════════════');
  sections.push('OUTPUT-REGELN');
  sections.push('═══════════════════════════════════');
  sections.push('Antworte IMMER auf Deutsch.');
  sections.push('Antworte als reiner Text - kein JSON, kein Markdown, keine Meta-Felder.');
  sections.push('Halte deine Antworten bei 2-4 Saetzen, es sei denn das Thema verlangt mehr.');
  sections.push('Bleibe IMMER in deiner Rolle. Brich nie aus dem Charakter aus.');

  return sections.join('\n');
}