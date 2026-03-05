/* ═══════════════════════════════════════════
   Timeline + Soul Card type definitions
   ═══════════════════════════════════════════ */

export type TimelineEntryType =
  | 'score'
  | 'chat_maya'
  | 'chat_lilith'
  | 'chat_luna'
  | 'chat_orion'
  | 'chat_sri'
  | 'insight'
  | 'crossing'
  | 'soul_card';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  title: string;
  preview: string;
  timestamp: string; // ISO date
  metadata?: {
    score?: number;
    personaId?: string;
    claimId?: string;
    cardIds?: string[];
    sessionId?: string;
  };
}

export type SoulCardSourceType = 'chat' | 'insight' | 'score' | 'manual' | 'crossing';

export interface SoulCard {
  id: string;
  title: string;
  essence: string;
  tags: string[];
  sourceEntryId: string;
  sourceType: SoulCardSourceType;
  createdAt: string; // ISO date
  confirmedByUser: boolean;
  crossedWith?: string[];
  crossingResults?: string[];
}

export interface SoulCardProposal {
  title: string;
  essence: string;
  tags: string[];
}
