import type { StudioRequest, StudioResult } from '../../../shared/types/studio';
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

class OpenAIProvider implements StudioProvider {
  async generateStudio(req: StudioRequest): Promise<StudioResult> {
    try {
      const res = await fetch('/api/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioRequest: req }),
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

class PlaceholderLLMProvider implements StudioProvider {
  private providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  async generateStudio(req: StudioRequest): Promise<StudioResult> {
    const result = await stubEngine.compute(req);
    return {
      ...result,
      meta: {
        ...result.meta,
        warnings: [
          ...(result.meta.warnings ?? []),
          `LLM provider "${this.providerName}" selected but not wired yet. Using stub fallback.`,
        ],
      },
    };
  }
}

const stubProvider = new StubProvider();
const openaiProvider = new OpenAIProvider();

export function getStudioProvider(): StudioProvider {
  const settings = loadSettings();

  if (!settings.features.llmEnabled) {
    return stubProvider;
  }

  if (settings.provider.provider === 'none') {
    return stubProvider;
  }

  if (settings.provider.provider === 'openai') {
    return openaiProvider;
  }

  return new PlaceholderLLMProvider(settings.provider.provider);
}
