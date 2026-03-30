import type { AccentKey, GeminiVoiceName } from '../shared/types/persona.js';

export interface VoiceCatalogEntry {
  name: GeminiVoiceName;
  label: string;
  gender: 'female' | 'male' | 'neutral';
  character: string;
  previewText: string;
}

export const VOICE_CATALOG: VoiceCatalogEntry[] = [
  { name: 'Aoede', label: 'Aoede - warm', gender: 'female', character: 'Warm, melodisch, ruhig', previewText: 'Hallo, ich bin Aoede.' },
  { name: 'Kore', label: 'Kore - klar', gender: 'female', character: 'Klar, neutral, freundlich', previewText: 'Hallo, ich bin Kore.' },
  { name: 'Leda', label: 'Leda - sanft', gender: 'female', character: 'Sanft, jung, neugierig', previewText: 'Hallo, ich bin Leda.' },
  { name: 'Callirrhoe', label: 'Callirrhoe - poetisch', gender: 'female', character: 'Fliessend, poetisch, ruhig', previewText: 'Hallo, ich bin Callirrhoe.' },
  { name: 'Autonoe', label: 'Autonoe - bedacht', gender: 'female', character: 'Ruhig, bedacht, weise', previewText: 'Hallo, ich bin Autonoe.' },
  { name: 'Despina', label: 'Despina - verspielt', gender: 'female', character: 'Leicht, verspielt, neugierig', previewText: 'Hallo, ich bin Despina.' },
  { name: 'Erinome', label: 'Erinome - mysterioes', gender: 'female', character: 'Dunkel, geheimnisvoll', previewText: 'Hallo, ich bin Erinome.' },
  { name: 'Pulcherrima', label: 'Pulcherrima - elegant', gender: 'female', character: 'Elegant, praezise, kuehl', previewText: 'Hallo, ich bin Pulcherrima.' },
  { name: 'Laomedeia', label: 'Laomedeia - aetherisch', gender: 'female', character: 'Aetherisch, distanziert', previewText: 'Hallo, ich bin Laomedeia.' },
  { name: 'Achernar', label: 'Achernar - kuehl', gender: 'female', character: 'Kuehl, intelligent, scharf', previewText: 'Hallo, ich bin Achernar.' },
  { name: 'Puck', label: 'Puck - warm', gender: 'male', character: 'Energisch, direkt, warm', previewText: 'Hallo, ich bin Puck.' },
  { name: 'Fenrir', label: 'Fenrir - rau', gender: 'male', character: 'Tief, intensiv, scharf', previewText: 'Hallo, ich bin Fenrir.' },
  { name: 'Charon', label: 'Charon - dunkel', gender: 'male', character: 'Dunkel, langsam, gewichtig', previewText: 'Hallo, ich bin Charon.' },
  { name: 'Orus', label: 'Orus - autoritaer', gender: 'male', character: 'Bestimmt, autoritaer, klar', previewText: 'Hallo, ich bin Orus.' },
  { name: 'Enceladus', label: 'Enceladus - kraftvoll', gender: 'male', character: 'Kraftvoll, warm, praesent', previewText: 'Hallo, ich bin Enceladus.' },
  { name: 'Iapetus', label: 'Iapetus - weise', gender: 'male', character: 'Alt, weise, bedaechtig', previewText: 'Hallo, ich bin Iapetus.' },
  { name: 'Umbriel', label: 'Umbriel - nachdenklich', gender: 'male', character: 'Leise, nachdenklich, tief', previewText: 'Hallo, ich bin Umbriel.' },
  { name: 'Zephyr', label: 'Zephyr - leicht', gender: 'neutral', character: 'Leicht, fliessend', previewText: 'Hallo, ich bin Zephyr.' },
  { name: 'Algieba', label: 'Algieba - neutral', gender: 'neutral', character: 'Neutral, professionell', previewText: 'Hallo, ich bin Algieba.' },
  { name: 'Algenib', label: 'Algenib - sachlich', gender: 'neutral', character: 'Klar, sachlich, praezise', previewText: 'Hallo, ich bin Algenib.' },
  { name: 'Rasalgethi', label: 'Rasalgethi - warm', gender: 'neutral', character: 'Warm-neutral, einladend', previewText: 'Hallo, ich bin Rasalgethi.' },
  { name: 'Schedar', label: 'Schedar - stabil', gender: 'neutral', character: 'Ruhig, stabil, geerdet', previewText: 'Hallo, ich bin Schedar.' },
  { name: 'Gacrux', label: 'Gacrux - technisch', gender: 'neutral', character: 'Praezise, technisch', previewText: 'Hallo, ich bin Gacrux.' },
  { name: 'Alnilam', label: 'Alnilam - strahlend', gender: 'neutral', character: 'Strahlend, optimistisch', previewText: 'Hallo, ich bin Alnilam.' },
  { name: 'Achird', label: 'Achird - sanft', gender: 'neutral', character: 'Sanft-neutral, vermittelnd', previewText: 'Hallo, ich bin Achird.' },
  { name: 'Zubenelgenubi', label: 'Zubenelgenubi - exotisch', gender: 'neutral', character: 'Exotisch, ungewoehnlich', previewText: 'Hallo, ich bin Zubenelgenubi.' },
  { name: 'Vindemiatrix', label: 'Vindemiatrix - reif', gender: 'neutral', character: 'Reif, erfahren, souveraen', previewText: 'Hallo, ich bin Vindemiatrix.' },
  { name: 'Sadachbia', label: 'Sadachbia - offen', gender: 'neutral', character: 'Freundlich, offen', previewText: 'Hallo, ich bin Sadachbia.' },
  { name: 'Sadaltager', label: 'Sadaltager - ernst', gender: 'neutral', character: 'Ernst, fokussiert', previewText: 'Hallo, ich bin Sadaltager.' },
  { name: 'Sulafat', label: 'Sulafat - melodisch', gender: 'neutral', character: 'Melodisch, rhythmisch', previewText: 'Hallo, ich bin Sulafat.' },
];

