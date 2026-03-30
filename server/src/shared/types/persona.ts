// Arcana Studio - Persona Types

export type PersonaTier = 'system' | 'user_created';
export type PersonaStatus = 'draft' | 'active' | 'archived';

export type ArchetypeKey =
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

export interface CharacterTuning {
  intensity: number;
  empathy: number;
  confrontation: number;
}

export type ToneModeKey = 'serioes' | 'bissig' | 'satirisch' | 'komisch';

export interface ToneMode {
  mode: ToneModeKey;
  slider: number;
}

export interface SignatureQuirk {
  id: string;
  label: string;
  description: string;
  promptFragment: string;
  enabled: boolean;
  category: 'behavior' | 'speech' | 'knowledge' | 'limitation';
}

export type GeminiVoiceName =
  | 'Zephyr'
  | 'Puck'
  | 'Charon'
  | 'Kore'
  | 'Fenrir'
  | 'Leda'
  | 'Orus'
  | 'Aoede'
  | 'Callirrhoe'
  | 'Autonoe'
  | 'Enceladus'
  | 'Iapetus'
  | 'Umbriel'
  | 'Algieba'
  | 'Despina'
  | 'Erinome'
  | 'Algenib'
  | 'Rasalgethi'
  | 'Laomedeia'
  | 'Achernar'
  | 'Alnilam'
  | 'Schedar'
  | 'Gacrux'
  | 'Pulcherrima'
  | 'Achird'
  | 'Zubenelgenubi'
  | 'Vindemiatrix'
  | 'Sadachbia'
  | 'Sadaltager'
  | 'Sulafat';

export type AccentKey =
  | 'off'
  | 'indisch'
  | 'britisch'
  | 'franzoesisch'
  | 'arabisch'
  | 'japanisch'
  | 'suedlaendisch'
  | 'nordisch'
  | 'mystisch'
  | 'griechisch'
  | 'russisch'
  | 'afrikanisch'
  | 'lateinamerikanisch';

export interface VoiceConfig {
  voiceName: GeminiVoiceName;
  accent: AccentKey;
  accentIntensity: number;
  speakingTempo: number;
  pauseDramaturgy: number;
  emotionalIntensity: number;
}

export interface PersonaCreditConfig {
  creationCost: number;
  textCostPerMessage: number;
  audioCostPerMessage: number;
}

export interface PersonaDefinition {
  id: string;
  name: string;
  subtitle: string;
  archetype: ArchetypeKey;
  description: string;
  icon: string;
  color: string;
  tier: PersonaTier;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  character: CharacterTuning;
  toneMode: ToneMode;
  quirks: SignatureQuirk[];
  voice: VoiceConfig;
  mayaSpecial?: string;
  credits: PersonaCreditConfig;
  presetId?: string;
  status: PersonaStatus;
  moderationScore?: number;
  moderationFlags?: string[];
}