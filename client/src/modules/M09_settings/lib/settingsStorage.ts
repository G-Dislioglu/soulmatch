import type { AppSettings, AiProvider } from '../../../shared/types/settings';

const STORAGE_KEY = 'soulmatch.settings.v1';

const DEFAULT_MODELS: Record<AiProvider, string> = {
  none: '',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
  grok: 'grok-1',
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
