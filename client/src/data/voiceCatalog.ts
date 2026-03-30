export type VoiceGender = 'female' | 'male' | 'neutral';
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

export interface VoiceCatalogEntry {
  name: string;
  label: string;
  gender: VoiceGender;
  character: string;
}

export interface AccentCatalogEntry {
  key: AccentKey;
  label: string;
}

export const VOICE_CATALOG: VoiceCatalogEntry[] = [
  { name: 'Aoede', label: 'Aoede - warm', gender: 'female', character: 'Warm, melodisch, ruhig' },
  { name: 'Kore', label: 'Kore - klar', gender: 'female', character: 'Klar, neutral, freundlich' },
  { name: 'Leda', label: 'Leda - sanft', gender: 'female', character: 'Sanft, jung, neugierig' },
  { name: 'Callirrhoe', label: 'Callirrhoe - poetisch', gender: 'female', character: 'Fliessend, poetisch, ruhig' },
  { name: 'Autonoe', label: 'Autonoe - bedacht', gender: 'female', character: 'Ruhig, bedacht, weise' },
  { name: 'Despina', label: 'Despina - verspielt', gender: 'female', character: 'Leicht, verspielt, neugierig' },
  { name: 'Erinome', label: 'Erinome - mysterioes', gender: 'female', character: 'Dunkel, geheimnisvoll' },
  { name: 'Pulcherrima', label: 'Pulcherrima - elegant', gender: 'female', character: 'Elegant, praezise, kuehl' },
  { name: 'Laomedeia', label: 'Laomedeia - aetherisch', gender: 'female', character: 'Aetherisch, distanziert' },
  { name: 'Achernar', label: 'Achernar - kuehl', gender: 'female', character: 'Kuehl, intelligent, scharf' },
  { name: 'Puck', label: 'Puck - warm', gender: 'male', character: 'Energisch, direkt, warm' },
  { name: 'Fenrir', label: 'Fenrir - rau', gender: 'male', character: 'Tief, intensiv, scharf' },
  { name: 'Charon', label: 'Charon - dunkel', gender: 'male', character: 'Dunkel, langsam, gewichtig' },
  { name: 'Orus', label: 'Orus - autoritaer', gender: 'male', character: 'Bestimmt, autoritaer, klar' },
  { name: 'Enceladus', label: 'Enceladus - kraftvoll', gender: 'male', character: 'Kraftvoll, warm, praesent' },
  { name: 'Iapetus', label: 'Iapetus - weise', gender: 'male', character: 'Alt, weise, bedaechtig' },
  { name: 'Umbriel', label: 'Umbriel - nachdenklich', gender: 'male', character: 'Leise, nachdenklich, tief' },
  { name: 'Zephyr', label: 'Zephyr - leicht', gender: 'neutral', character: 'Leicht, fliessend' },
  { name: 'Algieba', label: 'Algieba - neutral', gender: 'neutral', character: 'Neutral, professionell' },
  { name: 'Algenib', label: 'Algenib - sachlich', gender: 'neutral', character: 'Klar, sachlich, praezise' },
  { name: 'Rasalgethi', label: 'Rasalgethi - warm', gender: 'neutral', character: 'Warm-neutral, einladend' },
  { name: 'Schedar', label: 'Schedar - stabil', gender: 'neutral', character: 'Ruhig, stabil, geerdet' },
  { name: 'Gacrux', label: 'Gacrux - technisch', gender: 'neutral', character: 'Praezise, technisch' },
  { name: 'Alnilam', label: 'Alnilam - strahlend', gender: 'neutral', character: 'Strahlend, optimistisch' },
  { name: 'Achird', label: 'Achird - sanft', gender: 'neutral', character: 'Sanft-neutral, vermittelnd' },
  { name: 'Zubenelgenubi', label: 'Zubenelgenubi - exotisch', gender: 'neutral', character: 'Exotisch, ungewoehnlich' },
  { name: 'Vindemiatrix', label: 'Vindemiatrix - reif', gender: 'neutral', character: 'Reif, erfahren, souveraen' },
  { name: 'Sadachbia', label: 'Sadachbia - offen', gender: 'neutral', character: 'Freundlich, offen' },
  { name: 'Sadaltager', label: 'Sadaltager - ernst', gender: 'neutral', character: 'Ernst, fokussiert' },
  { name: 'Sulafat', label: 'Sulafat - melodisch', gender: 'neutral', character: 'Melodisch, rhythmisch' },
];

export const ACCENT_CATALOG: AccentCatalogEntry[] = [
  { key: 'off', label: 'Kein Akzent' },
  { key: 'indisch', label: 'Indisch' },
  { key: 'britisch', label: 'Britisch' },
  { key: 'franzoesisch', label: 'Franzoesisch' },
  { key: 'griechisch', label: 'Griechisch' },
  { key: 'arabisch', label: 'Arabisch' },
  { key: 'japanisch', label: 'Japanisch' },
  { key: 'suedlaendisch', label: 'Suedlaendisch' },
  { key: 'nordisch', label: 'Nordisch' },
  { key: 'mystisch', label: 'Mystisch' },
  { key: 'russisch', label: 'Russisch' },
  { key: 'afrikanisch', label: 'Afrikanisch' },
  { key: 'lateinamerikanisch', label: 'Lateinamerikanisch' },
];

export const SYSTEM_PERSONA_VOICES: Record<string, { voiceName: string; accent: AccentKey }> = {
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

export function getVoiceEntry(name: string): VoiceCatalogEntry | undefined {
  return VOICE_CATALOG.find((entry) => entry.name === name);
}

export function getSystemVoiceName(personaId: string): string {
  return SYSTEM_PERSONA_VOICES[personaId]?.voiceName ?? 'Puck';
}

export function getSystemAccent(personaId: string): AccentKey {
  return SYSTEM_PERSONA_VOICES[personaId]?.accent ?? 'off';
}