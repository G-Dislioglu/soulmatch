/**
 * providers.ts — Unified callProvider() for discuss-style LLM calls.
 * Uses chat/completions endpoint for all providers (OpenAI, xAI, DeepSeek).
 * No structured-output schema — expects free JSON or plain text responses.
 */

import { outboundFetch, type OutboundFetchInit, type OutboundFetchResponse } from './outboundHttp.js';

interface ProviderEndpoint {
  apiUrl: string;
  envKey: string;
}

const PROVIDER_ENDPOINTS: Record<string, ProviderEndpoint> = {
  openai:   { apiUrl: 'https://api.openai.com/v1/responses',        envKey: 'OPENAI_API_KEY' },
  xai:      { apiUrl: 'https://api.x.ai/v1/chat/completions',       envKey: 'XAI_API_KEY' },
  deepseek: { apiUrl: 'https://api.deepseek.com/chat/completions',   envKey: 'DEEPSEEK_API_KEY' },
  openrouter: { apiUrl: 'https://openrouter.ai/api/v1/chat/completions', envKey: 'OPENROUTER_API_KEY' },
  zhipu:    { apiUrl: 'https://api.z.ai/api/paas/v4/chat/completions', envKey: 'ZHIPU_API_KEY' },
};

const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRY_DELAY_MS = [250, 800];
const PROVIDER_TIMEOUT_MS = 150_000; // 150s per request — large files need more time
const ANTHROPIC_ENV_KEY = 'ANTHROPIC_API_KEY';

function shouldDisableOpenRouterReasoning(model: string): boolean {
  return model.startsWith('qwen/') || model.startsWith('z-ai/glm-');
}

function normalizeOpenAiReasoning(
  model: string,
  reasoning: CallProviderParams['reasoning'],
): { effort: 'low' | 'medium' | 'high' } | undefined {
  if (reasoning === false) {
    return undefined;
  }

  if (reasoning === true) {
    return { effort: 'low' };
  }

  if (reasoning && typeof reasoning === 'object' && 'effort' in reasoning && reasoning.effort) {
    return { effort: reasoning.effort };
  }

  if (model.startsWith('gpt-5') || model.startsWith('o3') || model.startsWith('o4')) {
    return { effort: 'low' };
  }

  return undefined;
}

function normalizeOpenRouterReasoning(
  model: string,
  reasoning: CallProviderParams['reasoning'],
): { enabled: boolean } | undefined {
  if (reasoning && typeof reasoning === 'object' && 'enabled' in reasoning && typeof reasoning.enabled === 'boolean') {
    return { enabled: reasoning.enabled };
  }

  if (shouldDisableOpenRouterReasoning(model)) {
    return { enabled: false };
  }

  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableTransportError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /wsasend|forcibly closed|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|unreachable|network|fetch failed|unavailable/i.test(message);
}

async function fetchWithRetries(url: string, init: OutboundFetchInit, provider: string): Promise<OutboundFetchResponse> {
  const maxAttempts = RETRY_DELAY_MS.length + 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await outboundFetch(url, {
        ...init,
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });
      if (RETRYABLE_HTTP_STATUS.has(response.status) && attempt < maxAttempts) {
        const delayMs = RETRY_DELAY_MS[attempt - 1] ?? RETRY_DELAY_MS[RETRY_DELAY_MS.length - 1] ?? 250;
        console.warn(`[providers] ${provider} transient HTTP ${response.status}, retrying`, { attempt, maxAttempts, delayMs });
        await sleep(delayMs);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts && isRetryableTransportError(error)) {
        const delayMs = RETRY_DELAY_MS[attempt - 1] ?? RETRY_DELAY_MS[RETRY_DELAY_MS.length - 1] ?? 250;
        console.warn(`[providers] ${provider} transport error, retrying`, {
          attempt,
          maxAttempts,
          delayMs,
          error: error instanceof Error ? error.message : String(error),
        });
        await sleep(delayMs);
        continue;
      }
      throw error;
    }
  }

  throw (lastError instanceof Error ? lastError : new Error(`${provider} API request failed after retries`));
}

export interface CallProviderParams {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  forceJsonObject?: boolean;
  /** Controls GLM thinking/reasoning mode. 'enabled' for workers (quality), 'disabled' for scouts (speed). Default: 'disabled'. */
  thinking?: 'enabled' | 'disabled';
  reasoning?: boolean | { enabled: boolean } | { effort: 'low' | 'medium' | 'high' };
  anthropicThinking?:
    | { type: 'enabled'; budget_tokens: number }
    | { type: 'disabled' }
    | { type: 'adaptive' };
}

/**
 * Calls any supported provider via the chat/completions endpoint.
 * Returns the raw text content of the first choice.
 * Throws on HTTP error or missing content.
 */
