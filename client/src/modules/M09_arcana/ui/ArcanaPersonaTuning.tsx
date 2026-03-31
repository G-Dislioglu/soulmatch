import { type ReactNode } from 'react';

import { TOKENS } from '../../../design';
import { VOICE_CATALOG } from '../../../data/voiceCatalog';
import {
  ARCANA_ARCHETYPE_OPTIONS,
  type ArcanaPersonaDefinition,
} from '../hooks/useArcanaApi';
import { getCharacterDisplay, getVoiceDisplay, TONE_MODE_IMPACT_TEXT } from '../lib/clientDirectorPrompt';

// ── Design constants ──────────────────────────────────────────────────────────
const TEAL   = '#4ECECE';
const VIOLET = '#8A6DB0';
const RED    = '#FF7070';
const GREEN  = '#6BD672';
const GOLD   = '#C9A84C';
const S1     = '#111118';   // block body bg
const S2     = '#16161F';   // block header bg
const MUTED  = '#6E6B7A';

// 3 featured voice chips (prototype: Fenrir·rau, Puck·warm, Kore·tief)
const FEATURED_VOICES = [
  { name: 'Fenrir', label: 'Fenrir · rau' },
  { name: 'Puck',   label: 'Puck · warm'  },
  { name: 'Kore',   label: 'Kore · tief'  },
] as const;

// 4 tone zones with distinct colors
const TONE_ZONES = [
  { key: 'serioes',   label: 'SERIÖS',    bg: 'rgba(107,79,160,0.3)',   color: '#C0A8E0' },
  { key: 'bissig',    label: 'BISSIG',    bg: 'rgba(201,168,76,0.18)',  color: '#C9A84C' },
  { key: 'satirisch', label: 'SATIRISCH', bg: 'rgba(255,120,50,0.18)',  color: '#FFB080' },
  { key: 'komisch',   label: 'KOMISCH',   bg: 'rgba(107,214,114,0.18)', color: GREEN     },
] as const;

// ── Slider helpers ────────────────────────────────────────────────────────────
function sliderBg(value: number, color: string): string {
  return `linear-gradient(90deg, ${color} 0%, ${color} ${value}%, rgba(255,255,255,0.12) ${value}%, rgba(255,255,255,0.12) 100%)`;
}

function rangeStyle(value: number, disabled: boolean, color: string) {
  return {
    width: '100%',
    appearance: 'none' as const,
    height: 6,
    borderRadius: 999,
    background: disabled ? 'rgba(255,255,255,0.08)' : sliderBg(value, color),
    outline: 'none',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  } as const;
}

