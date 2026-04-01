import { type ReactNode, useEffect, useState } from 'react';

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
const ORANGE = '#E8A838';
const S1     = '#111118';   // block body bg
const MUTED  = '#6E6B7A';

// Emoji icons by quirk category
const QUIRK_CATEGORY_ICON: Record<string, string> = {
  behavior: '🔱',
  speech:   '🎭',
  knowledge: '📚',
  limitation: '⚠️',
};

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

const SOURCE_PREVIEW_FALLBACK: NonNullable<ArcanaPersonaDefinition['sources']> = [
  { name: 'biografie.pdf', type: 'pdf', extractedCount: 4 },
  { name: 'portrait-referenz.png', type: 'image', extractedCount: 3 },
  { name: 'notizen.txt', type: 'text', extractedCount: 2 },
];

const QUIRKS_FALLBACK: ArcanaPersonaDefinition['quirks'] = [
  {
    id: 'fallback-importance',
    label: 'Betont seine Bedeutung',
    description: 'Setzt zentrale Punkte mit historischer Gravitas.',
    promptFragment: 'Betone historische Bedeutung.',
    enabled: true,
    category: 'speech',
  },
  {
    id: 'fallback-strategy',
    label: 'Denkt in Strategien',
    description: 'Rahmt Probleme als Plan, Taktik oder Feldzug.',
    promptFragment: 'Rahme Probleme als Strategie.',
    enabled: true,
    category: 'behavior',
  },
];

const SKILLS_FALLBACK: NonNullable<ArcanaPersonaDefinition['skills']> = {
  knowledge: ['Geschichte', 'Machtanalyse'],
  interaction: ['Direkt', 'Pointiert'],
  tools: ['Framing', 'Szenarien'],
};

const CONTRADICTIONS_FALLBACK: NonNullable<ArcanaPersonaDefinition['contradictions']> = [
  {
    poleA: 'Visionaer',
    poleB: 'Kontrollierend',
    description: 'Treibt Innovation, will aber den Verlauf strikt steuern.',
  },
];

function createOpenSections(compact: boolean) {
  return {
    identity: !compact,
    quirks: true,
    skills: true,
    contradictions: true,
    character: true,
    tone: compact,
    voice: compact,
    sources: true,
    maya: false,
  };
}

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

