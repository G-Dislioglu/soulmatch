import { useEffect, useState } from 'react';

import { TOKENS } from '../../../design';
import { ArcanaPersonaList } from './ArcanaPersonaList';
import { ArcanaCreatorChat } from './ArcanaCreatorChat';
import { ArcanaRightPanel } from './ArcanaRightPanel';
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
    skills: {
      knowledge: [],
      interaction: [],
      tools: [],
    },
    contradictions: [],
    voice: {
      voiceName: 'Aoede' as const,
      accent: 'off' as const,
      accentIntensity: 50,
      speakingTempo: 50,
      pauseDramaturgy: 50,
      emotionalIntensity: 50,
    },
    sources: [],
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
    skills: persona.skills,
    contradictions: persona.contradictions,
    voiceConfig: persona.voice,
    sources: persona.sources,
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
  const breadcrumbName = selectedPersona?.name || 'Napoleon';
  const creditBudget = selectedPersona?.credits.creationCost ?? 50;

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
    <main
      style={{
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        background: '#0B0A12',
        color: TOKENS.text,
        display: 'grid',
        gridTemplateRows: '48px minmax(0, calc(100vh - 48px))',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          height: 48,
          borderBottom: '1px solid rgba(201,168,76,0.12)',
          background: '#111118',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '0 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div style={{ fontFamily: TOKENS.font.display, fontSize: 12, letterSpacing: '4px', color: '#C9A84C', whiteSpace: 'nowrap' }}>
            ARCANA STUDIO
          </div>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: '#8D88A6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Creator Shell 
            <span style={{ color: '#5D5772' }}>→</span>
            {' '}
            <span style={{ color: '#D8D3EB' }}>{breadcrumbName}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: '#9F7AEA' }}>{creditBudget}T · Maya Special aktiv</span>
          <span
            style={{
              height: 30,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: '#1C1A28',
              color: '#8D88A6',
              fontFamily: TOKENS.font.body,
              fontSize: 11,
              padding: '0 12px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Credits: 847T
          </span>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!selectedPersona || saving || selectedPersona.tier === 'system' || !hasUnsavedChanges}
            style={{
              height: 30,
              borderRadius: 10,
              border: '1px solid rgba(201,168,76,0.45)',
              background: hasUnsavedChanges ? 'rgba(201,168,76,0.18)' : 'rgba(201,168,76,0.08)',
              color: '#E2C36D',
              fontFamily: TOKENS.font.body,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.02em',
              padding: '0 12px',
              cursor: !selectedPersona || saving || selectedPersona.tier === 'system' || !hasUnsavedChanges ? 'not-allowed' : 'pointer',
            }}
          >
            + Persona erstellen
          </button>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px minmax(0, 1fr) 380px',
          gap: 0,
          height: 'calc(100vh - 48px)',
          minHeight: 0,
          width: '100%',
          overflow: 'hidden',
          borderTop: '1px solid rgba(255,255,255,0.02)',
        }}
      >
        <ArcanaPersonaList
          personas={displayPersonas}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={handleCreate}
          loading={loading}
        />

        <ArcanaCreatorChat hasUnsavedChanges={hasUnsavedChanges} errorMessage={actionError ?? error} />

        <ArcanaRightPanel
          persona={selectedPersona}
          onChange={handleTuningChange}
          onSave={() => void handleSave()}
          onCancel={handleCancel}
          onDelete={selectedPersona && selectedPersona.tier !== 'system' ? () => void handleDelete() : undefined}
          onPreview={handlePreview}
          saving={saving}
          isSystem={selectedPersona?.tier === 'system'}
        />
      </div>
    </main>
  );
}