function blockHead(title: string, hint: string, dotColor: string) {
  const glow = dotColor + '80';
  return (
    <div
      style={{
        background: S2,
        padding: '9px 15px',
        borderBottom: '1px solid rgba(201,168,76,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: dotColor,
          boxShadow: `0 0 5px ${glow}`,
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      <span
        style={{
          fontFamily: TOKENS.font.display,
          fontSize: 10,
          letterSpacing: '2px',
          color: dotColor,
        }}
      >
        {title}
      </span>
      <span style={{ marginLeft: 'auto', fontSize: 11, color: MUTED, fontStyle: 'italic' }}>{hint}</span>
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

function blockOuter() {
  return {
    border: '1px solid rgba(201,168,76,0.1)',
    borderRadius: 11,
    overflow: 'hidden',
  } as const;
}

function blockBody() {
  return {
    padding: '14px 16px',
    background: S1,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  } as const;
}

function Block({
  title, hint, dotColor, children,
}: { title: string; hint: string; dotColor: string; children: ReactNode }) {
  return (
    <div style={blockOuter()}>
      {blockHead(title, hint, dotColor)}
      <div style={blockBody()}>{children}</div>
    </div>
  );
}

function labelForAccentIntensity(value: number): string {
  if (value >= 75) return 'Ausgepraegt';
  if (value >= 45) return 'Spuerbar';
  return 'Dezent';
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ArcanaPersonaTuningProps {
  persona: ArcanaPersonaDefinition | null;
  onChange: (updated: Partial<ArcanaPersonaDefinition>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving: boolean;
  isSystem: boolean;
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
        padding: '22px 24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: '#111118',
      }}
    >
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ fontFamily: TOKENS.font.display, fontSize: 12, letterSpacing: '2px', color: GOLD }}>
          {persona.name.toUpperCase()} · FINE-TUNING
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {isSystem ? <span style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: MUTED }}>Read-only</span> : null}
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: 7,
              padding: '6px 12px',
              fontFamily: TOKENS.font.body,
              fontSize: 11,
              color: MUTED,
              cursor: 'pointer',
            }}
          >
            ↩ Zuruecksetzen
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('arcana-live-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            style={{
              background: 'rgba(78,206,206,0.07)',
              border: '1px solid rgba(78,206,206,0.25)',
              borderRadius: 7,
              padding: '6px 12px',
              fontFamily: TOKENS.font.body,
              fontSize: 11,
              color: TEAL,
              cursor: 'pointer',
            }}
          >
            ▶ Vorschau
          </button>
        </div>
      </div>
      {/* Preset pill */}
      <div
        style={{
          background: '#1E1E2B',
          border: '1px solid rgba(201,168,76,0.20)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 26, flexShrink: 0 }}>{persona.icon || '✦'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: TOKENS.font.display, fontSize: 13, color: GOLD }}>{persona.name}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{persona.subtitle || 'Entwurf'}</div>
        </div>
      </div>

      {/* ─── A. Name · Archetyp ─── */}
      <Block title="NAME · ARCHETYP" hint="Identität" dotColor={GOLD}>
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
      </Block>

      {/* ─── B. Signature Quirks (vor Charakter) ─── */}
      <Block title="SIGNATURE QUIRKS" hint="Eigenarten" dotColor={RED}>
        {persona.quirks.length > 0 ? persona.quirks.map((quirk) => (
          <div
            key={quirk.id}
            style={{
              border: `1px solid ${quirk.enabled ? 'rgba(255,112,112,0.28)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 8,
              padding: '9px 11px',
              background: quirk.enabled ? 'rgba(255,112,112,0.07)' : 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 9,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, fontWeight: 500, color: TOKENS.text, marginBottom: 2 }}>
                {quirk.label}
              </div>
              <div style={{ fontFamily: TOKENS.font.serif, fontStyle: 'italic', fontSize: 11, color: TOKENS.text2, lineHeight: 1.4 }}>
                {quirk.description}
              </div>
            </div>
            {/* CSS toggle switch 32×17px */}
            <div
              role="switch"
              aria-checked={quirk.enabled}
              onClick={() => !disabled && onChange({
                quirks: persona.quirks.map((entry) => entry.id === quirk.id ? { ...entry, enabled: !entry.enabled } : entry),
              })}
              style={{
                width: 32,
                height: 17,
                borderRadius: 9,
                background: quirk.enabled ? 'rgba(255,112,112,0.2)' : TOKENS.b3,
                border: `1px solid ${quirk.enabled ? 'rgba(255,112,112,0.35)' : 'rgba(255,255,255,0.07)'}`,
                position: 'relative',
                cursor: disabled ? 'not-allowed' : 'pointer',
                flexShrink: 0,
                marginTop: 2,
                transition: 'background 0.3s, border-color 0.3s',
              }}
            >
              <div style={{
                position: 'absolute',
                width: 11,
                height: 11,
                borderRadius: '50%',
                background: quirk.enabled ? RED : TOKENS.text2,
                top: 2,
                left: quirk.enabled ? 17 : 2,
                transition: 'left 0.3s, background 0.3s',
              }} />
            </div>
          </div>
        )) : (
          <div style={{ border: `1.5px dashed ${TOKENS.b2}`, borderRadius: 18, padding: '14px 12px', fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>
            Diese Persona hat aktuell keine Signature Quirks.
          </div>
        )}
      </Block>

      {/* ─── C. Charakter · Tuning (Gold) ─── */}
      <Block title="CHARAKTER · TUNING" hint="Persönlichkeit" dotColor={GOLD}>
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
            style={rangeStyle(persona.character.intensity, disabled, '#C9A84C')}
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
            style={rangeStyle(persona.character.empathy, disabled, '#C9A84C')}
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
            style={rangeStyle(persona.character.confrontation, disabled, '#C9A84C')}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Bestaetigend</span>
            <span>Provokativ</span>
          </div>
        </label>
      </Block>

      {/* ─── D. Ton · Modus (4-Zonen-Balken + Violet-Slider) ─── */}
      <Block title="TON · MODUS" hint="Seriös bis Komisch" dotColor={GREEN}>
        {/* 4-zone bar */}
        <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden' }}>
          {TONE_ZONES.map((zone) => {
            const active = persona.toneMode.mode === zone.key;
            return (
              <button
                key={zone.key}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ toneMode: { ...persona.toneMode, mode: zone.key } })}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: zone.bg,
                  color: zone.color,
                  fontSize: 9,
                  letterSpacing: '0.5px',
                  opacity: active ? 1 : 0.35,
                  border: 'none',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
                  fontFamily: TOKENS.font.body,
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {zone.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 10, color: TOKENS.text2 }}>
          <span>Historisch akkurat</span>
          <span>Viral-komisch</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={persona.toneMode.slider}
          disabled={disabled}
          onChange={(event) => onChange({ toneMode: { ...persona.toneMode, slider: Number(event.target.value) } })}
          style={rangeStyle(persona.toneMode.slider, disabled, VIOLET)}
        />
        <div style={{ border: `1.5px solid ${TOKENS.b1}`, borderRadius: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Auswirkung bei "{persona.toneMode.mode}"
          </div>
          <div style={{ marginTop: 8, fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>
            {TONE_MODE_IMPACT_TEXT[persona.toneMode.mode]}
          </div>
        </div>
      </Block>

      {/* ─── E. Stimme · Tuning (Chips + Teal-Slider) ─── */}
      <Block title="STIMME · TUNING" hint="Klang & TTS" dotColor={TEAL}>
        {/* 3 featured voice chips */}
        <div>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 9, letterSpacing: '0.3em', color: TOKENS.text2, marginBottom: 8, textTransform: 'uppercase' }}>
            Basisstimme
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {FEATURED_VOICES.map((v) => {
              const active = persona.voice.voiceName === v.name;
              return (
                <button
                  key={v.name}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ voice: { ...persona.voice, voiceName: v.name as ArcanaPersonaDefinition['voice']['voiceName'] } })}
                  style={{
                    padding: '4px 11px',
                    borderRadius: 6,
                    border: `1px solid ${active ? 'rgba(78,206,206,0.45)' : 'rgba(201,168,76,0.12)'}`,
                    background: active ? 'rgba(78,206,206,0.07)' : 'transparent',
                    color: active ? TEAL : TOKENS.text2,
                    fontSize: 11,
                    fontFamily: TOKENS.font.body,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
          {/* Accent chip — styled select */}
          <select
            value={persona.voice.accent}
            disabled={disabled}
            onChange={(event) => onChange({ voice: { ...persona.voice, accent: event.target.value as ArcanaPersonaDefinition['voice']['accent'] } })}
            style={{
              padding: '4px 11px',
              borderRadius: 6,
              border: '1.5px dashed rgba(201,168,76,0.3)',
              background: 'transparent',
              color: TOKENS.gold,
              fontSize: 11,
              fontFamily: TOKENS.font.body,
              cursor: disabled ? 'not-allowed' : 'pointer',
              appearance: 'none',
              outline: 'none',
            }}
          >
            <option value="off">+ Kein Akzent ✦</option>
            <option value="indisch">+ Akzent: Indisch ✦</option>
            <option value="britisch">+ Akzent: Britisch ✦</option>
            <option value="franzoesisch">+ Akzent: Franzoesisch ✦</option>
            <option value="arabisch">+ Akzent: Arabisch ✦</option>
            <option value="japanisch">+ Akzent: Japanisch ✦</option>
            <option value="suedlaendisch">+ Akzent: Suedlaendisch ✦</option>
            <option value="nordisch">+ Akzent: Nordisch ✦</option>
            <option value="mystisch">+ Akzent: Mystisch ✦</option>
            <option value="griechisch">+ Akzent: Griechisch ✦</option>
            <option value="russisch">+ Akzent: Russisch ✦</option>
            <option value="afrikanisch">+ Akzent: Afrikanisch ✦</option>
            <option value="lateinamerikanisch">+ Akzent: Lateinamerikanisch ✦</option>
          </select>
          <div style={{ marginTop: 6, fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            {voiceEntry?.character ?? 'Keine Beschreibung verfuegbar.'}
          </div>
        </div>
        {/* Teal sliders */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text }}>Akzent-Staerke</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TEAL }}>{labelForAccentIntensity(persona.voice.accentIntensity)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={persona.voice.accentIntensity}
            disabled={disabled}
            onChange={(event) => onChange({ voice: { ...persona.voice, accentIntensity: Number(event.target.value) } })}
            style={rangeStyle(persona.voice.accentIntensity, disabled, TEAL)}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text }}>Sprechtempo</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TEAL }}>{voiceDisplay.tempo}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={persona.voice.speakingTempo}
            disabled={disabled}
            onChange={(event) => onChange({ voice: { ...persona.voice, speakingTempo: Number(event.target.value) } })}
            style={rangeStyle(persona.voice.speakingTempo, disabled, TEAL)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Langsam meditativ</span>
            <span>Dynamisch</span>
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text }}>Pausen & Dramaturgie</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TEAL }}>{voiceDisplay.pauses}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={persona.voice.pauseDramaturgy}
            disabled={disabled}
            onChange={(event) => onChange({ voice: { ...persona.voice, pauseDramaturgy: Number(event.target.value) } })}
            style={rangeStyle(persona.voice.pauseDramaturgy, disabled, TEAL)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Fliessend</span>
            <span>Dramatisch</span>
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text }}>Emotionale Intensitaet</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TEAL }}>{voiceDisplay.emotion}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={persona.voice.emotionalIntensity}
            disabled={disabled}
            onChange={(event) => onChange({ voice: { ...persona.voice, emotionalIntensity: Number(event.target.value) } })}
            style={rangeStyle(persona.voice.emotionalIntensity, disabled, TEAL)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Neutral</span>
            <span>Theatralisch</span>
          </div>
        </label>
      </Block>

      {/* ─── F. Maya · Special Mode (Violet) ─── */}
      <Block title="✦ MAYA · SPECIAL MODE" hint="Über die Regler hinaus" dotColor={VIOLET}>
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
      </Block>

      {/* ─── G. Footer actions ─── */}
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
