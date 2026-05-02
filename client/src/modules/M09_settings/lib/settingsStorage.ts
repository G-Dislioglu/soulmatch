import type { AppSettings, AiProvider } from '../../../shared/types/settings';

const STORAGE_KEY = 'soulmatch.settings.v1';

const DEFAULT_MODELS: Record<AiProvider, string> = {
  none: '',
  openai: 'gpt-5.5',
  deepseek: 'deepseek-v4-flash',
  xai: 'grok-4-1-fast-non-reasoning',
};

export const MODEL_OPTIONS: Record<AiProvider, { value: string; label: string; tier?: 'budget' | 'standard' | 'premium' | 'reasoning' }[]> = {
  none: [],
  openai: [
    { value: 'gpt-5-nano', label: 'GPT-5 Nano — $0.05/1M ⭐ Standard', tier: 'budget' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini — $0.25/1M', tier: 'standard' },
    { value: 'gpt-5.5', label: 'GPT-5.5 - Premium Coding/Reasoning', tier: 'premium' },
  ],
  deepseek: [
    { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash - Standard', tier: 'standard' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner - Reasoning', tier: 'reasoning' },
  ],
  xai: [
    { value: 'grok-4-1-fast-non-reasoning', label: 'Grok 4.1 Fast — Non-Reasoning ⭐ Standard', tier: 'standard' },
    { value: 'grok-4-1-fast', label: 'Grok 4.1 Fast', tier: 'premium' },
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
