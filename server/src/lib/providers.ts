/**
 * providers.ts — Unified callProvider() for discuss-style LLM calls.
 * Uses chat/completions endpoint for all providers (OpenAI, xAI, DeepSeek).
 * No structured-output schema — expects free JSON or plain text responses.
 */

interface ProviderEndpoint {
  apiUrl: string;
  envKey: string;
}

const PROVIDER_ENDPOINTS: Record<string, ProviderEndpoint> = {
  openai:   { apiUrl: 'https://api.openai.com/v1/responses',        envKey: 'OPENAI_API_KEY' },
  xai:      { apiUrl: 'https://api.x.ai/v1/chat/completions',       envKey: 'XAI_API_KEY' },
  deepseek: { apiUrl: 'https://api.deepseek.com/chat/completions',   envKey: 'DEEPSEEK_API_KEY' },
};

export interface CallProviderParams {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
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
  const endpoint = PROVIDER_ENDPOINTS[provider];
  if (!endpoint) throw new Error(`Unknown provider: ${provider}`);

  const apiKey = process.env[endpoint.envKey] || clientApiKey;
  if (!apiKey) throw new Error(`No API key for ${provider}. Set ${endpoint.envKey} on server.`);

  const resp = await fetch(endpoint.apiUrl, {
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
            max_output_tokens: params.maxTokens ?? 500,
          }
        : {
            // Chat Completions format (xAI, DeepSeek)
            model,
            messages: [
              { role: 'system', content: params.system },
              ...params.messages,
            ],
            response_format: { type: 'json_object' },
            temperature: params.temperature ?? 0.85,
            max_tokens: params.maxTokens ?? 500,
          },
    ),
  });

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
  type Choices = Array<{ message?: { content?: string } }>;
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

  if (!content) throw new Error(`No content in ${provider} response`);

  content = content.trim();
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  return content;
}

export function getProviderApiKey(provider: string, clientApiKey?: string): string | undefined {
  const endpoint = PROVIDER_ENDPOINTS[provider];
  if (!endpoint) return undefined;
  return process.env[endpoint.envKey] || clientApiKey || undefined;
}
