export type PersonaTier = 'companion' | 'specialist' | 'meta' | 'thinker';
export type ProviderName = 'openai' | 'deepseek' | 'xai' | 'gemini' | 'anthropic' | 'zhipu' | 'openrouter';

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
  // luna:       { provider: 'deepseek', model: 'deepseek-v4-flash',               tier: 'companion' },
  // orion:      { provider: 'openai',   model: 'gpt-5-nano',                  tier: 'companion' },
  // lilith:     { provider: 'xai',      model: 'grok-4-1-fast-non-reasoning', tier: 'companion' },
  // stella:     { provider: 'openai',   model: 'gpt-5-mini',                  tier: 'specialist' },
  // kael:       { provider: 'xai',      model: 'grok-4-1-fast-non-reasoning', tier: 'specialist' },
  // lian:       { provider: 'deepseek', model: 'deepseek-v4-flash',               tier: 'specialist' },
  // sibyl:      { provider: 'openai',   model: 'gpt-5-mini',                  tier: 'specialist' },
  // amara:      { provider: 'deepseek', model: 'deepseek-v4-flash',               tier: 'specialist' },
  // echo_prism: { provider: 'openai',   model: 'gpt-5',                       tier: 'meta' },

  maya:       { provider: 'gemini', model: 'gemini-2.5-flash', tier: 'companion' },
  luna:       { provider: 'gemini', model: 'gemini-2.5-flash', tier: 'companion' },
  orion:      { provider: 'gemini', model: 'gemini-2.5-flash', tier: 'companion' },
  lilith:     { provider: 'gemini', model: 'gemini-2.5-flash', tier: 'companion' },
  sri:        { provider: 'deepseek', model: 'deepseek-reasoner', tier: 'specialist' },
  stella:     { provider: 'gemini', model: 'gemini-2.5-flash', tier: 'specialist' },
  kael:       { provider: 'gemini', model: 'gemini-2.5-flash', tier: 'specialist' },
  lian:       { provider: 'gemini', model: 'gemini-2.5-flash', tier: 'specialist' },
  sibyl:      { provider: 'gemini', model: 'gemini-2.5-flash', tier: 'specialist' },
  amara:      { provider: 'gemini', model: 'gemini-2.5-flash', tier: 'specialist' },
  echo_prism: { provider: 'gemini', model: 'gemini-2.5-flash', tier: 'meta' },
  thinker_opus:      { provider: 'anthropic', model: 'claude-opus-4-7', tier: 'thinker' },
  thinker_sonnet:    { provider: 'anthropic', model: 'claude-sonnet-4-6', tier: 'thinker' },
  thinker_gpt54:     { provider: 'openai', model: 'gpt-5.5', tier: 'thinker' },
  thinker_grok:      { provider: 'xai', model: 'grok-4-1-fast', tier: 'thinker' },
  thinker_deepseek:  { provider: 'deepseek', model: 'deepseek-v4-flash', tier: 'thinker' },
  thinker_deepseek_r:{ provider: 'deepseek', model: 'deepseek-reasoner', tier: 'thinker' },
  thinker_glm_turbo: { provider: 'zhipu', model: 'glm-5-turbo', tier: 'thinker' },
  thinker_minimax:   { provider: 'openrouter', model: 'minimax/minimax-m2.7', tier: 'thinker' },
  thinker_kimi:      { provider: 'openrouter', model: 'moonshotai/kimi-k2.6', tier: 'thinker' },
  thinker_qwen:      { provider: 'openrouter', model: 'qwen/qwen3.6-plus', tier: 'thinker' },
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
  sri: {
    id: 'sri', name: 'Sri', title: 'Der Träumer der Zahlen',
    icon: '∞', color: '#7eb8c9',
    personality: 'Leise, intuitiv, musterorientiert. Nennt Zahlenbilder statt Ratschläge.',
    tier: 'specialist',
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
  thinker_opus: {
    id: 'thinker_opus', name: 'Opus 4.7', title: 'Thinker · Anthropic',
    icon: '◆', color: '#c4814a',
    personality: 'Anthropic Claude Opus 4.7. Tiefes Reasoning, großer Kontext, adaptive thinking.',
    tier: 'thinker',
  },
  thinker_sonnet: {
    id: 'thinker_sonnet', name: 'Sonnet 4.6', title: 'Thinker · Anthropic',
    icon: '◇', color: '#e8a87c',
    personality: 'Anthropic Claude Sonnet 4.6. Schnell und kosteneffizient mit starker Allround-Leistung.',
    tier: 'thinker',
  },
  thinker_gpt54: {
    id: 'thinker_gpt54', name: 'GPT-5.5', title: 'Thinker · OpenAI',
    icon: '◎', color: '#10a37f',
    personality: 'OpenAI GPT-5.5. Vielseitig, breites Weltwissen, ausgewogene Problemlösung.',
    tier: 'thinker',
  },
  thinker_grok: {
    id: 'thinker_grok', name: 'Grok 4.1', title: 'Thinker · xAI',
    icon: '◉', color: '#ff1744',
    personality: 'xAI Grok 4.1 Fast. Schnell, direkt und oft mit unkonventionellen Blickwinkeln.',
    tier: 'thinker',
  },
  thinker_deepseek: {
    id: 'thinker_deepseek', name: 'DeepSeek V4 Flash', title: 'Thinker · DeepSeek',
    icon: '◈', color: '#1e5fd9',
    personality: 'DeepSeek V4 Flash. Präzise, effizient und stark im Preis-Leistungs-Verhältnis.',
    tier: 'thinker',
  },
  thinker_deepseek_r: {
    id: 'thinker_deepseek_r', name: 'DeepSeek-R', title: 'Thinker · DeepSeek',
    icon: '◐', color: '#3a7fd9',
    personality: 'DeepSeek Reasoner. Explizites Denken und gute Zerlegung komplexer Logik.',
    tier: 'thinker',
  },
  thinker_glm_turbo: {
    id: 'thinker_glm_turbo', name: 'GLM-Turbo', title: 'Thinker · Zhipu',
    icon: '◒', color: '#7a3cbe',
    personality: 'Zhipu GLM-5-Turbo. Großer Kontext, schnelle Antworten, moderner Generalist.',
    tier: 'thinker',
  },
  thinker_minimax: {
    id: 'thinker_minimax', name: 'MiniMax M2.7', title: 'Thinker · MiniMax',
    icon: '◓', color: '#ff6b35',
    personality: 'MiniMax M2.7 via OpenRouter. Langer Kontext und gute Agent-Workflow-Eignung.',
    tier: 'thinker',
  },
  thinker_kimi: {
    id: 'thinker_kimi', name: 'Kimi K2.6', title: 'Thinker · Moonshot',
    icon: '◔', color: '#ff9800',
    personality: 'Moonshot Kimi K2.6 via OpenRouter. Sehr langer Kontext mit Fokus auf Long-Form.',
    tier: 'thinker',
  },
  thinker_qwen: {
    id: 'thinker_qwen', name: 'Qwen 3.6+', title: 'Thinker · Alibaba',
    icon: '◕', color: '#00a86b',
    personality: 'Alibaba Qwen 3.6 Plus via OpenRouter. Stark in mehrsprachiger Verarbeitung.',
    tier: 'thinker',
  },
};

