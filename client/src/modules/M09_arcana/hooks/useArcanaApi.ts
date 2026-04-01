import { useEffect, useState } from 'react';

import { ACCENT_CATALOG, SYSTEM_PERSONA_VOICES, VOICE_CATALOG } from '../../../data/voiceCatalog';

export type ArcanaPersonaTier = 'system' | 'user_created';
export type ArcanaPersonaStatus = 'draft' | 'active' | 'archived';
export type ArcanaArchetypeKey =
  | 'der_visionaer'
  | 'die_heilerin'
  | 'der_analytiker'
  | 'die_mystikerin'
  | 'der_provokateur'
  | 'die_begleiterin'
  | 'der_weise'
  | 'die_kriegerin'
  | 'der_poet'
  | 'die_forscherin'
  | 'custom';
export type ArcanaAccentKey = (typeof ACCENT_CATALOG)[number]['key'];
export type ArcanaVoiceName = (typeof VOICE_CATALOG)[number]['name'];
export type ArcanaToneModeKey = 'serioes' | 'bissig' | 'satirisch' | 'komisch';

export const ARCANA_ARCHETYPE_OPTIONS: ReadonlyArray<{ key: ArcanaArchetypeKey; label: string }> = [
  { key: 'der_visionaer', label: 'Der Visionaer' },
  { key: 'die_heilerin', label: 'Die Heilerin' },
  { key: 'der_analytiker', label: 'Der Analytiker' },
  { key: 'die_mystikerin', label: 'Die Mystikerin' },
  { key: 'der_provokateur', label: 'Der Provokateur' },
  { key: 'die_begleiterin', label: 'Die Begleiterin' },
  { key: 'der_weise', label: 'Der Weise' },
  { key: 'die_kriegerin', label: 'Die Kriegerin' },
  { key: 'der_poet', label: 'Der Poet' },
  { key: 'die_forscherin', label: 'Die Forscherin' },
  { key: 'custom', label: 'Custom' },
] as const;

export interface ArcanaCharacterTuning {
  intensity: number;
  empathy: number;
  confrontation: number;
}

function defaultSkills(): ArcanaPersonaSkills {
  return {
    knowledge: [],
    interaction: [],
    tools: [],
  };
}

export interface ArcanaToneMode {
  mode: ArcanaToneModeKey;
  slider: number;
}

export interface ArcanaSignatureQuirk {
  id: string;
  label: string;
  description: string;
  promptFragment: string;
  enabled: boolean;
  category: 'behavior' | 'speech' | 'knowledge' | 'limitation';
}

export interface ArcanaVoiceConfig {
  voiceName: ArcanaVoiceName;
  accent: ArcanaAccentKey;
  accentIntensity: number;
  speakingTempo: number;
  pauseDramaturgy: number;
  emotionalIntensity: number;
}

export interface ArcanaPersonaSkills {
  knowledge: string[];
  interaction: string[];
  tools: string[];
}

export interface ArcanaPersonaContradiction {
  poleA: string;
  poleB: string;
  description: string;
}

export interface ArcanaPersonaSource {
  name: string;
  type: 'pdf' | 'image' | 'text';
  extractedCount: number;
}

export interface ArcanaPersonaCreditConfig {
  creationCost: number;
  textCostPerMessage: number;
  audioCostPerMessage: number;
}

export interface ArcanaPersonaDefinition {
  id: string;
  name: string;
  subtitle: string;
  archetype: ArcanaArchetypeKey;
  description: string;
  icon: string;
  color: string;
  tier: ArcanaPersonaTier;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  character: ArcanaCharacterTuning;
  toneMode: ArcanaToneMode;
  quirks: ArcanaSignatureQuirk[];
  skills?: ArcanaPersonaSkills;
  contradictions?: ArcanaPersonaContradiction[];
  voice: ArcanaVoiceConfig;
  sources?: ArcanaPersonaSource[];
  mayaSpecial?: string;
  credits: ArcanaPersonaCreditConfig;
  presetId?: string;
  status: ArcanaPersonaStatus;
}

export interface ArcanaPreset {
  id: string;
  name: string;
  archetype: ArcanaArchetypeKey;
  description: string;
}

export interface PersonaDraftInput {
  name: string;
  subtitle: string;
  archetype: ArcanaArchetypeKey;
  description: string;
  icon: string;
  color: string;
  characterTuning: ArcanaCharacterTuning;
  toneMode: ArcanaToneMode;
  quirks: ArcanaSignatureQuirk[];
  skills?: ArcanaPersonaSkills;
  contradictions?: ArcanaPersonaContradiction[];
  voiceConfig: ArcanaVoiceConfig;
  sources?: ArcanaPersonaSource[];
  mayaSpecial?: string;
  presetId?: string;
}

interface PreviewResponse {
  audio: string;
  mimeType: string;
  engine: string;
}

