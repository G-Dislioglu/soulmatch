import type { AppSettings, AiProvider } from '../../../shared/types/settings';

const STORAGE_KEY = 'soulmatch.settings.v1';

const DEFAULT_MODELS: Record<AiProvider, string> = {
  none: '',
  openai: 'gpt-5-nano',
  deepseek: 'deepseek-chat',
  xai: 'grok-3-mini-fast',
};

export const MODEL_OPTIONS: Record<AiProvider, { value: string; label: string; tier?: 'budget' | 'standard' | 'premium' | 'reasoning' }[]> = {
  none: [],
  openai: [
    { value: 'gpt-5-nano', label: 'GPT-5 Nano — $0.05/1M ⭐ Standard', tier: 'budget' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini — $0.25/1M', tier: 'standard' },
    { value: 'gpt-5', label: 'GPT-5 — $1.25/1M 🔥 Premium', tier: 'premium' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano — $0.10/1M', tier: 'budget' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini — $0.40/1M', tier: 'standard' },
    { value: 'gpt-4.1', label: 'GPT-4.1 — $2.00/1M', tier: 'premium' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini — $0.15/1M', tier: 'budget' },
    { value: 'gpt-4o', label: 'GPT-4o — $2.50/1M', tier: 'premium' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek V3 — $0.28/1M ⭐ Standard', tier: 'standard' },
    { value: 'deepseek-reasoner', label: 'DeepSeek R1 — Reasoning 🧠', tier: 'reasoning' },
  ],
  xai: [
    { value: 'grok-3-mini-fast', label: 'Grok 3 Mini Fast ⭐ Standard', tier: 'standard' },
    { value: 'grok-3-mini', label: 'Grok 3 Mini', tier: 'standard' },
    { value: 'grok-3-fast', label: 'Grok 3 Fast', tier: 'premium' },
    { value: 'grok-3', label: 'Grok 3 — Premium', tier: 'premium' },
    { value: 'grok-2-1212', label: 'Grok 2', tier: 'standard' },
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
