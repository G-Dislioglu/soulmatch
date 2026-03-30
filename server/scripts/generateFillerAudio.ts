/**
 * Generiert Filler-Audio-Dateien fuer alle System-Personas.
 *
 * Ausfuehren:
 *   cd server
 *   GEMINI_API_KEY=xxx npx tsx scripts/generateFillerAudio.ts
 *
 * Ergebnis:
 *   server/assets/filler/{personaId}/{fillerId}.pcm
 *
 * ACHTUNG: Das Skript ist ein Einmal- oder Wartungswerkzeug.
 * Es wird nicht im Runtime-Pfad verwendet und startet nicht automatisch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FILLER_CATALOG } from '../src/lib/fillerCatalog.js';
import { SYSTEM_PERSONA_VOICES } from '../src/lib/voiceCatalog.js';
import { buildTtsPrompt } from '../src/lib/voicePromptBuilder.js';
import type { VoiceConfig } from '../src/shared/types/persona.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const DELAY_BETWEEN_CALLS_MS = 1500;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../assets/filler');

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY nicht gesetzt. Abbruch.');
  process.exit(1);
}

async function generateOneAudio(text: string, voiceConfig: VoiceConfig): Promise<Buffer> {
  const enrichedText = buildTtsPrompt(text, voiceConfig);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: enrichedText }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceConfig.voiceName,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS API ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string };
        }>;
      };
    }>;
  };

  const base64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) {
    throw new Error('Kein Audio in der Gemini-Antwort');
  }

  return Buffer.from(base64, 'base64');
}

function buildVoiceConfigForPersona(personaId: string): VoiceConfig {
  const systemVoice = SYSTEM_PERSONA_VOICES[personaId];

  return {
    voiceName: systemVoice?.voiceName ?? 'Algieba',
    accent: systemVoice?.accent ?? 'off',
    accentIntensity: 50,
    speakingTempo: 50,
    pauseDramaturgy: 50,
    emotionalIntensity: 50,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log(`Starte Filler-Audio-Generierung fuer ${FILLER_CATALOG.length} Phrasen...`);

  const personaIds = [...new Set(FILLER_CATALOG.map((filler) => filler.personaId))];
  for (const personaId of personaIds) {
    fs.mkdirSync(path.join(OUTPUT_DIR, personaId), { recursive: true });
  }

  let success = 0;
  let failed = 0;

  for (const [index, filler] of FILLER_CATALOG.entries()) {
    const outputPath = path.join(OUTPUT_DIR, filler.personaId, `${filler.id}.pcm`);

    if (fs.existsSync(outputPath)) {
      console.log(`[${index + 1}/${FILLER_CATALOG.length}] SKIP ${filler.id} (existiert)`);
      success += 1;
      continue;
    }

    const voiceConfig = buildVoiceConfigForPersona(filler.personaId);

    try {
      console.log(`[${index + 1}/${FILLER_CATALOG.length}] ${filler.id} -> ${filler.text.slice(0, 48)}...`);
      const audioBuffer = await generateOneAudio(filler.text, voiceConfig);
      fs.writeFileSync(outputPath, audioBuffer);
      console.log(`  OK ${audioBuffer.length} bytes`);
      success += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  FEHLER ${filler.id}: ${message}`);
      failed += 1;
    }

    if (index < FILLER_CATALOG.length - 1) {
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  console.log(`\nFertig: ${success} erfolgreich, ${failed} fehlgeschlagen.`);
  console.log(`Audio-Dateien in: ${OUTPUT_DIR}`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});