export interface AccentCatalogEntry {
  key: AccentKey;
  label: string;
  promptFragment: string;
}

export const ACCENT_CATALOG: AccentCatalogEntry[] = [
  { key: 'off', label: 'Kein Akzent', promptFragment: '' },
  { key: 'indisch', label: 'Indisch', promptFragment: 'Sprich mit einem indischen Akzent.' },
  { key: 'britisch', label: 'Britisch', promptFragment: 'Sprich mit einem britischen Akzent.' },
  { key: 'franzoesisch', label: 'Franzoesisch', promptFragment: 'Sprich mit einem franzoesischen Akzent.' },
  { key: 'griechisch', label: 'Griechisch', promptFragment: 'Sprich mit einem altgriechisch anmutenden Akzent.' },
  { key: 'arabisch', label: 'Arabisch', promptFragment: 'Sprich mit einem arabischen Akzent.' },
  { key: 'japanisch', label: 'Japanisch', promptFragment: 'Sprich mit einem japanischen Akzent.' },
  { key: 'suedlaendisch', label: 'Suedlaendisch', promptFragment: 'Sprich mit einem suedeuropaeischen Akzent.' },
  { key: 'nordisch', label: 'Nordisch', promptFragment: 'Sprich mit einem skandinavischen Akzent.' },
  { key: 'mystisch', label: 'Mystisch', promptFragment: 'Sprich mit einer zeitlosen, ortlosen Betonung.' },
  { key: 'russisch', label: 'Russisch', promptFragment: 'Sprich mit einem russischen Akzent.' },
  { key: 'afrikanisch', label: 'Afrikanisch', promptFragment: 'Sprich mit einem westafrikanischen Akzent.' },
  { key: 'lateinamerikanisch', label: 'Lateinamerikanisch', promptFragment: 'Sprich mit einem lateinamerikanischen Akzent.' },
];

export const SYSTEM_PERSONA_VOICES: Record<string, { voiceName: GeminiVoiceName; accent: AccentKey }> = {
  maya: { voiceName: 'Aoede', accent: 'off' },
  luna: { voiceName: 'Kore', accent: 'off' },
  orion: { voiceName: 'Puck', accent: 'off' },
  stella: { voiceName: 'Autonoe', accent: 'suedlaendisch' },
  kael: { voiceName: 'Fenrir', accent: 'indisch' },
  lian: { voiceName: 'Callirrhoe', accent: 'off' },
  sibyl: { voiceName: 'Kore', accent: 'mystisch' },
  amara: { voiceName: 'Aoede', accent: 'off' },
  lilith: { voiceName: 'Fenrir', accent: 'off' },
  sri: { voiceName: 'Iapetus', accent: 'indisch' },
  echo_prism: { voiceName: 'Pulcherrima', accent: 'off' },
};

export const CREDIT_TIERS = {
  system: {
    creationCost: 0,
    textCostPerMessage: 1,
    audioCostPerMessage: 2,
  },
  user_basic: {
    creationCost: 50,
    textCostPerMessage: 2,
    audioCostPerMessage: 4,
  },
  user_premium: {
    creationCost: 100,
    textCostPerMessage: 3,
    audioCostPerMessage: 5,
  },
} as const;