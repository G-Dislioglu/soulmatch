import type { AppSettings, AiProvider } from '../../../shared/types/settings';

const STORAGE_KEY = 'soulmatch.settings.v1';

const DEFAULT_MODELS: Record<AiProvider, string> = {
  none: '',
  openai: 'gpt-4.1-nano',
  deepseek: 'deepseek-chat',
  xai: 'grok-4-1-fast-reasoning',
};

export const MODEL_OPTIONS: Record<AiProvider, { value: string; label: string }[]> = {
  none: [],
  openai: [
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (günstigste)' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat (V3.2)' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' },
  ],
  xai: [
    { value: 'grok-4-1-fast-reasoning', label: 'Grok 4.1 Fast (Reasoning)' },
    { value: 'grok-4-fast-non-reasoning', label: 'Grok 4 Fast (kein Reasoning)' },
    { value: 'grok-4-0709', label: 'Grok 4 (volles Reasoning)' },
  ],
};

function defaultSettings(): AppSettings {
  return {
    version: 'settings-1',
    features: {
      studioEnabled: true,
      llmEnabled: false,
    },
    provider: {
      provider: 'none',
    },
  };
}

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultSettings();
  try {
    const parsed = JSON.parse(raw) as AppSettings;
    if (parsed.version !== 'settings-1') return defaultSettings();
    return {
      ...defaultSettings(),
      ...parsed,
      features: { ...defaultSettings().features, ...parsed.features },
      provider: { ...defaultSettings().provider, ...parsed.provider },
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(next: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = loadSettings();
  const next: AppSettings = {
    ...current,
    ...patch,
    version: 'settings-1',
    features: { ...current.features, ...(patch.features ?? {}) },
    provider: { ...current.provider, ...(patch.provider ?? {}) },
  };
  saveSettings(next);
  return next;
}

export function defaultModelForProvider(provider: AiProvider): string {
  return DEFAULT_MODELS[provider] ?? '';
}

export function maskApiKey(key?: string): string {
  if (!key || key.length < 8) return key ? '••••••••' : '';
  return `${key.slice(0, 3)}…${key.slice(-4)}`;
}
