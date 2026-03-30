import { useMemo, useRef, useState } from 'react';
import { ACCENT_CATALOG, getSystemAccent, getSystemVoiceName, getVoiceEntry, VOICE_CATALOG } from '../../../data/voiceCatalog';
import type { LiveTalkController } from '../../../hooks/useLiveTalk';
import { TOKENS } from '../../../design/tokens';
import type { PersonaInfo } from '../types';

export interface PersonaPanelSettings {
  signatureQuirks: string[];
  characterTuning: number;
  toneMode: string;
  voice: string;
  accent: string;
  preview: string;
  mayaSpecialFunction: string;
  appControl: boolean;
  proactiveInsights: boolean;
  mayaCoreSync: boolean;
}

interface Props {
  open: boolean;
  persona: PersonaInfo;
  settings: PersonaPanelSettings;
  liveTalk: LiveTalkController;
  onClose: () => void;
  onChange: (next: PersonaPanelSettings) => void;
}

const QUIRKS = ['Poetisch', 'Direkt', 'Spiegelnd', 'Visionaer', 'Sanft provokativ'];
const TONE_MODES = ['Ruhig', 'Klar', 'Mystisch', 'Analytisch'];

export function PersonaSettingsPanel({ open, persona, settings, liveTalk, onClose, onChange }: Props) {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedVoice = useMemo(() => getVoiceEntry(settings.voice) ?? getVoiceEntry(getSystemVoiceName(persona.id)), [persona.id, settings.voice]);

  if (!open) {
    return null;
  }

  const isMaya = persona.id === 'maya';

  async function handlePreview() {
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const response = await fetch('/api/arcana/tts-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceName: settings.voice || getSystemVoiceName(persona.id),
          accent: settings.accent || getSystemAccent(persona.id),
          text: `Hallo, ich bin ${persona.name}. So klinge ich.`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as { audio?: string; mimeType?: string };
      if (!data.audio || !data.mimeType) {
        throw new Error('preview_unavailable');
      }

      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = `data:${data.mimeType};base64,${data.audio}`;
      await audio.play();
    } catch {
      setPreviewError('Vorschau nicht verfuegbar');
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div onClick={onClose} style={styles.backdrop}>
      <aside onClick={(event) => event.stopPropagation()} style={styles.panel}>
        <div style={styles.header}>
          <div>
            <div style={styles.kicker}>Persona Settings</div>
            <div style={{ ...styles.title, color: isMaya ? TOKENS.gold : persona.color }}>{persona.name}</div>
          </div>
          <button onClick={onClose} style={styles.closeButton} type="button">
            ✕
          </button>
        </div>

        <Section label="1. Signature Quirks" sub="Wie diese Persona praesent bleibt.">
          <ChipGrid
            active={settings.signatureQuirks}
            items={QUIRKS}
            onToggle={(item) => {
              const next = settings.signatureQuirks.includes(item)
                ? settings.signatureQuirks.filter((entry) => entry !== item)
                : [...settings.signatureQuirks, item];
              onChange({ ...settings, signatureQuirks: next });
            }}
          />
        </Section>

        <Section label="2. Charakter-Tuning" sub="Tiefe und Intensitaet des Gespraechs.">
          <input
            max={5}
            min={1}
            onChange={(event) => onChange({ ...settings, characterTuning: Number(event.target.value) })}
            style={styles.slider}
            type="range"
            value={settings.characterTuning}
          />
          <div style={styles.sliderLabels}>
            <span>Sanft</span>
            <span style={styles.sliderValue}>{settings.characterTuning}</span>
            <span>Tief</span>
          </div>
        </Section>

        <Section label="3. Ton-Modus" sub="Grundstimmung im Antwortstil.">
          <ChipGrid
            active={[settings.toneMode]}
            items={TONE_MODES}
            onToggle={(item) => onChange({ ...settings, toneMode: item })}
            singleSelect
          />
        </Section>

        <Section label="4. Stimme waehlen" sub="Stimme fuer LiveTalk- oder Audio-Naehe.">
          <label style={styles.fieldLabel}>Stimme</label>
          <select
            onChange={(event) => {
              const nextVoice = event.target.value;
              onChange({ ...settings, voice: nextVoice });
            }}
            style={styles.select}
            value={settings.voice}
          >
            <optgroup label="Weiblich">
              {VOICE_CATALOG.filter((entry) => entry.gender === 'female').map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Maennlich">
              {VOICE_CATALOG.filter((entry) => entry.gender === 'male').map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Neutral">
              {VOICE_CATALOG.filter((entry) => entry.gender === 'neutral').map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.label}
                </option>
              ))}
            </optgroup>
          </select>
          <div style={styles.voiceHint}>{selectedVoice?.character ?? 'Neutral, professionell'}</div>
          <label style={styles.fieldLabel}>Akzent</label>
          <select
            onChange={(event) => onChange({ ...settings, accent: event.target.value })}
            style={styles.select}
            value={settings.accent}
          >
            {ACCENT_CATALOG.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
          <button onClick={() => void handlePreview()} style={styles.previewButton} type="button">
            {previewLoading ? '...' : 'Probe hoeren'}
          </button>
          {previewError ? <div style={styles.previewError}>{previewError}</div> : null}
        </Section>

        <Section label="5. Beispielantwort Preview" sub="Antwortvorschau fuer diese Persona.">
          <div style={styles.previewBox}>{settings.preview}</div>
        </Section>

        <Section label="6. Maya Spezial-Funktion" sub="Wie Maya rahmt, verbindet oder mitfuehrt.">
          <div style={styles.previewBox}>{settings.mayaSpecialFunction}</div>
        </Section>

        {isMaya ? (
          <Section label="Maya Zusatzsteuerung" sub="Section 4.4 Maya-spezifische Controls.">
            <ToggleRow checked={liveTalk.ttsEnabled} label="Gemini TTS" onToggle={liveTalk.toggleTTS} />
            <ToggleRow checked={liveTalk.micEnabled} label="Mikrofon" onToggle={liveTalk.toggleMic} />
            <ToggleRow
              checked={settings.appControl}
              label="App-Steuerung"
              onToggle={() => onChange({ ...settings, appControl: !settings.appControl })}
            />
            <ToggleRow
              checked={settings.proactiveInsights}
              label="Proaktive Insights"
              onToggle={() => onChange({ ...settings, proactiveInsights: !settings.proactiveInsights })}
            />
            <ToggleRow
              checked={settings.mayaCoreSync}
              label="Maya Core Sync"
              onToggle={() => onChange({ ...settings, mayaCoreSync: !settings.mayaCoreSync })}
            />
          </Section>
        ) : null}
      </aside>
    </div>
  );
}

interface SectionProps {
  label: string;
  sub: string;
  children: React.ReactNode;
}

function Section({ label, sub, children }: SectionProps) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionLabel}>{label}</div>
      <div style={styles.sectionSub}>{sub}</div>
      <div style={styles.sectionBody}>{children}</div>
    </section>
  );
}

