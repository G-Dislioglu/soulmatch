import type { AccentKey, GeminiVoiceName, VoiceConfig } from '../shared/types/persona.js';
import { buildTtsPrompt } from './voicePromptBuilder.js';
import { ACCENT_CATALOG, SYSTEM_PERSONA_VOICES, VOICE_CATALOG } from './voiceCatalog.js';
import { getPersonaVoice, getPersonaVoiceDirector } from './personaVoices.js';

interface TTSResult {
  audioBuffer: Buffer;
  mimeType: string;
  engine: string;
  durationEstimate?: number;
}

type GeminiTtsVoice = GeminiVoiceName;

type OpenAiTtsVoice =
  | 'nova'
  | 'shimmer'
  | 'onyx'
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'echo'
  | 'sage'
  | 'fable'
  | 'coral';

function getOpenAiVoiceForPersona(personaId: string): OpenAiTtsVoice {
  const key = (personaId ?? '').trim().toLowerCase();
  const map: Record<string, OpenAiTtsVoice> = {
    maya: 'nova',
    lilith: 'shimmer',
    sri: 'sage',
    kael: 'onyx',
    stella: 'alloy',
    luna: 'ash',
    orion: 'echo',
    lian: 'sage',
    sibyl: 'fable',
    amara: 'coral',
  };
  return map[key] ?? 'nova';
}

function isGeminiVoice(value: string): value is GeminiTtsVoice {
  return VOICE_CATALOG.some((entry) => entry.name === value);
}

function getGeminiVoice(personaId: string, voiceOverride?: string): GeminiTtsVoice {
  if (voiceOverride && isGeminiVoice(voiceOverride)) {
    return voiceOverride;
  }

  const systemVoice = SYSTEM_PERSONA_VOICES[personaId]?.voiceName;
  if (systemVoice) {
    return systemVoice;
  }

  return getPersonaVoice(personaId) as GeminiTtsVoice;
}

function isAccentKey(value: string): value is AccentKey {
  return ACCENT_CATALOG.some((entry) => entry.key === value);
}

function getEffectiveVoiceConfig(personaId: string, voiceOverride?: string, accentOverride?: string): VoiceConfig | undefined {
  const systemVoice = SYSTEM_PERSONA_VOICES[personaId];
  if (!systemVoice) {
    return undefined;
  }

  return {
    voiceName: getGeminiVoice(personaId, voiceOverride),
    accent: accentOverride && isAccentKey(accentOverride) ? accentOverride : systemVoice.accent,
    accentIntensity: 50,
    speakingTempo: 50,
    pauseDramaturgy: 50,
    emotionalIntensity: 50,
  };
}

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16): Buffer {
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bitDepth / 8, 28);
  header.writeUInt16LE(channels * bitDepth / 8, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

export async function generateTTS(
  text: string,
  personaId: string,
  geminiApiKey: string | undefined,
  openaiApiKey: string | undefined,
  personaSettings?: { accentProfile?: 'off' | 'subtle' | 'strict'; voice?: string; accent?: string },
): Promise<TTSResult> {
  const geminiVoice = getGeminiVoice(personaId, personaSettings?.voice);
  const effectiveVoiceConfig = getEffectiveVoiceConfig(personaId, personaSettings?.voice, personaSettings?.accent);
  const disableGeminiTts = process.env.DISABLE_GEMINI_TTS === 'true';
  const configuredPriority = (process.env.TTS_ENGINE_PRIORITY ?? 'gemini-first').toLowerCase();
  const priority: 'gemini-first' | 'openai-first' = configuredPriority === 'openai-first' ? 'openai-first' : 'gemini-first';
  const engineOrder: Array<'gemini' | 'openai'> = priority === 'gemini-first' ? ['gemini', 'openai'] : ['openai', 'gemini'];
  const errors: string[] = [];

  for (const engine of engineOrder) {
    if (engine === 'gemini') {
      if (!geminiApiKey) {
        errors.push('gemini: missing api key');
        continue;
      }
      if (disableGeminiTts) {
        const msg = 'Gemini TTS disabled via DISABLE_GEMINI_TTS=true';
        errors.push(msg);
        console.log('[TTS Engine]', {
          engine: 'gemini-preview',
          personaId,
          success: false,
          error: msg,
          timestamp: new Date().toISOString(),
        });
        continue;
      }
      try {
        const result = await geminiPreviewTTS(
          effectiveVoiceConfig ? buildTtsPrompt(text, effectiveVoiceConfig) : text,
          geminiVoice,
          geminiApiKey,
          effectiveVoiceConfig ? '' : getPersonaVoiceDirector(personaId, personaSettings?.accentProfile),
        );
        console.log('[TTS Engine]', {
          engine: priority === 'gemini-first' ? 'gemini-primary' : 'gemini-fallback',
          personaId,
          textLength: text.length,
          success: true,
          timestamp: new Date().toISOString(),
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`gemini: ${message}`);
        console.log('[TTS Engine]', {
          engine: priority === 'gemini-first' ? 'gemini-primary' : 'gemini-fallback',
          personaId,
          error: message,
          success: false,
          timestamp: new Date().toISOString(),
        });
        continue;
      }
    }

    if (!openaiApiKey) {
      errors.push('openai: missing api key');
      continue;
    }

    try {
      const result = await openaiTTS(text, getOpenAiVoiceForPersona(personaId), openaiApiKey);
      console.log('[TTS Engine]', {
        engine: priority === 'openai-first' ? 'openai-primary' : 'openai-fallback',
        personaId,
        textLength: text.length,
        success: true,
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`openai: ${message}`);
      console.log('[TTS Engine]', {
        engine: priority === 'openai-first' ? 'openai-primary' : 'openai-fallback',
        personaId,
        error: message,
        success: false,
        timestamp: new Date().toISOString(),
      });
    }
  }

  console.log('[TTS Engine]', {
    engine: 'failed',
    personaId,
    success: false,
    priority,
    error: errors.join(' | '),
    timestamp: new Date().toISOString(),
  });
  throw new Error(`Alle TTS Engines fehlgeschlagen (${priority})`);
}

async function geminiPreviewTTS(text: string, voiceName: string, apiKey: string, directorPrompt: string): Promise<TTSResult> {
  const promptText = directorPrompt ? `${directorPrompt}\n\nText:\n${text}` : text;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini TTS HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
  };

  const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) throw new Error('Kein Audio in Gemini Response');

  return {
    audioBuffer: pcmToWav(Buffer.from(audioData, 'base64')),
    mimeType: 'audio/wav',
    engine: 'gemini-preview',
  };
}

async function openaiTTS(text: string, voice: OpenAiTtsVoice, apiKey: string): Promise<TTSResult> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: voice || 'nova',
      input: text,
      response_format: 'mp3',
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI TTS HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    audioBuffer: buffer,
    mimeType: 'audio/mpeg',
    engine: 'openai',
  };
}
