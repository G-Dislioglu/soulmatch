import { Router } from 'express';
import type { Request, Response } from 'express';
import { STUDIO_RESULT_SCHEMA } from '../studioSchema.js';
import { buildSystemPrompt, buildUserPrompt } from '../studioPrompt.js';

export const studioRouter = Router();

type ProviderName = 'openai' | 'deepseek' | 'grok';

interface ProviderConfig {
  apiUrl: string;
  envKey: string;
  defaultModel: string;
  engineVersion: string;
  supportsStructuredOutputs: boolean;
}

const PROVIDER_CONFIGS: Record<ProviderName, ProviderConfig> = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/responses',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    engineVersion: 'studio-1.0-openai',
    supportsStructuredOutputs: true,
  },
  deepseek: {
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    engineVersion: 'studio-1.0-deepseek',
    supportsStructuredOutputs: false,
  },
  grok: {
    apiUrl: 'https://api.x.ai/v1/chat/completions',
    envKey: 'GROK_API_KEY',
    defaultModel: 'grok-3-mini',
    engineVersion: 'studio-1.0-grok',
    supportsStructuredOutputs: false,
  },
};

interface StudioRequestBody {
  studioRequest: {
    mode: 'profile' | 'match';
    profileId?: string;
    matchKey?: string;
    userMessage: string;
    seats: string[];
    maxTurns: number;
  };
  provider?: ProviderName;
  clientApiKey?: string;
  model?: string;
  profileExcerpt?: string;
  matchExcerpt?: string;
}

function resolveApiKey(provider: ProviderName, clientApiKey?: string): string | undefined {
  return process.env[PROVIDER_CONFIGS[provider].envKey] || clientApiKey || undefined;
}

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const resp = await fetch(PROVIDER_CONFIGS.openai.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      text: {
        format: {
          type: 'json_schema',
          json_schema: STUDIO_RESULT_SCHEMA,
        },
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI API ${resp.status}: ${errText}`);
  }

  const data = await resp.json() as {
    output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
  };

  let resultText: string | undefined;
  if (data.output) {
    for (const item of data.output) {
      if (item.type === 'message' && item.content) {
        for (const part of item.content) {
          if (part.type === 'output_text' && part.text) {
            resultText = part.text;
            break;
          }
        }
      }
      if (resultText) break;
    }
  }

  if (!resultText) throw new Error('No text content in OpenAI response');
  return JSON.parse(resultText);
}

async function callChatCompletions(config: ProviderConfig, apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const resp = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`${config.engineVersion} API ${resp.status}: ${errText}`);
  }

  const data = await resp.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in chat completion response');
  return JSON.parse(content);
}

studioRouter.post('/studio', async (req: Request, res: Response) => {
  const body = req.body as StudioRequestBody;

  if (!body.studioRequest?.userMessage) {
    res.status(400).json({ error: 'Missing studioRequest.userMessage' });
    return;
  }

  const providerName: ProviderName = body.provider ?? 'openai';
  const config = PROVIDER_CONFIGS[providerName];
  if (!config) {
    res.status(400).json({ error: `Unknown provider: ${providerName}` });
    return;
  }

  const apiKey = resolveApiKey(providerName, body.clientApiKey);
  if (!apiKey) {
    res.status(500).json({
      error: `No API key for ${providerName}. Set ${config.envKey} on server or provide key in Settings.`,
    });
    return;
  }

  const model = body.model || config.defaultModel;
  const { studioRequest, profileExcerpt, matchExcerpt } = body;

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    mode: studioRequest.mode,
    profileExcerpt,
    matchExcerpt,
    userMessage: studioRequest.userMessage,
    seats: studioRequest.seats,
  });

  try {
    let parsed;

    if (providerName === 'openai') {
      parsed = await callOpenAI(apiKey, model, systemPrompt, userPrompt);
    } else {
      parsed = await callChatCompletions(config, apiKey, model, systemPrompt, userPrompt);
    }

    if (!parsed.turns || !Array.isArray(parsed.turns) || !parsed.nextSteps || !parsed.watchOut) {
      res.status(502).json({ error: 'LLM response did not match StudioResult schema' });
      return;
    }

    parsed.meta = {
      engine: 'llm',
      engineVersion: config.engineVersion,
      computedAt: new Date().toISOString(),
      warnings: parsed.meta?.warnings ?? [],
    };

    res.json(parsed);
  } catch (err) {
    console.error(`Studio API error (${providerName}):`, err);
    res.status(500).json({
      error: `LLM call to ${providerName} failed`,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
