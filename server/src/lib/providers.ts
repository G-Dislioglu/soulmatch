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
  openai:   { apiUrl: 'https://api.openai.com/v1/chat/completions', envKey: 'OPENAI_API_KEY' },
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
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: params.system },
        ...params.messages,
      ],
      // GPT-5: no response_format, no temperature (only default=1 supported), use max_completion_tokens
      ...(provider !== 'openai' ? { response_format: { type: 'json_object' } } : {}),
      ...(provider !== 'openai' ? { temperature: params.temperature ?? 0.85 } : {}),
      ...(provider === 'openai'
        ? { max_completion_tokens: params.maxTokens ?? 500 }
        : { max_tokens: params.maxTokens ?? 500 }),
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`${provider} API ${resp.status}: ${errText}`);
  }

  const data = await resp.json() as Record<string, unknown>;

  if (provider === 'openai') {
    console.log('[providers] OpenAI raw response:', JSON.stringify(data, null, 2));
  }

  // Try all known response shapes:
  // 1. Chat Completions: choices[0].message.content
  // 2. Responses API: output[0].content[0].text
  // 3. Responses API alt: output[0].text
  type Choices = Array<{ message?: { content?: string } }>;
  type Output = Array<{ content?: Array<{ text?: string }>; text?: string }>;

  const choices = data.choices as Choices | undefined;
  const output = data.output as Output | undefined;

  let content: string | undefined =
    choices?.[0]?.message?.content ||
    output?.[0]?.content?.[0]?.text ||
    output?.[0]?.text ||
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
