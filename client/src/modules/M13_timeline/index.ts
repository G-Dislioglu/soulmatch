/** PURPOSE: Zeitstrahl-Komponenten fuer Verlauf, Sessions, Reports */

/* ═══════════════════════════════════════════
   M13_timeline — public API
   ═══════════════════════════════════════════ */

// Types
export type {
  TimelineEntry,
  TimelineEntryType,
  SoulCard,
  SoulCardProposal,
  SoulCardSourceType,
} from './lib/types';

// Entry type config
export { ENTRY_TYPES } from './lib/entryTypes';
export type { EntryTypeMeta } from './lib/entryTypes';

// Services
export * as timelineService from './lib/timelineService';
export * as soulCardService from './lib/soulCardService';

// UI
export { Sidebar } from './ui/Sidebar';
export type { SidebarProps, SidebarCallbacks } from './ui/Sidebar';
export { SoulCardDetail } from './ui/SoulCardDetail';
export type { SoulCardDetailProps } from './ui/SoulCardDetail';
export { CrossingModal } from './ui/CrossingModal';
export type { CrossingModalProps } from './ui/CrossingModal';
export { ScoreHistoryChart } from './ui/ScoreHistoryChart';
export { TopMatchesCard } from './ui/TopMatchesCard';
