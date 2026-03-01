export interface PersonaInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  role: string;
  trait: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'persona' | 'companion';
  senderName: string;
  senderIcon: string;
  senderColor: string;
  text: string;
  timestamp: string;
}

export interface InsightCard {
  type: string;
  text: string;
  category: '' | 'tension' | 'harmony' | 'key' | 'new';
  timestamp: string;
}

export const PERSONAS: PersonaInfo[] = [
  { id: 'maya', name: 'Maya', icon: '◇', color: '#d4af37', role: 'Die Weise', trait: 'Analytisch · Tiefgründig' },
  { id: 'luna', name: 'Luna', icon: '☽', color: '#c084fc', role: 'Mondgöttin', trait: 'Empathisch · Intuitiv' },
  { id: 'amara', name: 'Amara', icon: '💎', color: '#34d399', role: 'Heilerin', trait: 'Heilend · Sanft' },
  { id: 'orion', name: 'Orion', icon: '△', color: '#38bdf8', role: 'Sternenwächter', trait: 'Ruhig · Weitblick' },
  { id: 'lilith', name: 'Lilith', icon: '🔥', color: '#f97316', role: 'Schattenwesen', trait: 'Direkt · Provokativ' },
  { id: 'sibyl', name: 'Sibyl', icon: '🔮', color: '#8b5cf6', role: 'Prophetin', trait: 'Visionär · Mystisch' },
  { id: 'kael', name: 'Kael', icon: '𝌆', color: '#a78bfa', role: 'Seelenwanderer', trait: 'Philosophisch · Weise' },
  { id: 'stella', name: 'Stella', icon: '🔭', color: '#f59e0b', role: 'Himmelsforscherin', trait: 'Präzise · Analytisch' },
  { id: 'lian', name: 'Lian', icon: '🀄', color: '#ef4444', role: 'Drachenhüterin', trait: 'Wandel · I Ging' },
];