export async function callProvider(
  provider: string,
  model: string,
  params: CallProviderParams,
  clientApiKey?: string,
): Promise<string> {
  const openAiReasoning = normalizeOpenAiReasoning(model, params.reasoning);
  const openRouterReasoning = normalizeOpenRouterReasoning(model, params.reasoning);

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY || clientApiKey;
    if (!apiKey) throw new Error('No API key for gemini. Set GEMINI_API_KEY on server.');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = params.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const resp = await fetchWithRetries(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: params.system
          ? { parts: [{ text: params.system }] }
          : undefined,
        generationConfig: {
          maxOutputTokens: params.maxTokens ?? 2000,
          temperature: params.temperature ?? 0.85,
        },
      }),
    }, 'gemini');

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`gemini API ${resp.status}: ${errText}`);
    }

    const data = await resp.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string; inlineData?: { data?: string; mimeType?: string } }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('') ?? '';
    return typeof text === 'string' ? text : '';
  }

  if (provider === 'anthropic') {
    const apiKey = process.env[ANTHROPIC_ENV_KEY] || clientApiKey;
    if (!apiKey) throw new Error(`No API key for anthropic. Set ${ANTHROPIC_ENV_KEY} on server.`);

    const url = 'https://api.anthropic.com/v1/messages';
    const isOpus47OrLater =
      model.startsWith('claude-opus-4-7')
      || model.startsWith('claude-opus-4-8')
      || model.startsWith('claude-opus-5');

    const body: Record<string, unknown> = {
      model,
      system: params.system || undefined,
      messages: params.messages,
      max_tokens: params.maxTokens ?? 2000,
    };

    if (isOpus47OrLater) {
      body.thinking = { type: 'adaptive' };
    } else if (params.anthropicThinking) {
      body.thinking = params.anthropicThinking;
    } else {
      body.temperature = params.temperature ?? 0.7;
    }

    const resp = await fetchWithRetries(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }, 'anthropic');

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`anthropic API ${resp.status}: ${errText}`);
    }

    const data = await resp.json() as {
      content?: Array<{ type?: string; text?: string }>;
    };

    const text = data.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text)
      .filter(Boolean)
      .join('') ?? '';

    if (!text) throw new Error('No text content in anthropic response');

    let content = text.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    return content;
  }

  const endpoint = PROVIDER_ENDPOINTS[provider];
  if (!endpoint) throw new Error(`Unknown provider: ${provider}`);

  const apiKey = process.env[endpoint.envKey] || clientApiKey;
  if (!apiKey) throw new Error(`No API key for ${provider}. Set ${endpoint.envKey} on server.`);

  const resp = await fetchWithRetries(endpoint.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      provider === 'openai'
        ? {
            // Responses API format (GPT-5 reasoning models)
            model,
            input: [
              { role: 'system', content: params.system },
              ...params.messages,
            ],
            ...(openAiReasoning ? { reasoning: openAiReasoning } : {}),
            max_output_tokens: params.maxTokens ?? 2000,
          }
        : {
            // Chat Completions format (xAI, DeepSeek, OpenRouter, Zhipu)
            model,
            messages: [
              { role: 'system', content: params.system },
              ...params.messages,
            ],
            ...(params.forceJsonObject === false ? {} : { response_format: { type: 'json_object' } }),
            temperature: params.temperature ?? 0.85,
            max_tokens: params.maxTokens ?? 2000,
            ...(provider === 'deepseek' && model.includes('reasoner')
              ? { max_completion_tokens: params.maxTokens ?? 2000 }
              : {}),
            ...(provider === 'openrouter' && openRouterReasoning
              ? { reasoning: openRouterReasoning }
              : {}),
            // Direct Zhipu calls still use the native thinking parameter.
            ...(provider === 'zhipu'
              ? { thinking: { type: params.thinking ?? 'disabled' } }
              : {}),
          },
    ),
  }, provider);

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`${provider} API ${resp.status}: ${errText}`);
  }

  const data = await resp.json() as Record<string, unknown>;

  if (provider === 'openai') {
    console.log('[providers] OpenAI raw response:', JSON.stringify(data, null, 2));
  }

  // Responses API (OpenAI GPT-5): output_text convenience field, then output[] items
  // Chat Completions (xAI, DeepSeek): choices[0].message.content
  type Choices = Array<{ message?: { content?: string; reasoning_content?: string } }>;
  type Output = Array<{ type?: string; content?: Array<{ type?: string; text?: string }>; text?: string }>;

  const choices = data.choices as Choices | undefined;
  const output = data.output as Output | undefined;
  const outputText = typeof data.output_text === 'string' ? data.output_text : undefined;

  // Walk output[] items: find first message item with text content
  let outputItemText: string | undefined;
  if (output) {
    for (const item of output) {
      if (item.content) {
        for (const part of item.content) {
          if (part.type === 'output_text' || part.type === 'text') {
            outputItemText = part.text;
            break;
          }
        }
      } else if (typeof item.text === 'string') {
        outputItemText = item.text;
        break;
      }
      if (outputItemText) break;
    }
  }

  let content: string | undefined =
    outputText ||
    outputItemText ||
    choices?.[0]?.message?.content ||
    undefined;

  // DeepSeek Reasoner: Wenn content leer, nutze reasoning_content als Fallback
  if (!content && choices?.[0]?.message?.reasoning_content) {
    content = choices[0].message.reasoning_content;
  }

  if (!content) throw new Error(`No content in ${provider} response`);

  content = content.trim();
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  return content;
}

export function getProviderApiKey(provider: string, clientApiKey?: string): string | undefined {
  if (provider === 'gemini') {
    return process.env.GEMINI_API_KEY || clientApiKey || undefined;
  }
  if (provider === 'anthropic') {
    return process.env.ANTHROPIC_API_KEY || clientApiKey || undefined;
  }
  const endpoint = PROVIDER_ENDPOINTS[provider];
  if (!endpoint) return undefined;
  return process.env[endpoint.envKey] || clientApiKey || undefined;
}