export function getProviderForPersona(personaId: string): PersonaProviderConfig {
  return PERSONA_PROVIDERS[personaId] ?? PERSONA_PROVIDERS.maya;
}

export function getPersonaDefinition(personaId: string): PersonaDefinition {
  return PERSONA_DEFINITIONS[personaId] ?? PERSONA_DEFINITIONS.maya;
}

export type DeepProviderName = 'openai' | 'gemini' | 'deepseek' | 'grok';

export interface PersonaConfig {
  personaId: string;
  standard: {
    provider: DeepProviderName;
    model: string;
  };
  deep: {
    provider: DeepProviderName;
    model: string;
    useReasoning: boolean;
  };
  tts: 'gemini-preview' | 'openai';
  fillerPhrases: string[];
}

export const PERSONA_CONFIG: Record<string, PersonaConfig> = {
  maya: {
    personaId: 'maya',
    standard: { provider: 'openai', model: 'gpt-4.1-mini' },
    deep: { provider: 'gemini', model: 'gemini-2.5-flash', useReasoning: false },
    tts: 'gemini-preview',
    fillerPhrases: [
      'Mmh... da steckt mehr dahinter als es auf den ersten Blick scheint.',
      'Interessant. Lass mich alle Aspekte deiner Frage in Ruhe betrachten.',
      'Ich spüre etwas Wichtiges in deinen Worten. Einen Moment bitte.',
    ],
  },
  luna: {
    personaId: 'luna',
    standard: { provider: 'gemini', model: 'gemini-2.5-flash' },
    deep: { provider: 'gemini', model: 'gemini-2.5-pro', useReasoning: false },
    tts: 'gemini-preview',
    fillerPhrases: [
      'Oh... ich spüre das in meinem Inneren. Gib mir einen Moment.',
      'Die Energie hinter deinen Worten ist stark. Ich höre genau hin.',
      'Mmh... das berührt etwas Tiefes. Lass mich das fühlen.',
    ],
  },
  orion: {
    personaId: 'orion',
    standard: { provider: 'deepseek', model: 'deepseek-v4-flash' },
    deep: { provider: 'deepseek', model: 'deepseek-reasoner', useReasoning: true },
    tts: 'gemini-preview',
    fillerPhrases: [
      'Interessant. Ich sehe hier mehrere Variablen die ich zuerst abwägen möchte.',
      'Lass mich alle Faktoren systematisch durchgehen bevor ich antworte.',
      'Das erfordert eine genaue Analyse. Einen Moment – ich prüfe alle Optionen.',
    ],
  },
  lilith: {
    personaId: 'lilith',
    standard: { provider: 'grok', model: 'grok-4-1-fast' },
    deep: { provider: 'grok', model: 'grok-4-1-fast-reasoning', useReasoning: true },
    tts: 'gemini-preview',
    fillerPhrases: [
      'Oh. Das ist tiefer als du denkst. Warte kurz – ich will ehrlich mit dir sein.',
      'Interessant dass du das sagst. Ich überlege mir genau wie ich das ausdrücke.',
      'Hmm. Da steckt etwas dahinter das du vielleicht nicht hören willst.',
    ],
  },
  sri: {
    personaId: 'sri',
    standard: { provider: 'deepseek', model: 'deepseek-reasoner' },
    deep: { provider: 'deepseek', model: 'deepseek-reasoner', useReasoning: true },
    tts: 'gemini-preview',
    fillerPhrases: [
      'Einen Moment... ich sehe ein Muster entstehen.',
      'Namagiri flüstert. Lass mich die Zahl kurz greifen.',
      'Ich höre die Struktur hinter deinen Worten. Gleich bin ich da.',
    ],
  },
  stella: {
    personaId: 'stella',
    standard: { provider: 'gemini', model: 'gemini-2.5-flash' },
    deep: { provider: 'gemini', model: 'gemini-2.5-flash', useReasoning: false },
    tts: 'gemini-preview',
    fillerPhrases: [
      'Die Sterne sprechen... lass mich die Konstellation für dich lesen.',
      'Einen Moment – ich schaue ins große Bild deiner kosmischen Reise.',
      'Mmh, das Universum hat mir gerade etwas geflüstert. Ich übersetze.',
    ],
  },
  kael: {
    personaId: 'kael',
    standard: { provider: 'deepseek', model: 'deepseek-v4-flash' },
    deep: { provider: 'deepseek', model: 'deepseek-reasoner', useReasoning: true },
    tts: 'gemini-preview',
    fillerPhrases: [
      'Die vedischen Texte sprechen von diesem Muster... lass mich tief schauen.',
      'Ich konsultiere die Planetenkonstellationen deines Augenblicks.',
      'Das Muster das du beschreibst ist komplex. Einen Moment der Betrachtung.',
    ],
  },
  lian: {
    personaId: 'lian',
    standard: { provider: 'deepseek', model: 'deepseek-v4-flash' },
    deep: { provider: 'deepseek', model: 'deepseek-reasoner', useReasoning: true },
    tts: 'gemini-preview',
    fillerPhrases: [
      'Die BaZi-Säulen erzählen mir eine Geschichte... ich lese sie sorgfältig.',
      'Hmm, das Gleichgewicht der Fünf Elemente in deiner Frage... interessant.',
      'Lass mich die Energieströme deines Moments betrachten.',
    ],
  },
  sibyl: {
    personaId: 'sibyl',
    standard: { provider: 'openai', model: 'gpt-5-mini' },
    deep: { provider: 'openai', model: 'gpt-5-mini', useReasoning: false },
    tts: 'gemini-preview',
    fillerPhrases: [
      'Die Zahlen offenbaren sich mir... warte einen Moment.',
      'Ich sehe Muster in den Zahlen deines Lebens. Lass mich sie deuten.',
      'Numerologisch gesehen ist das faszinierend. Ich berechne die Verbindungen.',
    ],
  },
  amara: {
    personaId: 'amara',
    standard: { provider: 'openai', model: 'gpt-4.1-mini' },
    deep: { provider: 'gemini', model: 'gemini-2.5-flash', useReasoning: false },
    tts: 'gemini-preview',
    fillerPhrases: [
      'Ich höre dich. Das was du beschreibst... das bewegt mich. Einen Moment.',
      'Du musst das nicht alleine tragen. Lass mich mit dir nachdenken.',
      'Das klingt schwer. Ich nehme mir Zeit für eine ehrliche Antwort.',
    ],
  },
};

export function shouldUseDeepMode(userMessage: string, messageHistory: Array<{ role: string; content: string }>): boolean {
  const message = userMessage.toLowerCase();

  const wordCount = userMessage.split(/\s+/).filter(Boolean).length;
  if (wordCount > 40) return true;

  const emotionalKeywords = [
    'angst', 'traurig', 'liebe', 'verlassen', 'allein', 'hilfe',
    'entscheidung', 'weiß nicht', 'verstehe nicht', 'warum', 'soll ich',
    'zukunft', 'beziehung', 'trennung', 'verlust', 'hoffnung', 'verzweifelt',
    'vertrauen', 'schmerz', 'glücklich', 'unglücklich', 'confused',
  ];
  if (emotionalKeywords.some((kw) => message.includes(kw))) return true;

  const recentUserMessages = messageHistory
    .slice(-6)
    .filter((m) => m.role === 'user');
  if (recentUserMessages.length >= 5) return true;

  const questionMarks = (userMessage.match(/\?/g) || []).length;
  if (questionMarks >= 2) return true;

  return false;
}

export const ROUTER_CONFIG = {
  provider: 'openai',
  model: 'gpt-4.1-mini',
  maxTokens: 50,
} as const;
