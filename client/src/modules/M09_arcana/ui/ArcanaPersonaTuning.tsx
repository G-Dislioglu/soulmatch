import { TOKENS } from '../../../design';
import { VOICE_CATALOG } from '../../../data/voiceCatalog';
import {
  ARCANA_ARCHETYPE_OPTIONS,
  type ArcanaPersonaDefinition,
} from '../hooks/useArcanaApi';
import { getCharacterDisplay, getVoiceDisplay, TONE_MODE_IMPACT_TEXT } from '../lib/clientDirectorPrompt';

interface ArcanaPersonaTuningProps {
  persona: ArcanaPersonaDefinition | null;
  onChange: (updated: Partial<ArcanaPersonaDefinition>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving: boolean;
  isSystem: boolean;
}

function sliderBackground(value: number): string {
  return `linear-gradient(90deg, ${TOKENS.gold} 0%, ${TOKENS.gold} ${value}%, rgba(255,255,255,0.12) ${value}%, rgba(255,255,255,0.12) 100%)`;
}

function sectionLabel(title: string, subtitle: string) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        ● {title}
      </div>
      <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>{subtitle}</div>
    </div>
  );
}

function inputWrapStyle(disabled: boolean) {
  return {
    width: '100%',
    border: `1.5px solid ${disabled ? TOKENS.b3 : TOKENS.b1}`,
    borderRadius: 14,
    background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
    color: disabled ? TOKENS.text2 : TOKENS.text,
    padding: '12px 14px',
    fontFamily: TOKENS.font.body,
    fontSize: 14,
    outline: 'none',
  } as const;
}

function rangeStyle(value: number, disabled: boolean) {
  return {
    width: '100%',
    appearance: 'none',
    height: 6,
    borderRadius: 999,
    background: disabled ? 'rgba(255,255,255,0.08)' : sliderBackground(value),
    outline: 'none',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  } as const;
}

