import type { StudioRequest, StudioResult } from '../../../shared/types/studio';
import type { AiProvider } from '../../../shared/types/settings';
import { StubStudioEngine } from '../../M08_studio-chat';
import { loadSettings } from './settingsStorage';

export interface StudioProvider {
  generateStudio(req: StudioRequest): Promise<StudioResult>;
}

const stubEngine = new StubStudioEngine();

class StubProvider implements StudioProvider {
  async generateStudio(req: StudioRequest): Promise<StudioResult> {
    return stubEngine.compute(req);
  }
}

class LLMProvider implements StudioProvider {
  private providerName: AiProvider;
  private apiKey: string | undefined;
  private model: string | undefined;

  constructor(providerName: AiProvider, apiKey?: string, model?: string) {
    this.providerName = providerName;
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateStudio(req: StudioRequest): Promise<StudioResult> {
    try {
      const res = await fetch('/api/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioRequest: req,
          provider: this.providerName,
          clientApiKey: this.apiKey,
          model: this.model,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        console.error('LLM API error:', errData);
        const fallback = await stubEngine.compute(req);
        return {
          ...fallback,
          meta: {
            ...fallback.meta,
            warnings: [
              ...(fallback.meta.warnings ?? []),
              `LLM call failed (${errData.error ?? res.status}). Using stub fallback.`,
            ],
          },
        };
      }

      return await res.json() as StudioResult;
    } catch (err) {
      console.error('LLM fetch error:', err);
      const fallback = await stubEngine.compute(req);
      return {
        ...fallback,
        meta: {
          ...fallback.meta,
          warnings: [
            ...(fallback.meta.warnings ?? []),
            `LLM fetch failed. Using stub fallback.`,
          ],
        },
      };
    }
  }
}

const stubProvider = new StubProvider();

export function getStudioProvider(): StudioProvider {
  const settings = loadSettings();

  if (!settings.features.llmEnabled) {
    return stubProvider;
  }

  const provider = settings.provider.provider;
  if (provider === 'none') {
    return stubProvider;
  }

  const keyEntry = settings.provider.keys?.[provider];
  const apiKey = keyEntry?.apiKey ?? settings.provider.apiKey;
  const model = settings.provider.model ?? keyEntry?.model;

  return new LLMProvider(provider, apiKey, model);
}
