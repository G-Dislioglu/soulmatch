import { PERSONA_CONFIG } from './personaRouter.js';
import { generateFillerSpeech } from './fillerSpeech.js';
import { generateTTS } from './ttsService.js';
import { callProvider } from './providers.js';

interface DeepModeResult {
  fillerAudio: {
    buffer: Buffer;
    mimeType: string;
    durationMs: number;
  };
  mainResponse: {
    text: string;
    audioBuffer: Buffer;
    mimeType: string;
  };
  usedDeepMode: boolean;
  reasoningTimeMs: number;
}

export async function handleDeepModeRequest(params: {
  userMessage: string;
  personaId: string;
  messageHistory: Array<{ role: string; content: string }>;
  systemPrompt: string;
  useDeep: boolean;
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  clientApiKey?: string;
}): Promise<DeepModeResult> {
  const {
    userMessage,
    personaId,
    messageHistory,
    systemPrompt,
    useDeep,
    GEMINI_API_KEY,
    OPENAI_API_KEY,
    clientApiKey,
  } = params;

  const config = PERSONA_CONFIG[personaId] ?? PERSONA_CONFIG.maya;
  const llmConfig = useDeep ? config.deep : config.standard;

  const startTime = Date.now();

  const [fillerResult, llmResponse] = await Promise.all([
    generateFillerSpeech(personaId, GEMINI_API_KEY, OPENAI_API_KEY),
    callLLM({
      provider: llmConfig.provider,
      model: llmConfig.model,
      userMessage,
      messageHistory,
      systemPrompt,
      clientApiKey,
    }),
  ]);

  const reasoningTimeMs = Date.now() - startTime;

  const mainAudio = await generateTTS(llmResponse.text, personaId, GEMINI_API_KEY, OPENAI_API_KEY);

  return {
    fillerAudio: {
      buffer: fillerResult.audioBuffer,
      mimeType: fillerResult.mimeType,
      durationMs: fillerResult.durationMs,
    },
    mainResponse: {
      text: llmResponse.text,
      audioBuffer: mainAudio.audioBuffer,
      mimeType: mainAudio.mimeType,
    },
    usedDeepMode: useDeep,
    reasoningTimeMs,
  };
}

async function callLLM(params: {
  provider: 'openai' | 'gemini' | 'deepseek' | 'grok';
  model: string;
  userMessage: string;
  messageHistory: Array<{ role: string; content: string }>;
  systemPrompt: string;
  clientApiKey?: string;
}): Promise<{ text: string }> {
  const { provider, model, userMessage, messageHistory, systemPrompt, clientApiKey } = params;

  const normalizedProvider = provider === 'grok' ? 'xai' : provider;

  const text = await callProvider(
    normalizedProvider,
    model,
    {
      system: systemPrompt,
      messages: [
        ...messageHistory
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: userMessage },
      ],
      maxTokens: 500,
      temperature: 0.7,
    },
    clientApiKey,
  );

  return { text: text || '' };
}
