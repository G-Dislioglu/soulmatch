/* ═══════════════════════════════════════════
   Visual identity per timeline entry type
   ═══════════════════════════════════════════ */

import type { TimelineEntryType } from './types';

export interface EntryTypeMeta {
  icon: string;
  color: string;
  glowColor: string;
  label: string;
}

export const ENTRY_TYPES: Record<TimelineEntryType, EntryTypeMeta> = {
  score: {
    icon: '◈',
    color: '#d4af37',
    glowColor: 'rgba(212,175,55,0.12)',
    label: 'Score',
  },
  chat_maya: {
    icon: '◇',
    color: '#d4af37',
    glowColor: 'rgba(212,175,55,0.08)',
    label: 'Maya Chat',
  },
  chat_lilith: {
    icon: '🔥',
    color: '#d49137',
    glowColor: 'rgba(212,145,55,0.08)',
    label: 'Lilith Chat',
  },
  chat_luna: {
    icon: '☽',
    color: '#c084fc',
    glowColor: 'rgba(192,132,252,0.08)',
    label: 'Luna Chat',
  },
  chat_orion: {
    icon: '△',
    color: '#38bdf8',
    glowColor: 'rgba(56,189,248,0.08)',
    label: 'Orion Chat',
  },
  insight: {
    icon: '✦',
    color: '#10b981',
    glowColor: 'rgba(16,185,129,0.08)',
    label: 'Erkenntnis',
  },
  crossing: {
    icon: '⚛',
    color: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.08)',
    label: 'Crossing',
  },
  soul_card: {
    icon: '◆',
    color: '#e879f9',
    glowColor: 'rgba(232,121,249,0.08)',
    label: 'Soul Card',
  },
};
