import type { AccentKey, VoiceConfig } from '../shared/types/persona.js';
import { ACCENT_CATALOG } from './voiceCatalog.js';

function resolveTempoInstruction(value: number): string | null {
  if (value <= 15) return 'Sprich extrem langsam und kontemplativ.';
  if (value <= 30) return 'Sprich sehr langsam und meditativ.';
  if (value <= 45) return 'Sprich in einem ruhigen, gemaessigten Tempo.';
  if (value >= 85) return 'Sprich sehr schnell, druckvoll und mit vorwaertsdrang.';
  if (value >= 70) return 'Sprich in einem zuegigen, energischen Tempo.';
  if (value >= 55) return 'Sprich in einem lebendigen, leicht beschleunigten Tempo.';
  return null;
}

function resolvePauseInstruction(value: number): string | null {
  if (value <= 15) return 'Sprich nahezu ohne Pausen, sehr fliessend und durchgehend.';
  if (value <= 30) return 'Sprich fliessend und gleichmaessig ohne spuerbare Pausen.';
  if (value <= 45) return 'Setze nur kurze, natuerliche Atempausen.';
  if (value >= 85) return 'Setze starke, dramatische Pausen fuer Gewicht, Spannung und Betonung.';
  if (value >= 70) return 'Setze dramatische Pausen fuer Betonung.';
  if (value >= 55) return 'Setze gelegentlich betonte Pausen.';
  return null;
}

function resolveEmotionInstruction(value: number): string | null {
  if (value <= 15) return 'Sprich fast vollkommen neutral, kontrolliert und ohne emotionale Ausschlaege.';
  if (value <= 30) return 'Sprich neutral und zurueckhaltend.';
  if (value <= 45) return 'Sprich ruhig und kontrolliert.';
  if (value >= 85) return 'Sprich hoch emotional, theatralisch und mit maximaler Ausdruckskraft.';
  if (value >= 70) return 'Sprich theatralisch und emotional ausdrucksstark.';
  if (value >= 55) return 'Sprich mit deutlicher emotionaler Faerbung.';
  return null;
}

function applyAccentIntensity(fragment: string, intensity: number): string {
  if (!fragment) return fragment;

  const intensityPhrase = intensity <= 15
    ? 'einem kaum wahrnehmbaren'
    : intensity <= 30
      ? 'einem ganz leichten'
      : intensity <= 45
        ? 'einem leichten'
        : intensity >= 85
          ? 'einem sehr ausgepraegten'
          : intensity >= 70
            ? 'einem ausgepraegten'
            : 'einem spuerbaren';

  return fragment.replace('einem', intensityPhrase);
}

function resolveAccentInstruction(accent: AccentKey, intensity: number): string | null {
  if (accent === 'off') return null;

  const accentEntry = ACCENT_CATALOG.find((entry) => entry.key === accent);
  if (!accentEntry?.promptFragment) return null;

  return applyAccentIntensity(accentEntry.promptFragment, intensity);
}

export function buildTtsPrompt(text: string, voice: VoiceConfig): string {
  const parts = [
    resolveTempoInstruction(voice.speakingTempo),
    resolvePauseInstruction(voice.pauseDramaturgy),
    resolveEmotionInstruction(voice.emotionalIntensity),
    resolveAccentInstruction(voice.accent, voice.accentIntensity),
    `"${text}"`,
  ].filter((part): part is string => Boolean(part));

  return parts.join(' ');
}

export function getVoiceName(voice: VoiceConfig): string {
  return voice.voiceName;
}