import { devLogger } from '../devLogger.js';

export interface MasterPieceRoundMetrics {
  userId?: string;
  topic?: string;
  debateMode?: string;
  personasCount: number;
  thinkersCount: number;
  hasSynthesis: boolean;
  synthesisSectionsPresent: {
    kernpunkte: boolean;
    einigkeit: boolean;
    dissens: boolean;
    essenz: boolean;
  };
  thinkerMetrics: Array<{
    personaId: string;
    provider: string;
    model: string;
    responseLength: number;
    responseTimeMs: number;
    hadError: boolean;
  }>;
  totalDurationMs: number;
}

function detectSynthesisSections(text: string | undefined): MasterPieceRoundMetrics['synthesisSectionsPresent'] {
  const source = text ?? '';
  return {
    kernpunkte: /\*\*\s*Kernpunkte\s*\*\*/i.test(source),
    einigkeit: /\*\*\s*Einigkeit\s*\*\*/i.test(source),
    dissens: /\*\*\s*Dissens\s*\*\*/i.test(source),
    essenz: /\*\*\s*Essenz\s*\*\*/i.test(source),
  };
}

export function logMasterPieceRound(
  metrics: Omit<MasterPieceRoundMetrics, 'synthesisSectionsPresent'> & {
    synthesisText?: string;
    synthesisSectionsPresent?: MasterPieceRoundMetrics['synthesisSectionsPresent'];
  },
): void {
  const synthesisSectionsPresent = metrics.synthesisSectionsPresent ?? detectSynthesisSections(metrics.synthesisText);
  const payload = {
    userId: metrics.userId,
    topic: metrics.topic,
    debateMode: metrics.debateMode,
    personasCount: metrics.personasCount,
    thinkersCount: metrics.thinkersCount,
    hasSynthesis: metrics.hasSynthesis,
    synthesisSectionsPresent,
    thinkerMetrics: metrics.thinkerMetrics,
    totalDurationMs: metrics.totalDurationMs,
  };

  devLogger.info('masterpiece', 'Master-Piece round telemetry', payload);
}
