export type AiProvider = 'none' | 'openai' | 'deepseek' | 'grok';

export interface FeatureFlags {
  studioEnabled: boolean;
  llmEnabled: boolean;
}

export interface ProviderSettings {
  provider: AiProvider;
  apiKey?: string;
  model?: string;
}

export interface AppSettings {
  version: 'settings-1';
  features: FeatureFlags;
  provider: ProviderSettings;
}
