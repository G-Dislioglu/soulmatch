import type { NarrativeQualityDebug } from '../narrative/types.js';

/**
 * Studio response extension (PR-02)
 * qualityDebug is included for UI transparency while the gate is being rolled out.
 */
export interface StudioQualityDebugContract {
  qualityDebug?: NarrativeQualityDebug;
}

export const NARRATIVE_QUALITY_DEBUG_EXAMPLE: NarrativeQualityDebug = {
  pass: false,
  reasons: ['contains_code_fence', 'too_short'],
  fallbackUsed: true,
  version: 'gate-v1',
};
