import type {
  ArcanaPersonaDefinition,
  ArcanaSignatureQuirk,
  ArcanaToneMode,
  ArcanaToneModeKey,
  ArcanaVoiceConfig,
} from '../hooks/useArcanaApi';

export const TONE_MODE_IMPACT_TEXT: Record<ArcanaToneModeKey, string> = {
  serioes: 'Historisch fundiert, sachlich, kein Humor.',
  bissig: 'Scharf, trocken, Sarkasmus als Werkzeug.',
  satirisch: 'Ironische Distanz, entlarvt Widersprueche.',
  komisch: 'Maximale Uebertreibung, [laugh]-Tags, Theater.',
};

function describeIntensity(value: number): string {
  if (value >= 75) return 'Unerbittlich';
  if (value >= 55) return 'Direkt';
  if (value <= 25) return 'Sanft';
  if (value <= 45) return 'Ruhig';
  return 'Ausgeglichen';
}

function describeEmpathy(value: number): string {
  if (value >= 75) return 'Tief mitfuehlend';
  if (value >= 55) return 'Einfuehlsam';
  if (value <= 25) return 'Kuehl';
  if (value <= 45) return 'Neutral';
  return 'Ausgeglichen';
}

function describeConfrontation(value: number): string {
  if (value >= 75) return 'Schonungslos';
  if (value >= 55) return 'Provokativ';
  if (value <= 25) return 'Bestaetigend';
  if (value <= 45) return 'Wohlwollend';
  return 'Herausfordernd';
}

function describeTempo(value: number): string {
  if (value >= 75) return 'Lebendig';
  if (value >= 55) return 'Dynamisch';
  if (value <= 25) return 'Langsam';
  if (value <= 45) return 'Bedacht';
  return 'Ausgeglichen';
}

function describePauses(value: number): string {
  if (value >= 75) return 'Dramatisch';
  if (value >= 55) return 'Betont';
  if (value <= 25) return 'Fliessend';
  if (value <= 45) return 'Leicht gesetzt';
  return 'Kontrolliert';
}

function describeEmotion(value: number): string {
  if (value >= 75) return 'Theatralisch';
  if (value >= 55) return 'Warm';
  if (value <= 25) return 'Neutral';
  if (value <= 45) return 'Kontrolliert';
  return 'Spuerbar';
}

function buildCharacterBlock(persona: ArcanaPersonaDefinition): string {
  const lines: string[] = [];
  const { character } = persona;

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

function buildToneBlock(tone: ArcanaToneMode): string {
  const modeDescriptions: Record<ArcanaToneModeKey, string> = {
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

function buildQuirksBlock(quirks: ArcanaSignatureQuirk[]): string {
  return quirks.map((quirk) => `- ${quirk.label}: ${quirk.promptFragment}`).join('\n');
}

function buildVoicePerformanceBlock(voice: ArcanaVoiceConfig): string {
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

export function buildClientDirectorPrompt(persona: ArcanaPersonaDefinition): string {
  const sections: string[] = [];

  sections.push('## IDENTITAET');
  sections.push(`${persona.name}`);
  if (persona.subtitle) {
    sections.push(persona.subtitle);
  }
  if (persona.description) {
    sections.push(persona.description);
  }

  sections.push('');
  sections.push('## CHARAKTER');
  sections.push(buildCharacterBlock(persona));

  sections.push('');
  sections.push('## TON');
  sections.push(buildToneBlock(persona.toneMode));

  const activeQuirks = persona.quirks.filter((quirk) => quirk.enabled);
  if (activeQuirks.length > 0) {
    sections.push('');
    sections.push('## EIGENARTEN');
    sections.push(buildQuirksBlock(activeQuirks));
  }

  sections.push('');
  sections.push('## STIMME & AUSDRUCK');
  sections.push(`Voice: ${persona.voice.voiceName}`);
  sections.push(`Accent: ${persona.voice.accent}`);
  sections.push(buildVoicePerformanceBlock(persona.voice));

  if (persona.mayaSpecial && persona.mayaSpecial.trim().length > 0) {
    sections.push('');
    sections.push('## MAYA SPECIAL');
    sections.push(persona.mayaSpecial.trim());
  }

  sections.push('');
  sections.push('## OUTPUT-REGELN');
  sections.push('Antworte IMMER auf Deutsch.');
  sections.push('Antworte als reiner Text - kein JSON, kein Markdown, keine Meta-Felder.');
  sections.push('Halte deine Antworten bei 2-4 Saetzen, es sei denn das Thema verlangt mehr.');
  sections.push('Bleibe IMMER in deiner Rolle. Brich nie aus dem Charakter aus.');

  return sections.join('\n');
}

export function buildExampleResponse(persona: ArcanaPersonaDefinition): string {
  const prefix = persona.name.toUpperCase();
  const variants: Record<ArcanaToneModeKey, string> = {
    serioes: `${prefix}: Dein Leben braucht keine Mystifizierung, sondern eine klare Richtung. Beginne dort, wo Pflicht, Talent und wiederkehrende Unruhe sich schneiden. Dann entscheide dich und trage die Konsequenz mit Haltung.`,
    bissig: `${prefix}: Du fragst nicht nach dem Sinn, du verhandelst noch mit deiner Angst vor Klarheit. Waehle ein Feld, streich die Ausreden und teste dich an der Realitaet statt an Tagtraeumen.`,
    satirisch: `${prefix}: Ach, die klassische Frage nach dem Lebenssinn, gestellt in einer Zeit, in der jeder ein Orakel sucht und niemand einen Kalender pflegt. Fang mit etwas Konkretem an, das deiner Wahrheit standhaelt, wenn der Applaus ausbleibt.`,
    komisch: `${prefix}: [laugh] Mon dieu, als waere das Leben ein Buffet und du wartest auf eine Speisekarte aus Gold. Marschiere los, nimm ein Ziel ein, scheitere theatralisch, richte die Uniform und beginne erneut.`,
  };

  return variants[persona.toneMode.mode];
}

export function getCharacterDisplay(persona: ArcanaPersonaDefinition) {
  return {
    intensity: describeIntensity(persona.character.intensity),
    empathy: describeEmpathy(persona.character.empathy),
    confrontation: describeConfrontation(persona.character.confrontation),
  };
}

export function getVoiceDisplay(persona: ArcanaPersonaDefinition) {
  return {
    tempo: describeTempo(persona.voice.speakingTempo),
    pauses: describePauses(persona.voice.pauseDramaturgy),
    emotion: describeEmotion(persona.voice.emotionalIntensity),
  };
}