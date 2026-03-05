export const PERSONA_COLORS: Record<string, string> = {
  maya:       '#d4af37',
  luna:       '#c084fc',
  orion:      '#38bdf8',
  lilith:     '#f97316',
  sri:        '#7eb8c9',
  stella:     '#f59e0b',
  kael:       '#a78bfa',
  lian:       '#ef4444',
  sibyl:      '#8b5cf6',
  amara:      '#34d399',
  echo_prism: '#e2e8f0',
  user:       '#e0dbd0',
};

export const PERSONA_ICONS: Record<string, string> = {
  maya:       '◇',
  luna:       '☽',
  orion:      '△',
  lilith:     '🔥',
  sri:        '∞',
  stella:     '🔭',
  kael:       '𝌆',
  lian:       '🀄',
  sibyl:      '🔮',
  amara:      '💎',
  echo_prism: '◈',
};

export const PERSONA_NAMES: Record<string, string> = {
  maya:       'Maya',
  luna:       'Luna',
  orion:      'Orion',
  lilith:     'Lilith',
  sri:        'Sri',
  stella:     'Stella',
  kael:       'Kael',
  lian:       'Lian',
  sibyl:      'Sibyl',
  amara:      'Amara',
  echo_prism: 'Echo Prism',
};

export const PERSONA_TITLES: Record<string, string> = {
  maya:       'Die Strukturgeberin',
  luna:       'Die Traumführerin',
  orion:      'Der Seelenstratege',
  lilith:     'Die Schatten-Jägerin',
  sri:        'Der Träumer der Zahlen',
  stella:     'Westliche Astrologie',
  kael:       'Vedische Astrologie',
  lian:       'BaZi & Chinesische Astrologie',
  sibyl:      'Numerologie & Orakel',
  amara:      'Menschliches Design',
  echo_prism: 'Meta-Analyse',
};

export type PersonaTierLabel = 'companion' | 'specialist' | 'meta';

export const PERSONA_TIERS: Record<string, PersonaTierLabel> = {
  maya:       'companion',
  luna:       'companion',
  orion:      'companion',
  lilith:     'companion',
  sri:        'specialist',
  stella:     'specialist',
  kael:       'specialist',
  lian:       'specialist',
  sibyl:      'specialist',
  amara:      'specialist',
  echo_prism: 'meta',
};
