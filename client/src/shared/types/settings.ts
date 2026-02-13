export type AiProvider = 'none' | 'openai' | 'deepseek' | 'xai';

export interface FeatureFlags {
  studioEnabled: boolean;
  llmEnabled: boolean;
}

export interface ProviderKeyEntry {
  apiKey?: string;
  model?: string;
}

export interface ProviderSettings {
  provider: AiProvider;
  apiKey?: string;
  model?: string;
  keys?: Partial<Record<AiProvider, ProviderKeyEntry>>;
}

export interface AppSettings {
  version: 'settings-1';
  features: FeatureFlags;
  provider: ProviderSettings;
}