function panelStyle() {
  return {
    border: `1.5px solid ${TOKENS.b2}`,
    borderRadius: 22,
    background: 'rgba(255,255,255,0.025)',
    padding: '18px 18px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  } as const;
}

function labelForAccentIntensity(value: number): string {
  if (value >= 75) return 'Ausgepraegt';
  if (value >= 45) return 'Spuerbar';
  return 'Dezent';
}

export function ArcanaPersonaTuning({
  persona,
  onChange,
  onSave,
  onCancel,
  onDelete,
  saving,
  isSystem,
}: ArcanaPersonaTuningProps) {
  if (!persona) {
    return (
      <section
        style={{
          minHeight: 0,
          height: '100%',
          overflowY: 'auto',
          padding: '24px 24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <div style={{ fontFamily: TOKENS.font.display, fontSize: 28, color: TOKENS.text }}>Persona Fine-Tuning</div>
          <div style={{ marginTop: 12, fontFamily: TOKENS.font.body, fontSize: 14, lineHeight: 1.8, color: TOKENS.text2 }}>
            Waehle links eine User-Persona oder starte einen neuen Entwurf. Hier erscheinen dann Name, Charakter-Regler, Ton-Modus, Quirks und Voice-Tuning.
          </div>
        </div>
      </section>
    );
  }

  const characterDisplay = getCharacterDisplay(persona);
  const voiceDisplay = getVoiceDisplay(persona);
  const disabled = saving || isSystem;
  const voiceEntry = VOICE_CATALOG.find((entry) => entry.name === persona.voice.voiceName);

  return (
    <section
      style={{
        minHeight: 0,
        height: '100%',
        overflowY: 'auto',
        padding: '24px 24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div style={panelStyle()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.gold, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              {persona.name.toUpperCase()} · Fine-Tuning
            </div>
            <div style={{ marginTop: 8, fontFamily: TOKENS.font.serif, fontSize: 30, color: TOKENS.text }}>{persona.subtitle || 'Arcana Persona'}</div>
          </div>
          {isSystem ? (
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2, lineHeight: 1.5, maxWidth: 180, textAlign: 'right' }}>
              System-Personas bleiben read-only.
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: `1.5px solid ${TOKENS.b1}`,
              background: 'rgba(255,255,255,0.03)',
              color: TOKENS.text,
              borderRadius: 16,
              padding: '10px 14px',
              fontFamily: TOKENS.font.body,
              cursor: 'pointer',
            }}
          >
            ↻ Zuruecksetzen
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('arcana-live-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            style={{
              border: `1.5px solid ${TOKENS.gold}`,
              background: 'rgba(212,175,55,0.08)',
              color: TOKENS.gold,
              borderRadius: 16,
              padding: '10px 14px',
              fontFamily: TOKENS.font.body,
              cursor: 'pointer',
            }}
          >
            ▶ Vorschau
          </button>
        </div>
      </div>

      <div style={panelStyle()}>
        {sectionLabel('Name · Archetyp', 'Identitaet')}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Name</span>
            <input
              value={persona.name}
              maxLength={100}
              disabled={disabled}
              onChange={(event) => onChange({ name: event.target.value.slice(0, 100) })}
              style={inputWrapStyle(disabled)}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Subtitle</span>
            <input
              value={persona.subtitle}
              maxLength={120}
              disabled={disabled}
              onChange={(event) => onChange({ subtitle: event.target.value.slice(0, 120) })}
              style={inputWrapStyle(disabled)}
            />
          </label>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Archetyp</span>
          <select
            value={persona.archetype}
            disabled={disabled}
            onChange={(event) => onChange({ archetype: event.target.value as ArcanaPersonaDefinition['archetype'] })}
            style={inputWrapStyle(disabled)}
          >
            {ARCANA_ARCHETYPE_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Beschreibung fuer KI</span>
          <textarea
            value={persona.description}
            maxLength={500}
            disabled={disabled}
            onChange={(event) => onChange({ description: event.target.value.slice(0, 500) })}
            rows={4}
            style={{ ...inputWrapStyle(disabled), resize: 'vertical', minHeight: 110 }}
          />
        </label>
      </div>

      <div style={panelStyle()}>
        {sectionLabel('Charakter · Tuning', 'Persoenlichkeit')}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text }}>Intensitaet</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.gold }}>{characterDisplay.intensity}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={persona.character.intensity}
            disabled={disabled}
            onChange={(event) => onChange({ character: { ...persona.character, intensity: Number(event.target.value) } })}
            style={rangeStyle(persona.character.intensity, disabled)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Sanft</span>
            <span>Unerbittlich</span>
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text }}>Empathie</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.gold }}>{characterDisplay.empathy}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={persona.character.empathy}
            disabled={disabled}
            onChange={(event) => onChange({ character: { ...persona.character, empathy: Number(event.target.value) } })}
            style={rangeStyle(persona.character.empathy, disabled)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Kuehl analytisch</span>
            <span>Tief mitfuehlend</span>
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text }}>Konfrontation</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.gold }}>{characterDisplay.confrontation}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={persona.character.confrontation}
            disabled={disabled}
            onChange={(event) => onChange({ character: { ...persona.character, confrontation: Number(event.target.value) } })}
            style={rangeStyle(persona.character.confrontation, disabled)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Bestaetigend</span>
            <span>Provokativ</span>
          </div>
        </label>
      </div>

      <div style={panelStyle()}>
        {sectionLabel('Ton · Modus', 'Serioes bis Komisch')}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['serioes', 'bissig', 'satirisch', 'komisch'] as const).map((modeKey) => {
            const active = persona.toneMode.mode === modeKey;
            return (
              <button
                key={modeKey}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ toneMode: { ...persona.toneMode, mode: modeKey } })}
                style={{
                  border: `1.5px solid ${active ? TOKENS.gold : TOKENS.b1}`,
                  background: active ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
                  color: active ? TOKENS.gold : TOKENS.text,
                  borderRadius: 999,
                  padding: '10px 14px',
                  fontFamily: TOKENS.font.body,
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {modeKey}
              </button>
            );
          })}
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text }}>Modus-Intensitaet</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.gold }}>{persona.toneMode.slider}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={persona.toneMode.slider}
            disabled={disabled}
            onChange={(event) => onChange({ toneMode: { ...persona.toneMode, slider: Number(event.target.value) } })}
            style={rangeStyle(persona.toneMode.slider, disabled)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Historisch akkurat</span>
            <span>Viral-komisch</span>
          </div>
        </label>
        <div style={{ border: `1.5px solid ${TOKENS.b1}`, borderRadius: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Auswirkung bei "{persona.toneMode.mode}"
          </div>
          <div style={{ marginTop: 8, fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>
            {TONE_MODE_IMPACT_TEXT[persona.toneMode.mode]}
          </div>
        </div>
      </div>

      <div style={panelStyle()}>
        {sectionLabel('Signature Quirks', 'Eigenarten')}
        {persona.quirks.length > 0 ? persona.quirks.map((quirk) => (
          <div
            key={quirk.id}
            style={{
              border: `1.5px solid ${quirk.enabled ? `${TOKENS.gold}66` : TOKENS.b2}`,
              borderRadius: 18,
              padding: '14px 14px 12px',
              background: quirk.enabled ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.015)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontFamily: TOKENS.font.body, fontSize: 14, color: TOKENS.text }}>{quirk.label}</div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({
                  quirks: persona.quirks.map((entry) => entry.id === quirk.id ? { ...entry, enabled: !entry.enabled } : entry),
                })}
                style={{
                  border: `1.5px solid ${quirk.enabled ? TOKENS.gold : TOKENS.b1}`,
                  background: quirk.enabled ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
                  color: quirk.enabled ? TOKENS.gold : TOKENS.text2,
                  borderRadius: 999,
                  padding: '6px 10px',
                  fontFamily: TOKENS.font.body,
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {quirk.enabled ? 'On' : 'Off'}
              </button>
            </div>
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2, lineHeight: 1.6 }}>{quirk.description}</div>
          </div>
        )) : (
          <div style={{ border: `1.5px dashed ${TOKENS.b2}`, borderRadius: 18, padding: '14px 12px', fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>
            Diese Persona hat aktuell keine Signature Quirks. In Phase 6.2 koennen bestehende Quirks getoggelt, aber noch nicht neu erzeugt werden.
          </div>
        )}
      </div>

      <div style={panelStyle()}>
        {sectionLabel('Stimme · Tuning', 'Klang & TTS')}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Basisstimme</span>
          <select
            value={persona.voice.voiceName}
            disabled={disabled}
            onChange={(event) => onChange({ voice: { ...persona.voice, voiceName: event.target.value as ArcanaPersonaDefinition['voice']['voiceName'] } })}
            style={inputWrapStyle(disabled)}
          >
            <optgroup label="Female">
              {VOICE_CATALOG.filter((entry) => entry.gender === 'female').map((entry) => (
                <option key={entry.name} value={entry.name}>{entry.label}</option>
              ))}
            </optgroup>
            <optgroup label="Male">
              {VOICE_CATALOG.filter((entry) => entry.gender === 'male').map((entry) => (
                <option key={entry.name} value={entry.name}>{entry.label}</option>
              ))}
            </optgroup>
            <optgroup label="Neutral">
              {VOICE_CATALOG.filter((entry) => entry.gender === 'neutral').map((entry) => (
                <option key={entry.name} value={entry.name}>{entry.label}</option>
              ))}
            </optgroup>
          </select>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>{voiceEntry?.character ?? 'Keine Beschreibung verfuegbar.'}</div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Akzent</span>
          <select
            value={persona.voice.accent}
            disabled={disabled}
            onChange={(event) => onChange({ voice: { ...persona.voice, accent: event.target.value as ArcanaPersonaDefinition['voice']['accent'] } })}
            style={inputWrapStyle(disabled)}
          >
            <option value="off">Kein Akzent</option>
            <option value="indisch">Indisch</option>
            <option value="britisch">Britisch</option>
            <option value="franzoesisch">Franzoesisch</option>
            <option value="arabisch">Arabisch</option>
            <option value="japanisch">Japanisch</option>
            <option value="suedlaendisch">Suedlaendisch</option>
            <option value="nordisch">Nordisch</option>
            <option value="mystisch">Mystisch</option>
            <option value="griechisch">Griechisch</option>
            <option value="russisch">Russisch</option>
            <option value="afrikanisch">Afrikanisch</option>
            <option value="lateinamerikanisch">Lateinamerikanisch</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text }}>Akzent-Staerke</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.gold }}>{labelForAccentIntensity(persona.voice.accentIntensity)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={persona.voice.accentIntensity}
            disabled={disabled}
            onChange={(event) => onChange({ voice: { ...persona.voice, accentIntensity: Number(event.target.value) } })}
            style={rangeStyle(persona.voice.accentIntensity, disabled)}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text }}>Sprechtempo</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.gold }}>{voiceDisplay.tempo}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={persona.voice.speakingTempo}
            disabled={disabled}
            onChange={(event) => onChange({ voice: { ...persona.voice, speakingTempo: Number(event.target.value) } })}
            style={rangeStyle(persona.voice.speakingTempo, disabled)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Langsam meditativ</span>
            <span>Dynamisch</span>
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text }}>Pausen & Dramaturgie</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.gold }}>{voiceDisplay.pauses}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={persona.voice.pauseDramaturgy}
            disabled={disabled}
            onChange={(event) => onChange({ voice: { ...persona.voice, pauseDramaturgy: Number(event.target.value) } })}
            style={rangeStyle(persona.voice.pauseDramaturgy, disabled)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Fliessend</span>
            <span>Dramatisch</span>
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text }}>Emotionale Intensitaet</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.gold }}>{voiceDisplay.emotion}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={persona.voice.emotionalIntensity}
            disabled={disabled}
            onChange={(event) => onChange({ voice: { ...persona.voice, emotionalIntensity: Number(event.target.value) } })}
            style={rangeStyle(persona.voice.emotionalIntensity, disabled)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Neutral</span>
            <span>Theatralisch</span>
          </div>
        </label>
      </div>

      <div style={panelStyle()}>
        {sectionLabel('✦ Maya · Special Mode', 'Ueber die Regler hinaus')}
        <div style={{ border: `1.5px solid ${TOKENS.b1}`, borderRadius: 18, padding: '16px 16px 14px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            🌙 Maya Spezial-Funktion
          </div>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>
            Beschreibe Maya in deinen eigenen Worten, wie du diese Persona weiter modifizieren moechtest, was unsere Regler noch nicht abdecken.
          </div>
          <textarea
            value={persona.mayaSpecial ?? ''}
            disabled={disabled}
            onChange={(event) => onChange({ mayaSpecial: event.target.value })}
            rows={4}
            style={{ ...inputWrapStyle(disabled), resize: 'vertical', minHeight: 120 }}
          />
          <button
            type="button"
            disabled
            style={{
              alignSelf: 'flex-start',
              border: `1.5px solid ${TOKENS.gold}`,
              background: 'rgba(212,175,55,0.06)',
              color: `${TOKENS.gold}99`,
              borderRadius: 16,
              padding: '10px 14px',
              fontFamily: TOKENS.font.body,
              cursor: 'not-allowed',
            }}
          >
            ✦ Maya oeffnen
          </button>
        </div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        {onDelete && !isSystem ? (
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            style={{
              border: '1.5px solid rgba(248,113,113,0.35)',
              background: 'rgba(248,113,113,0.08)',
              color: '#fda4af',
              borderRadius: 16,
              padding: '12px 16px',
              fontFamily: TOKENS.font.body,
              cursor: saving ? 'progress' : 'pointer',
            }}
          >
            Persona loeschen
          </button>
        ) : <div />}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              border: `1.5px solid ${TOKENS.b1}`,
              background: 'rgba(255,255,255,0.03)',
              color: TOKENS.text,
              borderRadius: 16,
              padding: '12px 16px',
              fontFamily: TOKENS.font.body,
              cursor: saving ? 'progress' : 'pointer',
            }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={disabled}
            style={{
              border: `1.5px solid ${disabled ? TOKENS.b1 : TOKENS.gold}`,
              background: disabled ? 'rgba(255,255,255,0.03)' : TOKENS.gold,
              color: disabled ? TOKENS.text3 : TOKENS.bg,
              borderRadius: 16,
              padding: '12px 16px',
              fontFamily: TOKENS.font.body,
              fontWeight: 700,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Speichert...' : '✦ Persona speichern'}
          </button>
        </div>
      </div>
    </section>
  );
}
