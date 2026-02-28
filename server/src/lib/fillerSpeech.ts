import { PERSONA_CONFIG } from './personaRouter.js';
import { generateTTS } from './ttsService.js';

interface FillerResult {
  audioBuffer: Buffer;
  mimeType: string;
  durationMs: number;
}

export async function generateFillerSpeech(
  personaId: string,
  geminiApiKey: string,
  openaiApiKey: string,
): Promise<FillerResult> {
  const config = PERSONA_CONFIG[personaId];
  if (!config) throw new Error(`Unbekannte Persona: ${personaId}`);

  const phrases = config.fillerPhrases;
  const selectedPhrase = phrases[Math.floor(Math.random() * phrases.length)];

  const ttsResult = await generateTTS(selectedPhrase, personaId, geminiApiKey, openaiApiKey);

  const wordCount = selectedPhrase.split(/\s+/).filter(Boolean).length;
  const estimatedDurationMs = Math.round((wordCount / 2.5) * 1000);

  return {
    audioBuffer: ttsResult.audioBuffer,
    mimeType: ttsResult.mimeType,
    durationMs: estimatedDurationMs,
  };
}

export async function generateFillerQueue(
  personaId: string,
  estimatedReasoningMs: number,
  geminiApiKey: string,
  openaiApiKey: string,
): Promise<FillerResult[]> {
  const results: FillerResult[] = [];
  let coveredDurationMs = 0;
  let attempts = 0;
  const MAX_FILLERS = 3;

  while (coveredDurationMs < estimatedReasoningMs && attempts < MAX_FILLERS) {
    const filler = await generateFillerSpeech(personaId, geminiApiKey, openaiApiKey);
    results.push(filler);
    coveredDurationMs += filler.durationMs;
    attempts++;
  }

  return results;
}
