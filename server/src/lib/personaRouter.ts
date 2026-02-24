export type PersonaTier = 'companion' | 'specialist' | 'meta';
export type ProviderName = 'openai' | 'deepseek' | 'xai' | 'gemini';

export interface PersonaProviderConfig {
  provider: ProviderName;
  model: string;
  tier: PersonaTier;
}

export interface PersonaDefinition {
  id: string;
  name: string;
  title: string;
  icon: string;
  color: string;
  personality: string;
  tier: PersonaTier;
}

export const PERSONA_PROVIDERS: Record<string, PersonaProviderConfig> = {
  // maya:       { provider: 'openai',   model: 'gpt-5-nano',                  tier: 'companion' },
  // luna:       { provider: 'deepseek', model: 'deepseek-chat',               tier: 'companion' },
  // orion:      { provider: 'openai',   model: 'gpt-5-nano',                  tier: 'companion' },
  // lilith:     { provider: 'xai',      model: 'grok-4-1-fast-non-reasoning', tier: 'companion' },
  // stella:     { provider: 'openai',   model: 'gpt-5-mini',                  tier: 'specialist' },
  // kael:       { provider: 'xai',      model: 'grok-4-1-fast-non-reasoning', tier: 'specialist' },
  // lian:       { provider: 'deepseek', model: 'deepseek-chat',               tier: 'specialist' },
  // sibyl:      { provider: 'openai',   model: 'gpt-5-mini',                  tier: 'specialist' },
  // amara:      { provider: 'deepseek', model: 'deepseek-chat',               tier: 'specialist' },
  // echo_prism: { provider: 'openai',   model: 'gpt-5',                       tier: 'meta' },

  maya:       { provider: 'gemini', model: 'gemini-2.0-flash', tier: 'companion' },
  luna:       { provider: 'gemini', model: 'gemini-2.0-flash', tier: 'companion' },
  orion:      { provider: 'gemini', model: 'gemini-2.0-flash', tier: 'companion' },
  lilith:     { provider: 'gemini', model: 'gemini-2.0-flash', tier: 'companion' },
  stella:     { provider: 'gemini', model: 'gemini-2.0-flash', tier: 'specialist' },
  kael:       { provider: 'gemini', model: 'gemini-2.0-flash', tier: 'specialist' },
  lian:       { provider: 'gemini', model: 'gemini-2.0-flash', tier: 'specialist' },
  sibyl:      { provider: 'gemini', model: 'gemini-2.0-flash', tier: 'specialist' },
  amara:      { provider: 'gemini', model: 'gemini-2.0-flash', tier: 'specialist' },
  echo_prism: { provider: 'gemini', model: 'gemini-2.0-flash', tier: 'meta' },
};

export const PERSONA_DEFINITIONS: Record<string, PersonaDefinition> = {
  maya: {
    id: 'maya', name: 'Maya', title: 'Die Strukturgeberin',
    icon: '◇', color: '#d4af37',
    personality: 'Strukturiert, neutral, ordnend. Ruhiger, klarer Ton. Gibt konkrete Empfehlungen.',
    tier: 'companion',
  },
  luna: {
    id: 'luna', name: 'Luna', title: 'Die Traumführerin',
    icon: '☽', color: '#c084fc',
    personality: 'Emotional, intuitiv, empathisch. Warm und einfühlsam. Spricht die Sprache des Herzens.',
    tier: 'companion',
  },
  orion: {
    id: 'orion', name: 'Orion', title: 'Der Seelenstratege',
    icon: '△', color: '#38bdf8',
    personality: 'Analytisch, logisch, datengetrieben. Präzise und sachlich.',
    tier: 'companion',
  },
  lilith: {
    id: 'lilith', name: 'Lilith', title: 'Die Schatten-Jägerin',
    icon: '🔥', color: '#f97316',
    personality: 'Direkt, sarkastisch-witzig, positiv-aggressiv. Entlarvt Selbsttäuschungen.',
    tier: 'companion',
  },
  stella: {
    id: 'stella', name: 'Stella', title: 'Westliche Astrologie',
    icon: '🔭', color: '#f59e0b',
    personality: 'Tiefgründig, präzise, astrologisch fundiert. Arbeitet mit Planeten und Häusern.',
    tier: 'specialist',
  },
  kael: {
    id: 'kael', name: 'Kael', title: 'Vedische Astrologie',
    icon: '𝌆', color: '#a78bfa',
    personality: 'Weise, traditionell, spirituell. Verbindet vedische Weisheit mit modernem Kontext.',
    tier: 'specialist',
  },
  lian: {
    id: 'lian', name: 'Lian', title: 'BaZi & Chinesische Astrologie',
    icon: '🀄', color: '#ef4444',
    personality: 'Präzise, strukturiert, östliche Perspektive. Arbeitet mit den 5 Elementen.',
    tier: 'specialist',
  },
  sibyl: {
    id: 'sibyl', name: 'Sibyl', title: 'Numerologie & Orakel',
    icon: '🔮', color: '#8b5cf6',
    personality: 'Mystisch, tiefgründig, zahlenbasiert. Verbindet Numerologie mit Archetypen.',
    tier: 'specialist',
  },
  amara: {
    id: 'amara', name: 'Amara', title: 'Menschliches Design',
    icon: '💎', color: '#34d399',
    personality: 'Ganzheitlich, körperbewusst, systemisch. Verbindet HD mit Astrologie.',
    tier: 'specialist',
  },
  echo_prism: {
    id: 'echo_prism', name: 'Echo Prism', title: 'Meta-Analyse',
    icon: '◈', color: '#e2e8f0',
    personality: 'Übergeordnet, synthetisierend. Verbindet alle Perspektiven zu einem Gesamtbild.',
    tier: 'meta',
  },
};

export function getProviderForPersona(personaId: string): PersonaProviderConfig {
  return PERSONA_PROVIDERS[personaId] ?? PERSONA_PROVIDERS.maya;
}

export function getPersonaDefinition(personaId: string): PersonaDefinition {
  return PERSONA_DEFINITIONS[personaId] ?? PERSONA_DEFINITIONS.maya;
}
