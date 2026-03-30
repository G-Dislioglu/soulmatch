import { useState } from 'react';

import { TOKENS } from '../../../design';
import { ArcanaPersonaList } from './ArcanaPersonaList';
import { ArcanaPersonaTuning } from './ArcanaPersonaTuning';
import { ArcanaLivePreview } from './ArcanaLivePreview';
import { useArcanaApi, type ArcanaPersonaDefinition } from '../hooks/useArcanaApi';

interface ArcanaStudioPageProps {
  userId?: string | null;
}

function buildNewPersonaDraft() {
  return {
    name: 'Neue Persona',
    subtitle: 'Entwurf',
    archetype: 'custom',
    description: 'Ein neuer Arcana-Entwurf fuer Stimme, Verhalten und spaetere Studio-Feinabstimmung.',
    icon: '✦',
    color: TOKENS.gold,
    characterTuning: {
      intensity: 50,
      empathy: 50,
      confrontation: 50,
    },
    toneMode: {
      mode: 'serioes' as const,
      slider: 50,
    },
    quirks: [],
    voiceConfig: {
      voiceName: 'Aoede' as const,
      accent: 'off' as const,
      accentIntensity: 50,
      speakingTempo: 50,
      pauseDramaturgy: 50,
      emotionalIntensity: 50,
    },
  };
}

export function ArcanaStudioPage({ userId }: ArcanaStudioPageProps) {
  const { personas, loading, error, createPersona, previewTts } = useArcanaApi(userId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedPersona = personas.find((persona) => persona.id === selectedId) ?? null;

  async function handleCreate(): Promise<void> {
    const created = await createPersona(buildNewPersonaDraft());
    setSelectedId(created.id);
  }

  async function handlePreview(persona: ArcanaPersonaDefinition): Promise<void> {
    const response = await previewTts(
      persona.voice.voiceName,
      persona.voice.accent,
      `Hallo, ich bin ${persona.name}. Willkommen im Arcana Studio.`,
    );

    const audio = new Audio(`data:${response.mimeType};base64,${response.audio}`);
    await audio.play();
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px minmax(0, 1fr) 320px',
        gap: 0,
        height: '100%',
        minHeight: 0,
        width: '100%',
        border: `1.5px solid ${TOKENS.b2}`,
        borderRadius: 24,
        background: TOKENS.card,
        boxShadow: TOKENS.shadow.card,
        overflow: 'hidden',
      }}
    >
      <ArcanaPersonaList
        personas={personas}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={() => void handleCreate()}
        loading={loading}
      />

      <div style={{ minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 24px 0' }}>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.gold, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Creator Shell
          </div>
          <div style={{ marginTop: 8, fontFamily: TOKENS.font.display, fontSize: 28, color: TOKENS.text }}>
            Persona Creator
          </div>
          <div style={{ marginTop: 8, fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text2, lineHeight: 1.7, maxWidth: 680 }}>
            Drei Spalten, echte Arcana-Daten und sofortiger TTS-Preview. Die Detailregler fuer Charakter, Ton, Quirks und Director Prompt folgen in Phase 6.2.
          </div>
          {error ? (
            <div style={{ marginTop: 12, fontFamily: TOKENS.font.body, fontSize: 12, color: '#fda4af', lineHeight: 1.6 }}>
              Arcana API Fehler: {error}
            </div>
          ) : null}
        </div>

        <ArcanaPersonaTuning
          persona={selectedPersona}
          onSave={() => undefined}
          onCancel={() => setSelectedId(null)}
        />
      </div>

      <ArcanaLivePreview persona={selectedPersona} onPreview={handlePreview} />
    </div>
  );
}