interface ChipGridProps {
  items: string[];
  active: string[];
  onToggle: (item: string) => void;
  singleSelect?: boolean;
}

function ChipGrid({ items, active, onToggle }: ChipGridProps) {
  return (
    <div style={styles.chipGrid}>
      {items.map((item) => {
        const enabled = active.includes(item);

        return (
          <button
            key={item}
            onClick={() => onToggle(item)}
            style={{
              ...styles.chip,
              ...(enabled ? styles.chipActive : null),
            }}
            type="button"
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

function ToggleRow({ label, checked, onToggle }: ToggleRowProps) {
  return (
    <button onClick={onToggle} style={styles.toggleRow} type="button">
      <span style={styles.toggleLabel}>{label}</span>
      <span style={{ ...styles.toggleSwitch, ...(checked ? styles.toggleSwitchActive : null) }}>
        <span
          style={{
            ...styles.toggleThumb,
            transform: checked ? 'translateX(18px)' : 'translateX(0px)',
          }}
        />
      </span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.62)',
    zIndex: 40,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  panel: {
    width: 520,
    maxWidth: '100%',
    height: '100%',
    overflowY: 'auto',
    background: TOKENS.card,
    borderLeft: `2px solid ${TOKENS.b1}`,
    boxShadow: TOKENS.shadow.panel,
    padding: '24px 22px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  kicker: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    color: TOKENS.text3,
    fontFamily: TOKENS.font.body,
  },
  title: {
    fontFamily: TOKENS.font.display,
    fontSize: 28,
    marginTop: 6,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    border: `1.5px solid ${TOKENS.b1}`,
    background: 'transparent',
    color: TOKENS.text2,
    cursor: 'pointer',
  },
  section: {
    borderRadius: 18,
    border: `1.5px solid ${TOKENS.b2}`,
    background: TOKENS.card2,
    padding: '16px 14px',
  },
  sectionLabel: {
    color: TOKENS.gold,
    fontFamily: TOKENS.font.serif,
    fontSize: 18,
    letterSpacing: '0.04em',
  },
  sectionSub: {
    marginTop: 4,
    color: TOKENS.text2,
    fontFamily: TOKENS.font.body,
    fontSize: 12,
  },
  sectionBody: {
    marginTop: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  chipGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    padding: '8px 12px',
    borderRadius: 20,
    border: `1.5px solid ${TOKENS.b1}`,
    background: 'rgba(255,255,255,0.02)',
    color: TOKENS.text2,
    cursor: 'pointer',
    fontFamily: TOKENS.font.body,
    fontSize: 12,
  },
  chipActive: {
    borderColor: TOKENS.gold,
    color: TOKENS.gold,
    background: 'rgba(212,175,55,0.08)',
  },
  fieldLabel: {
    color: TOKENS.text2,
    fontFamily: TOKENS.font.body,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 14,
    border: `1.5px solid ${TOKENS.b1}`,
    background: TOKENS.bg3,
    color: TOKENS.text,
    fontFamily: TOKENS.font.body,
    fontSize: 13,
  },
  voiceHint: {
    marginTop: -2,
    color: TOKENS.text2,
    fontFamily: TOKENS.font.body,
    fontSize: 12,
    lineHeight: 1.5,
  },
  slider: {
    width: '100%',
    accentColor: TOKENS.gold,
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: TOKENS.text2,
    fontSize: 12,
    fontFamily: TOKENS.font.body,
  },
  sliderValue: {
    color: TOKENS.gold,
  },
  previewBox: {
    borderRadius: 14,
    border: `1.5px solid ${TOKENS.b1}`,
    background: 'rgba(8,6,14,0.28)',
    padding: '12px 14px',
    color: TOKENS.text,
    fontFamily: TOKENS.font.body,
    lineHeight: 1.6,
    fontSize: 13,
  },
  previewButton: {
    alignSelf: 'flex-start',
    padding: '10px 14px',
    borderRadius: 14,
    border: `1.5px solid ${TOKENS.b1}`,
    background: 'rgba(255,255,255,0.03)',
    color: TOKENS.text,
    cursor: 'pointer',
    fontFamily: TOKENS.font.body,
    fontSize: 13,
  },
  previewError: {
    color: TOKENS.text2,
    fontFamily: TOKENS.font.body,
    fontSize: 12,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    padding: '12px 14px',
    borderRadius: 14,
    border: `1.5px solid ${TOKENS.b1}`,
    background: 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
  },
  toggleLabel: {
    color: TOKENS.text,
    fontFamily: TOKENS.font.body,
    fontSize: 13,
  },
  toggleSwitch: {
    width: 42,
    height: 24,
    borderRadius: 999,
    border: `1.5px solid ${TOKENS.b1}`,
    padding: 2,
    background: TOKENS.bg3,
    flexShrink: 0,
  },
  toggleSwitchActive: {
    borderColor: TOKENS.goldSoft,
    background: 'rgba(212,175,55,0.14)',
  },
  toggleThumb: {
    display: 'block',
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: TOKENS.gold,
    transition: 'transform 0.2s ease',
  },
};