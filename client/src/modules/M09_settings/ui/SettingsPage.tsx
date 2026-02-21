import { useState } from 'react';
import type { AppSettings, AiProvider, ProviderKeyEntry } from '../../../shared/types/settings';
import { Button, Card, CardHeader, CardContent, BackButton } from '../../M02_ui-kit';
import { loadSettings, saveSettings, defaultModelForProvider, maskApiKey, MODEL_OPTIONS } from '../lib/settingsStorage';

const PROVIDERS: { value: AiProvider; label: string }[] = [
  { value: 'none', label: 'Kein Provider' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'xai', label: 'xAI' },
];

const KEY_PROVIDERS: { value: AiProvider; label: string; placeholder: string }[] = [
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { value: 'deepseek', label: 'DeepSeek', placeholder: 'sk-...' },
  { value: 'xai', label: 'xAI', placeholder: 'xai-...' },
];

interface SettingsPageProps {
  onBack: () => void;
  onSettingsChanged?: (settings: AppSettings) => void;
}

export function SettingsPage({ onBack, onSettingsChanged }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>(() => {
    const keys = settings.provider.keys ?? {};
    return {
      openai: keys.openai?.apiKey ?? '',
      deepseek: keys.deepseek?.apiKey ?? '',
      xai: keys.xai?.apiKey ?? '',
    };
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const keys: Partial<Record<AiProvider, ProviderKeyEntry>> = {};
    for (const p of KEY_PROVIDERS) {
      const key = keyInputs[p.value] || undefined;
      const existing = settings.provider.keys?.[p.value];
      keys[p.value] = {
        apiKey: key,
        model: existing?.model ?? defaultModelForProvider(p.value),
      };
    }

    const activeProvider = settings.provider.provider;
    const activeKey = activeProvider !== 'none' ? keyInputs[activeProvider] : undefined;

    const next: AppSettings = {
      ...settings,
      provider: {
        ...settings.provider,
        apiKey: activeKey || undefined,
        model: settings.provider.model || defaultModelForProvider(activeProvider),
        keys,
      },
    };
    saveSettings(next);
    setSettings(next);
    setSaved(true);
    onSettingsChanged?.(next);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleProviderChange(provider: AiProvider) {
    const existingKey = keyInputs[provider] ?? '';
    const existingModel = settings.provider.keys?.[provider]?.model;
    setSettings((prev) => ({
      ...prev,
      provider: {
        ...prev.provider,
        provider,
        apiKey: existingKey || undefined,
        model: existingModel ?? defaultModelForProvider(provider),
      },
    }));
  }

  function handleToggle(key: 'studioEnabled' | 'llmEnabled') {
    setSettings((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: !prev.features[key],
      },
    }));
  }

  const activeProvider = settings.provider.provider;
  const modelOptions = MODEL_OPTIONS[activeProvider] ?? [];

  return (
    <div className="mx-auto w-full max-w-lg flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-sm text-[color:var(--muted-fg)]">Provider & Feature Flags</p>
        </div>
        <BackButton onClick={onBack} />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Features</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex items-center justify-between text-sm">
            <span>Studio aktiviert</span>
            <input
              type="checkbox"
              checked={settings.features.studioEnabled}
              onChange={() => handleToggle('studioEnabled')}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>LLM aktiviert</span>
            <input
              type="checkbox"
              checked={settings.features.llmEnabled}
              onChange={() => handleToggle('llmEnabled')}
              disabled={settings.provider.provider === 'none'}
              className="h-4 w-4"
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Aktiver Provider</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[color:var(--muted-fg)]">Provider</label>
            <select
              value={settings.provider.provider}
              onChange={(e) => handleProviderChange(e.target.value as AiProvider)}
              className="w-full rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--fg)]"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {activeProvider !== 'none' && modelOptions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-[color:var(--muted-fg)]">Modell</label>
              <select
                value={settings.provider.model ?? defaultModelForProvider(activeProvider)}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    provider: { ...prev.provider, model: e.target.value },
                  }))
                }
                className="w-full rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--fg)]"
              >
                {modelOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-xs text-[color:var(--muted-fg)]">
            Lokal gespeichert. Auf Render werden ENV-Variablen bevorzugt.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {KEY_PROVIDERS.map((p) => {
            const savedKey = settings.provider.keys?.[p.value]?.apiKey;
            const isActive = settings.provider.provider === p.value;
            return (
              <div key={p.value} className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  {p.label}
                  {isActive && (
                    <span className="rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] text-green-400">aktiv</span>
                  )}
                </label>
                <input
                  type="password"
                  value={keyInputs[p.value] ?? ''}
                  onChange={(e) => setKeyInputs((prev) => ({ ...prev, [p.value]: e.target.value }))}
                  className="w-full rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--fg)] placeholder:text-[color:var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                  placeholder={p.placeholder}
                />
                {savedKey && (
                  <p className="text-xs text-[color:var(--muted-fg)]">
                    Gespeichert: {maskApiKey(savedKey)}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={handleSave}>Speichern</Button>
        {saved && <span className="text-sm text-green-400">Gespeichert!</span>}
      </div>
    </div>
  );
}
