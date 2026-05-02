import { Router } from 'express';
import type { Request, Response } from 'express';
import { devLogger } from '../devLogger.js';
import { callProvider } from '../lib/providers.js';

export const guideRouter = Router();

type ProviderName = 'openai' | 'deepseek' | 'xai';

const DEFAULT_MODELS: Record<ProviderName, string> = {
  openai: 'gpt-5-nano',
  deepseek: 'deepseek-chat',
  xai: 'grok-4-1-fast-non-reasoning',
};

interface GuideRequestBody {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  provider?: ProviderName;
  clientApiKey?: string;
  model?: string;
}

guideRouter.post('/guide', async (req: Request, res: Response) => {
  const body = req.body as GuideRequestBody;

  const systemPrompt = body.systemPrompt?.trim() ?? '';
  const userMessage = body.userMessage?.trim() ?? '';

  if (!systemPrompt || !userMessage) {
    res.status(400).json({ error: 'Missing systemPrompt or userMessage' });
    return;
  }

  const provider: ProviderName = (body.provider as ProviderName) ?? 'openai';
  if (!DEFAULT_MODELS[provider]) {
    res.status(400).json({ error: `Unknown provider: ${provider}` });
    return;
  }

  const model = body.model || DEFAULT_MODELS[provider];
  const startTime = Date.now();

  try {
    devLogger.info('api', `Guide LLM call: ${provider}/${model}`, { provider, model });

    const text = await callProvider(
      provider,
      model,
      {
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage },
        ],
        maxTokens: body.maxTokens ?? 100,
        temperature: body.temperature ?? 0.7,
        forceJsonObject: false,
      },
      body.clientApiKey,
    );

    const durationMs = Date.now() - startTime;
    devLogger.info('api', `Guide LLM responded in ${durationMs}ms`, { provider, model, durationMs });

    res.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startTime;
    devLogger.error('api', `Guide LLM failed: ${msg}`, { provider, model, durationMs });
    res.status(500).json({ error: msg });
  }
});