interface UseArcanaApiResult {
  personas: ArcanaPersonaDefinition[];
  loading: boolean;
  error: string | null;
  voices: typeof VOICE_CATALOG;
  accents: typeof ACCENT_CATALOG;
  refreshPersonas: () => Promise<void>;
  fetchPresets: () => Promise<ArcanaPreset[]>;
  createPersona: (input: PersonaDraftInput) => Promise<ArcanaPersonaDefinition>;
  updatePersona: (id: string, input: Partial<PersonaDraftInput>) => Promise<ArcanaPersonaDefinition>;
  deletePersona: (id: string) => Promise<void>;
  previewTts: (voice: ArcanaVoiceConfig, text: string) => Promise<PreviewResponse>;
}

const ARCANA_USER_ID_KEY = 'arcana.studio.userId';

function resolveArcanaUserId(explicitUserId?: string | null): string {
  if (explicitUserId && explicitUserId.trim().length > 0) {
    return explicitUserId;
  }

  const stored = window.localStorage.getItem(ARCANA_USER_ID_KEY);
  if (stored && stored.trim().length > 0) {
    return stored;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(ARCANA_USER_ID_KEY, created);
  return created;
}

function defaultVoiceConfig(): ArcanaVoiceConfig {
  return {
    voiceName: 'Aoede',
    accent: 'off',
    accentIntensity: 50,
    speakingTempo: 50,
    pauseDramaturgy: 50,
    emotionalIntensity: 50,
  };
}

function normalizePersona(persona: ArcanaPersonaDefinition): ArcanaPersonaDefinition {
  const systemVoice = SYSTEM_PERSONA_VOICES[persona.id];
  return {
    ...persona,
    subtitle: persona.subtitle || (persona.tier === 'system' ? 'System-Persona' : 'Entwurf'),
    skills: {
      ...defaultSkills(),
      ...persona.skills,
      knowledge: persona.skills?.knowledge ?? [],
      interaction: persona.skills?.interaction ?? [],
      tools: persona.skills?.tools ?? [],
    },
    contradictions: persona.contradictions ?? [],
    sources: persona.sources ?? [],
    voice: {
      ...defaultVoiceConfig(),
      ...persona.voice,
      voiceName: persona.voice?.voiceName ?? systemVoice?.voiceName ?? 'Aoede',
      accent: persona.voice?.accent ?? systemVoice?.accent ?? 'off',
    },
  };
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok || data === null) {
    const message = data && typeof data === 'object' && 'error' in data ? data.error : null;
    throw new Error(message || `HTTP ${response.status}`);
  }

  return data as T;
}

export function useArcanaApi(explicitUserId?: string | null): UseArcanaApiResult {
  const [personas, setPersonas] = useState<ArcanaPersonaDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Resolve userId synchronously so the first render already has the correct
  // ID and personas is never fetched with an empty userId (which caused the
  // flash: personas briefly [] → editState wiped → tuning shows empty state).
  const [userId, setUserId] = useState<string>(() => resolveArcanaUserId(explicitUserId));

  useEffect(() => {
    const resolved = resolveArcanaUserId(explicitUserId);
    setUserId(resolved);
  }, [explicitUserId]);

  async function refreshPersonas(): Promise<void> {
    if (!userId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/arcana/personas?userId=${encodeURIComponent(userId)}`);
      const data = await parseJsonOrThrow<ArcanaPersonaDefinition[]>(response);
      setPersonas(data.map(normalizePersona));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Arcana API Fehler');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshPersonas();
  }, [userId]);

  async function createPersona(input: PersonaDraftInput): Promise<ArcanaPersonaDefinition> {
    const response = await fetch('/api/arcana/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, userId }),
    });

    const created = normalizePersona(await parseJsonOrThrow<ArcanaPersonaDefinition>(response));
    setPersonas((current) => [...current, created]);
    return created;
  }

  async function updatePersona(id: string, input: Partial<PersonaDraftInput>): Promise<ArcanaPersonaDefinition> {
    const response = await fetch(`/api/arcana/personas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, userId }),
    });

    const updated = normalizePersona(await parseJsonOrThrow<ArcanaPersonaDefinition>(response));
    setPersonas((current) => current.map((persona) => (persona.id === id ? updated : persona)));
    return updated;
  }

  async function deletePersona(id: string): Promise<void> {
    const response = await fetch(`/api/arcana/personas/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    await parseJsonOrThrow<{ ok: true }>(response);
    setPersonas((current) => current.filter((persona) => persona.id !== id));
  }

  async function fetchPresets(): Promise<ArcanaPreset[]> {
    const response = await fetch('/api/arcana/presets');
    return parseJsonOrThrow<ArcanaPreset[]>(response);
  }

  async function previewTts(voice: ArcanaVoiceConfig, text: string): Promise<PreviewResponse> {
    const response = await fetch('/api/arcana/tts-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voiceName: voice.voiceName,
        accent: voice.accent,
        accentIntensity: voice.accentIntensity,
        speakingTempo: voice.speakingTempo,
        pauseDramaturgy: voice.pauseDramaturgy,
        emotionalIntensity: voice.emotionalIntensity,
        text,
      }),
    });

    return parseJsonOrThrow<PreviewResponse>(response);
  }

  return {
    personas,
    loading,
    error,
    voices: VOICE_CATALOG,
    accents: ACCENT_CATALOG,
    refreshPersonas,
    fetchPresets,
    createPersona,
    updatePersona,
    deletePersona,
    previewTts,
  };
}
