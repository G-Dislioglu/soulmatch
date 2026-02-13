import { useState, useEffect } from 'react';
import type { AppSettings, AiProvider } from '../../../shared/types/settings';
import { Button, Card, CardHeader, CardContent } from '../../M02_ui-kit';
import { loadSettings, saveSettings, defaultModelForProvider, maskApiKey } from '../lib/settingsStorage';

const PROVIDERS: { value: AiProvider; label: string }[] = [
  { value: 'none', label: 'Kein Provider' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'grok', label: 'Grok' },
];

interface SettingsPageProps {
  onBack: () => void;
  onSettingsChanged?: (settings: AppSettings) => void;
}

export function SettingsPage({ onBack, onSettingsChanged }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKeyInput(settings.provider.apiKey ?? '');
  }, [settings.provider.apiKey]);

  function handleSave() {
    const next: AppSettings = {
      ...settings,
      provider: {
        ...settings.provider,
        apiKey: apiKeyInput || undefined,
      },
    };
    saveSettings(next);
    setSettings(next);
    setSaved(true);
    onSettingsChanged?.(next);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleProviderChange(provider: AiProvider) {
    setSettings((prev) => ({
      ...prev,
      provider: {
        ...prev.provider,
        provider,
        model: defaultModelForProvider(provider),
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

  return (
    <div className="mx-auto w-full max-w-lg flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-sm text-[color:var(--muted-fg)]">Provider & Feature Flags</p>
        </div>
        <Button variant="secondary" onClick={onBack}>Zurück</Button>
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
          <h2 className="text-lg font-semibold">AI Provider</h2>
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

          {settings.provider.provider !== 'none' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[color:var(--muted-fg)]">Modell</label>
                <input
                  type="text"
                  value={settings.provider.model ?? ''}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      provider: { ...prev.provider, model: e.target.value },
                    }))
                  }
                  className="w-full rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--fg)] placeholder:text-[color:var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                  placeholder={defaultModelForProvider(settings.provider.provider)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[color:var(--muted-fg)]">API Key</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--fg)] placeholder:text-[color:var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                  placeholder="sk-..."
                />
                {settings.provider.apiKey && (
                  <p className="text-xs text-[color:var(--muted-fg)]">
                    Gespeichert: {maskApiKey(settings.provider.apiKey)}
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={handleSave}>Speichern</Button>
        {saved && <span className="text-sm text-green-400">Gespeichert!</span>}
      </div>
    </div>
  );
}
