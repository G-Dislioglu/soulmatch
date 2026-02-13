import { Router } from 'express';
import type { Request, Response } from 'express';
import { STUDIO_RESULT_SCHEMA } from '../studioSchema.js';
import { buildSystemPrompt, buildUserPrompt } from '../studioPrompt.js';

export const studioRouter = Router();

type ProviderName = 'openai' | 'deepseek' | 'xai';

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
    apiUrl: 'https://api.deepseek.com/chat/completions',
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    engineVersion: 'studio-1.0-deepseek',
    supportsStructuredOutputs: false,
  },
  xai: {
    apiUrl: 'https://api.x.ai/v1/chat/completions',
    envKey: 'XAI_API_KEY',
    defaultModel: 'grok-4.1-fast',
    engineVersion: 'studio-1.0-xai',
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

  let content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in chat completion response');

  // Strip markdown code fences if LLM wraps JSON in ```json ... ```
  content = content.trim();
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

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

    console.log(`[${providerName}] Raw LLM keys:`, Object.keys(parsed));

    // Normalize: some LLMs wrap result in a top-level key
    if (!parsed.turns && parsed.result && typeof parsed.result === 'object') {
      parsed = parsed.result;
    }
    if (!parsed.turns && parsed.data && typeof parsed.data === 'object') {
      parsed = parsed.data;
    }

    // Normalize: nextSteps may come as next_steps
    if (!parsed.nextSteps && parsed.next_steps) {
      parsed.nextSteps = parsed.next_steps;
      delete parsed.next_steps;
    }

    // Normalize: watchOut may come as watch_out
    if (!parsed.watchOut && parsed.watch_out) {
      parsed.watchOut = parsed.watch_out;
      delete parsed.watch_out;
    }

    // Validate required fields
    const missing: string[] = [];
    if (!parsed.turns || !Array.isArray(parsed.turns)) missing.push('turns');
    if (!parsed.nextSteps || !Array.isArray(parsed.nextSteps)) missing.push('nextSteps');
    if (!parsed.watchOut || typeof parsed.watchOut !== 'string') missing.push('watchOut');

    if (missing.length > 0) {
      console.error(`[${providerName}] Schema mismatch. Missing: ${missing.join(', ')}. Got:`, JSON.stringify(parsed).slice(0, 500));
      res.status(502).json({
        error: `LLM-Antwort fehlt: ${missing.join(', ')}. Bitte anderen Provider oder anderes Modell versuchen.`,
      });
      return;
    }

    // Ensure turns have valid seat/text
    parsed.turns = parsed.turns.map((t: Record<string, unknown>) => ({
      seat: String(t.seat ?? 'maya'),
      text: String(t.text ?? t.content ?? ''),
    }));

    // Ensure nextSteps is string array
    parsed.nextSteps = parsed.nextSteps.map((s: unknown) => String(s));

    parsed.meta = {
      engine: 'llm',
      engineVersion: config.engineVersion,
      computedAt: new Date().toISOString(),
      warnings: [],
    };

    res.json(parsed);
  } catch (err) {
    console.error(`Studio API error (${providerName}):`, err);
    res.status(500).json({
      error: `LLM-Aufruf an ${providerName} fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});
