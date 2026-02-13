import type { StudioRequest, StudioResult } from '../../../shared/types/studio';
import type { AiProvider } from '../../../shared/types/settings';
import { loadSettings } from './settingsStorage';

export interface StudioProvider {
  generateStudio(req: StudioRequest): Promise<StudioResult>;
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
      throw new Error(errData.error ?? `LLM API returned ${res.status}`);
    }

    return await res.json() as StudioResult;
  }
}

export function getStudioProvider(): StudioProvider {
  const settings = loadSettings();

  if (!settings.features.llmEnabled) {
    throw new Error('LLM ist nicht aktiviert. Bitte in den Einstellungen aktivieren.');
  }

  const provider = settings.provider.provider;
  if (provider === 'none') {
    throw new Error('Kein Provider ausgewählt. Bitte in den Einstellungen einen Provider wählen.');
  }

  const keyEntry = settings.provider.keys?.[provider];
  const apiKey = keyEntry?.apiKey ?? settings.provider.apiKey;
  const model = settings.provider.model ?? keyEntry?.model;

  return new LLMProvider(provider, apiKey, model);
}
