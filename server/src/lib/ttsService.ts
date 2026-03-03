import { getPersonaVoice, getPersonaVoiceDirector } from './personaVoices.js';

interface TTSResult {
  audioBuffer: Buffer;
  mimeType: string;
  engine: string;
  durationEstimate?: number;
}

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
  const map: Record<string, OpenAiTtsVoice> = {
    maya: 'nova',
    lilith: 'shimmer',
    kael: 'onyx',
    stella: 'alloy',
    luna: 'ash',
    orion: 'echo',
    lian: 'sage',
    sibyl: 'fable',
    amara: 'coral',
  };
  return map[personaId] ?? 'nova';
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
  geminiApiKey: string,
  openaiApiKey: string,
): Promise<TTSResult> {
  const geminiVoice = getPersonaVoice(personaId);
  const disableGeminiTts = process.env.DISABLE_GEMINI_TTS === 'true';

  try {
    const result = await openaiTTS(text, getOpenAiVoiceForPersona(personaId), openaiApiKey);
    console.log('[TTS Engine]', {
      engine: 'openai-default',
      personaId,
      textLength: text.length,
      success: true,
      timestamp: new Date().toISOString(),
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('[TTS Engine]', {
      engine: 'openai-default',
      personaId,
      error: message,
      success: false,
      timestamp: new Date().toISOString(),
    });
  }

  if (disableGeminiTts) {
    console.log('[TTS Engine]', {
      engine: 'gemini-preview',
      personaId,
      success: false,
      error: 'Gemini TTS disabled via DISABLE_GEMINI_TTS=true',
      timestamp: new Date().toISOString(),
    });
    throw new Error('OpenAI TTS fehlgeschlagen und Gemini TTS ist deaktiviert');
  }

  try {
    const result = await geminiPreviewTTS(text, geminiVoice, geminiApiKey, getPersonaVoiceDirector(personaId));
    console.log('[TTS Engine]', {
      engine: 'gemini-fallback',
      personaId,
      textLength: text.length,
      success: true,
      timestamp: new Date().toISOString(),
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('[TTS Engine]', {
      engine: 'failed',
      personaId,
      error: message,
      success: false,
      timestamp: new Date().toISOString(),
    });
    throw new Error('Alle TTS Engines fehlgeschlagen');
  }
}

async function geminiPreviewTTS(text: string, voiceName: string, apiKey: string, directorPrompt: string): Promise<TTSResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${directorPrompt}\n\nText:\n${text}` }] }],
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
