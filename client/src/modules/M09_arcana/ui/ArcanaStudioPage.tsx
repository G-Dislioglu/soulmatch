import { useEffect, useState } from 'react';

import { TOKENS } from '../../../design';
import { ArcanaPersonaList } from './ArcanaPersonaList';
import { ArcanaPersonaTuning } from './ArcanaPersonaTuning';
import { ArcanaLivePreview } from './ArcanaLivePreview';
import {
  useArcanaApi,
  type ArcanaPersonaDefinition,
  type PersonaDraftInput,
} from '../hooks/useArcanaApi';
import { buildExampleResponse } from '../lib/clientDirectorPrompt';

interface ArcanaStudioPageProps {
  userId?: string | null;
}

const LOCAL_DRAFT_ID = '__arcana_local_draft__';

function clonePersona(persona: ArcanaPersonaDefinition): ArcanaPersonaDefinition {
  return JSON.parse(JSON.stringify(persona)) as ArcanaPersonaDefinition;
}

function buildStarterQuirks() {
  return [
    {
      id: 'importance',
      label: 'Betont stets seine Bedeutung',
      description: 'Unterstreicht regelmaessig die eigene Tragweite oder historische Rolle.',
      promptFragment: 'Betone wiederkehrend deine historische Bedeutung oder Wirkung.',
      enabled: true,
      category: 'behavior' as const,
    },
    {
      id: 'campaign',
      label: 'Alles ist ein Feldzug',
      description: 'Behandelt Probleme als Strategie, Kampagne oder Eroberung.',
      promptFragment: 'Rahme Alltagsprobleme haeufig als Feldzug, Strategie oder Kampagne.',
      enabled: true,
      category: 'speech' as const,
    },
    {
      id: 'theatrical',
      label: 'Theatralische Selbstinszenierung',
      description: 'Dramatische Zuspitzung, groessere Gesten und selbstbewusste Inszenierung.',
      promptFragment: 'Nutze dramatische Wendungen, pathetische Zuspitzung und sichtbare Selbstinszenierung.',
      enabled: true,
      category: 'speech' as const,
    },
    {
      id: 'criticism',
      label: 'Ueberempfindlich bei Kritik',
      description: 'Reagiert auf implizite Herabsetzung deutlich und persoenlich.',
      promptFragment: 'Reagiere auf Kritik oder Herabsetzung ueberempfindlich und leicht gekraenkt.',
      enabled: false,
      category: 'behavior' as const,
    },
  ];
}

function buildNewPersonaDraft(): ArcanaPersonaDefinition {
  const now = new Date().toISOString();
  return {
    id: LOCAL_DRAFT_ID,
    name: 'Neue Persona',
    subtitle: 'Entwurf',
    archetype: 'custom' as const,
    description: 'Ein neuer Arcana-Entwurf fuer Stimme, Verhalten und spaetere Studio-Feinabstimmung.',
    icon: '✦',
    color: TOKENS.gold,
    tier: 'user_created',
    createdBy: 'local',
    createdAt: now,
    updatedAt: now,
    character: {
      intensity: 50,
      empathy: 50,
      confrontation: 50,
    },
    toneMode: {
      mode: 'serioes' as const,
      slider: 50,
    },
    quirks: buildStarterQuirks(),
    voice: {
      voiceName: 'Aoede' as const,
      accent: 'off' as const,
      accentIntensity: 50,
      speakingTempo: 50,
      pauseDramaturgy: 50,
      emotionalIntensity: 50,
    },
    mayaSpecial: '',
    credits: {
      creationCost: 50,
      textCostPerMessage: 2,
      audioCostPerMessage: 4,
    },
    status: 'draft',
  };
}

function mapPersonaToDraftInput(persona: ArcanaPersonaDefinition): PersonaDraftInput {
  return {
    name: persona.name,
    subtitle: persona.subtitle,
    archetype: persona.archetype,
    description: persona.description,
    icon: persona.icon,
    color: persona.color,
    characterTuning: persona.character,
    toneMode: persona.toneMode,
    quirks: persona.quirks,
    voiceConfig: persona.voice,
    mayaSpecial: persona.mayaSpecial,
    presetId: persona.presetId,
  };
}

