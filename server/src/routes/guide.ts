import { Router } from 'express';
import type { Request, Response } from 'express';
import { devLogger } from '../devLogger.js';

export const guideRouter = Router();

type ProviderName = 'openai' | 'deepseek' | 'xai';

const CHAT_URLS: Record<ProviderName, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
  xai: 'https://api.x.ai/v1/chat/completions',
};

const ENV_KEYS: Record<ProviderName, string> = {
  openai: 'OPENAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  xai: 'XAI_API_KEY',
};

const DEFAULT_MODELS: Record<ProviderName, string> = {
  openai: 'gpt-4.1-nano',
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

  if (!body.systemPrompt || !body.userMessage) {
    res.status(400).json({ error: 'Missing systemPrompt or userMessage' });
    return;
  }

  const provider: ProviderName = (body.provider as ProviderName) ?? 'openai';
  const apiUrl = CHAT_URLS[provider];
  if (!apiUrl) {
    res.status(400).json({ error: `Unknown provider: ${provider}` });
    return;
  }

  const apiKey = process.env[ENV_KEYS[provider]] || body.clientApiKey;
  if (!apiKey) {
    res.status(500).json({ error: `No API key for ${provider}` });
    return;
  }

  const model = body.model || DEFAULT_MODELS[provider];
  const startTime = Date.now();

  try {
    devLogger.info('api', `Guide LLM call: ${provider}/${model}`, { provider, model });

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: body.systemPrompt },
          { role: 'user', content: body.userMessage },
        ],
        ...(provider === 'openai'
          ? { max_completion_tokens: body.maxTokens ?? 100 }
          : { max_tokens: body.maxTokens ?? 100 }),
        temperature: body.temperature ?? 0.7,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`${provider} API ${resp.status}: ${errText}`);
    }

    const data = await resp.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('No content in response');

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
