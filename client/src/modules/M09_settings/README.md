# M09 — Settings & Feature Flags

**Summary:** Provider-Auswahl, API-Key Verwaltung, Feature Flags, Provider Router für Studio.

## Features
- settingsStorage: load/save/update mit Defaults + Migration
- FeatureFlags: studioEnabled, llmEnabled
- ProviderSettings: provider (none/openai/deepseek/grok), apiKey, model
- providerRouter: getStudioProvider() → StubProvider oder PlaceholderLLMProvider
- maskApiKey: sichere Anzeige gespeicherter Keys
- SettingsPage UI: Toggles, Provider-Dropdown, Model-Input, API Key

## Public Exports
- `index.ts`: loadSettings, saveSettings, updateSettings, defaultModelForProvider, maskApiKey, StudioProvider (type), getStudioProvider, SettingsPage

## Dependencies
- M02 (Card, Button)
- M08 (StubStudioEngine für Fallback)
- shared/types/settings, studio

## Non-Goals
- Keine echten LLM-Anfragen im MVP (→ M08.2)

## Smoke Test
1) Settings öffnen → Provider wählen → API Key eingeben → Speichern → Reload → persistent
2) studioEnabled=false → Studio-Button verschwindet
3) getStudioProvider() gibt Stub zurück (meta.engine = "local-stub")