function blockHead(
  title: string,
  hint: string,
  dotColor: string,
  collapsible?: { open: boolean; onToggle: () => void },
) {
  const glow = dotColor + '80';
  return (
    <div
      style={{
        background: '#2A2A3A',
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.10)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        borderLeft: `4px solid ${dotColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
        minHeight: 44,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: dotColor,
          boxShadow: `0 0 8px ${glow}`,
          flexShrink: 0,
          display: 'inline-block',
          marginRight: 8,
        }}
      />
      <span
        style={{
          fontFamily: TOKENS.font.display,
          fontSize: 10,
          letterSpacing: '2.5px',
          color: dotColor,
        }}
      >
        {title}
      </span>
      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.48)', fontStyle: 'italic' }}>{hint}</span>
      {collapsible ? (
        <button
          type="button"
          onClick={collapsible.onToggle}
          aria-label={collapsible.open ? `${title} einklappen` : `${title} ausklappen`}
          style={{
            border: `1px solid ${dotColor}55`,
            background: 'rgba(255,255,255,0.04)',
            color: dotColor,
            borderRadius: 8,
            width: 24,
            height: 24,
            cursor: 'pointer',
            lineHeight: 1,
            fontSize: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 8,
          }}
        >
          {collapsible.open ? '-' : '+'}
        </button>
      ) : null}
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
    overflow: 'visible',
    background: '#14141C',
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
  title,
  hint,
  dotColor,
  children,
  open = true,
  onToggle,
}: {
  title: string;
  hint: string;
  dotColor: string;
  children: ReactNode;
  open?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div style={blockOuter()}>
      {blockHead(title, hint, dotColor, onToggle ? { open, onToggle } : undefined)}
      {open ? <div style={blockBody()}>{children}</div> : null}
    </div>
  );
}

function labelForAccentIntensity(value: number): string {
  if (value >= 75) return 'Ausgepraegt';
  if (value >= 45) return 'Spuerbar';
  return 'Dezent';
}

function getSourceMeta(type: 'pdf' | 'image' | 'text') {
  if (type === 'pdf') {
    return { icon: 'PDF', color: '#F87171', bg: 'rgba(248,113,113,0.12)' };
  }
  if (type === 'image') {
    return { icon: 'IMG', color: TEAL, bg: 'rgba(78,206,206,0.12)' };
  }
  return { icon: 'TXT', color: '#B8A4E6', bg: 'rgba(138,109,176,0.2)' };
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
  compact?: boolean;
}

export function ArcanaPersonaTuning({
  persona,
  onChange,
  onSave,
  onCancel,
  onDelete,
  saving,
  isSystem,
  compact = false,
}: ArcanaPersonaTuningProps) {
  const [openSections, setOpenSections] = useState(() => createOpenSections(compact));
  const [skillInputs, setSkillInputs] = useState({ knowledge: '', interaction: '', tools: '' });
  const readOnlyInputs = saving || isSystem;

  useEffect(() => {
    setOpenSections(createOpenSections(compact));
    setSkillInputs({ knowledge: '', interaction: '', tools: '' });
  }, [persona?.id, compact]);

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function updateSkillInput(key: keyof typeof skillInputs, value: string) {
    setSkillInputs((prev) => ({ ...prev, [key]: value }));
  }

  function addSkillTag(key: keyof typeof skillInputs) {
    if (!persona || readOnlyInputs) {
      return;
    }

    const nextValue = skillInputs[key].trim();
    if (!nextValue) {
      return;
    }

    const nextSkills = {
      knowledge: persona.skills?.knowledge ?? [],
      interaction: persona.skills?.interaction ?? [],
      tools: persona.skills?.tools ?? [],
    };

    if (!nextSkills[key].includes(nextValue)) {
      nextSkills[key] = [...nextSkills[key], nextValue];
      onChange({ skills: nextSkills });
    }

    updateSkillInput(key, '');
  }

  function removeSkillTag(key: keyof typeof skillInputs, tag: string) {
    if (!persona || readOnlyInputs) {
      return;
    }

    onChange({
      skills: {
        knowledge: key === 'knowledge'
          ? (persona.skills?.knowledge ?? []).filter((entry) => entry !== tag)
          : (persona.skills?.knowledge ?? []),
        interaction: key === 'interaction'
          ? (persona.skills?.interaction ?? []).filter((entry) => entry !== tag)
          : (persona.skills?.interaction ?? []),
        tools: key === 'tools'
          ? (persona.skills?.tools ?? []).filter((entry) => entry !== tag)
          : (persona.skills?.tools ?? []),
      },
    });
  }

  function updateContradiction(index: number, field: 'poleA' | 'poleB' | 'description', value: string) {
    if (!persona || readOnlyInputs) {
      return;
    }

    onChange({
      contradictions: (persona.contradictions ?? []).map((entry, currentIndex) => (
        currentIndex === index ? { ...entry, [field]: value } : entry
      )),
    });
  }

  function addContradiction() {
    if (!persona || readOnlyInputs) {
      return;
    }

    onChange({
      contradictions: [
        ...(persona.contradictions ?? []),
        {
          poleA: 'Ordnung',
          poleB: 'Chaos',
          description: 'Bewegt sich zwischen methodischer Kontrolle und kreativer Unberechenbarkeit.',
        },
      ],
    });
  }

  function removeContradiction(index: number) {
    if (!persona || readOnlyInputs) {
      return;
    }

    onChange({
      contradictions: (persona.contradictions ?? []).filter((_, currentIndex) => currentIndex !== index),
    });
  }

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
  const voiceEntry = VOICE_CATALOG.find((entry) => entry.name === persona.voice.voiceName);
  const voiceDisplay = getVoiceDisplay(persona);
  const quirks = persona.quirks.length > 0 ? persona.quirks : QUIRKS_FALLBACK;
  const skills = {
    knowledge: persona.skills?.knowledge?.length ? persona.skills.knowledge : SKILLS_FALLBACK.knowledge,
    interaction: persona.skills?.interaction?.length ? persona.skills.interaction : SKILLS_FALLBACK.interaction,
    tools: persona.skills?.tools?.length ? persona.skills.tools : SKILLS_FALLBACK.tools,
  };
  const contradictions = persona.contradictions && persona.contradictions.length > 0 ? persona.contradictions : CONTRADICTIONS_FALLBACK;
  const sources = (persona.sources && persona.sources.length > 0) ? persona.sources : SOURCE_PREVIEW_FALLBACK;

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
      {/* ─── Header (compact single line) ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{persona.icon || '✦'}</span>
          <div style={{ fontFamily: TOKENS.font.display, fontSize: 11, letterSpacing: '2px', color: GOLD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {persona.name.toUpperCase()} · FINE-TUNING
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
          {isSystem ? <span style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: MUTED }}>Read-only</span> : null}
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: 7,
              padding: '5px 10px',
              fontFamily: TOKENS.font.body,
              fontSize: 11,
              color: MUTED,
              cursor: 'pointer',
            }}
          >
            ↩ Reset
          </button>
        </div>
      </div>

      {/* ─── A. Name · Archetyp ─── */}
      {!compact ? (
        <Block title="NAME · ARCHETYP" hint="Identität" dotColor={GOLD} open={openSections.identity} onToggle={() => toggleSection('identity')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Name</span>
            <input
              value={persona.name}
              maxLength={100}
              disabled={readOnlyInputs}
              onChange={(event) => onChange({ name: event.target.value.slice(0, 100) })}
              style={inputWrapStyle(readOnlyInputs)}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Subtitle</span>
            <input
              value={persona.subtitle}
              maxLength={120}
              disabled={readOnlyInputs}
              onChange={(event) => onChange({ subtitle: event.target.value.slice(0, 120) })}
              style={inputWrapStyle(readOnlyInputs)}
            />
          </label>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Archetyp</span>
          <select
            value={persona.archetype}
            disabled={readOnlyInputs}
            onChange={(event) => onChange({ archetype: event.target.value as ArcanaPersonaDefinition['archetype'] })}
            style={inputWrapStyle(readOnlyInputs)}
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
            disabled={readOnlyInputs}
            onChange={(event) => onChange({ description: event.target.value.slice(0, 500) })}
            rows={4}
            style={{ ...inputWrapStyle(readOnlyInputs), resize: 'vertical', minHeight: 110 }}
          />
        </label>
        </Block>
      ) : null}

      {/* ─── B. Signature Quirks (vor Charakter) ─── */}
      <Block title="SIGNATURE QUIRKS" hint="Eigenarten" dotColor={RED} open={openSections.quirks} onToggle={() => toggleSection('quirks')}>
        {quirks.map((quirk) => (
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
              <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, fontWeight: 500, color: TOKENS.text, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{QUIRK_CATEGORY_ICON[quirk.category] ?? '✦'}</span>
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
              onClick={() => !readOnlyInputs && onChange({
                quirks: quirks.map((entry) => entry.id === quirk.id ? { ...entry, enabled: !entry.enabled } : entry),
              })}
              style={{
                width: 32,
                height: 17,
                borderRadius: 9,
                background: quirk.enabled ? 'rgba(255,112,112,0.2)' : TOKENS.b3,
                border: `1px solid ${quirk.enabled ? 'rgba(255,112,112,0.35)' : 'rgba(255,255,255,0.07)'}`,
                position: 'relative',
                cursor: readOnlyInputs ? 'not-allowed' : 'pointer',
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
        ))}
      </Block>

      {/* ─── C. Fähigkeiten & Wissen ─── */}
      <Block title="FAEHIGKEITEN & WISSEN" hint="Tag-basierte Profile" dotColor={TEAL} open={openSections.skills} onToggle={() => toggleSection('skills')}>
        {[
          {
            key: 'knowledge' as const,
            title: 'Wissensdomaenen',
            tags: skills.knowledge,
            border: 'rgba(78,206,206,0.3)',
            bg: 'rgba(78,206,206,0.12)',
            color: TEAL,
          },
          {
            key: 'interaction' as const,
            title: 'Interaktionsmodi',
            tags: skills.interaction,
            border: 'rgba(138,109,176,0.35)',
            bg: 'rgba(138,109,176,0.2)',
            color: '#B8A4E6',
          },
          {
            key: 'tools' as const,
            title: 'Werkzeuge',
            tags: skills.tools,
            border: 'rgba(201,168,76,0.35)',
            bg: 'rgba(201,168,76,0.16)',
            color: GOLD,
          },
        ].map((group) => (
          <div key={group.key} style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#5A5A6E', fontFamily: TOKENS.font.body }}>
              {group.title}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {group.tags.map((tag) => (
                <span
                  key={`${group.key}-${tag}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 999,
                    border: `1px solid ${group.border}`,
                    background: group.bg,
                    color: group.color,
                    padding: '4px 9px',
                    fontFamily: TOKENS.font.body,
                    fontSize: 12,
                  }}
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    disabled={readOnlyInputs}
                    onClick={() => removeSkillTag(group.key, tag)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: group.color,
                      cursor: readOnlyInputs ? 'not-allowed' : 'pointer',
                      padding: 0,
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            <input
              value={skillInputs[group.key]}
              disabled={readOnlyInputs}
              onChange={(event) => updateSkillInput(group.key, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addSkillTag(group.key);
                }
              }}
              placeholder="Tag hinzufuegen"
              style={{
                ...inputWrapStyle(readOnlyInputs),
                padding: '8px 12px',
                fontSize: 12,
              }}
            />
          </div>
        ))}
      </Block>

      {/* ─── D. Widersprueche / Spannungsprofil ─── */}
      <Block title="WIDERSPRUECHE / SPANNUNGSPROFIL" hint="Pole mit Reibung" dotColor={ORANGE} open={openSections.contradictions} onToggle={() => toggleSection('contradictions')}>
        {contradictions.length > 0 ? contradictions.map((entry, index) => (
          <div
            key={`contradiction-${index}`}
            style={{
              borderLeft: `3px solid ${ORANGE}`,
              borderRadius: 8,
              background: '#16161F',
              borderTop: '1px solid rgba(232,168,56,0.2)',
              borderRight: '1px solid rgba(232,168,56,0.2)',
              borderBottom: '1px solid rgba(232,168,56,0.2)',
              padding: '10px 11px',
              display: 'grid',
              gap: 8,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }}>
              <input
                value={entry.poleA}
                disabled={readOnlyInputs}
                onChange={(event) => updateContradiction(index, 'poleA', event.target.value)}
                style={{ ...inputWrapStyle(readOnlyInputs), padding: '7px 10px', fontSize: 12 }}
              />
              <span style={{ fontSize: 12, fontWeight: 500, color: ORANGE }}>↔</span>
              <input
                value={entry.poleB}
                disabled={readOnlyInputs}
                onChange={(event) => updateContradiction(index, 'poleB', event.target.value)}
                style={{ ...inputWrapStyle(readOnlyInputs), padding: '7px 10px', fontSize: 12 }}
              />
              <button
                type="button"
                disabled={readOnlyInputs}
                onClick={() => removeContradiction(index)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#fda4af',
                  cursor: readOnlyInputs ? 'not-allowed' : 'pointer',
                }}
              >
                x
              </button>
            </div>
            <textarea
              value={entry.description}
              disabled={readOnlyInputs}
              onChange={(event) => updateContradiction(index, 'description', event.target.value)}
              rows={2}
              style={{
                ...inputWrapStyle(readOnlyInputs),
                padding: '8px 10px',
                fontSize: 12,
                fontFamily: TOKENS.font.serif,
                fontStyle: 'italic',
                color: '#8A8A9A',
                lineHeight: 1.5,
                resize: 'vertical',
              }}
            />
          </div>
        )) : (
          <div style={{ padding: '10px 11px', display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#8A8A9A' }}>
              Keine Widersprueche definiert.
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={readOnlyInputs}
          onClick={addContradiction}
          style={{
            border: '1px dashed rgba(232,168,56,0.45)',
            background: 'rgba(232,168,56,0.06)',
            color: ORANGE,
            borderRadius: 10,
            padding: '9px 10px',
            fontFamily: TOKENS.font.body,
            fontSize: 12,
            cursor: readOnlyInputs ? 'not-allowed' : 'pointer',
          }}
        >
          + Widerspruch hinzufuegen
        </button>
      </Block>

      {/* ─── E. Charakter · Tuning (Gold) ─── */}
      <Block title="CHARAKTER · TUNING" hint="Persönlichkeit" dotColor={GOLD} open={openSections.character} onToggle={() => toggleSection('character')}>
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
            disabled={readOnlyInputs}
            onChange={(event) => onChange({ character: { ...persona.character, intensity: Number(event.target.value) } })}
            style={rangeStyle(persona.character.intensity, readOnlyInputs, '#C9A84C')}
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
            disabled={readOnlyInputs}
            onChange={(event) => onChange({ character: { ...persona.character, empathy: Number(event.target.value) } })}
            style={rangeStyle(persona.character.empathy, readOnlyInputs, '#C9A84C')}
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
            disabled={readOnlyInputs}
            onChange={(event) => onChange({ character: { ...persona.character, confrontation: Number(event.target.value) } })}
            style={rangeStyle(persona.character.confrontation, readOnlyInputs, '#C9A84C')}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Bestaetigend</span>
            <span>Provokativ</span>
          </div>
        </label>
      </Block>

      {/* ─── F. Ton · Modus (4-Zonen-Balken + Violet-Slider) ─── */}
      <Block title="TON · MODUS" hint="Seriös bis Komisch" dotColor={GREEN} open={openSections.tone} onToggle={() => toggleSection('tone')}>
        {/* 4-zone bar */}
        <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden' }}>
          {TONE_ZONES.map((zone) => {
            const active = persona.toneMode.mode === zone.key;
            return (
              <button
                key={zone.key}
                type="button"
                disabled={readOnlyInputs}
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
                  cursor: readOnlyInputs ? 'not-allowed' : 'pointer',
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
          disabled={readOnlyInputs}
          onChange={(event) => onChange({ toneMode: { ...persona.toneMode, slider: Number(event.target.value) } })}
          style={rangeStyle(persona.toneMode.slider, readOnlyInputs, VIOLET)}
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

      {/* ─── G. Stimme · Tuning (Chips + Teal-Slider) ─── */}
      <Block title="STIMME · TUNING" hint="Klang & TTS" dotColor={TEAL} open={openSections.voice} onToggle={() => toggleSection('voice')}>
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
                  disabled={readOnlyInputs}
                  onClick={() => onChange({ voice: { ...persona.voice, voiceName: v.name as ArcanaPersonaDefinition['voice']['voiceName'] } })}
                  style={{
                    padding: '4px 11px',
                    borderRadius: 6,
                    border: `1px solid ${active ? 'rgba(78,206,206,0.45)' : 'rgba(201,168,76,0.12)'}`,
                    background: active ? 'rgba(78,206,206,0.07)' : 'transparent',
                    color: active ? TEAL : TOKENS.text2,
                    fontSize: 11,
                    fontFamily: TOKENS.font.body,
                    cursor: readOnlyInputs ? 'not-allowed' : 'pointer',
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
            disabled={readOnlyInputs}
            onChange={(event) => onChange({ voice: { ...persona.voice, accent: event.target.value as ArcanaPersonaDefinition['voice']['accent'] } })}
            style={{
              padding: '4px 11px',
              borderRadius: 6,
              border: '1.5px dashed rgba(201,168,76,0.3)',
              background: 'transparent',
              color: TOKENS.gold,
              fontSize: 11,
              fontFamily: TOKENS.font.body,
              cursor: readOnlyInputs ? 'not-allowed' : 'pointer',
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
            disabled={readOnlyInputs}
            onChange={(event) => onChange({ voice: { ...persona.voice, accentIntensity: Number(event.target.value) } })}
            style={rangeStyle(persona.voice.accentIntensity, readOnlyInputs, TEAL)}
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
            disabled={readOnlyInputs}
            onChange={(event) => onChange({ voice: { ...persona.voice, speakingTempo: Number(event.target.value) } })}
            style={rangeStyle(persona.voice.speakingTempo, readOnlyInputs, TEAL)}
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
            disabled={readOnlyInputs}
            onChange={(event) => onChange({ voice: { ...persona.voice, pauseDramaturgy: Number(event.target.value) } })}
            style={rangeStyle(persona.voice.pauseDramaturgy, readOnlyInputs, TEAL)}
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
            disabled={readOnlyInputs}
            onChange={(event) => onChange({ voice: { ...persona.voice, emotionalIntensity: Number(event.target.value) } })}
            style={rangeStyle(persona.voice.emotionalIntensity, readOnlyInputs, TEAL)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            <span>Neutral</span>
            <span>Theatralisch</span>
          </div>
        </label>
      </Block>

      {/* ─── H. Quellen · Verankerung ─── */}
      <Block title="QUELLEN · VERANKERUNG" hint="Statische Vorschau" dotColor={VIOLET} open={openSections.sources} onToggle={() => toggleSection('sources')}>
        {sources.map((source, index) => {
          const meta = getSourceMeta(source.type);
          return (
            <div
              key={`${source.name}-${index}`}
              style={{
                border: '1px solid rgba(138,109,176,0.2)',
                borderRadius: 10,
                background: '#16161F',
                padding: '9px 10px',
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  borderRadius: 6,
                  border: `1px solid ${meta.color}55`,
                  background: meta.bg,
                  color: meta.color,
                  padding: '3px 6px',
                  fontFamily: TOKENS.font.body,
                  fontSize: 10,
                  letterSpacing: '1px',
                }}
              >
                {meta.icon}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text }}>{source.name}</div>
                <div style={{ marginTop: 2, fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text3 }}>
                  Quelle ist vorbereitet und wird in Phase 4 mit Attachments verbunden.
                </div>
              </div>
              <span
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(107,214,114,0.3)',
                  background: 'rgba(107,214,114,0.12)',
                  color: '#86E08C',
                  padding: '3px 8px',
                  fontFamily: TOKENS.font.body,
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                }}
              >
                ✓ {source.extractedCount} Merkmale
              </span>
            </div>
          );
        })}
      </Block>

      {/* ─── I. Maya · Special Mode (Violet) ─── */}
      <Block title="✦ MAYA · SPECIAL MODE" hint="Über die Regler hinaus" dotColor={VIOLET} open={openSections.maya} onToggle={() => toggleSection('maya')}>
        <div style={{ border: `1.5px solid ${TOKENS.b1}`, borderRadius: 18, padding: '16px 16px 14px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            🌙 Maya Spezial-Funktion
          </div>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>
            Beschreibe Maya in deinen eigenen Worten, wie du diese Persona weiter modifizieren moechtest, was unsere Regler noch nicht abdecken.
          </div>
          <textarea
            value={persona.mayaSpecial ?? ''}
            disabled={readOnlyInputs}
            onChange={(event) => onChange({ mayaSpecial: event.target.value })}
            rows={4}
            style={{ ...inputWrapStyle(readOnlyInputs), resize: 'vertical', minHeight: 120 }}
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

      {/* ─── G. Footer actions (nur im Full-Tuning-Modus) ─── */}
      {!compact && (
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
              disabled={readOnlyInputs}
              style={{
                border: `1.5px solid ${readOnlyInputs ? TOKENS.b1 : TOKENS.gold}`,
                background: readOnlyInputs ? 'rgba(255,255,255,0.03)' : TOKENS.gold,
                color: readOnlyInputs ? TOKENS.text3 : TOKENS.bg,
                borderRadius: 16,
                padding: '12px 16px',
                fontFamily: TOKENS.font.body,
                fontWeight: 700,
                cursor: readOnlyInputs ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Speichert...' : '✦ Persona speichern'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