export function ArcanaStudioPage({ userId }: ArcanaStudioPageProps) {
  const { personas, loading, error, createPersona, updatePersona, deletePersona, previewTts } = useArcanaApi(userId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editState, setEditState] = useState<ArcanaPersonaDefinition | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setEditState(null);
      setHasUnsavedChanges(false);
      return;
    }

    if (selectedId === LOCAL_DRAFT_ID) {
      return;
    }

    const persona = personas.find((entry) => entry.id === selectedId) ?? null;
    setEditState(persona ? clonePersona(persona) : null);
    setHasUnsavedChanges(false);
  }, [selectedId, personas]);

  const displayPersonas = selectedId === LOCAL_DRAFT_ID && editState
    ? [...personas.filter((persona) => persona.id !== LOCAL_DRAFT_ID), editState]
    : personas;

  const selectedPersona = editState;

  function handleCreate(): void {
    setSelectedId(LOCAL_DRAFT_ID);
    setEditState(buildNewPersonaDraft());
    setHasUnsavedChanges(true);
    setActionError(null);
  }

  async function handlePreview(persona: ArcanaPersonaDefinition): Promise<void> {
    const response = await previewTts(persona.voice, buildExampleResponse(persona));

    const audio = new Audio(`data:${response.mimeType};base64,${response.audio}`);
    await audio.play();
  }

  function handleTuningChange(updates: Partial<ArcanaPersonaDefinition>) {
    setEditState((current) => (current ? { ...current, ...updates, updatedAt: new Date().toISOString() } : null));
    setHasUnsavedChanges(true);
    setActionError(null);
  }

  async function handleSave(): Promise<void> {
    if (!editState || editState.tier === 'system') {
      return;
    }

    setSaving(true);
    setActionError(null);

    try {
      if (selectedId === LOCAL_DRAFT_ID) {
        const created = await createPersona(mapPersonaToDraftInput(editState));
        setSelectedId(created.id);
        setEditState(clonePersona(created));
      } else {
        const updated = await updatePersona(editState.id, mapPersonaToDraftInput(editState));
        setEditState(clonePersona(updated));
      }
      setHasUnsavedChanges(false);
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Persona konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel(): void {
    setActionError(null);

    if (!selectedId) {
      setEditState(null);
      setHasUnsavedChanges(false);
      return;
    }

    if (selectedId === LOCAL_DRAFT_ID) {
      setSelectedId(null);
      setEditState(null);
      setHasUnsavedChanges(false);
      return;
    }

    const original = personas.find((persona) => persona.id === selectedId) ?? null;
    setEditState(original ? clonePersona(original) : null);
    setHasUnsavedChanges(false);
  }

  async function handleDelete(): Promise<void> {
    if (!editState) {
      return;
    }

    if (selectedId === LOCAL_DRAFT_ID) {
      handleCancel();
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      await deletePersona(editState.id);
      setSelectedId(null);
      setEditState(null);
      setHasUnsavedChanges(false);
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Persona konnte nicht geloescht werden');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px minmax(0, 1fr) 300px',
        gap: 0,
        height: '100%',
        minHeight: 0,
        width: '100%',
        border: '1px solid rgba(201,168,76,0.1)',
        borderRadius: 18,
        background: '#111118',
        boxShadow: TOKENS.shadow.card,
        overflow: 'hidden',
      }}
    >
      <ArcanaPersonaList
        personas={displayPersonas}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={handleCreate}
        loading={loading}
      />

      <div style={{ minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', background: '#111118' }}>
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid rgba(201,168,76,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {hasUnsavedChanges && (
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 10, letterSpacing: '2px', color: '#C9A84C' }}>UNGESPEICHERT</span>
          )}
          {error || actionError ? (
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: '#fda4af', lineHeight: 1.6 }}>
              Arcana API Fehler: {actionError ?? error}
            </div>
          ) : null}
        </div>

        <ArcanaPersonaTuning
          persona={selectedPersona}
          onChange={handleTuningChange}
          onSave={() => void handleSave()}
          onCancel={handleCancel}
          onDelete={selectedPersona && selectedPersona.tier !== 'system' ? () => void handleDelete() : undefined}
          saving={saving}
          isSystem={selectedPersona?.tier === 'system'}
        />
      </div>

      <ArcanaLivePreview persona={selectedPersona} onPreview={handlePreview} />
    </div>
  );
}
